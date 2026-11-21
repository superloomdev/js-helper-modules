// Info: Carbon Design System v11 reference template profile.
//
// Default export is a frozen profile with four schemes (white, g10, g90, g100)
// generated from pinned @carbon packages, with Carbon's own glyphs from
// @carbon/icons as icon literals. Each scheme is a complete Themer template
// with every contract key.
// `adaptive` declares the classes the Themer accepts for this profile (v9);
// `brands` ships the sample brand layers.
import white from './data/white.js';
import g10 from './data/g10.js';
import g90 from './data/g90.js';
import g100 from './data/g100.js';
import brands from './brands.js';

export default Object.freeze({
  id: 'carbon-v11',
  contract_version: 10,
  reference: {
    themes: '@carbon/themes@11.85.0',
    type: '@carbon/type@11.71.0',
    motion: '@carbon/motion@11.56.0',
    layout: '@carbon/layout@11.63.0',
    via: '@carbon/react@1.120.0',
    commit: 'd9c9a18b8ffcc3c03881c88999a3675e4e1b6b1a',
    icons: '@carbon/icons@11.92.0'
  },
  adaptive: {
    options: ['auto', 'fixed', 'platform.ios', 'platform.android', 'form.compact', 'form.medium']
  },
  schemes: {
    white: white,
    g10: g10,
    g90: g90,
    g100: g100
  },
  brands: brands
});
