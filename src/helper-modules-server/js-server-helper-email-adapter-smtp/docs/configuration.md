# Configuration - helper-email-adapter-smtp

## Loader Pattern

```javascript
import smtpAdapter from 'helper-email-adapter-smtp';

const adapter = smtpAdapter(Lib, {
  SMTP_HOST: 'smtp.example.com',
  SMTP_PORT: 587,
  SMTP_SECURE: false,
  SMTP_USER: 'user',
  SMTP_PASS: 'pass'
});
```

## Config Keys

| Key | Type | Default | Required | Description |
|---|---|---|---|---|
| SMTP_HOST | String | null | yes | SMTP server hostname |
| SMTP_PORT | Number | 587 | no | SMTP server port (587 for STARTTLS, 465 for SSL) |
| SMTP_SECURE | Boolean | false | no | Use SSL/TLS directly (true for port 465) |
| SMTP_USER | String | null | no | SMTP authentication username |
| SMTP_PASS | String | null | no | SMTP authentication password |
| SMTP_DKIM_DOMAIN | String | null | no | DKIM signing domain. All three DKIM keys must be provided together |
| SMTP_DKIM_SELECTOR | String | null | no | DKIM key selector |
| SMTP_DKIM_PRIVATE_KEY | String | null | no | PEM-encoded DKIM private key |
| SMTP_MAX_ATTACHMENT_SIZE_MB | Number | 0 | no | Max size per individual attachment in MB. 0 = no limit |
| SMTP_MAX_TOTAL_ATTACHMENT_SIZE_MB | Number | 0 | no | Max total size of all attachments in MB. 0 = no limit |

## Peer Dependencies

| Package | Alias | Injected As |
|---|---|---|
| `@superloomdev/js-helper-utils` | `helper-utils` | `Lib.Utils` |
| `@superloomdev/js-helper-debug` | `helper-debug` | `Lib.Debug` |

## Direct Dependencies

| Package | Version | Description |
|---|---|---|
| `nodemailer` | ^6.9.0 | SMTP client library |

## Runtime Requirements

- Node.js 24+
- Network access to the SMTP server
