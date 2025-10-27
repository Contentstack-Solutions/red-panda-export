const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Creates a version tag in the current git repository
 */
async function createVersionTag() {
    try {
        // Read package.json to get the current version
        const packageJsonPath = path.join(__dirname, 'package.json');
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        const version = packageJson.version;
        
        console.log(`Creating version tag for v${version}...`);
        
        // Check if we're in a git repository
        try {
            execSync('git status', { stdio: 'pipe' });
        } catch (error) {
            throw new Error('Not in a git repository');
        }
        
        // Check if the tag already exists
        try {
            execSync(`git rev-parse v${version}`, { stdio: 'pipe' });
            console.log(`Tag v${version} already exists. Skipping...`);
            return;
        } catch (error) {
            // Tag doesn't exist, continue with creation
        }
        
        // Add all changes to staging
        console.log('Adding changes to staging...');
        execSync('git add .', { stdio: 'inherit' });
        
        // Check if there are any changes to commit
        try {
            execSync('git diff --cached --quiet', { stdio: 'pipe' });
            console.log('No changes to commit.');
        } catch (error) {
            // There are changes, commit them
            console.log('Committing changes...');
            execSync(`git commit -m "Release v${version}"`, { stdio: 'inherit' });
        }
        
        // Create and push the tag
        console.log(`Creating tag v${version}...`);
        execSync(`git tag -a v${version} -m "Release version ${version}"`, { stdio: 'inherit' });
        
        console.log(`Pushing tag v${version} to remote...`);
        execSync(`git push origin v${version}`, { stdio: 'inherit' });
        
        console.log(`✅ Successfully created and pushed tag v${version}`);
        
    } catch (error) {
        console.error('❌ Error creating version tag:', error.message);
        process.exit(1);
    }
}

/**
 * Updates the version in package.json and creates a tag
 * @param {string} type - Version bump type: 'patch', 'minor', or 'major'
 */
async function updateVersionAndTag(type = 'patch') {
    try {
        const packageJsonPath = path.join(__dirname, 'package.json');
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        
        // Parse current version
        const versionParts = packageJson.version.split('.').map(Number);
        let [major, minor, patch] = versionParts;
        
        // Increment version based on type
        switch (type) {
            case 'major':
                major++;
                minor = 0;
                patch = 0;
                break;
            case 'minor':
                minor++;
                patch = 0;
                break;
            case 'patch':
            default:
                patch++;
                break;
        }
        
        const newVersion = `${major}.${minor}.${patch}`;
        console.log(`Updating version from ${packageJson.version} to ${newVersion}`);
        
        // Update package.json
        packageJson.version = newVersion;
        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
        
        console.log(`Updated package.json version to ${newVersion}`);
        
        // Create version tag
        await createVersionTag();
        
    } catch (error) {
        console.error('❌ Error updating version and creating tag:', error.message);
        process.exit(1);
    }
}

// CLI interface
if (require.main === module) {
    const args = process.argv.slice(2);
    const command = args[0];
    
    switch (command) {
        case 'tag':
            // Just create a tag with current version
            createVersionTag();
            break;
        case 'update':
            // Update version and create tag
            const versionType = args[1] || 'patch';
            if (!['patch', 'minor', 'major'].includes(versionType)) {
                console.error('❌ Invalid version type. Use: patch, minor, or major');
                process.exit(1);
            }
            updateVersionAndTag(versionType);
            break;
        default:
            console.log(`
Usage:
  node update.js tag              - Create a tag with current version (${require('./package.json').version})
  node update.js update [type]    - Update version and create tag
  
Version types:
  patch (default) - Increment patch version (x.x.X)
  minor          - Increment minor version (x.X.0)
  major          - Increment major version (X.0.0)

Examples:
  node update.js tag              - Create tag v3.3.0
  node update.js update           - Update to v3.3.1 and create tag
  node update.js update minor     - Update to v3.4.0 and create tag
  node update.js update major     - Update to v4.0.0 and create tag
            `);
            break;
    }
}

module.exports = {
    createVersionTag,
    updateVersionAndTag
};
