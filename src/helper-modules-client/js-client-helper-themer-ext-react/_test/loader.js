'use strict';

const React = require('react');
const ReactTestRenderer = require('react-test-renderer');

// Peer dependencies
const Utils = require('helper-utils')();
const Debug = require('helper-debug')({ Utils: Utils });
const Themer = require('helper-themer')({ Utils: Utils, Debug: Debug }, {});

// Module under test - React and Themer injected via shared_libs
const Extension = require('helper-themer-ext-react')({
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
      background: { group: 'colour' },
      textPrimary: { group: 'colour' },
      spacing03: { group: 'dimension' },
      spacing05: { group: 'dimension' }
    },
    contrast_rules: []
  };

}

// Export everything tests need
module.exports = {
  React: React,
  ReactTestRenderer: ReactTestRenderer,
  Extension: Extension,
  Themer: Themer,
  Utils: Utils,
  Debug: Debug,
  buildTemplate: buildTemplate
};
