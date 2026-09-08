// Info: Material Design 3 reference profile for the Superloom token contract.
//
// Data only: no loader, no React, no side effects. Six schemes generated from
// @material/web@2.5.0 and @material/material-color-utilities@0.4.0, mapped
// onto Superloom keys through data/mapping.js. Keys Material has no concept
// for are completed from the Superloom base template and listed in from_base.
import light from './data/light.js';
import dark from './data/dark.js';
import lightMediumContrast from './data/light_medium_contrast.js';
import lightHighContrast from './data/light_high_contrast.js';
import darkMediumContrast from './data/dark_medium_contrast.js';
import darkHighContrast from './data/dark_high_contrast.js';

export default Object.freeze({

  id: 'material-v0_192',
  contract_version: 2,

  reference: {
    material_web: '@material/web@2.5.0',
    material_color_utilities: '@material/material-color-utilities@0.4.0',
    token_set_version: 'v0_192',
    compose_material3_motion_tokens: 'ExpressiveMotionTokens.kt, androidx-main, read 2026-09-08'
  },

  schemes: {
    light: light,
    dark: dark,
    light_medium_contrast: lightMediumContrast,
    light_high_contrast: lightHighContrast,
    dark_medium_contrast: darkMediumContrast,
    dark_high_contrast: darkHighContrast
  }

});
