# Configuration. `helper-contact-phone`

Loader pattern, configuration keys, the adapter contract, reason codes, and dependency notes. For the function reference see [API Reference](https://github.com/superloomdev/superloom/blob/main/src/helper-modules-core/js-helper-contact-phone/docs/api.md). For the adapter contract schema and return envelope shapes see [Schemas](https://github.com/superloomdev/superloom/blob/main/src/helper-modules-core/js-helper-contact-phone/docs/schemas.md).

## On This Page

- [Loader Pattern](#loader-pattern)
- [Configuration Keys](#configuration-keys)
- [Adapter Contract](#adapter-contract)
- [Reason Codes](#reason-codes)
- [Environment Variables](#environment-variables)
- [Peer Dependencies](#peer-dependencies)
- [Direct Dependencies](#direct-dependencies)
- [Testing Tiers](#testing-tiers)

---

## Loader Pattern

The module is a factory. Each loader call returns an independent `ContactPhone` interface with its own `Lib`, `CONFIG`, `ERRORS`, `Validators`, and adapter, all captured in a closure. The loader validates `CONFIG` and the adapter contract at construction time so misconfiguration fails at startup, not on the first request.

```javascript
const ContactPhone = require('helper-contact-phone');

const contactPhone = ContactPhone(Lib, {
  Adapter: require('helper-contact-phone-adapter-basic')(Lib, {})
});
```

Loader call semantics:

- **First argument: `Lib`.** The dependency container. Must include `Utils` and `Debug`. The module uses `Lib.Utils` for type checks and null guards throughout.
- **Second argument: config overrides.** Merged over defaults from `phone.config.js` via `Object.assign`. The merged config is validated by `Validators.validateConfig` at startup. Must include `Adapter` as a ready-to-use adapter object.
- **Multiple loader calls return independent interfaces.** Two interfaces bound to different adapters can coexist in the same process. This is the recommended pattern when different parts of an application need different validation depth.

> **The adapter must be constructed before it is passed to the loader.** The loader does not call the adapter's constructor. It expects a ready-to-use object that already exposes the 3-method contract. Construct the adapter first, then pass the result as `Adapter`.

---

## Configuration Keys

One key, required.

| Key | Type | Default | Description |
|---|---|---|---|
| `Adapter` | `Object` | `null` | Ready-to-use adapter object from the chosen adapter package, constructed with its config before being passed here. The loader throws if this is `null` or not an object at startup |

The loader validates `Adapter` in two steps:

1. **`Validators.validateConfig`** checks that `Adapter` is not null or undefined and is an object. Throws `Error` at startup if the check fails.
2. **`Validators.validateAdapterContract`** checks that the adapter object exposes the three required methods. Throws `Error` at startup if any method is missing.

Both checks run before the public interface is returned, so a misconfigured loader call never produces a usable interface.

---

## Adapter Contract

Every adapter must implement three methods. The core module delegates all country-specific logic to these methods and holds no country data of its own.

### `adapter.listCountries()`

Return an array of lowercase ISO 3166-1 alpha-2 country codes that the adapter knows about.

**Signature:** `listCountries() -> [String]`

**Returns:** `String[]` - array of country code strings

### `adapter.getMetadata(country_code)`

Return phone metadata for a country, or `null` if the country is unknown.

**Signature:** `getMetadata(country_code) -> { calling_code, min_length, max_length } | null`

| Param | Type | Description |
|---|---|---|
| `country_code` | `String` | Lowercase ISO 3166-1 alpha-2 country code |

**Returns:** `{ calling_code, min_length, max_length }` or `null`

| Field | Type | Description |
|---|---|---|
| `calling_code` | `String` | Country calling code without the `+` prefix |
| `min_length` | `Number` | Minimum national number length |
| `max_length` | `Number` | Maximum national number length |

### `adapter.validateNumber(country_code, national_number)`

Validate a national phone number against the adapter rules. Return an object with `valid` and `reason`.

**Signature:** `validateNumber(country_code, national_number) -> { valid: Boolean, reason: String | null }`

| Param | Type | Description |
|---|---|---|
| `country_code` | `String` | Lowercase ISO 3166-1 alpha-2 country code |
| `national_number` | `String` | National phone number (no calling code) |

**Returns:** `{ valid: Boolean, reason: String | null }`

| Field | Type | Description |
|---|---|---|
| `valid` | `Boolean` | `true` if the number passed all checks |
| `reason` | `String` or `null` | Reason code on failure, `null` on success |

For the full schema definition including the contract validation logic see [Schemas](https://github.com/superloomdev/superloom/blob/main/src/helper-modules-core/js-helper-contact-phone/docs/schemas.md).

---

## Reason Codes

The adapter returns reason codes in the `reason` field of the `validateNumber` return object. The core module wraps the reason in its error catalog. Both adapters share the same reason code vocabulary.

| Code | Meaning | Emitted by basic adapter |
|---|---|---|
| `UNKNOWN_COUNTRY` | The country code is not in the adapter known list | Yes |
| `CHARSET` | The national number contains non-digit characters | Yes |
| `TOO_SHORT` | The national number is shorter than `min_length` | Yes |
| `TOO_LONG` | The national number is longer than `max_length` | Yes |
| `PATTERN` | The number does not match the country's number pattern | No |
| `NOT_ASSIGNED` | The number matches the pattern but is not in an assigned range | No |

The basic adapter checks country existence, charset, and length bounds only. It never emits `PATTERN` or `NOT_ASSIGNED`. The libphonenumber adapter adds pattern matching and assigned-range checks, so it can emit all six codes.

When the core module wraps a validation failure, the error object is:

```javascript
{
  type: 'CONTACT_PHONE_INVALID_NUMBER',
  message: <reason>  // the reason code string from the adapter
}
```

If the adapter returns a falsy `reason` (no reason provided), the message defaults to `'Validation failed'`.

---

## Environment Variables

None. The module never reads `process.env`. All configuration flows through the loader call.

> **Recommended pattern.** To drive adapter selection from the environment, read `process.env` in the application's bootstrap code, construct the appropriate adapter, and pass it as `Adapter` to the loader. This keeps the module testable without polluting the environment in tests.

---

## Peer Dependencies

Two peer modules in the `Lib` container:

| Peer | Alias | Purpose |
|---|---|---|
| `helper-utils` | `@superloomdev/js-helper-utils` | Type checks (`isString`, `isNullOrUndefined`, `isObject`, `isFunction`) and null guards used throughout the core |
| `helper-debug` | `@superloomdev/js-helper-debug` | Structured logging. Injected into `Lib` but the core does not call it directly in the current version |

Both must be loaded and placed on the `Lib` container before the phone module loader is called:

```javascript
Lib.Utils = require('helper-utils')(Lib, {});
Lib.Debug = require('helper-debug')(Lib, {});
const contactPhone = require('helper-contact-phone')(Lib, { Adapter });
```

The adapter packages are declared as `optionalPeerDependencies` in `package.json` because the caller chooses which one to use. At least one adapter must be installed and constructed for the module to function.

---

## Direct Dependencies

None. The module's `package.json` declares no `dependencies`. The supply chain audit ends at this package and its peer modules.

---

## Testing Tiers

The module ships a single test tier:

| Tier | Runtime | When to run | CI Status |
|---|---|---|---|
| **Unit** | Node.js `node --test` | Every commit, every CI run | [![Test](https://github.com/superloomdev/superloom/actions/workflows/ci-helper-modules.yml/badge.svg?branch=main)](https://github.com/superloomdev/superloom/actions/workflows/ci-helper-modules.yml) |

Tests use a stub adapter (`_test/stub-adapter.js`) with a small known country set covering different calling codes, length bounds, and phone number lengths. No Docker container, no service emulator, no real adapter package is required.

```bash
cd _test && npm install && npm test
```

The test runner uses Node's built-in test framework (`node --test` plus `node:assert/strict`). Test runtime is sub-second.

For the framework-wide testing architecture see [Module Testing](https://github.com/superloomdev/superloom/blob/main/docs/testing/module-testing.md).
