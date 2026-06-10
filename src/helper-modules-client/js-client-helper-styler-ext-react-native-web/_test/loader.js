// loader.js — Dependency injection for js-client-helper-styler-ext-react-native-web tests
// Uses npm aliases: helper-styler, helper-utils, helper-debug, helper-styler-ext

'use strict';

const React = require('react');
const ReactTestRenderer = require('react-test-renderer');

// Peer dependencies (optional but recommended)
let Utils;
let Debug;
try {
  Utils = require('helper-utils')();
} catch (e) {
  Utils = null;
}

try {
  Debug = require('helper-debug')();
} catch (e) {
  Debug = null;
}

// Core styler engine (published version)
const Styler = require('helper-styler')({ Utils, Debug });

// Extension under test
const Extension = require('helper-styler-ext')({
  React,
  Styler,
  Utils,
  Debug
});

// Export everything tests need
module.exports = {
  React,
  ReactTestRenderer,
  Styler,
  Extension,
  Utils,
  Debug
};
