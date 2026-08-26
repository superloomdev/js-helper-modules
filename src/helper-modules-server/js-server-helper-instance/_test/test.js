// Info: Test Cases for helper-instance
// Config comes from environment variables via loader.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Load all dependencies via test loader (mirrors main project loader pattern)
import loader from './loader.js';
const { Lib, buildInstance } = loader();
const Instance = Lib.Instance;

// A persistent deployment holds process-scoped resources open between
// requests; a serverless one closes them with the request that opened them.
const Persistent = buildInstance({ CLOSE_ON_CLEANUP: false });
const Serverless = buildInstance({ CLOSE_ON_CLEANUP: true });

// Yield to the event loop so a pending promise can settle
const tick = function () {
  return new Promise(function (resolve) { setImmediate(resolve); });
};



describe('initialize', function () {

  it('should return an object with required properties', function () {

    const instance = Instance.initialize();

    assert.ok(instance, 'Instance should be created');
    assert.strictEqual(typeof instance.time, 'number');
    assert.strictEqual(typeof instance.time_ms, 'number');
    assert.strictEqual(instance.logger_counter, 0);
    assert.ok(Array.isArray(instance.background_routines));
    assert.strictEqual(instance.background_routines.length, 0);
    assert.ok(Array.isArray(instance.cleanup_queue));
    assert.strictEqual(instance.cleanup_queue.length, 0);

  });


  it('should set both timestamps', function () {

    const instance = Instance.initialize();

    assert.ok(instance.time > 0);
    assert.ok(instance.time_ms > 0);

  });


  it('should return independent objects on each call', function () {

    const a = Instance.initialize();
    const b = Instance.initialize();

    Instance.addInstanceCleanupRoutine(a, async function () {});

    assert.strictEqual(Instance.getInstanceCleanupRoutineCount(a), 1);
    assert.strictEqual(Instance.getInstanceCleanupRoutineCount(b), 0);

  });

});



describe('config validation', function () {

  it('should throw when CLOSE_ON_CLEANUP is not a boolean', function () {

    assert.throws(
      function () { buildInstance({ CLOSE_ON_CLEANUP: 'true' }); },
      TypeError
    );

  });


  it('should throw when CLOSE_ON_CLEANUP is null', function () {

    assert.throws(
      function () { buildInstance({ CLOSE_ON_CLEANUP: null }); },
      TypeError
    );

  });


  it('should default to false when no config is supplied', async function () {

    const Default = buildInstance({});
    const instance = Default.initialize();
    let closed = false;

    Default.addProcessCleanupRoutine(instance, async function () { closed = true; });
    await Default.runInstanceCleanup(instance);

    // Default is a persistent deployment, so the resource is still held
    assert.strictEqual(closed, false);
    assert.strictEqual(Default.getProcessCleanupRoutineCount(), 1);

  });

});



describe('addBackgroundRoutine', function () {

  it('should count a routine as in flight until it signals', function () {

    const instance = Instance.initialize();

    const done = Instance.addBackgroundRoutine(instance);
    assert.strictEqual(Instance.getBackgroundRoutineCount(instance), 1);

    done();
    assert.strictEqual(Instance.getBackgroundRoutineCount(instance), 0);

  });


  it('should track multiple routines independently', function () {

    const instance = Instance.initialize();

    const done1 = Instance.addBackgroundRoutine(instance);
    const done2 = Instance.addBackgroundRoutine(instance);
    const done3 = Instance.addBackgroundRoutine(instance);

    assert.strictEqual(Instance.getBackgroundRoutineCount(instance), 3);

    done2();
    assert.strictEqual(Instance.getBackgroundRoutineCount(instance), 2);

    done1();
    done3();
    assert.strictEqual(Instance.getBackgroundRoutineCount(instance), 0);

  });


  it('should tolerate a completion signal called twice', function () {

    const instance = Instance.initialize();

    const done = Instance.addBackgroundRoutine(instance);
    done();
    done();

    assert.strictEqual(Instance.getBackgroundRoutineCount(instance), 0);

  });

});



