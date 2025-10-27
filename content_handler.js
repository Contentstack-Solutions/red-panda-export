const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Updates the content directory by deleting it and running fresh export
 */
async function updateContentDirectory() {
    try {
        const contentDir = path.join(__dirname, 'content');
        
        console.log('🗑️  Deleting existing content directory...');
        
        // Check if content directory exists
        if (fs.existsSync(contentDir)) {
            // Remove the content directory recursively
            fs.rmSync(contentDir, { recursive: true, force: true });
            console.log('✅ Content directory deleted successfully');
        } else {
            console.log('ℹ️  Content directory does not exist');
        }
        
        console.log('📥 Starting fresh content export...');
        
        // Run the Contentstack export command
        const exportCommand = 'csdx cm:export -k bltc991c0dda4197336 -d content';
        
        console.log(`Running: ${exportCommand}`);
        execSync(exportCommand, { 
            stdio: 'inherit',
            cwd: __dirname 
        });
        
        console.log('✅ Content export completed successfully!');
        
        // Verify the content directory was created
        if (fs.existsSync(contentDir)) {
            console.log('✅ New content directory created');
            
            // Show some basic stats about the exported content
            const stats = getContentStats(contentDir);
            console.log('📊 Export Summary:');
            console.log(`   - Directories: ${stats.directories}`);
            console.log(`   - Files: ${stats.files}`);
        } else {
            console.log('⚠️  Warning: Content directory was not created');
        }
        
    } catch (error) {
        console.error('❌ Error updating content directory:', error.message);
        process.exit(1);
    }
}

/**
 * Get basic statistics about the content directory
 * @param {string} dirPath - Path to the content directory
 * @returns {object} Stats object with file and directory counts
 */
function getContentStats(dirPath) {
    let files = 0;
    let directories = 0;
    
    function countItems(currentPath) {
        try {
            const items = fs.readdirSync(currentPath);
            
            for (const item of items) {
                const itemPath = path.join(currentPath, item);
                const stat = fs.statSync(itemPath);
                
                if (stat.isDirectory()) {
                    directories++;
                    countItems(itemPath); // Recursively count subdirectories
                } else {
                    files++;
                }
            }
        } catch (error) {
            // Skip inaccessible directories
        }
    }
    
    countItems(dirPath);
    return { files, directories };
}

// CLI interface
if (require.main === module) {
    const args = process.argv.slice(2);
    const command = args[0];
    if (!command) {
        updateContentDirectory(); // Default action
    }
    command === '--help' && console.log(`
        📁 Content Directory Updater

        Usage:
        node content_handler.js          - Delete content directory and export fresh content

        Export Command Used: csdx cm:export -k bltc991c0dda4197336 -d content
            `);
    }

module.exports = {
    updateContentDirectory,
    getContentStats
};