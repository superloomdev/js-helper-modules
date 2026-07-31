'use strict';

const createWebStorageStub = require('./web-storage-stub');

// Peer dependencies
const Utils = require('helper-utils')();
const Debug = require('helper-debug')({ Utils: Utils });

// Shared storage engine for namespaced tests (two instances share one engine)
const sharedEngine = createWebStorageStub();

// Module under test - Web Storage stub injected via shared_libs
const Store = require('helper-kv-localstorage')({
  Utils: Utils,
  Debug: Debug,
  WebStorage: sharedEngine
}, {
  NAMESPACE: 'testapp',
  STORE: 'local'
});

// Second instance with a different namespace sharing the same engine
const StoreOther = require('helper-kv-localstorage')({
  Utils: Utils,
  Debug: Debug,
  WebStorage: sharedEngine
}, {
  NAMESPACE: 'otherapp',
  STORE: 'local'
});

// Instance with empty namespace
const StoreGlobal = require('helper-kv-localstorage')({
  Utils: Utils,
  Debug: Debug,
  WebStorage: createWebStorageStub()
}, {
  NAMESPACE: '',
  STORE: 'local'
});

// Instance with no engine (for STORAGE_UNAVAILABLE tests)
const StoreNoEngine = require('helper-kv-localstorage')({
  Utils: Utils,
  Debug: Debug
}, {
  NAMESPACE: 'noengine',
  STORE: 'local'
});

// Fresh engine for isolated tests
function createFreshStore (namespace) {
  const engine = createWebStorageStub();
  return {
    store: require('helper-kv-localstorage')({
      Utils: Utils,
      Debug: Debug,
      WebStorage: engine
    }, {
      NAMESPACE: namespace || 'fresh',
      STORE: 'local'
    }),
    engine: engine
  };
}

module.exports = {
  Store: Store,
  StoreOther: StoreOther,
  StoreGlobal: StoreGlobal,
  StoreNoEngine: StoreNoEngine,
  sharedEngine: sharedEngine,
  createFreshStore: createFreshStore,
  createWebStorageStub: createWebStorageStub,
  Utils: Utils,
  Debug: Debug
};
