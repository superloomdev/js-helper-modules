# helper-crypto - AI Agent Reference

## Module Type
Server module. Node.js-specific cryptography helpers using the built-in `crypto` module.

## Peer Dependencies
- `helper-utils` (injected as `Lib.Utils`)

## Direct Dependencies
- `crypto` (Node.js built-in)

## Loader Pattern (Factory)

```javascript
import crypto from 'helper-crypto';

Lib.Crypto = crypto(Lib, { /* config overrides */ });
```

Each loader call returns an independent Crypto interface with its own `Lib`, `CONFIG`, `ERRORS`, and `Validators`. Stateless - no per-instance resources. The shared Node.js `crypto` module is cached at module level.
Companion files: `crypto.config.js`, `crypto.errors.js` (empty frozen catalog), `crypto.validators.js` (no-op `validateConfig`).

## Config Keys
| Key | Type | Default | Description |
|---|---|---|---|
| BASE36_CHARSET | String | `'0123456789abcdefghijklmnopqrstuvwxyz'` | Alphabet for base-36 conversion |
| PASSWORD_HASH_COST_N | Number | `16384` | scrypt CPU/memory cost parameter |
| PASSWORD_HASH_BLOCK_SIZE_R | Number | `8` | scrypt block size parameter |
| PASSWORD_HASH_PARALLELIZATION_P | Number | `1` | scrypt parallelization parameter |
| PASSWORD_HASH_KEY_LENGTH_BYTES | Number | `64` | scrypt output key length in bytes |
| PASSWORD_HASH_SALT_LENGTH_BYTES | Number | `16` | scrypt salt length in bytes |

## Exported Functions

### Random & UUIDs
generateRandomString(charset, length) → String | async:no - cryptographically secure random from charset
generateTimeRandomString(time, min_length, epoch_offset) → String | async:no - time-prefixed base36 random
generateUUID() → String | async:no - standard UUID v4
generateCompactUUID() → String | async:no - UUID in base36 (25 chars)

### Hashing
md5String(str) → String | async:no - 32-char hex MD5 (use only for checksums, NOT security)
sha256String(str, secret?) → String | async:no - 64-char hex HMAC-SHA256

### Password Hashing
generatePasswordHash(password) → String | async:no - self-describing scrypt hash (`scrypt$N$r$p$salt$digest`)
checkPassword(password, stored_hash) → Boolean | async:no - verify password against stored hash; false on malformed

### AES Encryption (AES-128-CBC)
aesEncrypt(str, secret) → String | async:no - returns hex ciphertext
aesDecrypt(str, secret) → String | async:no - returns plaintext from hex

### Base Conversion
intToBase36(num) → String | async:no
base36ToInt(str) → Number | async:no

### Base64
stringToBase64(str) → String | async:no
base64ToString(str) → String | async:no
bufferToBase64(obj) → String | async:no
urlEncodeBase64(str) → String | async:no - URL-safe variant (+/= → -_)
urlDecodeBase64(str) → String | async:no

## Patterns
- **Server-only:** Uses Node.js `crypto` module. For browser/client use `helper-client-crypto` instead
- **AES key derivation:** Uses MD5 of secret for key, MD5 of key+secret for IV - consistent with legacy encryption contracts
- **MD5 warning:** MD5 is cryptographically broken. Only use `md5String` for checksums/legacy compatibility, never for passwords or security
- **HMAC-SHA256:** Use `sha256String(str, secret)` for secure hashing with a secret
- **Password hashing:** `generatePasswordHash` is the only correct choice for password storage. `md5String` and `sha256String` are NOT password hashes. The output format is self-describing (`scrypt$N$r$p$salt$digest`) so parameters can be raised later and old hashes still verify
- **Uses Lib.Utils:** For input validation (e.g., `Lib.Utils.isEmpty`, `Lib.Utils.isNullOrUndefined`)
