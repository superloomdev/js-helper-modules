# Configuration - helper-validate-email

## Loader Pattern

```javascript
import validateEmail from 'helper-validate-email';

Lib.ValidateEmail = validateEmail(Lib, {
  SMTP_TIMEOUT_MS: 5000,
  SMTP_FROM_ADDRESS: 'verify@example.com'
});
```

Each loader call returns an independent ValidateEmail interface. The module is stateless - no per-instance resources are held.

## Config Keys

| Key | Type | Default | Required | Description |
|---|---|---|---|---|
| SMTP_TIMEOUT_MS | Number | 5000 | no | TCP connect and per-command response timeout for SMTP probes, in milliseconds |
| SMTP_FROM_ADDRESS | String | 'verify@superloom.dev' | no | MAIL FROM address used for SMTP RCPT TO probes |
| SMTP_MAX_MX_ATTEMPTS | Number | 3 | no | Maximum number of MX hosts to try before giving up |
| DNS_TIMEOUT_MS | Number | 3000 | no | DNS resolution timeout, in milliseconds |
| CHECK_CATCH_ALL | Boolean | true | no | Whether to probe for catch-all domains after a successful RCPT TO |
| CATCH_ALL_TEST_PREFIX | String | 'zzz-probe-' | no | Prefix for the random catch-all probe address |
| GREYLIST_RETRY_MS | Number | 0 | no | Greylisting retry delay in milliseconds. 0 = no retry (returns 'unknown' verdict). When set to a positive number, retries once after the delay |
| EHLO_FQDN | String | null | no | EHLO FQDN sent in the SMTP greeting. When null, derives from SMTP_FROM_ADDRESS domain |
| DNS_SERVERS | Array | null | no | Custom DNS servers for MX/A resolution. When null, uses system defaults. Must be an array of IP strings |

## Peer Dependencies

| Package | Alias | Injected As |
|---|---|---|
| `@superloomdev/js-helper-utils` | `helper-utils` | `Lib.Utils` |
| `@superloomdev/js-helper-debug` | `helper-debug` | `Lib.Debug` |

## Direct Dependencies

None. Uses only Node.js built-in modules:
- `node:dns/promises` - MX record resolution
- `node:dns` - custom DNS resolver support
- `node:net` - SMTP TCP connections
- `node:crypto` - catch-all probe UUID generation

## Runtime Requirements

- Node.js 24+
- Network access to DNS servers (port 53) for MX resolution
- Network access to MX servers (port 25) for SMTP probes

## SMTP Verification Limitations

SMTP mailbox verification is inherently unreliable. The module documents these limitations honestly:

- **Greylisting**: first attempt returns 4xx; the module returns an 'unknown' verdict (reachable: null) by default. When `GREYLIST_RETRY_MS` is set to a positive number, the probe retries once after the configured delay
- **Catch-all domains**: some servers accept all addresses (250 for everything). When `CHECK_CATCH_ALL` is true (default), the module detects this and sets `catch_all: true` in the result
- **Provider blocks**: Gmail, Yahoo, and others refuse RCPT TO probes from unknown IPs
- **Reputation**: repeated probing can hurt your sending IP reputation

The result is a signal, not a guarantee. For production email sending, rely on provider bounce/complaint feedback rather than pre-send SMTP verification.
