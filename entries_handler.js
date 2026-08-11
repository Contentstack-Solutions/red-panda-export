const fs = require('fs');
const path = require('path');
require('dotenv').config();

const RP_STACK_API_KEY = process.env.RP_STACK_API_KEY;
const MANAGEMENT_TOKEN = process.env.management_token;
const ENTRIES_DIR = path.join(__dirname, 'beta-cli', 'entries');
const API_BASE = 'https://api.contentstack.io/v3';

// Fields the exporter never includes at the entry's top level.
const AUDIT_FIELDS = ['created_at', 'created_by', 'updated_at', 'updated_by'];

const REQUEST_DELAY_MS = 350;
const MAX_RETRIES = 3;

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function listDirs(dirPath) {
    return fs.readdirSync(dirPath, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name);
}

function findEntriesFiles(contentType, locale) {
    const localeDir = path.join(ENTRIES_DIR, contentType, locale);
    if (!fs.existsSync(localeDir)) return [];
    return fs.readdirSync(localeDir)
        .filter((name) => name.endsWith('-entries.json'))
        .map((name) => path.join(localeDir, name));
}

async function getSingleEntry(contentType, uid, locale) {
    const url = `${API_BASE}/content_types/${contentType}/entries/${uid}?locale=${locale}&include_publish_details=true`;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const response = await fetch(url, {
            headers: {
                api_key: RP_STACK_API_KEY,
                authorization: MANAGEMENT_TOKEN,
            },
        });

        if (response.status === 429) {
            const backoff = REQUEST_DELAY_MS * attempt * 2;
            console.log(`   ⏳ Rate limited, retrying in ${backoff}ms...`);
            await sleep(backoff);
            continue;
        }

        if (!response.ok) {
            const body = await response.text();
            throw new Error(`HTTP ${response.status}: ${body}`);
        }

        const data = await response.json();
        return data.entry;
    }

    throw new Error('Max retries exceeded (rate limited)');
}

function stripAuditFields(entry) {
    const cleaned = { ...entry };
    for (const field of AUDIT_FIELDS) {
        delete cleaned[field];
    }
    return cleaned;
}

async function processEntriesFile(contentType, locale, filePath) {
    const raw = fs.readFileSync(filePath, 'utf8');
    const entries = JSON.parse(raw);
    const uids = Object.keys(entries);

    let updated = 0;
    let failed = 0;

    for (const uid of uids) {
        try {
            const apiEntry = await getSingleEntry(contentType, uid, locale);
            entries[uid] = stripAuditFields(apiEntry);
            updated++;
            console.log(`   ✅ ${uid}`);
        } catch (error) {
            failed++;
            console.log(`   ❌ ${uid}: ${error.message}`);
        }
        await sleep(REQUEST_DELAY_MS);
    }

    fs.writeFileSync(filePath, JSON.stringify(entries, null, 4));
    return { updated, failed, total: uids.length };
}

async function run(contentTypeArg, localeArg) {
    if (!RP_STACK_API_KEY || !MANAGEMENT_TOKEN) {
        console.error('❌ RP_STACK_API_KEY and/or management_token missing from .env');
        process.exit(1);
    }

    const contentTypes = contentTypeArg === 'all' ? listDirs(ENTRIES_DIR) : [contentTypeArg];

    const totals = { updated: 0, failed: 0, total: 0 };

    for (const contentType of contentTypes) {
        const contentTypeDir = path.join(ENTRIES_DIR, contentType);
        if (!fs.existsSync(contentTypeDir)) {
            console.log(`⚠️  Skipping unknown content type: ${contentType}`);
            continue;
        }

        const locales = localeArg === 'all' ? listDirs(contentTypeDir) : [localeArg];

        for (const locale of locales) {
            const files = findEntriesFiles(contentType, locale);
            if (files.length === 0) continue;

            for (const filePath of files) {
                console.log(`📁 ${contentType}/${locale} (${path.basename(filePath)})`);
                const result = await processEntriesFile(contentType, locale, filePath);
                totals.updated += result.updated;
                totals.failed += result.failed;
                totals.total += result.total;
            }
        }
    }

    console.log('\n📊 Summary:');
    console.log(`   - Entries processed: ${totals.total}`);
    console.log(`   - Updated: ${totals.updated}`);
    console.log(`   - Failed: ${totals.failed}`);
}

if (require.main === module) {
    const [contentTypeArg, localeArg] = process.argv.slice(2);

    if (!contentTypeArg || !localeArg) {
        console.log(`
📁 Entries Fixer — refreshes exported entries via the Get Single Entry API

Usage:
  node entries_handler.js <content_type> <locale>
  node entries_handler.js <content_type> all
  node entries_handler.js all all

Examples:
  node entries_handler.js faq en
  node entries_handler.js homepage all
  node entries_handler.js all all
        `);
        process.exit(1);
    }

    run(contentTypeArg, localeArg).catch((error) => {
        console.error('❌ Unexpected error:', error);
        process.exit(1);
    });
}

module.exports = { run };
