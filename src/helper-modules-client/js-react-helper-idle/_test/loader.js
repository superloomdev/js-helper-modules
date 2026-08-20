'use strict';

const React = require('react');
const ReactTestRenderer = require('react-test-renderer');

// Peer dependencies
const Utils = require('helper-utils')();
const Debug = require('helper-debug')({ Utils: Utils });

// Module under test - React injected via shared_libs, short idle_ms for tests
const Idle = require('helper-idle')({
  React: React,
  Utils: Utils,
  Debug: Debug
}, {
  IDLE_MS: 1000
});

// Export everything tests need
module.exports = {
  React: React,
  ReactTestRenderer: ReactTestRenderer,
  Idle: Idle,
  Utils: Utils,
  Debug: Debug
};
