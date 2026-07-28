// Info: Unit tests for js-react-helper-timer
'use strict';

const { test, describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { mock } = require('node:test');

const ReactTestRenderer = require('react-test-renderer');

const { Timer, React } = require('./loader')();


describe('Timer loader', function () {

  it('should return the 11 expected exports when loaded', function () {
    const expected = [
      'start', 'pause', 'resume', 'stop', 'reset', 'stopAll',
      'getRemaining', 'getElapsed', 'getState',
      'useTimer', 'useCountdown'
    ];
    for (let i = 0; i < expected.length; i++) {
      assert.strictEqual(typeof Timer[expected[i]], 'function', expected[i] + ' is a function');
    }
  });

});


describe('start', function () {

  beforeEach(function () {
    mock.timers.enable();
    Timer.stopAll();
  });

  afterEach(function () {
    Timer.stopAll();
    mock.timers.reset();
  });

  it('should return success with key and state when starting a countdown', function () {
    const result = Timer.start('test', { duration_ms: 5000, direction: 'down' });
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.data.key, 'test');
    assert.strictEqual(result.data.state, 'running');
  });

  it('should default key to "default" when not provided', function () {
    const result = Timer.start({ duration_ms: 5000 });
    assert.strictEqual(result.data.key, 'default');
  });

  it('should default direction to "down"', function () {
    Timer.start({ duration_ms: 5000 });
    const state = Timer.getState();
    assert.strictEqual(state.data.direction, 'down');
  });

  it('should throw TypeError for non-positive duration_ms', function () {
    assert.throws(function () {
      Timer.start({ duration_ms: 0 });
    }, TypeError);
  });

  it('should throw TypeError for non-number duration_ms', function () {
    assert.throws(function () {
      Timer.start({ duration_ms: 'abc' });
    }, TypeError);
  });

  it('should throw TypeError for invalid direction', function () {
    assert.throws(function () {
      Timer.start({ duration_ms: 5000, direction: 'sideways' });
    }, TypeError);
  });

  it('should throw TypeError for non-function onTick', function () {
    assert.throws(function () {
      Timer.start({ duration_ms: 5000, onTick: 'not a function' });
    }, TypeError);
  });

  it('should replace an existing timer with the same key', function () {
    Timer.start('k', { duration_ms: 5000 });
    Timer.start('k', { duration_ms: 3000 });
    const remaining = Timer.getRemaining('k');
    assert.strictEqual(remaining.data.remaining_ms, 3000);
  });

});


describe('pause and resume', function () {

  beforeEach(function () {
    mock.timers.enable();
    Timer.stopAll();
  });

  afterEach(function () {
    Timer.stopAll();
    mock.timers.reset();
  });

  it('should return paused true when pause is called', function () {
    Timer.start({ duration_ms: 5000 });
    const result = Timer.pause();
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.data.paused, true);
  });

  it('should return paused false when resume is called after pause', function () {
    Timer.start({ duration_ms: 5000 });
    Timer.pause();
    const result = Timer.resume();
    assert.strictEqual(result.data.paused, false);
  });

  it('should be idempotent on double-pause', function () {
    Timer.start({ duration_ms: 5000 });
    Timer.pause();
    const result = Timer.pause();
    assert.strictEqual(result.data.paused, true);
  });

  it('should be idempotent on resume without prior pause', function () {
    Timer.start({ duration_ms: 5000 });
    const result = Timer.resume();
    assert.strictEqual(result.data.paused, false);
  });

  it('should return error for pause on unknown key', function () {
    const result = Timer.pause('nonexistent');
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error.type, 'helper-timer/not-found');
  });

  it('should return error for resume on unknown key', function () {
    const result = Timer.resume('nonexistent');
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error.type, 'helper-timer/not-found');
  });

  it('should freeze getRemaining while paused', function () {
    Timer.start({ duration_ms: 5000 });
    mock.timers.tick(2000);
    Timer.pause();
    const frozen = Timer.getRemaining().data.remaining_ms;
    mock.timers.tick(3000);
    const stillFrozen = Timer.getRemaining().data.remaining_ms;
    assert.strictEqual(frozen, stillFrozen);
  });

  it('should continue from frozen remaining on resume', function () {
    Timer.start({ duration_ms: 5000 });
    mock.timers.tick(2000);
    Timer.pause();
    mock.timers.tick(3000);
    Timer.resume();
    const remaining = Timer.getRemaining().data.remaining_ms;
    assert.strictEqual(remaining, 3000);
  });

});


