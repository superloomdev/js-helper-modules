// Info: Event-driven lifecycle tests for js-rnw-helper-device
// Covers subscription lifecycles, event propagation, stub state updates,
// factory independence, and error isolation across subscribers.
// Tests use ONLY public API exports (no direct private function access).
import { test } from 'node:test';
import assert from 'node:assert/strict';

import deviceLoader from 'helper-device';

import loader from './loader.js';
const {
  DeviceDebounced,
  dimensionsDebounceStub,
  Utils,
  createPlatformStub,
  createDimensionsStub,
  createAppStateStub,
  createNetInfoStub
} = loader;

const DeviceModule = deviceLoader;


// ~~~~~~~~~~~~~~~~~~~~ Viewport state propagation ~~~~~~~~~~~~~~~~~~~~

test('getViewport returns updated dimensions after a dimension change event', function () {

  const dimStub = createDimensionsStub(375, 812);

  const device = DeviceModule({
    Utils: Utils,
    Platform: createPlatformStub('web'),
    Dimensions: dimStub
  });

  dimStub._emitChange({ window: { width: 414, height: 896 } });

  const result = device.getViewport();

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.width, 414);
  assert.strictEqual(result.height, 896);
  assert.strictEqual(result.error, null);

});

test('getViewport reflects the latest emit when multiple changes fire in sequence', function () {

  const dimStub = createDimensionsStub(320, 568);

  const device = DeviceModule({
    Utils: Utils,
    Platform: createPlatformStub('ios'),
    Dimensions: dimStub
  });

  dimStub._emitChange({ window: { width: 375, height: 812 } });
  dimStub._emitChange({ window: { width: 414, height: 896 } });
  dimStub._emitChange({ window: { width: 768, height: 1024 } });

  const result = device.getViewport();

  assert.strictEqual(result.width, 768);
  assert.strictEqual(result.height, 1024);

});


// ~~~~~~~~~~~~~~~~~~~~ AppState transition sequence ~~~~~~~~~~~~~~~~~~~~

test('onAppStateChange callback fires exactly twice for a two-transition sequence', function () {

  const appStub = createAppStateStub();

  const device = DeviceModule({
    Utils: Utils,
    Platform: createPlatformStub('web'),
    Dimensions: createDimensionsStub(375, 812),
    AppState: appStub
  });

  let callCount = 0;
  const receivedStates = [];

  device.onAppStateChange(function (nextState) {

    callCount += 1;
    receivedStates.push(nextState);

  });

  appStub._emitChange('background');
  appStub._emitChange('active');

  assert.strictEqual(callCount, 2);
  assert.deepStrictEqual(receivedStates, ['background', 'active']);

});

test('onAppStateChange callback fires exactly three times for active to background to inactive to active', function () {

  const appStub = createAppStateStub();

  const device = DeviceModule({
    Utils: Utils,
    Platform: createPlatformStub('ios'),
    Dimensions: createDimensionsStub(375, 812),
    AppState: appStub
  });

  let callCount = 0;

  device.onAppStateChange(function () {

    callCount += 1;

  });

  appStub._emitChange('background');
  appStub._emitChange('inactive');
  appStub._emitChange('active');

  assert.strictEqual(callCount, 3);

});


// ~~~~~~~~~~~~~~~~~~~~ NetInfo state change ~~~~~~~~~~~~~~~~~~~~

test('getNetworkState returns updated connectivity after stub state changes', async function () {

  const netStub = createNetInfoStub(true, 'wifi');

  const device = DeviceModule({
    Utils: Utils,
    Platform: createPlatformStub('web'),
    Dimensions: createDimensionsStub(375, 812),
    NetInfo: netStub
  });

  const result1 = await device.getNetworkState();

  assert.strictEqual(result1.success, true);
  assert.strictEqual(result1.isConnected, true);
  assert.strictEqual(result1.type, 'wifi');

  netStub._setState({ isConnected: false, type: 'none' });

  const result2 = await device.getNetworkState();

  assert.strictEqual(result2.success, true);
  assert.strictEqual(result2.isConnected, false);
  assert.strictEqual(result2.type, 'none');

});


// ~~~~~~~~~~~~~~~~~~~~ Unsubscribe safety ~~~~~~~~~~~~~~~~~~~~

test('double unsubscribe does not throw', function () {

  const dimStub = createDimensionsStub(375, 812);

  const device = DeviceModule({
    Utils: Utils,
    Platform: createPlatformStub('web'),
    Dimensions: dimStub
  });

  const { unsubscribe } = device.onViewportChange(function () {});

  unsubscribe();

  assert.doesNotThrow(function () {

    unsubscribe();

  });

});

