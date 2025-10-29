# red-panda-export

### Pre-requisite
- Contentstack account
- Contentstack cli installed on your machine.
- Write access to this repository

## Content Update

This repository includes scripts to update the exported content from Contentstack.

### Content Update Commands

```bash
# Update content directory (delete existing and re-export)
npm run content:update
```

### What the Content Update Does:
1. **Deletes** the existing `content` directory
2. **Runs** the Contentstack export command: `csdx cm:export -k bltc991c0dda4197336 -d content`
3. **Creates** fresh content export from Contentstack



## Git tag and version update

This repository includes scripts to manage version tags and releases.

### Version Update Commands

```bash
# Create tag with current package.json version
npm run version:update tag

# Create tag with custom version
npm run version:update tag 1.2.3

# Force recreate existing tag (deletes existing tags first)
npm run version:update tag 1.2.3 --force

# Update version in package.json and create tag using patch|minor|major
# Increment patch version (3.3.0 → 3.3.1) and create tag
npm run version:update update

# Increment minor version (3.3.0 → 3.4.0) and create tag  
npm run version:update update minor

# Increment major version (3.3.0 → 4.0.0) and create tag
npm run version:update update major
```