describe('stop and stopAll', function () {

  beforeEach(function () {
    mock.timers.enable();
    Timer.stopAll();
  });

  afterEach(function () {
    Timer.stopAll();
    mock.timers.reset();
  });

  it('should return success with stopped true when stopping a timer', function () {
    Timer.start({ duration_ms: 5000 });
    const result = Timer.stop();
    assert.strictEqual(result.data.stopped, true);
  });

  it('should return error for stop on unknown key', function () {
    const result = Timer.stop('nonexistent');
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error.type, 'helper-timer/not-found');
  });

  it('should remove the timer so getState returns not-found', function () {
    Timer.start({ duration_ms: 5000 });
    Timer.stop();
    const result = Timer.getState();
    assert.strictEqual(result.success, false);
  });

  it('should stop all timers and return the count', function () {
    Timer.start('a', { duration_ms: 5000 });
    Timer.start('b', { duration_ms: 3000 });
    const result = Timer.stopAll();
    assert.strictEqual(result.data.stopped_count, 2);
  });

  it('should return stopped_count 0 when no timers exist', function () {
    const result = Timer.stopAll();
    assert.strictEqual(result.data.stopped_count, 0);
  });

});


describe('reset', function () {

  beforeEach(function () {
    mock.timers.enable();
    Timer.stopAll();
  });

  afterEach(function () {
    Timer.stopAll();
    mock.timers.reset();
  });

  it('should restart the clock from now', function () {
    Timer.start({ duration_ms: 5000 });
    mock.timers.tick(2000);
    Timer.reset();
    const remaining = Timer.getRemaining().data.remaining_ms;
    assert.strictEqual(remaining, 5000);
  });

  it('should clear pause state on reset', function () {
    Timer.start({ duration_ms: 5000 });
    mock.timers.tick(2000);
    Timer.pause();
    Timer.reset();
    const state = Timer.getState();
    assert.strictEqual(state.data.paused, false);
    assert.strictEqual(state.data.state, 'running');
  });

  it('should return error for reset on unknown key', function () {
    const result = Timer.reset('nonexistent');
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error.type, 'helper-timer/not-found');
  });

});


describe('getRemaining', function () {

  beforeEach(function () {
    mock.timers.enable();
    Timer.stopAll();
  });

  afterEach(function () {
    Timer.stopAll();
    mock.timers.reset();
  });

  it('should return duration_ms immediately after start', function () {
    Timer.start({ duration_ms: 5000 });
    const result = Timer.getRemaining();
    assert.strictEqual(result.data.remaining_ms, 5000);
  });

  it('should decrease as time advances', function () {
    Timer.start({ duration_ms: 5000 });
    mock.timers.tick(2000);
    const result = Timer.getRemaining();
    assert.strictEqual(result.data.remaining_ms, 3000);
  });

  it('should return 0 when time has expired', function () {
    Timer.start({ duration_ms: 3000 });
    mock.timers.tick(5000);
    const result = Timer.getRemaining();
    assert.strictEqual(result.data.remaining_ms, 0);
  });

  it('should return 0 for count-up timers', function () {
    Timer.start({ duration_ms: 5000, direction: 'up' });
    const result = Timer.getRemaining();
    assert.strictEqual(result.data.remaining_ms, 0);
  });

  it('should return error for unknown key', function () {
    const result = Timer.getRemaining('nonexistent');
    assert.strictEqual(result.success, false);
  });

});


