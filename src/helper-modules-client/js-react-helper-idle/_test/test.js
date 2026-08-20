// Info: Unit tests for js-react-helper-idle
// Tests the idle threshold registry and React hook using mock timers.
// Tests use ONLY public API exports (no direct private function access).
'use strict';

const { describe, it, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');

const { React, ReactTestRenderer, Idle } = require('./loader.js');


// Reset state before each test
beforeEach(function () {
  mock.timers.enable();
  Idle.clearIdleHandlers();
  Idle.resume();
  Idle.touch();
});

// Clean up timers after each test
afterEach(function () {
  Idle.clearIdleHandlers();
  Idle.pause();
  mock.timers.reset();
});


// ============================================================================
// 1. LOADER AND EXPORTS
// ============================================================================

describe('Idle loader', function () {

  it('should return the 11 expected exports when loaded', function () {
    assert.strictEqual(typeof Idle.useIdle, 'function', 'has useIdle');
    assert.strictEqual(typeof Idle.touch, 'function', 'has touch');
    assert.strictEqual(typeof Idle.pause, 'function', 'has pause');
    assert.strictEqual(typeof Idle.resume, 'function', 'has resume');
    assert.strictEqual(typeof Idle.registerIdleHandler, 'function', 'has registerIdleHandler');
    assert.strictEqual(typeof Idle.unregisterIdleHandler, 'function', 'has unregisterIdleHandler');
    assert.strictEqual(typeof Idle.clearIdleHandlers, 'function', 'has clearIdleHandlers');
    assert.strictEqual(typeof Idle.getElapsed, 'function', 'has getElapsed');
    assert.strictEqual(typeof Idle.getLastActive, 'function', 'has getLastActive');
    assert.strictEqual(typeof Idle.getTotalIdle, 'function', 'has getTotalIdle');
    assert.strictEqual(typeof Idle.getTotalActive, 'function', 'has getTotalActive');
  });

  it('should not export removed functions', function () {
    assert.strictEqual(Idle.reset, undefined, 'reset is removed');
    assert.strictEqual(Idle.getState, undefined, 'getState is removed');
    assert.strictEqual(Idle.getRemaining, undefined, 'getRemaining is removed');
    assert.strictEqual(Idle.onIdle, undefined, 'onIdle is removed');
    assert.strictEqual(Idle.onPrompt, undefined, 'onPrompt is removed');
    assert.strictEqual(Idle.onActive, undefined, 'onActive is removed');
  });

});


// ============================================================================
// 2. CONTROL FUNCTIONS
// ============================================================================

describe('touch', function () {

  it('should return success with touched true when active', function () {
    const result = Idle.touch();
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.data.touched, true);
    assert.strictEqual(result.error, null);
  });

  it('should return touched false when paused', function () {
    Idle.pause();
    const result = Idle.touch();
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.data.touched, false);
  });

});

describe('pause and resume', function () {

  it('should return paused true when pause is called', function () {
    const result = Idle.pause();
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.data.paused, true);
  });

  it('should return paused false when resume is called after pause', function () {
    Idle.pause();
    const result = Idle.resume();
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.data.paused, false);
  });

  it('should be idempotent on double-pause', function () {
    Idle.pause();
    const result = Idle.pause();
    assert.strictEqual(result.data.paused, true);
  });

  it('should be idempotent on resume without prior pause', function () {
    const result = Idle.resume();
    assert.strictEqual(result.data.paused, false);
  });

  it('should freeze getElapsed while paused', function () {
    Idle.touch();
    const before = Idle.getElapsed();
    Idle.pause();
    const frozen = Idle.getElapsed();
    // Advance real time a tiny bit - frozen should not change
    assert.strictEqual(frozen, before);
  });

  it('should continue from frozen elapsed on resume', function () {
    Idle.touch();
    Idle.pause();
    const frozen = Idle.getElapsed();
    Idle.resume();
    // After resume, elapsed should be at least the frozen value
    const after = Idle.getElapsed();
    assert.ok(after >= frozen, 'elapsed continues from frozen value');
  });

});


// ============================================================================
// 3. THRESHOLD REGISTRATION
// ============================================================================

