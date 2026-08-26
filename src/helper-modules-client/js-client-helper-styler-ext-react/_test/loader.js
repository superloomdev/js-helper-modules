// loader.js - Dependency injection for js-client-helper-styler-ext-react tests
// Uses npm aliases: helper-styler, helper-utils, helper-debug, helper-styler-ext

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import stylerLoader from 'helper-styler';
import stylerExtLoader from 'helper-styler-ext';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

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
const Styler = stylerLoader({ Utils, Debug });

// Extension under test
const Extension = stylerExtLoader({
  React,
  Styler,
  Utils,
  Debug
});

// Export everything tests need
export {
  React,
  ReactTestRenderer,
  Styler,
  Extension,
  Utils,
  Debug
};