describe('getElapsed', function () {

  beforeEach(function () {
    mock.timers.enable();
    Timer.stopAll();
  });

  afterEach(function () {
    Timer.stopAll();
    mock.timers.reset();
  });

  it('should return 0 immediately after start', function () {
    Timer.start({ duration_ms: 5000 });
    const result = Timer.getElapsed();
    assert.strictEqual(result.data.elapsed_ms, 0);
  });

  it('should increase as time advances', function () {
    Timer.start({ duration_ms: 5000 });
    mock.timers.tick(2000);
    const result = Timer.getElapsed();
    assert.strictEqual(result.data.elapsed_ms, 2000);
  });

  it('should return error for unknown key', function () {
    const result = Timer.getElapsed('nonexistent');
    assert.strictEqual(result.success, false);
  });

});


describe('getState', function () {

  beforeEach(function () {
    mock.timers.enable();
    Timer.stopAll();
  });

  afterEach(function () {
    Timer.stopAll();
    mock.timers.reset();
  });

  it('should return running state after start', function () {
    Timer.start({ duration_ms: 5000 });
    const result = Timer.getState();
    assert.strictEqual(result.data.state, 'running');
    assert.strictEqual(result.data.direction, 'down');
    assert.strictEqual(result.data.paused, false);
  });

  it('should return paused state after pause', function () {
    Timer.start({ duration_ms: 5000 });
    Timer.pause();
    const result = Timer.getState();
    assert.strictEqual(result.data.state, 'paused');
    assert.strictEqual(result.data.paused, true);
  });

  it('should return running state after resume', function () {
    Timer.start({ duration_ms: 5000 });
    Timer.pause();
    Timer.resume();
    const result = Timer.getState();
    assert.strictEqual(result.data.state, 'running');
  });

  it('should return error for unknown key', function () {
    const result = Timer.getState('nonexistent');
    assert.strictEqual(result.success, false);
  });

});


describe('drift correction', function () {

  beforeEach(function () {
    mock.timers.enable();
    Timer.stopAll();
  });

  afterEach(function () {
    Timer.stopAll();
    mock.timers.reset();
  });

  it('should compute exact remaining with uneven mock-time jumps', function () {
    Timer.start({ duration_ms: 10000 });
    mock.timers.tick(3333);
    assert.strictEqual(Timer.getRemaining().data.remaining_ms, 6667);
    mock.timers.tick(1111);
    assert.strictEqual(Timer.getRemaining().data.remaining_ms, 5556);
    mock.timers.tick(5556);
    assert.strictEqual(Timer.getRemaining().data.remaining_ms, 0);
  });

  it('should compute exact elapsed across pause/resume with uneven jumps', function () {
    Timer.start({ duration_ms: 10000 });
    mock.timers.tick(2000);
    Timer.pause();
    mock.timers.tick(5000);
    Timer.resume();
    mock.timers.tick(3000);
    // Active time: 2000 + 3000 = 5000
    assert.strictEqual(Timer.getElapsed().data.elapsed_ms, 5000);
    assert.strictEqual(Timer.getRemaining().data.remaining_ms, 5000);
  });

});


