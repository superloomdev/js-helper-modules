// Info: Entry point for the shared ESLint configuration. Exports four named
// presets: `base` (Node 24 ESM), `esm` (alias of base, retained for
// compatibility), `browser` (base plus DOM globals), and `app` (browser plus
// JSX plus browser globals). Consumers pick a preset by name and never
// assemble rules themselves.
//
// Compatibility: ESLint 9+ flat config format. Requires @eslint/js as a peer.


// Preset imports. Each preset is a flat-config array ready to be exported
// directly as a consumer's `export default`.
import base from './presets/base.js';
import esm from './presets/esm.js';
import browser from './presets/browser.js';
import app from './presets/app.js';


// Public surface. Consumers destructure a preset name:
//   import { base } from '@superloomdev/js-helper-eslint-config';
export {
  base,
  esm,
  browser,
  app
};