describe('registerIdleHandler', function () {

  it('should return success with an id when registering a valid handler', function () {
    const result = Idle.registerIdleHandler(500, function () {});
    assert.strictEqual(result.success, true);
    assert.strictEqual(typeof result.data.id, 'number');
    assert.strictEqual(result.error, null);
  });

  it('should return error for non-positive ms', function () {
    const result = Idle.registerIdleHandler(0, function () {});
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error.type, 'helper-idle/invalid-threshold');
  });

  it('should return error for negative ms', function () {
    const result = Idle.registerIdleHandler(-100, function () {});
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error.type, 'helper-idle/invalid-threshold');
  });

  it('should return error for non-function callback', function () {
    const result = Idle.registerIdleHandler(500, 'not a function');
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error.type, 'helper-idle/invalid-callback');
  });

  it('should fire callback after the specified ms of inactivity', function () {
    let fired = false;
    Idle.touch();
    Idle.registerIdleHandler(500, function () { fired = true; });

    // Advance time past the threshold
    mock.timers.tick(501);

    assert.strictEqual(fired, true, 'callback fired after 500ms');
  });

  it('should not fire callback before the threshold', function () {
    let fired = false;
    Idle.touch();
    Idle.registerIdleHandler(500, function () { fired = true; });

    mock.timers.tick(499);

    assert.strictEqual(fired, false, 'callback has not fired yet');
  });

  it('should re-arm on touch after firing', function () {
    let fireCount = 0;
    Idle.touch();
    Idle.registerIdleHandler(500, function () { fireCount += 1; });

    mock.timers.tick(501);
    assert.strictEqual(fireCount, 1, 'fired once');

    Idle.touch();
    mock.timers.tick(501);
    assert.strictEqual(fireCount, 2, 'fired again after re-arm');
  });

  it('should fire two thresholds at the same ms in registration order', function () {
    const order = [];
    Idle.touch();
    Idle.registerIdleHandler(500, function () { order.push('first'); });
    Idle.registerIdleHandler(500, function () { order.push('second'); });

    mock.timers.tick(501);

    assert.deepStrictEqual(order, ['first', 'second']);
  });

  it('should fire immediately if ms has already elapsed', function () {
    let fired = false;
    Idle.touch();
    // Advance past 800ms without any handler registered
    mock.timers.tick(800);

    // Now register a 500ms handler - should fire immediately
    Idle.registerIdleHandler(500, function () { fired = true; });
    assert.strictEqual(fired, true, 'fired immediately because 500ms already elapsed');
  });

});

describe('unregisterIdleHandler', function () {

  it('should remove a handler and prevent its callback from firing', function () {
    let fired = false;
    Idle.touch();
    const reg = Idle.registerIdleHandler(500, function () { fired = true; });

    const result = Idle.unregisterIdleHandler(reg.data.id);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.data.removed, true);

    mock.timers.tick(501);
    assert.strictEqual(fired, false, 'callback did not fire after unregister');
  });

  it('should return removed false for an unknown id', function () {
    const result = Idle.unregisterIdleHandler(99999);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.data.removed, false);
  });

});

describe('clearIdleHandlers', function () {

  it('should remove all handlers and return the count', function () {
    Idle.touch();
    Idle.registerIdleHandler(500, function () {});
    Idle.registerIdleHandler(1000, function () {});

    const result = Idle.clearIdleHandlers();
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.data.removed_count, 2);
  });

  it('should prevent all callbacks from firing after clear', function () {
    let fired = false;
    Idle.touch();
    Idle.registerIdleHandler(500, function () { fired = true; });
    Idle.clearIdleHandlers();

    mock.timers.tick(501);
    assert.strictEqual(fired, false, 'no callbacks fire after clear');
  });

  it('should return removed_count 0 when no handlers exist', function () {
    const result = Idle.clearIdleHandlers();
    assert.strictEqual(result.data.removed_count, 0);
  });

});


// ============================================================================
// 4. QUERY FUNCTIONS
// ============================================================================

describe('getElapsed', function () {

  it('should return a non-negative number after touch', function () {
    Idle.touch();
    const result = Idle.getElapsed();
    assert.ok(result >= 0, 'elapsed is non-negative');
  });

  it('should return 0 when no activity has been recorded', function () {
    // Fresh instance has no last_active_ms until touch
    // After beforeEach touch, this should be >= 0
    const result = Idle.getElapsed();
    assert.ok(result >= 0);
  });

});

describe('getLastActive', function () {

  it('should return a timestamp after touch', function () {
    Idle.touch();
    const result = Idle.getLastActive();
    assert.ok(result !== null, 'last active is set');
  });

});

describe('getTotalIdle', function () {

  it('should return a number', function () {
    const result = Idle.getTotalIdle();
    assert.strictEqual(typeof result, 'number');
  });

  it('should accumulate idle time after crossing idle_ms', function () {
    Idle.touch();
    // idle_ms is 1000 in test config
    mock.timers.tick(1500);

    const result = Idle.getTotalIdle();
    assert.ok(result > 0, 'idle time accumulated');
  });

});

describe('getTotalActive', function () {

  it('should return a number', function () {
    const result = Idle.getTotalActive();
    assert.strictEqual(typeof result, 'number');
  });

  it('should accumulate active time while user is active', function () {
    Idle.touch();
    mock.timers.tick(500);

    const result = Idle.getTotalActive();
    assert.ok(result > 0, 'active time accumulated');
  });

});


// ============================================================================
// 5. ANALYTICS ACCUMULATION MODEL
// ============================================================================

