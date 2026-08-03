'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  Device,
  DeviceMinimal,
  DeviceDebounced,
  dimensionsStub,
  dimensionsDebounceStub,
  appStateStub,
  Utils,
  createPlatformStub,
  createDimensionsStub
} = require('./loader');


// ~~~~~~~~~~~~~~~~~~~~ getPlatform ~~~~~~~~~~~~~~~~~~~~

test('getPlatform returns the injected platform OS', function () {

  const result = Device.getPlatform();

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.platform, 'web');
  assert.strictEqual(result.error, null);

});

test('getPlatform returns ios for ios platform stub', function () {

  const result = DeviceMinimal.getPlatform();

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.platform, 'ios');
  assert.strictEqual(result.error, null);

});


// ~~~~~~~~~~~~~~~~~~~~ getViewport ~~~~~~~~~~~~~~~~~~~~

test('getViewport returns the injected window dimensions', function () {

  const result = Device.getViewport();

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.width, 375);
  assert.strictEqual(result.height, 812);
  assert.strictEqual(result.error, null);

});

test('getViewport returns dimensions for minimal device', function () {

  const result = DeviceMinimal.getViewport();

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.width, 393);
  assert.strictEqual(result.height, 852);
  assert.strictEqual(result.error, null);

});


// ~~~~~~~~~~~~~~~~~~~~ onViewportChange ~~~~~~~~~~~~~~~~~~~~

test('onViewportChange subscribes and receives dimension events', function () {

  let received = null;

  const { success, unsubscribe, error } = Device.onViewportChange(function (dims) {

    received = dims;

  });

  assert.strictEqual(success, true);
  assert.strictEqual(error, null);
  assert.strictEqual(typeof unsubscribe, 'function');

  // Simulate a dimension change
  dimensionsStub._emitChange({ window: { width: 414, height: 896 } });

  assert.deepStrictEqual(received, { width: 414, height: 896 });

  // Unsubscribe and verify no further callbacks
  unsubscribe();

  dimensionsStub._emitChange({ window: { width: 320, height: 568 } });

  assert.deepStrictEqual(received, { width: 414, height: 896 });

});

test('onViewportChange rejects non-function callback', function () {

  const result = Device.onViewportChange('not a function');

  assert.strictEqual(result.success, false);
  assert.strictEqual(result.unsubscribe, null);
  assert.strictEqual(result.error.type, 'helper-device/invalid-callback');

});

test('onViewportChange supports multiple subscribers', function () {

  let received1 = null;
  let received2 = null;

  const sub1 = Device.onViewportChange(function (dims) { received1 = dims; });
  const sub2 = Device.onViewportChange(function (dims) { received2 = dims; });

  dimensionsStub._emitChange({ window: { width: 768, height: 1024 } });

  assert.deepStrictEqual(received1, { width: 768, height: 1024 });
  assert.deepStrictEqual(received2, { width: 768, height: 1024 });

  sub1.unsubscribe();

  dimensionsStub._emitChange({ window: { width: 375, height: 812 } });

  assert.deepStrictEqual(received1, { width: 768, height: 1024 });
  assert.deepStrictEqual(received2, { width: 375, height: 812 });

  sub2.unsubscribe();

});


// ~~~~~~~~~~~~~~~~~~~~ getNetworkState ~~~~~~~~~~~~~~~~~~~~

test('getNetworkState returns the injected network state', async function () {

  const result = await Device.getNetworkState();

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.isConnected, true);
  assert.strictEqual(result.type, 'wifi');
  assert.strictEqual(result.error, null);

});

test('getNetworkState returns error when NetInfo not injected', async function () {

  const result = await DeviceMinimal.getNetworkState();

  assert.strictEqual(result.success, false);
  assert.strictEqual(result.isConnected, null);
  assert.strictEqual(result.type, null);
  assert.strictEqual(result.error.type, 'helper-device/netinfo-unavailable');

});


// ~~~~~~~~~~~~~~~~~~~~ onAppStateChange ~~~~~~~~~~~~~~~~~~~~

test('onAppStateChange subscribes and receives state events', function () {

  let received = null;

  const { success, unsubscribe, error } = Device.onAppStateChange(function (state) {

    received = state;

  });

  assert.strictEqual(success, true);
  assert.strictEqual(error, null);
  assert.strictEqual(typeof unsubscribe, 'function');

  // Simulate an app state change
  appStateStub._emitChange('background');

  assert.strictEqual(received, 'background');

  // Unsubscribe and verify no further callbacks
  unsubscribe();

  appStateStub._emitChange('active');

  assert.strictEqual(received, 'background');

});

test('onAppStateChange returns error when AppState not injected', function () {

  const result = DeviceMinimal.onAppStateChange(function () {});

  assert.strictEqual(result.success, false);
  assert.strictEqual(result.unsubscribe, null);
  assert.strictEqual(result.error.type, 'helper-device/appstate-unavailable');

});

test('onAppStateChange rejects non-function callback', function () {

  const result = Device.onAppStateChange(42);

  assert.strictEqual(result.success, false);
  assert.strictEqual(result.error.type, 'helper-device/invalid-callback');

});


// ~~~~~~~~~~~~~~~~~~~~ getSafeAreaInsets ~~~~~~~~~~~~~~~~~~~~

test('getSafeAreaInsets returns the injected insets', function () {

  const result = Device.getSafeAreaInsets();

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.top, 47);
  assert.strictEqual(result.bottom, 34);
  assert.strictEqual(result.left, 0);
  assert.strictEqual(result.right, 0);
  assert.strictEqual(result.error, null);

});

test('getSafeAreaInsets returns error when SafeArea not injected', function () {

  const result = DeviceMinimal.getSafeAreaInsets();

  assert.strictEqual(result.success, false);
  assert.strictEqual(result.top, null);
  assert.strictEqual(result.error.type, 'helper-device/safearea-unavailable');

});


// ~~~~~~~~~~~~~~~~~~~~ Debounce ~~~~~~~~~~~~~~~~~~~~

test('onViewportChange debounces when VIEWPORT_DEBOUNCE_MS > 0', function (t, done) {

  let callCount = 0;

  const { unsubscribe } = DeviceDebounced.onViewportChange(function () {

    callCount++;

  });

  // Emit two rapid changes; only one callback should fire after debounce
  dimensionsDebounceStub._emitChange({ window: { width: 400, height: 800 } });
  dimensionsDebounceStub._emitChange({ window: { width: 414, height: 896 } });

  assert.strictEqual(callCount, 0);

  setTimeout(function () {

    assert.strictEqual(callCount, 1);

    unsubscribe();

    done();

  }, 80);

});


// ~~~~~~~~~~~~~~~~~~~~ Constructor validation ~~~~~~~~~~~~~~~~~~~~

test('constructor throws when Platform is not injected', function () {

  assert.throws(function () {

    require('helper-device')({
      Utils: Utils,
      Dimensions: createDimensionsStub(375, 812)
    });

  }, /Platform is required/);

});

test('constructor throws when Dimensions is not injected', function () {

  assert.throws(function () {

    require('helper-device')({
      Utils: Utils,
      Platform: createPlatformStub('web')
    });

  }, /Dimensions is required/);

});

test('constructor throws on invalid VIEWPORT_DEBOUNCE_MS', function () {

  assert.throws(function () {

    require('helper-device')({
      Utils: Utils,
      Platform: createPlatformStub('web'),
      Dimensions: createDimensionsStub(375, 812)
    }, {
      VIEWPORT_DEBOUNCE_MS: -1
    });

  }, /VIEWPORT_DEBOUNCE_MS must be a non-negative number/);

});
