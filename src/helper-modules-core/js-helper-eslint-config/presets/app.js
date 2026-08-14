// Info: Placeholder preset for application repos (codebase-demo-client-rnw and
// future product repos). Currently re-exports the browser preset as-is.
//
// Phase F of the ESLint config rollout plan replaces this with a real ESM +
// JSX preset once the client repo's actual lint needs are measured. The
// final preset will add:
//   - sourceType: 'module' (ESM import/export syntax)
//   - JSX parsing support (eslint-plugin-react or equivalent)
//   - React-specific globals and JSX-related rules
//   - varsIgnorePattern: '^React$' (React is imported for JSX transform, not
//     directly referenced in code)
//
// Until Phase F lands, application repos that adopt the config early will
// use the browser preset's globals and CommonJS rules. This is acceptable
// because the client repo's source files are CommonJS today.
'use strict';


// Re-export browser as the interim app preset. Phase F will replace this
// with a dedicated ESM + JSX config array.
module.exports = require('./browser');
