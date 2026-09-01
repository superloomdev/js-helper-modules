# helper-email - AI Agent Reference

## Module Type
Server module (Class E - feature module with adapters). Email sending with swappable transport adapters. Owns the message model, deliverability headers, unsubscribe token signing, and the transport adapter contract.

## Peer Dependencies
- `helper-utils` (injected as `Lib.Utils`)
- `helper-debug` (injected as `Lib.Debug`)
- `helper-crypto` (injected as `Lib.Crypto`)

## Direct Dependencies
- `node:crypto` (Node.js built-in, for constant-time comparison in verifyUnsubscribeToken)

## Loader Pattern (Factory)

```javascript
import email from 'helper-email';
import smtpAdapter from 'helper-email-adapter-smtp';

Lib.Email = email(Lib, {
  Adapter: smtpAdapter(Lib, { /* adapter config */ }),
  DEFAULT_FROM: 'noreply@example.com',
  UNSUBSCRIBE_SECRET: 'your-hmac-secret-key'
});
```

Each loader call returns an independent Email interface with its own Lib, CONFIG, ERRORS, Validators, and adapter. Stateless - no per-instance resources.

## Adapter Contract (1 method)

### adapter.send(instance, message) -> { success, message_id, accepted, rejected, error } | async:yes
Deliver a normalized email message through the transport.

## Companion Files
- `email.config.js` - default config (Adapter, DEFAULT_FROM, DEFAULT_MESSAGE_TYPE, UNSUBSCRIBE_SECRET)
- `email.errors.js` - frozen error catalog (5 error types)
- `email.validators.js` - config and adapter contract validators singleton

## Config Keys
| Key | Type | Default | Description |
|---|---|---|---|
| Adapter | Object | null | Required. Ready-to-use transport adapter object (Class F) |
| DEFAULT_FROM | String | null | Optional. Default sender address if message.from is omitted |
| DEFAULT_MESSAGE_TYPE | String | 'transactional' | Default message type: 'transactional' or 'promotional' |
| UNSUBSCRIBE_SECRET | String | null | Required for sign/verify token functions. HMAC-SHA256 secret for unsubscribe tokens |

## Exported Functions (5 total)

### sendEmail(instance, message) -> { success, message_id, accepted, rejected, error } | async:yes
Validate, normalize, apply deliverability headers, and dispatch through the transport adapter. Supports text, HTML, and attachments.

### buildTransactionalHeaders() -> Object | async:no
Build headers for transactional messages. Returns `{ 'Precedence': 'transactional' }`.

### buildPromotionalHeaders(unsubscribe_url, unsubscribe_email) -> Object | async:no
Build headers for promotional messages with RFC 8058 one-click unsubscribe.

### signUnsubscribeToken(instance, email) -> { success, token, error } | async:no
Sign an email address into a URL-safe unsubscribe token using HMAC-SHA256. Token format: `base64url(email).base64url(hmac)`. Requires `UNSUBSCRIBE_SECRET` to be configured.

### verifyUnsubscribeToken(instance, token) -> { success, email, error } | async:no
Verify an unsubscribe token and extract the original email. Uses constant-time comparison to prevent timing attacks. Requires `UNSUBSCRIBE_SECRET` to be configured.

## Error Catalog

| Type | Message |
|---|---|
| EMAIL_ADAPTER_MISSING | Adapter is required and must be a ready-to-use object |
| EMAIL_ADAPTER_CONTRACT | Adapter does not implement the required send method |
| EMAIL_MESSAGE_INVALID | Email message is missing required fields |
| EMAIL_SEND_FAILED | Failed to send email |
| EMAIL_INVALID_TOKEN | Unsubscribe token is invalid or signature does not match |

## Testing

```bash
cd _test && npm install && npm test
```

Stub-adapter pattern: the test loader injects a recording adapter that captures sent messages and returns canned results. Crypto functions tested with real HMAC-SHA256.
