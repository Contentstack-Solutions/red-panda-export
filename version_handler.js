const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Creates a version tag in the current git repository
 * @param {string} customVersion - Optional custom version to use instead of package.json version
 * @param {boolean} force - Force recreate tag if it already exists
 */
async function createVersionTag(customVersion = null, force = false) {
    try {
        let version;
        
        if (customVersion) {
            version = customVersion;
            console.log(`Using custom version: ${version}`);
        } else {
            // Read package.json to get the current version
            const packageJsonPath = path.join(__dirname, 'package.json');
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            version = packageJson.version;
        }
        
        console.log(`Creating version tag for ${version}...`);
        
        // Check if we're in a git repository
        try {
            execSync('git status', { stdio: 'pipe' });
        } catch (error) {
            throw new Error('Not in a git repository');
        }
        
        // Check if the tag already exists locally
        let tagExistsLocally = false;
        try {
            execSync(`git rev-parse ${version}`, { stdio: 'pipe' });
            tagExistsLocally = true;
        } catch (error) {
            // Tag doesn't exist locally
        }
        
        // Check if the tag exists on remote
        let tagExistsRemotely = false;
        try {
            const remoteOutput = execSync(`git ls-remote --tags origin ${version}`, { encoding: 'utf8', stdio: 'pipe' });
            tagExistsRemotely = remoteOutput.trim().length > 0;
        } catch (error) {
            // Error checking remote or tag doesn't exist remotely
        }
        
        // Handle the three cases
        if (tagExistsLocally && tagExistsRemotely) {
            // Case 1: Tag exists both locally and remotely
            if (force) {
                console.log(`⚠️  Tag ${version} exists both locally and remotely. Force updating...`);
                console.log(`🗑️  Deleting local tag ${version}...`);
                try {
                    execSync(`git tag -d ${version}`, { stdio: 'inherit' });
                    console.log(`✅ Local tag ${version} deleted`);
                } catch (error) {
                    console.error(`❌ Failed to delete local tag: ${error.message}`);
                    throw error;
                }
                
                console.log(`🗑️  Deleting remote tag ${version}...`);
                try {
                    execSync(`git push --delete origin ${version}`, { stdio: 'inherit' });
                    console.log(`✅ Remote tag ${version} deleted`);
                } catch (error) {
                    console.error(`❌ Failed to delete remote tag: ${error.message}`);
                    throw error;
                }
            } else {
                console.log(`⏭️  Tag ${version} exists both locally and remotely. Skipping...`);
                console.log(`💡 Use force-update to update the existing tag`);
                return;
            }
        } else if (tagExistsLocally && !tagExistsRemotely) {
            // Case 2: Tag exists locally but not remotely - always proceed
            console.log(`📍 Tag ${version} exists locally but not remotely. Deleting local tag and creating fresh...`);
            try {
                execSync(`git tag -d ${version}`, { stdio: 'inherit' });
                console.log(`✅ Local tag ${version} deleted`);
            } catch (error) {
                console.error(`❌ Failed to delete local tag: ${error.message}`);
                throw error;
            }
        } else if (!tagExistsLocally && tagExistsRemotely) {
            // Case 3: Tag exists remotely but not locally
            if (force) {
                console.log(`🌐 Tag ${version} exists remotely but not locally. Force updating...`);
                console.log(`🗑️  Deleting remote tag ${version}...`);
                try {
                    execSync(`git push --delete origin ${version}`, { stdio: 'inherit' });
                    console.log(`✅ Remote tag ${version} deleted`);
                } catch (error) {
                    console.error(`❌ Failed to delete remote tag: ${error.message}`);
                    throw error;
                }
            } else {
                console.log(`🌐 Tag ${version} exists remotely but not locally.`);
                console.log(`💡 Use force-update to update the remote tag`);
                return;
            }
        } else {
            // Tag doesn't exist anywhere - proceed normally
            console.log(`✨ Tag ${version} doesn't exist. Creating new tag...`);
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
            execSync(`git commit -m "Release ${version}" --no-verify`, { stdio: 'inherit' });
        }
        
        // Create and push the tag
        console.log(`Creating tag ${version}...`);
        execSync(`git tag -a ${version} -m "Release version ${version}"`, { stdio: 'inherit' });
        
        console.log(`Pushing tag ${version} to remote...`);
        execSync(`git push origin ${version}`, { stdio: 'inherit' });

        // publish changes to main branch
        // console.log('Pushing changes to main branch...');
        // execSync('git push origin main', { stdio: 'inherit' });
        
        console.log(`✅ Successfully created and pushed tag ${version}`);
        
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
    console.log(process.argv)
    const args = process.argv.slice(2);
    const command = args[0];
    
    switch (command) {
        case 'tag': 
            // Create a tag with custom version or current version
            const customVersion = args[1];
            const forceFlag = args.includes('force-update') || args.includes('-f');
            console.log("🚀 ~ forceFlag:", forceFlag)
            
            if (customVersion && (customVersion === 'force-update' || customVersion === '-f')) {
                // If first argument is force flag, use package.json version with force
                createVersionTag(null, true);
            } else {
                if (customVersion) {
                    // Validate version format (basic semver check)
                    const versionRegex = /^\d+\.\d+\.\d+(-[\w\.-]+)?$/;
                    if (!versionRegex.test(customVersion)) {
                        console.error('❌ Invalid version format. Please use semantic versioning (e.g., 1.0.0)');
                        process.exit(1);
                    }
                }
                createVersionTag(customVersion, forceFlag);
            }
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
  npm run version:update tag [version] [force-update]  - Create a tag using current or custom version
  npm run version:update update [type]            - Update version in package.json and create tag

Version types:
  patch (default) - Increment patch version (x.x.X)
  minor          - Increment minor version (x.X.0)
  major          - Increment major version (X.0.0)

Flags:
  force-update, -f    - Force recreate tag if it already exists locally

Examples:
  npm run version:update tag                    - Create tag ${require('./package.json').version} (current version)
  npm run version:update tag 3.3.0             - Create tag v3.3.0 (custom version)
  npm run version:update tag 3.3.0 force-update     - Force recreate tag v3.3.0 (deletes local tag first)
  npm run version:update tag force-update           - Force recreate tag with current version
  npm run version:update update                - Update to next patch and create tag
  npm run version:update update minor          - Update to next minor and create tag
  npm run version:update update major          - Update to next major and create tag

Note: If you deleted a tag from GitHub but it still exists locally, use force-update flag
            `);
            break;
    }
}

module.exports = {
    createVersionTag,
    updateVersionAndTag
};