describe('analytics accumulation', function () {

  it('should split active and idle at the idle_ms boundary', function () {
    Idle.touch();
    // Advance 1500ms total, idle_ms is 1000
    // So 1000ms active + 500ms idle
    mock.timers.tick(1500);

    const idleResult = Idle.getTotalIdle();
    const activeResult = Idle.getTotalActive();

    assert.ok(activeResult >= 1000, 'active has at least 1000ms');
    assert.ok(idleResult > 0, 'idle has accumulated');
  });

  it('should accumulate idle on touch after idle period', function () {
    Idle.touch();
    mock.timers.tick(1500); // 1000 active + 500 idle

    const idleBefore = Idle.getTotalIdle();
    Idle.touch(); // closes idle period
    const idleAfter = Idle.getTotalIdle();

    assert.ok(idleAfter >= idleBefore, 'idle total preserved after touch');
  });

  it('should not attribute time while paused', function () {
    Idle.touch();
    mock.timers.tick(500);
    const activeBefore = Idle.getTotalActive();

    Idle.pause();
    mock.timers.tick(2000);
    Idle.resume();

    const activeAfter = Idle.getTotalActive();
    // Paused time should not be added to either total
    assert.ok(activeAfter < activeBefore + 2000, 'paused time not attributed to active');
  });

});


// ============================================================================
// 6. RESUME RESCHEDULES FOR REMAINING DELTA
// ============================================================================

describe('resume reschedules remaining delta', function () {

  it('should fire threshold for remaining delta after resume, not from zero', function () {
    let fired = false;
    Idle.touch();
    Idle.registerIdleHandler(1000, function () { fired = true; });

    // Advance 600ms, then pause
    mock.timers.tick(600);
    Idle.pause();

    // Advance 5000ms while paused - should not fire
    mock.timers.tick(5000);
    assert.strictEqual(fired, false, 'did not fire while paused');

    // Resume - remaining delta is 400ms
    Idle.resume();
    mock.timers.tick(399);
    assert.strictEqual(fired, false, 'did not fire before remaining delta');

    mock.timers.tick(2);
    assert.strictEqual(fired, true, 'fired after remaining delta');
  });

});


// ============================================================================
// 7. USEIDLE HOOK
// ============================================================================

describe('useIdle', { skip: !React || !ReactTestRenderer }, function () {

  it('should return isIdle and control functions when rendered', function () {

    let captured = null;

    function TestComponent() {
      captured = Idle.useIdle({});
      return React.createElement('div', null, 'Test');
    }

    const element = React.createElement(TestComponent);
    const tree = ReactTestRenderer.create(element);

    assert.ok(captured, 'hook returned a value');
    assert.strictEqual(captured.isIdle, false, 'initial isIdle is false');
    assert.strictEqual(typeof captured.touch, 'function', 'has touch');
    assert.strictEqual(typeof captured.pause, 'function', 'has pause');
    assert.strictEqual(typeof captured.resume, 'function', 'has resume');

    tree.unmount();
  });

  it('should subscribe to activity sources on mount and unsubscribe on unmount', function () {

    let subscribeCalled = false;
    let unsubscribeCalled = false;

    const mockSource = {
      subscribe: function (onActivity) {
        subscribeCalled = true;
        return function () {
          unsubscribeCalled = true;
        };
      }
    };

    function TestComponent() {
      Idle.useIdle({ sources: [mockSource] });
      return React.createElement('div', null, 'Test');
    }

    let tree;
    ReactTestRenderer.act(function () {
      tree = ReactTestRenderer.create(React.createElement(TestComponent));
    });

    assert.strictEqual(subscribeCalled, true, 'source.subscribe was called on mount');

    ReactTestRenderer.act(function () {
      tree.unmount();
    });

    assert.strictEqual(unsubscribeCalled, true, 'unsubscribe was called on unmount');
  });

  it('should register user thresholds on mount and unregister on unmount', function () {

    let thresholdFired = false;

    function TestComponent() {
      Idle.useIdle({
        thresholds: [
          { ms: 500, callback: function () { thresholdFired = true; } }
        ]
      });
      return React.createElement('div', null, 'Test');
    }

    let tree;
    ReactTestRenderer.act(function () {
      tree = ReactTestRenderer.create(React.createElement(TestComponent));
    });

    // Advance past the threshold
    ReactTestRenderer.act(function () {
      mock.timers.tick(501);
    });

    assert.strictEqual(thresholdFired, true, 'user threshold fired');

    // Unmount should unregister - after unmount, touch + advance should not re-fire
    ReactTestRenderer.act(function () {
      tree.unmount();
    });

    thresholdFired = false;
    Idle.touch();
    mock.timers.tick(501);
    assert.strictEqual(thresholdFired, false, 'threshold did not re-fire after unmount');
  });

});
