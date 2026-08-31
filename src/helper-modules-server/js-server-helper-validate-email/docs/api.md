# API Reference - helper-validate-email

## Overview

Email deliverability verification using Node.js `dns` and `net` modules. Checks whether a domain can receive email (MX records) and whether a specific mailbox is reachable (SMTP RCPT TO probe).

## Loader Pattern (Factory)

```javascript
import validateEmail from 'helper-validate-email';

Lib.ValidateEmail = validateEmail(Lib, { /* config overrides */ });
```

Each loader call returns an independent ValidateEmail interface with its own Lib, CONFIG, ERRORS, and Validators. Stateless - no per-instance resources.

## Peer Dependencies

- `helper-utils` (injected as `Lib.Utils`)
- `helper-debug` (injected as `Lib.Debug`)

## Direct Dependencies

- `node:dns/promises` (Node.js built-in)
- `node:dns` (Node.js built-in, for custom DNS resolver)
- `node:net` (Node.js built-in)
- `node:crypto` (Node.js built-in, for catch-all probe UUIDs)

## Exported Functions

### checkDomainMx(instance, domain)

Check whether a domain can receive email by resolving its MX records. Handles null MX (RFC 7505) and A/AAAA fallback (RFC 5321 section 5.1).

| Parameter | Type | Required | Description |
|---|---|---|---|
| instance | Object | yes | Request instance |
| domain | String | yes | Domain name to check |

**Returns:** `Promise<Object>` - `{ success, has_mx, mx_records, error }`

- `success` (Boolean): true if DNS resolution completed without error
- `has_mx` (Boolean): true when MX records exist OR an A/AAAA fallback record exists
- `mx_records` (Array): array of `{ priority, exchange }` sorted by priority, empty if none
- `error` (Object|null): error envelope on failure

**Throws:** `TypeError` if domain is not a non-empty string

### getDomainMx(instance, domain)

Resolve MX records for a domain without SMTP probing. Returns the raw MX record array sorted by priority.

| Parameter | Type | Required | Description |
|---|---|---|---|
| instance | Object | yes | Request instance |
| domain | String | yes | Domain name to resolve |

**Returns:** `Promise<Object>` - `{ success, mx_records, error }`

- `success` (Boolean): true if DNS resolution completed without error
- `mx_records` (Array): array of `{ priority, exchange }` sorted by priority, empty if none
- `error` (Object|null): error envelope on failure

**Throws:** `TypeError` if domain is not a non-empty string

### checkMailbox(instance, email)

Check whether a specific mailbox is reachable by connecting to the domain's MX server and running an SMTP RCPT TO probe.

Best-effort: greylisting, catch-all domains, and provider blocks (Gmail, Yahoo) make SMTP verification inherently unreliable. The result is a signal, not a guarantee.

| Parameter | Type | Required | Description |
|---|---|---|---|
| instance | Object | yes | Request instance |
| email | String | yes | Email address to verify |

**Returns:** `Promise<Object>` - `{ success, reachable, catch_all, reason, error }`

- `success` (Boolean): true if the probe completed without operational error
- `reachable` (Boolean|null): true if mailbox accepted (250/251), false if rejected (550-553), null if inconclusive (greylisted)
- `catch_all` (Boolean): true when the domain accepts all addresses regardless of mailbox existence. Only set when `CHECK_CATCH_ALL` is true and `reachable` is true
- `reason` (String): human-readable explanation of the result
- `error` (Object|null): error envelope on failure

**Throws:** `TypeError` if email is not a non-empty string

### checkEmailDeliverability(instance, email)

Run a composite deliverability check: syntax validation, MX record resolution, and SMTP mailbox probe. Returns a single envelope with all results.

| Parameter | Type | Required | Description |
|---|---|---|---|
| instance | Object | yes | Request instance |
| email | String | yes | Email address to verify |

**Returns:** `Promise<Object>` - `{ success, syntax_valid, has_mx, mailbox_reachable, catch_all, reason, error }`

- `success` (Boolean): true if the check completed without operational error
- `syntax_valid` (Boolean): true if email passes basic syntax check
- `has_mx` (Boolean): true if domain has MX records or A/AAAA fallback
- `mailbox_reachable` (Boolean|null): true if SMTP probe accepted the mailbox, false if rejected, null if greylisted
- `catch_all` (Boolean): true when the domain is catch-all. Only set when `CHECK_CATCH_ALL` is true and `mailbox_reachable` is true
- `reason` (String): human-readable explanation of the result
- `error` (Object|null): error envelope on failure

**Throws:** `TypeError` if email is not a non-empty string

## Error Catalog

| Error Type | Message |
|---|---|
| `VALIDATE_EMAIL_INVALID_DOMAIN` | Domain is empty or not a valid domain string |
| `VALIDATE_EMAIL_INVALID_EMAIL` | Email address is empty or not a valid email string |
| `VALIDATE_EMAIL_DNS_FAILED` | DNS resolution failed for domain |
| `VALIDATE_EMAIL_NO_MX` | No MX records found and no A/AAAA fallback for domain |
| `VALIDATE_EMAIL_SMTP_CONNECT_FAILED` | Could not connect to any MX server |
| `VALIDATE_EMAIL_SMTP_TIMEOUT` | SMTP probe timed out |
| `VALIDATE_EMAIL_SMTP_PROTOCOL_ERROR` | Unexpected SMTP response during verification |

## Relationship to contact-email

The existing `helper-contact-email` module (Class A, browser-compatible) handles syntax validation and disposable domain checking. This module (Class B, server-only) adds MX record resolution and SMTP mailbox probing. An application uses both: `contact-email` for syntax, `validate-email` for deliverability.
