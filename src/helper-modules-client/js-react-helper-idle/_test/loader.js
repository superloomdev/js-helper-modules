import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import utilsLoader from 'helper-utils';
import debugLoader from 'helper-debug';
import idleLoader from 'helper-idle';

// Peer dependencies
const Utils = utilsLoader();
const Debug = debugLoader({ Utils: Utils });

// Module under test - React injected via shared_libs, short idle_ms for tests
const Idle = idleLoader({
  React: React,
  Utils: Utils,
  Debug: Debug
}, {
  IDLE_MS: 1000
});

// Export everything tests need
export default {
  React: React,
  ReactTestRenderer: ReactTestRenderer,
  Idle: Idle,
  Utils: Utils,
  Debug: Debug
};
