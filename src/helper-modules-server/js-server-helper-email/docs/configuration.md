# Configuration - helper-email

## Loader Pattern

```javascript
import email from 'helper-email';
import smtpAdapter from 'helper-email-adapter-smtp';

Lib.Email = email(Lib, {
  Adapter: smtpAdapter(Lib, {
    SMTP_HOST: 'smtp.example.com',
    SMTP_PORT: 587
  }),
  DEFAULT_FROM: 'noreply@example.com',
  DEFAULT_MESSAGE_TYPE: 'transactional'
});
```

Each loader call returns an independent Email interface. The module is stateless - no per-instance resources are held.

## Config Keys

| Key | Type | Default | Required | Description |
|---|---|---|---|---|
| Adapter | Object | null | yes | Ready-to-use transport adapter object (must implement `send(instance, message)`) |
| DEFAULT_FROM | String | null | no | Default sender address if message.from is omitted |
| DEFAULT_MESSAGE_TYPE | String | 'transactional' | no | Default message type: 'transactional' or 'promotional' |
| UNSUBSCRIBE_SECRET | String | null | conditional | HMAC-SHA256 secret for sign/verify unsubscribe tokens. Required when using signUnsubscribeToken or verifyUnsubscribeToken |

## Peer Dependencies

| Package | Alias | Injected As |
|---|---|---|
| `@superloomdev/js-helper-utils` | `helper-utils` | `Lib.Utils` |
| `@superloomdev/js-helper-debug` | `helper-debug` | `Lib.Debug` |
| `@superloomdev/js-server-helper-crypto` | `helper-crypto` | `Lib.Crypto` |

## Direct Dependencies

- `node:crypto` (Node.js built-in, for constant-time comparison in verifyUnsubscribeToken)

The transport adapter (Class F) is injected by the caller.

## Runtime Requirements

- Node.js 24+
- A configured transport adapter (e.g. `helper-email-adapter-smtp`)

## Available Adapters

- `helper-email-adapter-smtp` - SMTP transport via Nodemailer

## Deliverability Headers

The module applies headers based on message_type:

- **transactional** (default): `Precedence: transactional`
- **promotional**: `Precedence: bulk`, `List-Unsubscribe`, `List-Unsubscribe-Post` (RFC 8058 one-click unsubscribe, required by Gmail and Yahoo for bulk senders)

Caller-supplied custom headers (in `message.headers`) take precedence over deliverability headers.
