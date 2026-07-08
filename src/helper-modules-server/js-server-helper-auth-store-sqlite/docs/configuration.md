# Configuration

The SQLite store adapter is a fully independent module. Call it with its config to get a ready-to-use store object, then pass that object as `Store` to the Auth parent.

## On This Page

- [Loader Pattern](#loader-pattern)
- [Config Keys](#config-keys)
- [Peer Dependencies](#peer-dependencies)
- [Environment Variables](#environment-variables)
- [Testing Tier](#testing-tier)

## Loader Pattern

```js
Lib.SQLite = require('@superloomdev/js-server-helper-sql-sqlite')(Lib, {
  FILE: '/var/data/sessions.db'   // path to a SQLite file, or ':memory:'
});
Lib.SQL = Lib.SQLite;  // alias so the adapter picks Lib.SQL

const Store = require('@superloomdev/js-server-helper-auth-store-sqlite')(Lib, {
  table_name: 'sessions_user'
});

Lib.AuthUser = require('@superloomdev/js-server-helper-auth')(Lib, {
  Store:      Store,
  ACTOR_TYPE: 'user',
  TTL_SECONDS: 2592000
});

await Lib.AuthUser.setupNewStore(Lib.Instance.initialize());
```

The adapter receives the `Lib` container and picks `Lib.Utils`, `Lib.Debug`, and `Lib.SQL` by reference. It defines its own `CONFIG` and `ERRORS` internally, then returns a ready-to-use store object. The Auth parent receives that object via `CONFIG.Store` and uses it directly.

The SQLite database handle lives inside `Lib.SQLite`. The `sql-sqlite` driver helper opens the database file (or the `:memory:` instance) on first access. The adapter does not open any handle of its own and inherits whatever WAL / journal-mode configuration the driver helper applies.

**File-backed vs in-memory.** Set `FILE` to a filesystem path for persistent storage, or to `':memory:'` for an ephemeral database that disappears when the Node process exits. The adapter behaves identically in both modes from the contract's perspective. The choice is a deployment decision, not an application-code change.

## Config Keys

| Key | Type | Required | Description |
|---|---|---|---|
| `table_name` | String | Yes | Name of the sessions table. Use one table per `actor_type` (`sessions_user`, `sessions_admin`, `sessions_device`, etc.) so multiple Auth instances can share one database without collision |

The validator throws an `Error` at loader time if `table_name` is missing, null, undefined, or the empty string. The throw is intentional. Misconfiguration must fail at boot, never silently at first request.

`table_name` cannot contain a double-quote character. The check happens lazily on first SQL build, not at config-validation time. Use lowercase, underscored identifiers (`sessions_user`, not `"Sessions"`).

## Peer Dependencies

The adapter does not require these packages directly. It accesses them through `Lib`, which the application populates before constructing the Auth parent.

| Package | Reads via `Lib` |
|---|---|
| `@superloomdev/js-helper-utils` | `Lib.Utils` for type checks in `store.validators.js` |
| `@superloomdev/js-helper-debug` | `Lib.Debug` for driver-error logging |
| `@superloomdev/js-server-helper-sql-sqlite` | `Lib.SQL` (set by caller as `Lib.SQL = Lib.SQLite`) |

The driver helper wraps Node's built-in `node:sqlite` module. There is no native add-on (no `better-sqlite3`, no `sqlite3`). Applications that never use this adapter never load the SQLite driver.

## Environment Variables

The adapter reads no environment variables at runtime. The variable below is consumed by `_test/loader.js` and never anywhere else; production deployments pass the file path directly through the `Lib.SQLite` loader.

| Variable | Default | Purpose |
|---|---|---|
| `SQLITE_FILE` | `:memory:` | Path to the SQLite file used by the test suite. Defaults to in-memory so the test database is always created from scratch |

## Testing Tier

In-process. No Docker, no external service. The contract test suite runs against a `:memory:` SQLite database that is created from scratch for each test run.

```bash
npm install && npm test
```

No `pretest` or `posttest` script is needed; the test entry point initializes the in-memory database via `Lib.SQLite` and tears it down implicitly when the process exits. The single environment variable (`SQLITE_FILE`) can be overridden to point at a file path if you want to inspect the resulting database after a test run; the default in-memory mode is the supported configuration.

The test entry point is `_test/test.js`. It loads `_test/store-contract-suite.js`, which contains a local copy of the shared contract suite maintained by the Auth parent module. Keeping the suite local (rather than fetching from the parent at test time) means the adapter's test harness is self-contained and records which contract version it was built against.

The suite covers two tiers:

- **Tier 1. Adapter unit tests.** Store loader config validation; identifier quoting rejection; boolean encoding as INTEGER 0/1 and round-trip; `custom_data` JSON round-trip; hash-mismatch returns `record: null`; `updateSessionActivity` identity blocklist; UPSERT immutability for primary-key and per-install fields; `cleanupExpiredSessions` `deleted_count` accuracy
- **Tier 3. Full Auth lifecycle integration.** Every public Auth API path driven against the in-process SQLite backend through the store contract suite. Catches integration bugs that the unit tests cannot see (parent-side ordering, error envelope propagation, scheduled-cleanup interaction with active sessions)

Tier 2 (an in-process emulated backend) is not a separate test tier for this adapter because the production code path already runs in-process; the unit tests effectively are the emulated tier.

The in-process test mode makes the test suite **fast and parallelizable**. There is no container startup latency, no port conflict, no network. Running the full suite typically takes seconds, not minutes.
