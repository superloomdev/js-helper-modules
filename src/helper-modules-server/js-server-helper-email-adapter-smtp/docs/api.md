# API Reference - helper-email-adapter-smtp

## Overview

SMTP transport adapter for `helper-email`. Uses Nodemailer to deliver email messages via an SMTP server. Implements the adapter contract defined by the parent email module.

## Loader Pattern (Factory)

```javascript
import smtpAdapter from 'helper-email-adapter-smtp';

const adapter = smtpAdapter(Lib, {
  SMTP_HOST: 'smtp.example.com',
  SMTP_PORT: 587,
  SMTP_USER: 'user',
  SMTP_PASS: 'pass'
});
```

Each loader call returns an independent Adapter instance with its own Lib, CONFIG, ERRORS, and Validators. The Nodemailer transporter is lazy-loaded on first `send` call.

## Peer Dependencies

- `helper-utils` (injected as `Lib.Utils`)
- `helper-debug` (injected as `Lib.Debug`)

## Direct Dependencies

- `nodemailer` (npm package)

## Adapter Contract

### send(instance, message) -> { success, message_id, accepted, rejected, error }

Send an email message through the SMTP transport.

| Parameter | Type | Required | Description |
|---|---|---|---|
| instance | Object | yes | Request instance |
| message | Object | yes | Normalized message object from the parent email module |

**Returns:** `Promise<Object>` - `{ success, message_id, accepted, rejected, error }`

## Error Catalog

| Error Type | Message |
|---|---|
| `EMAIL_ADAPTER_SMTP_SEND_FAILED` | Failed to send email via SMTP transport |
| `EMAIL_ADAPTER_SMTP_ATTACHMENT_TOO_LARGE` | Attachment size exceeds the configured limit |
