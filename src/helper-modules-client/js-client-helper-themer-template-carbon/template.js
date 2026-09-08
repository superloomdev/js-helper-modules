// Info: Carbon Design System v11 reference template profile.
//
// Default export is a frozen profile with four schemes (white, g10, g90, g100)
// generated from pinned @carbon packages. Each scheme is a complete Themer
// template with every contract key.
import white from './data/white.js';
import g10 from './data/g10.js';
import g90 from './data/g90.js';
import g100 from './data/g100.js';

export default Object.freeze({
  id: 'carbon-v11',
  contract_version: 2,
  reference: {
    themes: '@carbon/themes@11.80.0',
    type: '@carbon/type@11.66.0',
    motion: '@carbon/motion@11.51.0',
    layout: '@carbon/layout@11.58.0',
    via: '@carbon/react@1.115.0',
    commit: '7518c84ffd00f22434fe19d83119692c12fccb2f'
  },
  schemes: {
    white: white,
    g10: g10,
    g90: g90,
    g100: g100
  }
});
