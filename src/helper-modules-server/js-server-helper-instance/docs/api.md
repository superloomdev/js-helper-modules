# API Reference. `helper-instance`

Request and process lifecycle management for server deployments.

## On This Page

- [Conventions](#conventions)
- [The Instance Object](#the-instance-object)
- [Two Scopes, Three Registries](#two-scopes-three-registries)
- [Lifecycle Functions](#lifecycle-functions)
- [Background Routines](#background-routines)
- [Instance Cleanup](#instance-cleanup)
- [Process Cleanup](#process-cleanup)
- [Inspection](#inspection)
- [Worked Examples](#worked-examples)
- [Lifecycle Notes](#lifecycle-notes)

---

## Conventions

Every function takes the request instance as its first argument, except `runProcessCleanup` and `getProcessCleanupRoutineCount`, which are process-scoped and take none.

Teardown routines are always awaited. A synchronous routine works, but declare them `async` by convention. A routine receives the instance and may ignore it.

---

## The Instance Object

`initialize()` returns a plain object. It is passed by reference through every function in a request and is discarded once the response is sent.

| Field | Type | Meaning |
|---|---|---|
| `time` | Integer | Request start, unix seconds |
| `time_ms` | Integer | Request start, unix milliseconds. Pass to `performanceAuditLog` |
| `logger_counter` | Integer | Sequence counter for ordered log lines |
| `background_routines` | Array | Promises for work still in flight |
| `cleanup_queue` | Array | Request-scoped teardown routines |

Nothing else belongs on it. The deployment's teardown policy is config, not request state.

---

## Two Scopes, Three Registries

A request lasts milliseconds. A connection pool lasts as long as the process. Teardown for the second cannot live on an object discarded with the first.

| Registry | Scope | Stored on | Drained by |
|---|---|---|---|
| Background routines | request | instance object | `runInstanceCleanup` waits for these before anything else |
| Instance cleanup | request | instance object | `runInstanceCleanup` |
| Process cleanup | **process** | **module `state`, alongside `CONFIG`** | `runProcessCleanup`, or `runInstanceCleanup` when `CLOSE_ON_CLEANUP` is true |

Background routines are a **gate**, not teardown. They answer "is it safe to tear down yet", not "what needs tearing down".

**What goes where**

| Resource | Registry | Why |
|---|---|---|
| Connection pool, long-lived client | process cleanup | Shared by every request |
| Connection borrowed via `getClient()` | instance cleanup | Belongs to one request; must go back |
| Temp file, per-request stream | instance cleanup | Created and finished inside one request |
| Audit write, cache warm, session refresh | background routine | Must land before teardown, but must not delay the response |

---

## Lifecycle Functions

### `initialize()`

Create a request instance. No arguments.

```javascript
const instance = Lib.Instance.initialize();
```

---

## Background Routines

### `addBackgroundRoutine(instance)`

Register work that runs in parallel with the response. Returns a completion signal; call it from a `finally` block so it fires on success and failure alike.

```javascript
const signalComplete = Lib.Instance.addBackgroundRoutine(instance);

store.addLog(instance, record)
  .catch(function (error) {
    Lib.Debug.debug('background write failed', { error: error.message });
  })
  .finally(function () {
    signalComplete();
  });
```

The routine is tracked as a promise, so `runInstanceCleanup` **awaits** it. There is no window to miss: a routine that finished before cleanup was called resolves instantly, and one that finishes after parks cleanup until it lands.

A background routine may itself register another. Both are awaited.

**There is no timeout.** Abandoning a routine would silently drop an audit row or leave a consumed one-time code reusable. A routine that never signals is a defect, and surfacing it as a platform timeout is preferable to hiding it.

---

## Instance Cleanup

### `addInstanceCleanupRoutine(instance, cleanup_function)`

Register teardown for a resource belonging to this request alone.

```javascript
const { client } = await Lib.Postgres.getClient(instance);

// Whatever happens next, this client goes back to the pool
Lib.Instance.addInstanceCleanupRoutine(instance, async function () {
  Lib.Postgres.releaseClient(instance, client);
});
```

### `runInstanceCleanup(instance)`

Run teardown for this request. Call once, after the response is sent.

```javascript
await Lib.Instance.runInstanceCleanup(instance);
```

Order of operations:

1. Wait for every background routine to finish
2. Drain the instance cleanup queue, in registration order
3. If `CLOSE_ON_CLEANUP` is true, run process cleanup as well

It never skips while background work is pending; it waits. Nothing re-triggers it.

---

## Process Cleanup

### `addProcessCleanupRoutine(instance, cleanup_function)`

Register teardown for a resource shared by every request in this process. Register once, from whatever opened it.

```javascript
// Inside the driver, immediately after the pool is created
state.pool = new PG.Pool(options);

Lib.Instance.addProcessCleanupRoutine(instance, _Postgres.close);
```

The caller declares **what the resource is** and never decides when it closes. This function files it against the deployment's policy:

| `CLOSE_ON_CLEANUP` | Filed against | Closed by |
|---|---|---|
| `true` | the current request | `runInstanceCleanup`, every request |
| `false` | the process | `runProcessCleanup`, at shutdown |

### `runProcessCleanup()`

Run process-scoped teardown and empty the queue. Takes no instance, because none exists at shutdown; each routine receives `null`.

```javascript
await Lib.Instance.runProcessCleanup();
```

A persistent deployment calls this from its SIGTERM handler. A deployment with `CLOSE_ON_CLEANUP` enabled reaches it through `runInstanceCleanup` and never calls it directly.

---

## Inspection

### `getBackgroundRoutineCount(instance)`

Number of background routines still in flight. Drops as each signals completion.

### `getInstanceCleanupRoutineCount(instance)`

Number of registered instance cleanup routines.

### `getProcessCleanupRoutineCount()`

Number of registered process cleanup routines. Takes no instance.

### `getAge(instance)`

Milliseconds since `initialize()`.

---

## Worked Examples

### Persistent deployment. Express

```javascript
// Composition root, once
Lib.Instance = require('helper-instance')(Lib, { CLOSE_ON_CLEANUP: false });
```

```javascript
// Per request
app.use(async function (req, res, next) {

  const instance = Lib.Instance.initialize();
  res.locals.instance = instance;

  res.on('finish', async function () {
    await Lib.Instance.runInstanceCleanup(instance);
  });

  next();

});
```

```javascript
// Once, at shutdown
process.on('SIGTERM', async function () {
  server.close();
  await Lib.Instance.runProcessCleanup();
  process.exit(0);
});
```

The pool is opened by the first request and reused by every later one. It closes once, on SIGTERM.

### Serverless deployment. Lambda

```javascript
// Composition root, once per container
Lib.Instance = require('helper-instance')(Lib, { CLOSE_ON_CLEANUP: true });
```

```javascript
exports.handler = async function (event, context) {

  const instance = Lib.Instance.initialize();

  const response = await Lib.Controller.handle(instance, event);

  // Background writes land, then every connection closes. Leaving a handle
  // open holds the worker alive and billable until the function times out,
  // and marks it busy so it refuses new requests meanwhile.
  await Lib.Instance.runInstanceCleanup(instance);

  return response;

};
```

No SIGTERM handler. The container freezes rather than shutting down, and the next invocation re-opens what it needs.

### The same driver, both deployments

```javascript
// Driver code is identical. It declares the resource and nothing more.
Lib.Instance.addProcessCleanupRoutine(instance, _Postgres.close);
```

| | Express | Lambda |
|---|---|---|
| Filed to | process queue | that request's queue |
| Closed | on SIGTERM | end of every request |
| Driver code | identical | identical |

---

## Lifecycle Notes

- Load this module **once**, from the composition root. Each loader call has its own process cleanup queue, so loading twice splits the registry and orphans half of it
- Every teardown routine is awaited, in registration order, one at a time
- One failing routine never strands the routines after it. Each is caught individually and logged through `Lib.Debug.error`
- `runInstanceCleanup` empties the instance queue, so calling it twice does not run a routine twice
- `runProcessCleanup` empties the process queue. On a serverless deployment the driver re-registers on the next request, because closing nulls its cached handle
- A process cleanup routine must leave its resource re-creatable. A driver that caches a handle it does not clear on close will never be cleaned up again
