# @superloomdev/js-server-helper-instance

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Node.js 24+](https://img.shields.io/badge/Node.js-24%2B-brightgreen.svg)](https://nodejs.org)

A request-lifecycle helper for Node.js servers and serverless handlers that ships pre-tested and has zero runtime dependencies. Part of [Superloom](https://superloom.dev).

## What This Is

A small lifecycle module. One call to `initialize()` returns a plain object that travels with a single request: it carries the start timestamps, the background routines still in flight, and a queue of teardown routines. Register per-request teardown with `addInstanceCleanupRoutine`, shared-resource teardown with `addProcessCleanupRoutine`, work that runs alongside the response with `addBackgroundRoutine`, and call `runInstanceCleanup` once the response is sent.

## Why Use This Module

- **Zero runtime dependencies.** Adding this module to your project adds zero packages to your dependency tree. The supply chain you audit ends at this package itself.

- **Same code in Express and Lambda.** The lifecycle abstraction is identical in both runtimes. Express attaches the instance to the request object so downstream middleware can use it; Lambda creates one per invocation. Business logic never has to ask which runtime it is in.

- **Pre-tested at every release.** A full test suite runs in CI on every push. Your project trusts the wrapper instead of re-verifying request-lifecycle plumbing on each release.

- **Designed for human review.** The code is laid out as clearly-marked visual sections (section banners, short functions, scoped comments) so a reviewer can read it top to bottom in order, use the section breaks as checkpoints to mark how far they have got, and finish without ever getting lost in dense logic. This matters most when an AI assistant is generating the change and a human still has to sign off on it. Open `instance.js` to see the structure.

## Behavior

The module is the contract between a request entry-point (Express middleware, Lambda handler) and the rest of the application.

### Instance cleanup versus process cleanup

This is the distinction the module exists to draw. A request lasts milliseconds. A database connection pool lasts as long as the process. Teardown for the second cannot live on an object that is discarded with the first.

| | Instance cleanup | Process cleanup |
|---|---|---|
| Register with | `addInstanceCleanupRoutine` | `addProcessCleanupRoutine` |
| Lifetime of the resource | this one request | the whole process |
| Held on | the instance object | the module's own state, which lives as long as `Lib` |
| Typical contents | a connection borrowed from a pool, a temp file, a per-request stream | a connection pool, a long-lived client |
| Runs | end of every request, on every deployment | see below |

Process cleanup is the interesting one, because when it should run depends on the deployment, and the code that opened the resource has no business knowing:

- On a **persistent server**, the pool is shared by every later request. Closing it per request would pay a TCP, TLS, and authentication handshake every time and defeat the point of pooling. It closes **once**, at shutdown.
- On a **serverless runtime**, an open handle keeps the worker alive and billable until the function times out, and marks it busy so it refuses new requests meanwhile. It closes with **the request that opened it**.

So a driver declares only what kind of resource it holds:

```javascript
Lib.Instance.addProcessCleanupRoutine(instance, _Postgres.close);
```

and the single config key `CLOSE_ON_CLEANUP` decides where that lands. The driver code is byte-identical in both deployments.

### Background routines gate teardown

`addBackgroundRoutine(instance)` returns a completion signal for work that runs alongside the response, such as an audit write. `runInstanceCleanup` **waits** for those routines before tearing anything down, rather than checking a count and giving up. That ordering is not cosmetic: closing a connection while an audit write is still in flight loses the row, and on a runtime that freezes after the response the write would never resume.

There is deliberately no timeout on that wait. Abandoning a routine would silently drop data; a routine that never signals is a defect and should surface as a platform timeout instead of being hidden.

### Performance audit reference

`instance.time_ms` is the unix-millisecond timestamp at the start of the request. Pass it to [`Lib.Debug.performanceAuditLog`](https://github.com/superloomdev/superloom/blob/main/src/helper-modules-core/js-helper-debug/docs/api.md#performanceauditlogaction-routine-reference_time) on every external service boundary, and the resulting log lines reconstruct the full request timeline; not just the duration of the function that emitted the line.

Full mechanics with worked Express and Lambda examples are in [`docs/api.md`](https://github.com/superloomdev/superloom/blob/main/src/helper-modules-server/js-server-helper-instance/docs/api.md).

```text
   initialize()
      |
      |-- addBackgroundRoutine()     -> signalComplete()   (runs beside the response)
      |-- addInstanceCleanupRoutine(fn)                    (this request only)
      |-- addProcessCleanupRoutine(fn)                     (shared resource)
      |
      v
   runInstanceCleanup()          <- called once, after the response is sent
      |
      |-- 1. wait for every background routine to finish
      |-- 2. drain the instance cleanup queue (FIFO)
      |-- 3. CLOSE_ON_CLEANUP ? runProcessCleanup() : leave shared resources open
      |
      v
   runProcessCleanup()           <- persistent server only, from SIGTERM
      |
      |-- drain the process cleanup queue (FIFO)
```

## Aligned with Superloom Philosophy

If your project is built on Superloom conventions (the same loader pattern, the same testing model), this module slots in without you needing to learn anything new. Every Superloom helper that does I/O accepts an `instance` as its first argument; that argument is what this module produces.

If you are not yet using Superloom, the principles are documented at [superloom.dev](https://superloom.dev).

## Extended Documentation

- [API reference](https://github.com/superloomdev/superloom/blob/main/src/helper-modules-server/js-server-helper-instance/docs/api.md) - every exported function with its signature, parameters, return shape, and worked Express + Lambda examples
- [Configuration](https://github.com/superloomdev/superloom/blob/main/src/helper-modules-server/js-server-helper-instance/docs/configuration.md) - loader pattern, instance object shape, dependency notes, testing tier
- [`helper-debug` performance auditing](https://github.com/superloomdev/superloom/blob/main/src/helper-modules-core/js-helper-debug/docs/api.md#performance-auditing) - the canonical use of `instance.time_ms`
- [Superloom](https://superloom.dev) - the framework

## Adding to Your Project

Install this module as a peer dependency in your project's `package.json` and load it through the standard Superloom loader. Do not vendor the source or use it as a local file dependency. The published package is the supported integration path.

The loader pattern, including the full `Lib` container shape, is documented in [Server Loader Architecture](https://github.com/superloomdev/superloom/blob/main/docs/server/server-loader.md). For one-time GitHub Packages registry setup, see the [npmrc setup guide](https://github.com/superloomdev/superloom/blob/main/docs/dev/npmrc-setup.md).

## Dependencies

This module has no external dependencies.

This module expects two peer modules in the `Lib` container (Utils, Debug). For the full dependency breakdown, see [`docs/configuration.md`](docs/configuration.md).

## Testing Status

| Tier | Runtime | Status |
|---|---|---|
| Unit | Node.js `node --test` | [![Test](https://github.com/superloomdev/js-helper-modules/actions/workflows/ci-publish-helper-modules.yml/badge.svg?branch=main)](https://github.com/superloomdev/js-helper-modules/actions/workflows/ci-publish-helper-modules.yml) |

Test runtime details (no Docker, no service required) live in [Configuration → Testing Tiers](https://github.com/superloomdev/superloom/blob/main/src/helper-modules-server/js-server-helper-instance/docs/configuration.md#testing-tiers).

## License

MIT
