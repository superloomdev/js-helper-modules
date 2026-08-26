# Configuration. `js-server-helper-nosql-mongodb-admin`

Every loader option, every environment variable, dependency expectations, and the runtime patterns that combine them. For the function reference see [API Reference](https://github.com/superloomdev/superloom/blob/main/src/helper-modules-server/js-server-helper-nosql-mongodb-admin/docs/api.md).

The page is split into two halves: a **reference** block (what you can set) at the top, and a **patterns** block (worked examples that combine those settings) at the bottom.

## On This Page

**Reference**

- [Loader Pattern](#loader-pattern)
- [Configuration Keys](#configuration-keys)
- [Environment Variables](#environment-variables)
- [Peer Dependencies (Injected)](#peer-dependencies-injected)
- [Direct Dependencies (Bundled)](#direct-dependencies-bundled)

**Patterns and Examples**

- [Least-Privilege Credential Separation](#least-privilege-credential-separation)
- [Required MongoDB Roles](#required-mongodb-roles)
- [Testing Tiers](#testing-tiers)

---

## Loader Pattern

The module is a factory. Each loader call returns an independent public interface with its own `MongoClient`, config, and lifecycle. The driver (`mongodb`) is cached at the module scope and shared across instances because it is stateless. Only the client and database references hold state.

```javascript
Lib.MongoDBAdmin = require('@superloomdev/js-server-helper-nosql-mongodb-admin')(Lib, {
  CONNECTION_STRING: process.env.MONGODB_ADMIN_CONNECTION_STRING,
  DATABASE_NAME:     process.env.MONGODB_ADMIN_DATABASE
});
```

Loader call semantics:

- The first argument is the `Lib` container. The module reads `Lib.Utils`, `Lib.Debug`, and `Lib.Instance` from it (see [Peer Dependencies](#peer-dependencies-injected)).
- The second argument is the config override. Missing keys fall back to defaults.
- The `MongoClient` is **not** created at loader time. It is created lazily on the first call. This keeps cold-start fast in serverless deployments.

---

## Configuration Keys

| Key | Type | Required | Default | Description |
|---|---|---|---|---|
| `CONNECTION_STRING` | `String` | Yes | `'mongodb://localhost:27018'` | MongoDB connection string for the admin-role user. Standard `mongodb://...` or `mongodb+srv://...` URI. Must authenticate with a user that has `dbAdmin` or `root` role |
| `DATABASE_NAME` | `String` | Yes | `'test'` | Database name to bind the loader instance to |
| `CONNECT_TIMEOUT_MS` | `Number` | No | `5000` | Connection timeout in milliseconds. Also used as `serverSelectionTimeoutMS` |

`CONNECTION_STRING` defaults to localhost for development. Every production deployment must override it with a connection string that authenticates as an admin-role user. The default port is 27018 (offset from the data-plane module's 27017) so parallel local runs never collide.

---

## Environment Variables

Environment variables are consumed only by `_test/loader.js`. The module itself never reads `process.env` directly. All configuration flows through the loader.

| Variable | Used by | Description |
|---|---|---|
| `MONGODB_ADMIN_CONNECTION_STRING` | `_test/loader.js` | Connection string for the test MongoDB instance |
| `MONGODB_ADMIN_DATABASE` | `_test/loader.js` | Database name for testing |

---

## Peer Dependencies (Injected)

The module receives these through the `Lib` container, not through `dependencies` in `package.json`. The project loader is responsible for loading them and passing them in.

| Peer | Package | Role |
|---|---|---|
| `Lib.Utils` | `@superloomdev/js-helper-utils` | Utility functions (`isNullOrUndefined`, `isEmpty`, `getUnixTimeInMilliSeconds`) |
| `Lib.Debug` | `@superloomdev/js-helper-debug` | Logging and performance audit |
| `Lib.Instance` | `@superloomdev/js-server-helper-instance` | Process cleanup registration. The module registers its connection teardown with `Lib.Instance.addProcessCleanupRoutine` on first client creation. The deployment's `CLOSE_ON_CLEANUP` config on `helper-instance` controls when teardown runs, not this module |

The `Lib.Instance` peer is required. The module registers its connection teardown with `Lib.Instance.addProcessCleanupRoutine` on first client creation. The deployment's `CLOSE_ON_CLEANUP` config lives on `helper-instance`, not on this module.

---

## Direct Dependencies (Bundled)

| Package | Version | Role |
|---|---|---|
| `mongodb` | `^6.0.0` | Official MongoDB Node.js driver. Provides `MongoClient` for admin commands |

---

## Least-Privilege Credential Separation

The admin module uses a **separate connection string** from the data-plane `nosql-mongodb` module. This is intentional:

- The data-plane module connects with a read/write user. It handles CRUD, queries, and transactions.
- The admin module connects with a `dbAdmin` or `root` user. It handles collection creation, index management, and TTL configuration.
- Separate config means separate credentials. The elevated set never ships in the runtime deployment.

In a typical project loader:

```javascript
// Data-plane: read/write user
Lib.MongoDB = require('@superloomdev/js-server-helper-nosql-mongodb')(Lib, {
  CONNECTION_STRING: process.env.MONGODB_CONNECTION_STRING,
  DATABASE_NAME:     process.env.MONGODB_DATABASE
});

// Control-plane: admin user (only loaded in provisioning scripts or migration runners)
Lib.MongoDBAdmin = require('@superloomdev/js-server-helper-nosql-mongodb-admin')(Lib, {
  CONNECTION_STRING: process.env.MONGODB_ADMIN_CONNECTION_STRING,
  DATABASE_NAME:     process.env.MONGODB_ADMIN_DATABASE
});
```

---

## Required MongoDB Roles

The admin connection string must authenticate as a user with one of the following roles:

| Role | Scope | Sufficient for |
|---|---|---|
| `dbAdmin` | Single database | `createCollection`, `deleteCollection`, `createIndexes`, `enableTtlIndex`, `listIndexes`, `ping` |
| `root` | All databases | All admin operations (use only when a single-database role is insufficient) |

For MongoDB Atlas, assign the `dbAdmin` built-in role to a dedicated user. For self-hosted MongoDB, create a user with `dbAdmin` on the target database:

```javascript
use admin
db.createUser({
  user: 'superloom_admin',
  pwd: 'secure_password',
  roles: [{ role: 'dbAdmin', db: 'your_database' }]
})
```

---

## Testing Tiers

The test suite uses Docker with a single-node MongoDB replica set (image `mongo:8`). The compose project is named `superloom-test-mongodb-admin` and uses host port 27018 to avoid collisions with the data-plane module's tests.

| Tier | Command | What it covers |
|---|---|---|
| Unit (Docker) | `npm test` from `_test/` | All provisioning functions, idempotency, TTL conflict, validator TypeErrors, config validation, operational failure envelope |
