# helper-email-adapter-smtp - AI Agent Reference

## Module Type
Server module (Class F - transport adapter). SMTP transport adapter for `helper-email` using Nodemailer. Implements the adapter contract: one `send` method.

## Peer Dependencies
- `helper-utils` (injected as `Lib.Utils`)
- `helper-debug` (injected as `Lib.Debug`)

## Direct Dependencies
- `nodemailer` (npm, lazy-loaded on first send)

## Loader Pattern (Factory)

```javascript
import smtpAdapter from 'helper-email-adapter-smtp';

const adapter = smtpAdapter(Lib, {
  SMTP_HOST: 'smtp.example.com',
  SMTP_PORT: 587,
  SMTP_SECURE: false,
  SMTP_USER: 'user',
  SMTP_PASS: 'pass',
  SMTP_DKIM_DOMAIN: 'example.com',
  SMTP_DKIM_SELECTOR: 'mail',
  SMTP_DKIM_PRIVATE_KEY: '-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----',
  SMTP_MAX_ATTACHMENT_SIZE_MB: 25,
  SMTP_MAX_TOTAL_ATTACHMENT_SIZE_MB: 25
});
```

Each loader call returns an independent Adapter instance. The Nodemailer transporter is lazy-loaded on first `send` and cached at module scope keyed by the SMTP connection config.

## Config Keys
| Key | Type | Default | Description |
|---|---|---|---|
| SMTP_HOST | String | null | Required. SMTP server hostname |
| SMTP_PORT | Number | 587 | SMTP server port (587 for STARTTLS, 465 for SSL) |
| SMTP_SECURE | Boolean | false | Use SSL/TLS directly (port 465). When false, STARTTLS is used |
| SMTP_USER | String | null | SMTP auth username (optional for open relays) |
| SMTP_PASS | String | null | SMTP auth password (optional for open relays) |
| SMTP_DKIM_DOMAIN | String | null | DKIM signing domain. All three DKIM keys must be provided together |
| SMTP_DKIM_SELECTOR | String | null | DKIM key selector |
| SMTP_DKIM_PRIVATE_KEY | String | null | PEM-encoded DKIM private key |
| SMTP_MAX_ATTACHMENT_SIZE_MB | Number | 0 | Max size per individual attachment in MB. 0 = no limit |
| SMTP_MAX_TOTAL_ATTACHMENT_SIZE_MB | Number | 0 | Max total size of all attachments in MB. 0 = no limit |

## Exported Functions (1 total)

### send(instance, message) -> { success, message_id, accepted, rejected, error } | async:yes
Deliver a normalized email message through the SMTP transport. Validates attachment sizes before sending. Signs with DKIM when configured.

## Error Catalog

| Type | Message |
|---|---|
| EMAIL_ADAPTER_SMTP_SEND_FAILED | Failed to send email via SMTP transport |
| EMAIL_ADAPTER_SMTP_CONFIG_INVALID | SMTP adapter configuration is invalid |
| ATTACHMENT_TOO_LARGE | Attachment size exceeds the configured limit |

## Testing

```bash
cd _test && npm install && npm test
```

Uses an in-process SMTP server (smtp-server npm package) for real send testing. No external SMTP credentials required.
