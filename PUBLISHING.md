# Publishing Guide for mcp-fitbit

This guide walks through publishing the mcp-fitbit package to npm.

## Pre-requisites

1. **npm account**: You need an npm account at https://www.npmjs.com/
2. **npm CLI**: Installed and logged in locally
3. **Package ready**: Built, tested, and linted

## Publishing Steps

### 1. Login to npm (if not already)
```bash
npm login
```

### 2. Verify package is ready
```bash
# Check what files will be included
npm pack --dry-run

# Verify all checks pass
npm run prepublishOnly
```

### 3. Publish to npm
```bash
# For first release
npm publish

# For scoped packages (if needed later)
npm publish --access public
```

### 4. Verify publication
```bash
# Check it's available
npm view mcp-fitbit

# Test installation
npm install -g mcp-fitbit
```

## Version Management

### Updating versions
```bash
# Patch version (bug fixes): 1.0.0 -> 1.0.1
npm version patch

# Minor version (new features): 1.0.0 -> 1.1.0
npm version minor

# Major version (breaking changes): 1.0.0 -> 2.0.0
npm version major
```

After updating version:
```bash
npm publish
git push --tags
```

## GitHub Releases (Optional but Recommended)

1. **Create a release on GitHub**:
   - Go to https://github.com/TheDigitalNinja/mcp-fitbit/releases
   - Click "Create a new release"
   - Tag version: `v1.0.0` (matches package.json)
   - Release title: `v1.0.0 - Initial Release`
   - Description: Brief changelog

2. **Automate with GitHub Actions** (future enhancement):
   - Could set up automatic npm publishing on GitHub releases
   - Would require npm token as GitHub secret

## Package Status Verification

After publishing, verify these work:

```bash
# Installation
npm install -g mcp-fitbit

# Direct execution
npx mcp-fitbit

# Package info
npm info mcp-fitbit
```

## Badges & Links

The README.md already includes:
- ✅ npm version badge: `https://badge.fury.io/js/mcp-fitbit.svg`
- ✅ npm downloads badge: `https://img.shields.io/npm/dm/mcp-fitbit.svg`
- ✅ npm package link: `https://www.npmjs.com/package/mcp-fitbit`

These will work automatically once published.

## Troubleshooting

**Package name taken?**
```bash
npm search mcp-fitbit
# If taken, consider: @yourusername/mcp-fitbit
```

**Permission issues?**
```bash
npm whoami  # Verify logged in
npm access ls-packages  # Check access
```

**Publishing fails?**
- Check npm status: https://status.npmjs.org/
- Verify package.json fields are valid
- Ensure version hasn't been published before

## Current Package Status

✅ **Ready to publish!**

- Package name: `mcp-fitbit` (available)
- Version: `1.0.0`
- Size: ~13.2 kB packed, ~54.3 kB unpacked
- Files: 17 (build/, README.md, LICENSE, package.json)
- Tests: 114 passing with 78% coverage
- Linting: Clean
- Dependencies: All production-ready

Just run `npm publish` when ready!
