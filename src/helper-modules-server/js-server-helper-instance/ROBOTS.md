# helper-instance

Request and process lifecycle manager. Creates per-request state, tracks background routines, and runs request-scoped and process-scoped teardown.

## Type
Server helper. Offline (no external services needed).

## Peer Dependencies
- `helper-utils` - injected as `Lib.Utils`
- `helper-debug` - injected as `Lib.Debug`

## Direct Dependencies
None.

## Loader Pattern (Factory)

```javascript
Lib.Instance = require('helper-instance')(Lib, { CLOSE_ON_CLEANUP: false });
```

Each loader call returns an independent Instance interface with its own `Lib`, `CONFIG`, `ERRORS`, and `Validators`, **and its own process cleanup queue**. Load it exactly once, from the composition root, and share it through `Lib`.

Companion files: `instance.config.js`, `instance.errors.js` (empty frozen catalog), `instance.validators.js`.

## Config Keys
- `CLOSE_ON_CLEANUP` (Boolean, default `false`) - whether process-scoped teardown runs at the end of every request. `false` for a persistent deployment, `true` for a serverless one. Supplied by the entry point; this module never reads the environment.

## Three Registries

| Registry | Scope | Stored on | Drained by |
|---|---|---|---|
| Background routines | request | instance object | `runInstanceCleanup` waits for these first |
| Instance cleanup routines | request | instance object | `runInstanceCleanup` |
| Process cleanup routines | **process** | **module `state`** | `runProcessCleanup`, or `runInstanceCleanup` when `CLOSE_ON_CLEANUP` is true |

Background routines are a **gate**, not teardown. A connection pool outlives every request that used it, so its teardown is held in module `state`, not on an instance object that is discarded with the response.

## Exported Functions

initialize() → Object | async:no
  Create new request instance with timestamps and empty queues.
  Returns: { time, time_ms, logger_counter, background_routines, cleanup_queue }
  time = unix seconds. time_ms = unix milliseconds (use for perf logging).

addBackgroundRoutine(instance) → Function | async:no
  Register work that runs in parallel with the response.
  Returns a completion signal - call it from a finally block when the work settles.
  Tracked as a promise, so runInstanceCleanup awaits it rather than skipping.
  A background routine may itself register another one.

getBackgroundRoutineCount(instance) → Number | async:no
  Number of background routines still in flight.

addInstanceCleanupRoutine(instance, cleanup_function) → void | async:no
  Register teardown for a resource belonging to this request alone, such as a
  connection borrowed from a pool or a temporary file.
  cleanup_function signature: fn(instance). Declare it async by convention.

getInstanceCleanupRoutineCount(instance) → Number | async:no
  Number of registered instance cleanup routines.

runInstanceCleanup(instance) → Promise<void> | async:yes
  Run teardown for this request. Call once, after the response is sent.
  Order: wait for background routines, drain the instance queue, then run
  process cleanup if CLOSE_ON_CLEANUP is true.
  Never skips while background work is pending - it waits, so nothing
  re-triggers it.

addProcessCleanupRoutine(instance, cleanup_function) → void | async:no
  Register teardown for a resource shared by every request in this process,
  such as a database connection pool. Register once, from whatever opened it.
  The caller declares what the resource is and never decides when it closes:
  CLOSE_ON_CLEANUP true files it with the current request, false files it
  against the process.
  cleanup_function signature: fn(instance). Declare it async by convention.

getProcessCleanupRoutineCount() → Number | async:no
  Number of registered process cleanup routines. Takes no instance.

runProcessCleanup() → Promise<void> | async:yes
  Run teardown for process-scoped resources and empty the queue.
  A persistent deployment calls this from its SIGTERM handler.
  A deployment with CLOSE_ON_CLEANUP enabled reaches it through
  runInstanceCleanup and never calls it directly.

getAge(instance) → Number | async:no
  Milliseconds since instance was initialized. Uses instance.time_ms.

## Patterns
- `instance.time_ms` is the request start timestamp - pass to `performanceAuditLog` for a request-level timeline
- Every teardown routine is awaited. A synchronous routine still works, but declare them `async`
- A routine receives `instance` and may ignore it. `runProcessCleanup` passes `null`, because no request is in progress at shutdown
- One failing routine never strands the routines after it - each is caught individually and logged through `Lib.Debug.error`
- There is deliberately **no timeout** on the background wait. Abandoning a routine would silently drop an audit row or leave a consumed one-time code reusable. A routine that never signals is a defect and should surface as a platform timeout
- Both queues are FIFO - routines run in registration order
- The instance object is a plain object passed by reference to all functions in a request