describe('runInstanceCleanup - background routine timing', function () {

  it('should return immediately when no routine was registered', async function () {

    const instance = Instance.initialize();

    await Instance.runInstanceCleanup(instance);

    assert.strictEqual(Instance.getBackgroundRoutineCount(instance), 0);

  });


  it('should proceed when the routine finished BEFORE cleanup was called', async function () {

    const instance = Instance.initialize();
    let cleaned = false;

    const done = Instance.addBackgroundRoutine(instance);
    done();

    Instance.addInstanceCleanupRoutine(instance, async function () { cleaned = true; });
    await Instance.runInstanceCleanup(instance);

    assert.strictEqual(cleaned, true);

  });


  it('should wait when the routine finishes AFTER cleanup was called', async function () {

    const instance = Instance.initialize();
    const order = [];

    const done = Instance.addBackgroundRoutine(instance);

    // Settle the background work on a later tick, after cleanup has parked
    setImmediate(function () {
      order.push('background');
      done();
    });

    Instance.addInstanceCleanupRoutine(instance, async function () {
      order.push('cleanup');
    });

    await Instance.runInstanceCleanup(instance);

    // Cleanup must not have run before the background work landed
    assert.deepStrictEqual(order, ['background', 'cleanup']);

  });


  it('should wait for every routine in a parallel batch', async function () {

    const instance = Instance.initialize();
    const finished = [];

    const done1 = Instance.addBackgroundRoutine(instance);
    const done2 = Instance.addBackgroundRoutine(instance);
    const done3 = Instance.addBackgroundRoutine(instance);

    setTimeout(function () { finished.push(1); done1(); }, 5);
    setTimeout(function () { finished.push(2); done2(); }, 15);
    setTimeout(function () { finished.push(3); done3(); }, 10);

    await Instance.runInstanceCleanup(instance);

    assert.strictEqual(finished.length, 3);
    assert.strictEqual(Instance.getBackgroundRoutineCount(instance), 0);

  });


  it('should wait for a routine registered BY another routine', async function () {

    const instance = Instance.initialize();
    let nested_ran = false;

    const outer = Instance.addBackgroundRoutine(instance);

    setImmediate(function () {

      // The outer routine starts a second one before signalling its own end
      const inner = Instance.addBackgroundRoutine(instance);
      setImmediate(function () {
        nested_ran = true;
        inner();
      });

      outer();

    });

    await Instance.runInstanceCleanup(instance);

    assert.strictEqual(nested_ran, true, 'nested routine must be awaited');
    assert.strictEqual(Instance.getBackgroundRoutineCount(instance), 0);

  });

});



