import createMmkvStub from './mmkv-stub.js';
import utilsLoader from 'helper-utils';
import debugLoader from 'helper-debug';
import kvMmkvLoader from 'helper-kv-mmkv';

// Peer dependencies
const Utils = utilsLoader();
const Debug = debugLoader({ Utils: Utils });

// Shared MMKV class for namespaced tests (two instances share one data store)
const SharedMmkv = createMmkvStub();

// Module under test - MMKV stub injected via shared_libs
const Store = kvMmkvLoader({
  Utils: Utils,
  Debug: Debug,
  MMKV: SharedMmkv
}, {
  NAMESPACE: 'testapp',
  INSTANCE_ID: 'test-instance'
});

// Second instance with a different namespace sharing the same MMKV class
const StoreOther = kvMmkvLoader({
  Utils: Utils,
  Debug: Debug,
  MMKV: SharedMmkv
}, {
  NAMESPACE: 'otherapp',
  INSTANCE_ID: 'test-instance'
});

// Instance with empty namespace
const StoreGlobal = kvMmkvLoader({
  Utils: Utils,
  Debug: Debug,
  MMKV: createMmkvStub()
}, {
  NAMESPACE: '',
  INSTANCE_ID: 'global-instance'
});

// Fresh stub for isolated tests
function createFreshStore (namespace) {
  const MmkvStub = createMmkvStub();
  return {
    store: kvMmkvLoader({
      Utils: Utils,
      Debug: Debug,
      MMKV: MmkvStub
    }, {
      NAMESPACE: namespace || 'fresh',
      INSTANCE_ID: 'fresh-instance'
    }),
    MmkvStub: MmkvStub
  };
}

// Reset shared data before each test
function resetSharedData () {
  SharedMmkv._reset();
}

export default {
  Store: Store,
  StoreOther: StoreOther,
  StoreGlobal: StoreGlobal,
  SharedMmkv: SharedMmkv,
  createFreshStore: createFreshStore,
  createMmkvStub: createMmkvStub,
  resetSharedData: resetSharedData,
  Utils: Utils,
  Debug: Debug
};
