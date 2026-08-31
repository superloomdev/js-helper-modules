# API Reference - helper-email

## Overview

Email sending module with swappable transport adapters. Owns the message model, deliverability headers, and the transport adapter contract. The caller passes a ready-to-use adapter object as `CONFIG.Adapter`.

## Loader Pattern (Factory)

```javascript
import email from 'helper-email';
import smtpAdapter from 'helper-email-adapter-smtp';

Lib.Email = email(Lib, {
  Adapter: smtpAdapter(Lib, { /* adapter config */ }),
  DEFAULT_FROM: 'noreply@example.com'
});
```

Each loader call returns an independent Email interface with its own Lib, CONFIG, ERRORS, Validators, and adapter. Stateless - no per-instance resources.

## Peer Dependencies

- `helper-utils` (injected as `Lib.Utils`)
- `helper-debug` (injected as `Lib.Debug`)
- `helper-crypto` (injected as `Lib.Crypto`)

## Adapter Contract

Every transport adapter must implement one method:

### adapter.send(instance, message) -> { success, message_id, accepted, rejected, error }

| Parameter | Type | Required | Description |
|---|---|---|---|
| instance | Object | yes | Request instance |
| message | Object | yes | Normalized message object (to, cc, bcc, from, subject, text, html, headers) |

**Returns:** `Promise<Object>` - `{ success, message_id, accepted, rejected, error }`

## Exported Functions

### sendEmail(instance, message)

Send an email message through the configured transport adapter. Validates the message, applies deliverability headers based on message_type, and delegates to the adapter for delivery.

| Parameter | Type | Required | Description |
|---|---|---|---|
| instance | Object | yes | Request instance |
| message | Object | yes | Email message object |

**Message object fields:**

| Field | Type | Required | Description |
|---|---|---|---|
| to | String or Array | one of to/cc/bcc | Recipient address(es) |
| cc | String or Array | one of to/cc/bcc | CC address(es) |
| bcc | String or Array | one of to/cc/bcc | BCC address(es) |
| from | String | no | Sender address (falls back to DEFAULT_FROM) |
| subject | String | yes | Email subject |
| text | String | one of text/html/attachments | Plain text body |
| html | String | one of text/html/attachments | HTML body |
| attachments | Array | one of text/html/attachments | Array of attachment objects ({ filename, content, contentType }) |
| headers | Object | no | Custom headers merged with deliverability headers |
| message_type | String | no | 'transactional' (default) or 'promotional' |
| unsubscribe_url | String | promotional only | HTTPS URL for one-click unsubscribe |
| unsubscribe_email | String | promotional only | Mailto address for unsubscribe |

**Returns:** `Promise<Object>` - `{ success, message_id, accepted, rejected, error }`

**Throws:** `TypeError` for missing required fields

### buildTransactionalHeaders()

Build headers object for transactional messages.

**Returns:** `Object` - `{ 'Precedence': 'transactional' }`

### buildPromotionalHeaders(unsubscribe_url, unsubscribe_email)

Build headers object for promotional or marketing messages. Includes List-Unsubscribe and List-Unsubscribe-Post per RFC 8058 (one-click unsubscribe), required by Gmail and Yahoo for bulk senders.

| Parameter | Type | Required | Description |
|---|---|---|---|
| unsubscribe_url | String | yes | HTTPS URL for one-click unsubscribe |
| unsubscribe_email | String | yes | Mailto address for unsubscribe |

**Returns:** `Object` - headers with Precedence, List-Unsubscribe, List-Unsubscribe-Post

**Throws:** `TypeError` for empty strings

### signUnsubscribeToken(instance, email)

Sign an email address into a URL-safe unsubscribe token using HMAC-SHA256. The token contains the base64url-encoded email and its signature, separated by a dot. The application builds the unsubscribe URL by appending this token as a query parameter.

Token format: `base64url(email).base64url(hmac_sha256(email, UNSUBSCRIBE_SECRET))`

| Parameter | Type | Required | Description |
|---|---|---|---|
| instance | Object | yes | Request instance |
| email | String | yes | Email address to sign |

**Returns:** `Object` - `{ success, token, error }`

- `success` (Boolean): true if signing completed
- `token` (String): URL-safe signed token
- `error` (Object|null): error envelope on failure

**Throws:** `TypeError` if email is not a non-empty string, or if `UNSUBSCRIBE_SECRET` is not configured

### verifyUnsubscribeToken(instance, token)

Verify an unsubscribe token and extract the original email address. Uses constant-time comparison (`crypto.timingSafeEqual`) to prevent timing attacks.

| Parameter | Type | Required | Description |
|---|---|---|---|
| instance | Object | yes | Request instance |
| token | String | yes | Token returned by signUnsubscribeToken |

**Returns:** `Object` - `{ success, email, error }`

- `success` (Boolean): true if token is valid
- `email` (String|null): the original email address on success, null on failure
- `error` (Object|null): error envelope on failure

**Throws:** `TypeError` if token is not a non-empty string, or if `UNSUBSCRIBE_SECRET` is not configured

## Error Catalog

| Error Type | Message |
|---|---|
| `EMAIL_ADAPTER_MISSING` | Adapter is required and must be a ready-to-use object |
| `EMAIL_ADAPTER_CONTRACT` | Adapter does not implement the required send method |
| `EMAIL_MESSAGE_INVALID` | Email message is missing required fields |
| `EMAIL_RECIPIENTS_EMPTY` | At least one recipient (to, cc, or bcc) is required |
| `EMAIL_SUBJECT_EMPTY` | Subject is required |
| `EMAIL_BODY_EMPTY` | At least one body (text or html) is required |
| `EMAIL_SEND_FAILED` | Failed to send email |
| `EMAIL_INVALID_TOKEN` | Unsubscribe token is invalid or signature does not match |