describe('addInstanceCleanupRoutine', function () {

  it('should run every routine in registration order', async function () {

    const instance = Instance.initialize();
    const order = [];

    Instance.addInstanceCleanupRoutine(instance, async function () { order.push(1); });
    Instance.addInstanceCleanupRoutine(instance, async function () { order.push(2); });
    Instance.addInstanceCleanupRoutine(instance, async function () { order.push(3); });

    await Instance.runInstanceCleanup(instance);

    assert.deepStrictEqual(order, [1, 2, 3]);

  });


  it('should await an async routine before returning', async function () {

    const instance = Instance.initialize();
    let settled = false;

    Instance.addInstanceCleanupRoutine(instance, async function () {
      await new Promise(function (resolve) { setTimeout(resolve, 10); });
      settled = true;
    });

    await Instance.runInstanceCleanup(instance);

    assert.strictEqual(settled, true, 'cleanup must not return before the routine settles');

  });


  it('should accept a synchronous routine', async function () {

    const instance = Instance.initialize();
    let ran = false;

    Instance.addInstanceCleanupRoutine(instance, function () { ran = true; });

    await Instance.runInstanceCleanup(instance);

    assert.strictEqual(ran, true);

  });


  it('should pass the instance to each routine', async function () {

    const instance = Instance.initialize();
    let received = null;

    Instance.addInstanceCleanupRoutine(instance, async function (passed) {
      received = passed;
    });

    await Instance.runInstanceCleanup(instance);

    assert.strictEqual(received, instance);

  });


  it('should empty the queue after running', async function () {

    const instance = Instance.initialize();

    Instance.addInstanceCleanupRoutine(instance, async function () {});
    assert.strictEqual(Instance.getInstanceCleanupRoutineCount(instance), 1);

    await Instance.runInstanceCleanup(instance);

    assert.strictEqual(Instance.getInstanceCleanupRoutineCount(instance), 0);

  });


  it('should not run a routine twice across two cleanup calls', async function () {

    const instance = Instance.initialize();
    let calls = 0;

    Instance.addInstanceCleanupRoutine(instance, async function () { calls++; });

    await Instance.runInstanceCleanup(instance);
    await Instance.runInstanceCleanup(instance);

    assert.strictEqual(calls, 1);

  });


  it('should keep running later routines when one throws', async function () {

    const instance = Instance.initialize();
    const ran = [];

    Instance.addInstanceCleanupRoutine(instance, async function () { ran.push(1); });
    Instance.addInstanceCleanupRoutine(instance, async function () { throw new Error('boom'); });
    Instance.addInstanceCleanupRoutine(instance, async function () { ran.push(3); });

    await Instance.runInstanceCleanup(instance);

    assert.deepStrictEqual(ran, [1, 3], 'a failed routine must not strand the rest');

  });


  it('should keep running later routines when one throws synchronously', async function () {

    const instance = Instance.initialize();
    const ran = [];

    Instance.addInstanceCleanupRoutine(instance, function () { throw new Error('sync boom'); });
    Instance.addInstanceCleanupRoutine(instance, async function () { ran.push(2); });

    await Instance.runInstanceCleanup(instance);

    assert.deepStrictEqual(ran, [2]);

  });

});



describe('addProcessCleanupRoutine - persistent deployment', function () {

  it('should file the routine against the process, not the request', function () {

    const instance = Persistent.initialize();

    Persistent.addProcessCleanupRoutine(instance, async function () {});

    assert.strictEqual(Persistent.getProcessCleanupRoutineCount(), 1);
    assert.strictEqual(Persistent.getInstanceCleanupRoutineCount(instance), 0);

  });


  it('should NOT close the resource when a request ends', async function () {

    const Local = buildInstance({ CLOSE_ON_CLEANUP: false });
    const instance = Local.initialize();
    let closed = false;

    Local.addProcessCleanupRoutine(instance, async function () { closed = true; });
    await Local.runInstanceCleanup(instance);

    assert.strictEqual(closed, false, 'a shared pool must survive the request');
    assert.strictEqual(Local.getProcessCleanupRoutineCount(), 1);

  });


  it('should survive many requests and close once at shutdown', async function () {

    const Local = buildInstance({ CLOSE_ON_CLEANUP: false });
    let closed_count = 0;

    // Registered once, by whatever opened the resource
    const first = Local.initialize();
    Local.addProcessCleanupRoutine(first, async function () { closed_count++; });
    await Local.runInstanceCleanup(first);

    // Many later requests come and go
    for (let i = 0; i < 5; i++) {
      const later = Local.initialize();
      await Local.runInstanceCleanup(later);
    }

    assert.strictEqual(closed_count, 0, 'still open across every request');
    assert.strictEqual(Local.getProcessCleanupRoutineCount(), 1);

    await Local.runProcessCleanup();

    assert.strictEqual(closed_count, 1);
    assert.strictEqual(Local.getProcessCleanupRoutineCount(), 0);

  });

});



