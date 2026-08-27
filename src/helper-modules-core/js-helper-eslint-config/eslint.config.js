// Info: Self-hosted ESLint config for the js-helper-eslint-config package itself.
// Uses a relative import (not the package name) so the package never depends
// on a published copy of itself. Consumers use the package name instead:
//   import { base } from '@superloomdev/js-helper-eslint-config';
import { base } from './eslint-config.js';

export default base;
