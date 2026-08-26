import createWebStorageStub from './web-storage-stub.js';
import utilsLoader from 'helper-utils';
import debugLoader from 'helper-debug';
import kvLocalstorageLoader from 'helper-kv-localstorage';

// Peer dependencies
const Utils = utilsLoader();
const Debug = debugLoader({ Utils: Utils });

// Shared storage engine for namespaced tests (two instances share one engine)
const sharedEngine = createWebStorageStub();

// Module under test - Web Storage stub injected via shared_libs
const Store = kvLocalstorageLoader({
  Utils: Utils,
  Debug: Debug,
  WebStorage: sharedEngine
}, {
  NAMESPACE: 'testapp',
  STORE: 'local'
});

// Second instance with a different namespace sharing the same engine
const StoreOther = kvLocalstorageLoader({
  Utils: Utils,
  Debug: Debug,
  WebStorage: sharedEngine
}, {
  NAMESPACE: 'otherapp',
  STORE: 'local'
});

// Instance with empty namespace
const StoreGlobal = kvLocalstorageLoader({
  Utils: Utils,
  Debug: Debug,
  WebStorage: createWebStorageStub()
}, {
  NAMESPACE: '',
  STORE: 'local'
});

// Instance with no engine (for STORAGE_UNAVAILABLE tests)
const StoreNoEngine = kvLocalstorageLoader({
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
    store: kvLocalstorageLoader({
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

export default {
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