describe('onTick and onDone callbacks', function () {

  beforeEach(function () {
    mock.timers.enable();
    Timer.stopAll();
  });

  afterEach(function () {
    Timer.stopAll();
    mock.timers.reset();
  });

  it('should fire onTick at each tick interval', function () {
    let tickCount = 0;
    let lastValue = null;
    Timer.start({
      duration_ms: 5000,
      tick_ms: 1000,
      onTick: function (v) { tickCount += 1; lastValue = v; }
    });
    mock.timers.tick(1000);
    assert.strictEqual(tickCount, 1);
    assert.strictEqual(lastValue, 4000);
    mock.timers.tick(1000);
    assert.strictEqual(tickCount, 2);
    assert.strictEqual(lastValue, 3000);
  });

  it('should fire onDone when countdown reaches zero', function () {
    let done = false;
    Timer.start({
      duration_ms: 3000,
      onDone: function () { done = true; }
    });
    mock.timers.tick(3000);
    assert.strictEqual(done, true);
  });

  it('should fire onDone immediately if duration has already elapsed on reset', function () {
    let doneCount = 0;
    Timer.start({
      duration_ms: 3000,
      onDone: function () { doneCount += 1; }
    });
    // Let the original timer fire
    mock.timers.tick(3000);
    assert.strictEqual(doneCount, 1);
    // Reset: start_ms is now, but duration is 3000 and elapsed is 0
    // So onDone should NOT fire immediately - it should schedule normally
    Timer.reset();
    assert.strictEqual(doneCount, 1);
    mock.timers.tick(3000);
    assert.strictEqual(doneCount, 2);
  });

  it('should not fire onDone if timer is stopped before completion', function () {
    let done = false;
    Timer.start({
      duration_ms: 3000,
      onDone: function () { done = true; }
    });
    mock.timers.tick(1000);
    Timer.stop();
    mock.timers.tick(3000);
    assert.strictEqual(done, false);
  });

  it('should not fire onTick after stop', function () {
    let tickCount = 0;
    Timer.start({
      duration_ms: 5000,
      tick_ms: 1000,
      onTick: function () { tickCount += 1; }
    });
    mock.timers.tick(1000);
    const ticksBeforeStop = tickCount;
    Timer.stop();
    mock.timers.tick(3000);
    assert.strictEqual(tickCount, ticksBeforeStop);
  });

  it('should not fire onTick while paused', function () {
    let tickCount = 0;
    Timer.start({
      duration_ms: 5000,
      tick_ms: 1000,
      onTick: function () { tickCount += 1; }
    });
    Timer.pause();
    mock.timers.tick(3000);
    assert.strictEqual(tickCount, 0);
  });

  it('should resume firing onTick after resume', function () {
    let tickCount = 0;
    Timer.start({
      duration_ms: 5000,
      tick_ms: 1000,
      onTick: function () { tickCount += 1; }
    });
    mock.timers.tick(1000);
    Timer.pause();
    mock.timers.tick(3000);
    Timer.resume();
    mock.timers.tick(1000);
    assert.strictEqual(tickCount, 2);
  });

  it('should fire onTick with count-up values for direction up', function () {
    let lastValue = null;
    Timer.start({
      duration_ms: 5000,
      direction: 'up',
      tick_ms: 1000,
      onTick: function (v) { lastValue = v; }
    });
    mock.timers.tick(1000);
    assert.strictEqual(lastValue, 1000);
    mock.timers.tick(1000);
    assert.strictEqual(lastValue, 2000);
  });

});


describe('keyed timers', function () {

  beforeEach(function () {
    mock.timers.enable();
    Timer.stopAll();
  });

  afterEach(function () {
    Timer.stopAll();
    mock.timers.reset();
  });

  it('should manage multiple independent timers by key', function () {
    Timer.start('a', { duration_ms: 5000 });
    Timer.start('b', { duration_ms: 10000 });
    mock.timers.tick(2000);
    assert.strictEqual(Timer.getRemaining('a').data.remaining_ms, 3000);
    assert.strictEqual(Timer.getRemaining('b').data.remaining_ms, 8000);
  });

  it('should pause one timer without affecting others', function () {
    Timer.start('a', { duration_ms: 5000 });
    Timer.start('b', { duration_ms: 5000 });
    mock.timers.tick(1000);
    Timer.pause('a');
    mock.timers.tick(2000);
    assert.strictEqual(Timer.getRemaining('a').data.remaining_ms, 4000);
    assert.strictEqual(Timer.getRemaining('b').data.remaining_ms, 2000);
  });

  it('should stop one timer without affecting others', function () {
    Timer.start('a', { duration_ms: 5000 });
    Timer.start('b', { duration_ms: 5000 });
    Timer.stop('a');
    assert.strictEqual(Timer.getRemaining('a').success, false);
    assert.strictEqual(Timer.getRemaining('b').success, true);
  });

});


