// loader.js - Dependency injection for js-client-helper-styler-ext-react tests
// Uses npm aliases: helper-styler, helper-utils, helper-debug, helper-styler-ext

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import stylerLoader from 'helper-styler';
import stylerExtLoader from 'helper-styler-ext';
import utilsLoader from 'helper-utils';
import debugLoader from 'helper-debug';

// Peer dependencies (declared as peer deps; absence is a setup error
// that should fail loudly, not be silently swallowed).
// Utils is the foundation lib; Debug depends on Utils via shared_libs.
const Utils = utilsLoader();
const Debug = debugLoader({ Utils });

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
