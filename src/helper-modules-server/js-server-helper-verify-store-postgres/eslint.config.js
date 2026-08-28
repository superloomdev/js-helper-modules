// Info: ESLint flat config for js-server-helper-verify-store-postgres. Delegates to the shared
// @superloomdev/js-helper-eslint-config package via the `base` preset.
// No per-module rule overrides are permitted - if the module cannot pass
// the shared config, the finding goes to the retrospective, not to a local
// override.
import { esm } from '@superloomdev/js-helper-eslint-config';

export default esm;