describe('addProcessCleanupRoutine - serverless deployment', function () {

  it('should file the routine against the request', function () {

    const instance = Serverless.initialize();

    Serverless.addProcessCleanupRoutine(instance, async function () {});

    assert.strictEqual(Serverless.getInstanceCleanupRoutineCount(instance), 1);
    assert.strictEqual(Serverless.getProcessCleanupRoutineCount(), 0);

  });


  it('should close the resource when the request ends', async function () {

    const Local = buildInstance({ CLOSE_ON_CLEANUP: true });
    const instance = Local.initialize();
    let closed = false;

    Local.addProcessCleanupRoutine(instance, async function () { closed = true; });
    await Local.runInstanceCleanup(instance);

    assert.strictEqual(closed, true, 'no handle may be left open after the response');

  });


  it('should close again on a later request that re-registers', async function () {

    const Local = buildInstance({ CLOSE_ON_CLEANUP: true });
    let closed_count = 0;

    // Each invocation re-opens the resource, so each re-registers
    for (let i = 0; i < 3; i++) {
      const instance = Local.initialize();
      Local.addProcessCleanupRoutine(instance, async function () { closed_count++; });
      await Local.runInstanceCleanup(instance);
    }

    assert.strictEqual(closed_count, 3);
    assert.strictEqual(Local.getProcessCleanupRoutineCount(), 0);

  });


  it('should close only after background routines have landed', async function () {

    const Local = buildInstance({ CLOSE_ON_CLEANUP: true });
    const instance = Local.initialize();
    const order = [];

    const done = Local.addBackgroundRoutine(instance);
    setImmediate(function () {
      order.push('background-write');
      done();
    });

    Local.addProcessCleanupRoutine(instance, async function () {
      order.push('connection-closed');
    });

    await Local.runInstanceCleanup(instance);

    // Closing the connection before the write lands would lose the write
    assert.deepStrictEqual(order, ['background-write', 'connection-closed']);

  });

});



describe('runProcessCleanup', function () {

  it('should run routines in registration order', async function () {

    const Local = buildInstance({ CLOSE_ON_CLEANUP: false });
    const instance = Local.initialize();
    const order = [];

    Local.addProcessCleanupRoutine(instance, async function () { order.push(1); });
    Local.addProcessCleanupRoutine(instance, async function () { order.push(2); });

    await Local.runProcessCleanup();

    assert.deepStrictEqual(order, [1, 2]);

  });


  it('should pass null instead of an instance', async function () {

    const Local = buildInstance({ CLOSE_ON_CLEANUP: false });
    const instance = Local.initialize();
    let received = 'untouched';

    Local.addProcessCleanupRoutine(instance, async function (passed) {
      received = passed;
    });

    await Local.runProcessCleanup();

    assert.strictEqual(received, null, 'no request is in progress at shutdown');

  });


  it('should be safe to call with an empty queue', async function () {

    const Local = buildInstance({ CLOSE_ON_CLEANUP: false });

    await Local.runProcessCleanup();

    assert.strictEqual(Local.getProcessCleanupRoutineCount(), 0);

  });


  it('should keep running later routines when one throws', async function () {

    const Local = buildInstance({ CLOSE_ON_CLEANUP: false });
    const instance = Local.initialize();
    const ran = [];

    Local.addProcessCleanupRoutine(instance, async function () { throw new Error('boom'); });
    Local.addProcessCleanupRoutine(instance, async function () { ran.push(2); });

    await Local.runProcessCleanup();

    assert.deepStrictEqual(ran, [2]);

  });


  it('should keep queues independent between two loaded modules', async function () {

    const A = buildInstance({ CLOSE_ON_CLEANUP: false });
    const B = buildInstance({ CLOSE_ON_CLEANUP: false });

    const instance_a = A.initialize();
    A.addProcessCleanupRoutine(instance_a, async function () {});

    assert.strictEqual(A.getProcessCleanupRoutineCount(), 1);
    assert.strictEqual(B.getProcessCleanupRoutineCount(), 0);

  });

});



describe('getAge', function () {

  it('should return a non-negative elapsed time', async function () {

    const instance = Instance.initialize();

    await tick();

    assert.ok(Instance.getAge(instance) >= 0);

  });

});
