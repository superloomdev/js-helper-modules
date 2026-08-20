# API Reference - helper-contact-email

## Overview

Email address validation, sanitization, canonicalization, and disposable domain checking. Port module requiring a swappable adapter for validation depth.

## Loader

```javascript
const Adapter = require('helper-contact-email-adapter-basic')(Lib, {});
Lib.ContactEmail = require('helper-contact-email')(Lib, { Adapter });
```

## Exported Functions (7 total)

All functions are synchronous and client-side safe.

### Sanitization

| Function | Signature | Returns |
|---|---|---|
| `sanitizeEmail` | `sanitizeEmail(email)` | `String` - cleaned email |

### String Utilities

| Function | Signature | Returns |
|---|---|---|
| `getDomainPart` | `getDomainPart(email)` | `String\|null` - domain after @ |
| `getLocalPart` | `getLocalPart(email)` | `String\|null` - local part before @ |

### Validation

| Function | Signature | Returns |
|---|---|---|
| `validateSyntax` | `validateSyntax(email)` | `{ success, error }` |
| `validateDisposable` | `validateDisposable(email)` | `{ success, error }` |

### Predicates

| Function | Signature | Returns |
|---|---|---|
| `isDisposableDomain` | `isDisposableDomain(domain)` | `Boolean` |

### Canonicalization

| Function | Signature | Returns |
|---|---|---|
| `canonicalize` | `canonicalize(email)` | `String\|null` - canonicalized email |

## Important: canonicalize is for duplicate detection only

`canonicalize` folds Gmail dots and plus-tags (e.g., `user.name+tag@gmail.com` becomes `username@gmail.com`). This is for detecting duplicate accounts. **Never store or deliver the canonicalized address.** It loses the user's actual address.

## Disposable checking

`validateDisposable` and `isDisposableDomain` are separately exposed. The application decides when to call them. There is no `ALLOW_DISPOSABLE` config. The basic adapter always returns `false` (no disposable data). The extended adapter checks against a committed list of ~5K domains.

## Error Codes

| Type | Message | Emitted by |
|---|---|---|
| `CONTACT_EMAIL_EMPTY` | Email address is empty | both adapters |
| `CONTACT_EMAIL_NO_AT` | Email address must contain an @ symbol | both adapters |
| `CONTACT_EMAIL_MULTIPLE_AT` | Email address must contain exactly one @ symbol | both adapters |
| `CONTACT_EMAIL_EMPTY_LOCAL` | The part before @ must not be empty | both adapters |
| `CONTACT_EMAIL_EMPTY_DOMAIN` | The part after @ must not be empty | both adapters |
| `CONTACT_EMAIL_INVALID_SYNTAX` | Email address format is invalid | both adapters |
| `CONTACT_EMAIL_TOO_LONG` | Email address exceeds the maximum permitted length | core, before either adapter |
| `CONTACT_EMAIL_LOCAL_TOO_LONG` | The part before @ exceeds the maximum permitted length | core, before either adapter |
| `CONTACT_EMAIL_DOMAIN_TOO_LONG` | The part after @ exceeds the maximum permitted length | core, before either adapter |
| `CONTACT_EMAIL_DISPOSABLE` | Email domain is a known disposable email provider | extended only |

The three length codes are emitted by the core rather than by an adapter. RFC 5321 lengths are structural facts that do not vary with adapter depth, so bounding them once in the core keeps both adapters in agreement on every length verdict and keeps the limits configurable through `EMAIL_MAX_LENGTH`, `LOCAL_MAX_LENGTH`, and `DOMAIN_MAX_LENGTH`.