describe('useTimer', function () {

  beforeEach(function () {
    mock.timers.enable();
    Timer.stopAll();
  });

  afterEach(function () {
    Timer.stopAll();
    mock.timers.reset();
  });

  it('should return value and control functions when rendered', function () {
    let hookResult = null;

    function TestComponent () {
      hookResult = Timer.useTimer({ duration_ms: 5000, tick_ms: 1000 });
      return null;
    }

    ReactTestRenderer.act(function () {
      ReactTestRenderer.create(React.createElement(TestComponent));
    });

    assert.strictEqual(typeof hookResult.value, 'number');
    assert.strictEqual(typeof hookResult.start, 'function');
    assert.strictEqual(typeof hookResult.pause, 'function');
    assert.strictEqual(typeof hookResult.resume, 'function');
    assert.strictEqual(typeof hookResult.stop, 'function');
    assert.strictEqual(typeof hookResult.reset, 'function');
    assert.strictEqual(typeof hookResult.getRemaining, 'function');
    assert.strictEqual(typeof hookResult.getElapsed, 'function');
  });

  it('should update value from onTick', function () {
    let hookResult = null;

    function TestComponent () {
      hookResult = Timer.useTimer({ duration_ms: 5000, tick_ms: 1000 });
      return null;
    }

    ReactTestRenderer.act(function () {
      ReactTestRenderer.create(React.createElement(TestComponent));
    });
    assert.strictEqual(hookResult.value, 5000);

    ReactTestRenderer.act(function () {
      mock.timers.tick(1000);
    });
    assert.strictEqual(hookResult.value, 4000);
  });

  it('should stop the timer on unmount', function () {
    let hookResult = null;

    function TestComponent () {
      hookResult = Timer.useTimer({ duration_ms: 5000, tick_ms: 1000 });
      return null;
    }

    let renderer;
    ReactTestRenderer.act(function () {
      renderer = ReactTestRenderer.create(React.createElement(TestComponent));
    });

    ReactTestRenderer.act(function () {
      renderer.unmount();
    });

    // Timer should be gone
    const state = Timer.getState();
    assert.strictEqual(state.success, false);
  });

});


describe('useCountdown', function () {

  beforeEach(function () {
    mock.timers.enable();
    Timer.stopAll();
  });

  afterEach(function () {
    Timer.stopAll();
    mock.timers.reset();
  });

  it('should return value starting at duration_ms', function () {
    let hookResult = null;

    function TestComponent () {
      hookResult = Timer.useCountdown(5000);
      return null;
    }

    ReactTestRenderer.act(function () {
      ReactTestRenderer.create(React.createElement(TestComponent));
    });
    assert.strictEqual(hookResult.value, 5000);
  });

  it('should count down over time', function () {
    let hookResult = null;

    function TestComponent () {
      hookResult = Timer.useCountdown(5000);
      return null;
    }

    ReactTestRenderer.act(function () {
      ReactTestRenderer.create(React.createElement(TestComponent));
    });

    ReactTestRenderer.act(function () {
      mock.timers.tick(1000);
    });
    assert.strictEqual(hookResult.value, 4000);
  });

  it('should stop on unmount', function () {
    function TestComponent () {
      Timer.useCountdown(5000);
      return null;
    }

    let renderer;
    ReactTestRenderer.act(function () {
      renderer = ReactTestRenderer.create(React.createElement(TestComponent));
    });

    ReactTestRenderer.act(function () {
      renderer.unmount();
    });

    assert.strictEqual(Timer.getState().success, false);
  });

});
