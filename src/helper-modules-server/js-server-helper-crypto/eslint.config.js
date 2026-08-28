// Info: ESLint flat config for js-server-helper-crypto. Delegates to the shared
// @superloomdev/js-helper-eslint-config package via the `esm` preset.
// No per-module rule overrides are permitted - if the module cannot pass
// the shared config, the finding goes to the retrospective, not to a local
// override.
import { esm } from '@superloomdev/js-helper-eslint-config';

export default esm;
