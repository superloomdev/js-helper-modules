import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import utilsLoader from 'helper-utils';
import debugLoader from 'helper-debug';
import themerLoader from 'helper-themer';
import themerExtReactLoader from 'helper-themer-ext-react';

// Peer dependencies
const Utils = utilsLoader();
const Debug = debugLoader({ Utils: Utils });
const Themer = themerLoader({ Utils: Utils, Debug: Debug }, {});

// Module under test - React and Themer injected via shared_libs
const Extension = themerExtReactLoader({
  React: React,
  Themer: Themer,
  Utils: Utils,
  Debug: Debug
});

// A minimal template that exercises literal, rule, and generator routes
function buildTemplate () {

  return {
    polarity: 'light',
    ramp: ['#ffffff', '#f4f4f4', '#e0e0e0', '#8d8d8d', '#393939', '#161616'],
    palette: {},
    scales: {
      base_font_size: 16,
      miniUnit: { base: 8 },
      carbonType: { base: 12 },
      geometric: { base: 10, ratio: 2 }
    },
    tokens: {
      background: '#ffffff',
      textPrimary: { op: 'rampStep', args: [5] },
      spacing03: { scale: 'miniUnit', multiplier: 2 },
      spacing05: { scale: 'miniUnit', multiplier: 4 }
    },
    meta: {
      background: { group: 'color' },
      textPrimary: { group: 'color' },
      spacing03: { group: 'dimension' },
      spacing05: { group: 'dimension' }
    },
    contrast_rules: []
  };

}

// Export everything tests need
export {
  React,
  ReactTestRenderer,
  Extension,
  Themer,
  Utils,
  Debug,
  buildTemplate
};
