# red-panda-export

### Pre-requisites
- Contentstack account
- Contentstack cli installed on your machine, if not install using: 

    ```
    npm i -g @contentstack/cli@latest
    ```

### Project setup
- Clone the repo using
```
git clone https://github.com/Contentstack-Solutions/red-panda-export.git
```
- Navigate to the root directory, Run 
```
npm install
```

### Using Content Directory - Import Content
if you want to import the exported content from this repository follow these steps:
- Navigate to root directory
- Run following command in terminal

```
csdx config:set:region
```
```
csdx auth:login
```
```
csdx cm:stacks:import -k <<DESTINATION_STACK_API KEY>> -d content/main -y
```
Sit back and relax, import to your destination stack will start.
<br/><br/><br/>

---
# Revision Scripts 

## Content Update

This repository includes scripts to update the exported content from Contentstack.

#### Content Update Commands

```bash
# Update content directory (delete existing and re-export)
npm run content:update
```

#### What the Content Update Does:
1.  **Deletes** the existing `content` directory
2. **Runs** the Contentstack export command: `csdx cm:export -k <<RED PANDA STACK API KEY>> -d content`
3. **Creates** fresh content export from Contentstack



## Git tag and version update

This repository includes scripts to manage release tags and their versions. Which will be published and available to use.

#### Version Update Commands

```bash
# Create tag with current package.json version
npm run version:update tag

# Create tag with custom version
npm run version:update tag 1.2.3

# Force recreate existing tag (deletes existing tags first)
npm run version:update tag 1.2.3 force-update

# Update version in package.json and create tag using patch|minor|major
# Increment patch version (3.3.0 → 3.3.1) and create tag
npm run version:update patch

# Increment minor version (3.3.0 → 3.4.0) and create tag  
npm run version:update minor

# Increment major version (3.3.0 → 4.0.0) and create tag
npm run version:update major

# help command
npm run version:update help
```


