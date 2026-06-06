# Configuration

The PostgreSQL store adapter is a fully independent module. Call it with its config to get a ready-to-use store object, then pass that object as `Store` to the Auth parent.

## On This Page

- [Loader Pattern](#loader-pattern)
- [Config Keys](#config-keys)
- [Peer Dependencies](#peer-dependencies)
- [Environment Variables](#environment-variables)
- [Testing Tier](#testing-tier)

## Loader Pattern

```js
Lib.Postgres = require('@superloomdev/js-server-helper-sql-postgres')(Lib, {
  HOST:     'localhost',
  DATABASE: 'app_db',
  USER:     'app_user',
  PASSWORD: process.env.DB_PASSWORD,
  POOL_MAX: 10
});

const Store = require('@superloomdev/js-server-helper-auth-store-postgres')({
  table_name: 'sessions_user',
  lib_sql:    Lib.Postgres
});

Lib.AuthUser = require('@superloomdev/js-server-helper-auth')(Lib, {
  Store:      Store,
  ACTOR_TYPE: 'user',
  TTL_SECONDS: 2592000
});
```

The adapter is called directly with its config. It builds its own `Lib` (Utils + Debug) and defines its own `ERRORS` catalog internally, then returns a ready-to-use store object. The Auth parent receives that object via `CONFIG.Store` and uses it directly.

The connection pool is **not** created at loader time. `Lib.Postgres` lazy-initializes on the first query. The adapter does not open any connection during construction either; the first round-trip happens on `setupNewStore` or the first runtime call.

## Config Keys

| Key | Type | Required | Description |
|---|---|---|---|
| `table_name` | String | Yes | Name of the sessions table. Use one table per `actor_type` (`sessions_user`, `sessions_admin`, `sessions_device`, etc.) so multiple Auth instances can share one database without collision |
| `lib_sql` | Object | Yes | Initialized `Lib.Postgres` instance. The adapter delegates all SQL execution to this helper |

The validator throws an `Error` at loader time if either key is missing, null, undefined, or (for `table_name`) the empty string. The throw is intentional. Misconfiguration must fail at boot, never silently at first request.

`table_name` cannot contain a double-quote character. The check happens lazily on first SQL build, not at config-validation time. Use lowercase, underscored identifiers (`sessions_user`, not `"Sessions"`).

## Peer Dependencies

Utils and Debug are required directly by the adapter and built into its own internal `Lib`. The `sql-postgres` driver helper is passed in via `config.lib_sql` by the application.

| Package | How it is used |
|---|---|
| `@superloomdev/js-helper-utils` | Required by adapter; used for type checks in `store.validators.js` |
| `@superloomdev/js-helper-debug` | Required by adapter; used for driver-error logging |
| `@superloomdev/js-server-helper-sql-postgres` | Passed in via `config.lib_sql`; the adapter delegates all SQL execution to this helper |

The driver helper (`Lib.Postgres`) carries its own peer dependency on `pg` (node-postgres). The adapter never `require`s `pg` directly; applications that never use this store never load the driver.

## Environment Variables

The adapter reads no environment variables at runtime. The variables below are consumed by `_test/loader.js` and never anywhere else; production deployments pass connection details directly through the `Lib.Postgres` loader.

| Variable | Default (Docker) | Purpose |
|---|---|---|
| `POSTGRES_HOST` | `127.0.0.1` | Postgres host |
| `POSTGRES_PORT` | `5433` | Postgres port (5433 to avoid collision with host's local Postgres on 5432) |
| `POSTGRES_DATABASE` | `test_db` | Database name |
| `POSTGRES_USER` | `test_user` | Postgres user |
| `POSTGRES_PASSWORD` | `test_pw` | Postgres password |

## Testing Tier

Service-dependent. The contract test suite runs against a real PostgreSQL 17 container. The Docker lifecycle is fully automated by `npm test`:

```bash
cd _test && npm install && npm test
```

`pretest` runs `docker compose down -v --remove-orphans` (defensive cleanup) then `docker compose up -d --wait` to start the Postgres 17 container on port 5433. `posttest` removes containers and volumes (the image stays cached for next time). No manual `docker compose up` step is required.

The test entry point is `_test/test.js`. It loads `_test/store-contract-suite.js`, which contains a local copy of the shared contract suite maintained by the Auth parent module. Keeping the suite local (rather than fetching from the parent at test time) means the adapter's test harness is self-contained and records which contract version it was built against.

The suite covers two tiers:

- **Tier 1. Adapter unit tests.** Store loader config validation; identifier quoting rejection; native boolean handling; `custom_data` JSON round-trip; BIGINT-as-string coercion; hash-mismatch returns `record: null`; `updateSessionActivity` identity blocklist; UPSERT immutability for primary-key and per-install fields; `cleanupExpiredSessions` `deleted_count` accuracy
- **Tier 3. Full Auth lifecycle integration.** Every public Auth API path driven against the real Postgres backend through the store contract suite. Catches integration bugs that the unit tests cannot see (parent-side ordering, error envelope propagation, scheduled-cleanup interaction with active sessions)

Tier 2 (an in-process emulated backend) is not applicable to PostgreSQL. There is no embedded variant; emulation would require a separate test surface that would diverge from the real driver over time.
