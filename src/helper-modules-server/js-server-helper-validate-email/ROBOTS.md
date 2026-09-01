# helper-validate-email - AI Agent Reference

## Module Type
Server module. Node.js-specific email deliverability verification using the built-in `dns` and `net` modules.

## Peer Dependencies
- `helper-utils` (injected as `Lib.Utils`)
- `helper-debug` (injected as `Lib.Debug`)

## Direct Dependencies
- `node:dns/promises` (Node.js built-in)
- `node:dns` (Node.js built-in, for custom DNS resolver)
- `node:net` (Node.js built-in)
- `node:crypto` (Node.js built-in, for catch-all probe UUIDs)

## Loader Pattern (Factory)

```javascript
import validateEmail from 'helper-validate-email';

Lib.ValidateEmail = validateEmail(Lib, { /* config overrides */ });
```

Each loader call returns an independent ValidateEmail interface with its own Lib, CONFIG, ERRORS, and Validators. Stateless - no per-instance resources.

## Companion Files
- `validate-email.config.js` - default config (SMTP_TIMEOUT_MS, SMTP_FROM_ADDRESS, SMTP_MAX_MX_ATTEMPTS, CHECK_CATCH_ALL, CATCH_ALL_TEST_PREFIX, GREYLIST_RETRY_MS, EHLO_FQDN, DNS_SERVERS)
- `validate-email.errors.js` - frozen error catalog (7 error types)
- `validate-email.validators.js` - config validators singleton

## Config Keys
| Key | Type | Default | Description |
|---|---|---|---|
| SMTP_TIMEOUT_MS | Number | 5000 | SMTP probe timeout in milliseconds |
| SMTP_FROM_ADDRESS | String | 'verify@superloom.dev' | MAIL FROM address for SMTP probes |
| SMTP_MAX_MX_ATTEMPTS | Number | 3 | Maximum MX hosts to try before giving up |
| CHECK_CATCH_ALL | Boolean | true | Whether to probe for catch-all domains after a successful RCPT TO |
| CATCH_ALL_TEST_PREFIX | String | 'zzz-probe-' | Prefix for the random catch-all probe address |
| GREYLIST_RETRY_MS | Number | 0 | Greylisting retry delay in milliseconds. 0 = no retry (returns 'unknown' verdict) |
| EHLO_FQDN | String | null | EHLO FQDN. When null, derives from the domain being probed |
| DNS_SERVERS | Array | null | Custom DNS servers for MX/A resolution. When null, uses system defaults |

## Exported Functions (4 total)

### checkDomainMx(instance, domain) -> { success, has_mx, mx_records, error } | async:yes
Resolve MX records for a domain. Handles null MX (RFC 7505) and A/AAAA fallback (RFC 5321).

### getDomainMx(instance, domain) -> { success, mx_records, error } | async:yes
Thin getter: resolve MX records only, no SMTP probe. Returns raw record array sorted by priority.

### checkMailbox(instance, email) -> { success, reachable, catch_all, reason, error } | async:yes
Full SMTP RCPT TO probe against the domain's MX servers. Best-effort: greylisting, catch-all, and provider blocks make this inherently unreliable.

The `reachable` field can be `true` (mailbox accepted), `false` (mailbox rejected), or `null` (unknown - greylisted or transient failure). The `catch_all` field is `true` when the domain accepts all addresses regardless of mailbox existence.

### checkEmailDeliverability(instance, email) -> { success, syntax_valid, has_mx, mailbox_reachable, catch_all, reason, error } | async:yes
Composite: syntax check + MX check + SMTP probe in one call. `mailbox_reachable` can be `true`, `false`, or `null` (greylisted).

## Error Catalog

| Type | Message |
|---|---|
| VALIDATE_EMAIL_INVALID_DOMAIN | Domain is empty or not a valid domain string |
| VALIDATE_EMAIL_INVALID_EMAIL | Email address is empty or not a valid email string |
| VALIDATE_EMAIL_DNS_FAILED | DNS resolution failed for domain |
| VALIDATE_EMAIL_NO_MX | No MX records found and no A/AAAA fallback for domain |
| VALIDATE_EMAIL_SMTP_CONNECT_FAILED | Could not connect to any MX server |
| VALIDATE_EMAIL_SMTP_TIMEOUT | SMTP probe timed out |
| VALIDATE_EMAIL_SMTP_PROTOCOL_ERROR | Unexpected SMTP response during verification |

## Testing

```bash
cd _test && npm install && npm test
```

DNS stubs and an in-process SMTP server. No external services required.
