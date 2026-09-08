// Info: Superloom base template profile.
//
// Default export is a frozen profile with light and dark schemes.
// Each scheme is a complete Themer template with every contract key.
import light from './data/light.js';
import dark from './data/dark.js';

export default Object.freeze({
  id: 'superloom-base',
  contract_version: 2,
  schemes: {
    light: light,
    dark: dark
  }
});
