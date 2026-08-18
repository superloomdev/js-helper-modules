# Data Model - helper-contact-email

## Email Address Structure

An email address has two parts separated by `@`:

- **Local part** - before `@` (e.g., `user.name` in `user.name@gmail.com`)
- **Domain part** - after `@` (e.g., `gmail.com` in `user.name@gmail.com`)

## RFC 5321 Length Limits

| Part | Maximum Length |
|---|---|
| Full email | 254 characters |
| Local part | 64 characters |
| Domain part | 255 characters |

## Canonicalization

Canonicalization folds provider-specific aliasing rules for duplicate detection:

- **Gmail**: dots are ignored (`user.name@gmail.com` = `username@gmail.com`), plus-tags are removed (`user+tag@gmail.com` = `user@gmail.com`)
- **Extended adapter**: also handles Outlook, iCloud, Yahoo, Fastmail via `validator.normalizeEmail()`

**Canonicalized addresses are never stored or delivered.** They exist only for comparing two addresses to detect if they belong to the same inbox.

## Disposable Domains

Disposable email providers (e.g., `mailinator.com`, `guerrillamail.com`) offer temporary inboxes. The extended adapter carries a committed list of ~5K disposable domains. The basic adapter has no disposable data and always returns `false`.

Disposable checking is a separately exposed function (`validateDisposable`, `isDisposableDomain`). There is no `ALLOW_DISPOSABLE` config. The application decides when to call it.
