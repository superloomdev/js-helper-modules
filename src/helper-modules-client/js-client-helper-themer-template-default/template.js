// Info: Superloom default template profile.
//
// Default export is a frozen profile with light and dark schemes.
// Each scheme is a complete Themer template with every contract key.
// `brands` ships the sample brand layers (v9 D29/D30); a host applies the
// one matching its scheme's polarity.
import light from './data/light.js';
import dark from './data/dark.js';
import brands from './brands.js';

export default Object.freeze({
  id: 'superloom-default',
  contract_version: 9,
  adaptive: {
    options: ['auto', 'fixed', 'form.compact', 'form.medium']
  },
  schemes: {
    light: light,
    dark: dark
  },
  brands: brands
});