test('unsubscribing the middle of three subscribers leaves the other two intact', function () {

  const dimStub = createDimensionsStub(375, 812);

  const device = DeviceModule({
    Utils: Utils,
    Platform: createPlatformStub('web'),
    Dimensions: dimStub
  });

  let calls1 = 0;
  let calls2 = 0;
  let calls3 = 0;

  const sub1 = device.onViewportChange(function () { calls1 += 1; });
  const sub2 = device.onViewportChange(function () { calls2 += 1; });
  const sub3 = device.onViewportChange(function () { calls3 += 1; });

  sub2.unsubscribe();

  dimStub._emitChange({ window: { width: 414, height: 896 } });

  assert.strictEqual(calls1, 1);
  assert.strictEqual(calls2, 0);
  assert.strictEqual(calls3, 1);

  sub1.unsubscribe();
  sub3.unsubscribe();

});


// ~~~~~~~~~~~~~~~~~~~~ Late subscriber ~~~~~~~~~~~~~~~~~~~~

test('subscriber registered after an emit receives the next emit only', function () {

  const dimStub = createDimensionsStub(375, 812);

  const device = DeviceModule({
    Utils: Utils,
    Platform: createPlatformStub('web'),
    Dimensions: dimStub
  });

  let received = null;

  dimStub._emitChange({ window: { width: 414, height: 896 } });

  device.onViewportChange(function (dims) {

    received = dims;

  });

  dimStub._emitChange({ window: { width: 320, height: 568 } });

  assert.deepStrictEqual(received, { width: 320, height: 568 });

});


// ~~~~~~~~~~~~~~~~~~~~ Flat dims (no window key) ~~~~~~~~~~~~~~~~~~~~

test('onViewportChange receives flat dims without a window key', function () {

  const dimStub = createDimensionsStub(375, 812);

  const device = DeviceModule({
    Utils: Utils,
    Platform: createPlatformStub('web'),
    Dimensions: dimStub
  });

  let received = null;

  device.onViewportChange(function (dims) {

    received = dims;

  });

  dimStub._emitChange({ width: 1024, height: 768 });

  assert.deepStrictEqual(received, { width: 1024, height: 768 });

});


// ~~~~~~~~~~~~~~~~~~~~ Error isolation across subscribers ~~~~~~~~~~~~~~~~~~~~

test('callback that throws does not prevent other subscribers from receiving the event', function () {

  const dimStub = createDimensionsStub(375, 812);

  const device = DeviceModule({
    Utils: Utils,
    Platform: createPlatformStub('web'),
    Dimensions: dimStub
  });

  let received = null;

  device.onViewportChange(function () {

    throw new Error('intentional test error');

  });

  device.onViewportChange(function (dims) {

    received = dims;

  });

  dimStub._emitChange({ window: { width: 414, height: 896 } });

  assert.deepStrictEqual(received, { width: 414, height: 896 });

});


// ~~~~~~~~~~~~~~~~~~~~ Factory independence ~~~~~~~~~~~~~~~~~~~~

test('two device instances with separate stubs do not cross-notify', function () {

  const dimStubA = createDimensionsStub(375, 812);
  const dimStubB = createDimensionsStub(393, 852);

  const deviceA = DeviceModule({
    Utils: Utils,
    Platform: createPlatformStub('ios'),
    Dimensions: dimStubA
  });

  const deviceB = DeviceModule({
    Utils: Utils,
    Platform: createPlatformStub('android'),
    Dimensions: dimStubB
  });

  let receivedA = null;
  let receivedB = null;

  deviceA.onViewportChange(function (dims) { receivedA = dims; });
  deviceB.onViewportChange(function (dims) { receivedB = dims; });

  dimStubA._emitChange({ window: { width: 414, height: 896 } });

  assert.deepStrictEqual(receivedA, { width: 414, height: 896 });
  assert.strictEqual(receivedB, null);

  dimStubB._emitChange({ window: { width: 768, height: 1024 } });

  assert.deepStrictEqual(receivedB, { width: 768, height: 1024 });

});


// ~~~~~~~~~~~~~~~~~~~~ Debounce: separate changes after window ~~~~~~~~~~~~~~~~~~~~

test('debounced viewport fires once per debounce window and again for a later change', function (t, done) {

  let callCount = 0;

  const { unsubscribe } = DeviceDebounced.onViewportChange(function () {

    callCount += 1;

  });

  dimensionsDebounceStub._emitChange({ window: { width: 400, height: 800 } });

  setTimeout(function () {

    assert.strictEqual(callCount, 1);

    dimensionsDebounceStub._emitChange({ window: { width: 500, height: 900 } });

    setTimeout(function () {

      assert.strictEqual(callCount, 2);

      unsubscribe();

      done();

    }, 80);

  }, 80);

});
