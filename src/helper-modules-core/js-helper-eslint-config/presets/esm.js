// Info: Compatibility alias for `base`. Retained because 70 modules import
// `{ esm }` from the config package. After the ESM conversion, `base` and
// `esm` are identical - both use `sourceType: 'module'`.
import base from './base.js';


/////////////////////////// Flat-Config Export START ///////////////////////////

// Re-export base as esm. No changes to rules, globals, or language options.
export default base;

//////////////////////////// Flat-Config Export END ////////////////////////////
