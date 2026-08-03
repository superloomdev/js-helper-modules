# @superloomdev/js-client-helper-font

![MIT License](https://img.shields.io/badge/license-MIT-blue)
![Node 24+](https://img.shields.io/badge/node-%3E%3D24-green)

A pure font family registry and `@font-face` CSS string constructor with zero platform dependencies. Part of [Superloom](https://superloom.dev).

## What This Is

The pure core of the font system. It owns the family registry, family-name resolution, and `@font-face` CSS string construction. Extensions (`-ext-web`, `-ext-rn`, `-ext-expo`) implement the adapter contract to load fonts on each platform.

The core is testable in pure Node with zero stubs. No DOM, no React, no react-native, no Expo.

```text
// Core: register families and resolve tokens
const Font = require('@superloomdev/js-client-helper-font')(Lib);
Font.registerFamilies(manifest);
const { family } = Font.resolveFamily('primaryFamily');

// Web extension: inject @font-face into the DOM
const WebFontAdapter = require('@superloomdev/js-client-helper-font-ext-web')(Lib);
await WebFontAdapter.loadManifest(Font.getManifest().manifest);
```

## Why Use This Module

1. **Pure computation.** No platform dependencies. The core builds strings; extensions inject them.

2. **Adapter contract.** Extensions implement a documented function set. Swap adapters at the loader level without touching app code.

3. **Pre-tested at every release.** A full test suite runs in CI on every push in pure Node. No device or emulator required.

4. **Designed for human review.** The code is laid out as clearly-marked visual sections so a reviewer can read it top to bottom in order.

## Aligned with Superloom Philosophy

If your project is built on Superloom conventions, this module slots in without you needing to learn anything new. It follows the standard loader pattern, companion file structure, and documentation footprint.

## Extended Documentation

- [API Reference](https://github.com/superloomdev/js-helper-modules/blob/main/src/helper-modules-client/js-client-helper-font/docs/api.md) - full API, envelope shapes, adapter contract
- [Configuration](https://github.com/superloomdev/js-helper-modules/blob/main/src/helper-modules-client/js-client-helper-font/docs/configuration.md) - config keys, peer dependencies, testing tiers
- [Superloom](https://superloom.dev) - the framework

## Adding to Your Project

This module is a peer dependency. Add it to your project's `package.json` and load it through the [loader pattern](https://github.com/superloomdev/superloom/blob/main/docs/server/server-loader.md).

See [npmrc setup](https://github.com/superloomdev/superloom/blob/main/docs/dev/npmrc-setup.md) for one-time GitHub Packages registry configuration.

## Dependencies

No bundled npm packages. All dependencies are peer dependencies:

- `@superloomdev/js-helper-utils` - type checks
- `@superloomdev/js-helper-debug` - logging (optional)

## Testing Status

| Tier | Runtime | Status |
|---|---|---|
| Unit | Node.js (no stubs) | Pass |
| Integration | Platform (via extensions) | N/A (extension responsibility) |

## License

MIT
