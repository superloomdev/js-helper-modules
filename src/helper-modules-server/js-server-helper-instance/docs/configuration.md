# Configuration. `helper-instance`

Loader pattern, dependency notes, and testing tier. For the function reference see [API Reference](https://github.com/superloomdev/superloom/blob/main/src/helper-modules-server/js-server-helper-instance/docs/api.md).

This page is intentionally short. Instance has no current configuration keys and reads no environment variables. The page exists for shape consistency: every Superloom module ships a `docs/configuration.md` so contributors and AI tooling can find the loader pattern and runtime details in the same place across the framework. The canonical reasoning is in [`module-categorization.md` → Universal Documentation Footprint](https://github.com/superloomdev/superloom/blob/main/docs/modules/module-categorization.md#universal-documentation-footprint).

## On This Page

- [Loader Pattern](#loader-pattern)
- [Configuration Keys](#configuration-keys)
- [Environment Variables](#environment-variables)
- [Peer Dependencies](#peer-dependencies)
- [Direct Dependencies](#direct-dependencies)
- [Testing Tiers](#testing-tiers)

---

## Loader Pattern

The module is a factory. Each loader call returns an independent public interface with its own `Lib`, `CONFIG`, `ERRORS`, and `Validators` captured in a closure. Per-request state lives on the instance object returned by `initialize()`, not inside the loaded interface.

```javascript
import instance from 'helper-instance';

Lib.Instance = instance(Lib, {});
```

Loader call semantics:

- **First argument: `Lib`.** A container exposing peer modules. Instance reads `Lib.Utils.getUnixTime` and `Lib.Utils.getUnixTimeInMilliSeconds` to capture timestamps in `initialize`.
- **Second argument: config overrides.** Merged on top of the built-in defaults from `instance.config.js`. The merged config is validated by `Validators.validateConfig` at startup (currently a no-op). No function reads it at runtime. Pass `{}`.
- **Load this module exactly once, from the composition root.** Each loader call carries its own process cleanup queue. Loading it twice splits that registry, so half the registered connections are never closed. This is the one Superloom module where repeat loading is a defect rather than merely wasteful.

> **Why accept a `Lib` argument at all?** Every Superloom helper accepts the same `(Lib, config)` shape so that consumers can swap modules without changing the loader call. The uniformity is the point.

---

## Configuration Keys

| Key | Type | Default | Meaning |
|---|---|---|---|
| `CLOSE_ON_CLEANUP` | Boolean | `false` | Whether process-scoped teardown runs at the end of every request |

`validateConfig` throws a `TypeError` when this is not a boolean. A truthy string such as `'false'` would otherwise silently select the wrong queue.

### Choosing the value

| Deployment | Value | Consequence |
|---|---|---|
| Persistent server (Express in Docker, EC2, a VM) | `false` | A resource registered through `addProcessCleanupRoutine` is held open and shared by every later request, and closes once via `runProcessCleanup()` on SIGTERM |
| Serverless (AWS Lambda, Cloud Functions) | `true` | The same resource closes with the request that opened it. An open handle keeps such a runtime alive and billable until the function times out, and marks that worker busy so it refuses new requests meanwhile |

The entry point supplies this. **The module never reads the environment to guess it**, because the platform boundary is already expressed structurally: a deployment has a Lambda entry point or a server entry point, and each supplies its own config.

```javascript
import instance from 'helper-instance';

// Lambda composition root
Lib.Instance = instance(Lib, { CLOSE_ON_CLEANUP: true });

// Express composition root
Lib.Instance = instance(Lib, { CLOSE_ON_CLEANUP: false });
```

Setting `true` on a persistent server is not a crash, but it destroys connection reuse: every request would open and close its own pool and pay a TCP, TLS, and authentication handshake.

---

## Environment Variables

None. The module never reads `process.env`.

---

## Peer Dependencies

| Peer | Why |
|---|---|
| `helper-utils` | `initialize` uses `getUnixTime` and `getUnixTimeInMilliSeconds`; `getAge` uses `getUnixTimeInMilliSeconds`; `validateConfig` uses `isBoolean` |
| `helper-debug` | `Lib.Debug.error` reports a teardown routine that threw, so one failure never strands the routines after it |

The peers are consumed through the standard `Lib` injection in the loader's first argument. The module does not import either peer directly.

---

## Direct Dependencies

None. The module's `package.json` declares no `dependencies`. The supply chain you audit ends at this package and its two peers.

---

## Testing Tiers

The module ships a single test tier:

| Tier | Runtime | When to run | CI Status |
|---|---|---|---|
| **Unit** | Node.js `node --test` | Every commit, every CI run | [![Test](https://github.com/superloomdev/js-helper-modules/actions/workflows/ci-publish-helper-modules.yml/badge.svg?branch=main)](https://github.com/superloomdev/js-helper-modules/actions/workflows/ci-publish-helper-modules.yml) |

There is no Docker container and no service emulator. Tests exercise the lifecycle ordering (initialize -> register cleanup -> register background -> complete background -> cleanup runs) directly against the module's public interface.

```bash
cd _test && npm install && npm test
```

The test runner uses Node's built-in test framework (`node --test` plus `node:assert/strict`). Test runtime is sub-second.

For the framework-wide testing architecture see [Module Testing](https://github.com/superloomdev/superloom/blob/main/docs/testing/module-testing.md).
