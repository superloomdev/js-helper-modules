# API Reference - helper-contact-email-adapter-basic

## validateSyntax

```javascript
adapter.validateSyntax(email) -> { valid, reason }
```

| Reason | Condition |
|---|---|
| `CONTACT_EMAIL_EMPTY` | Empty string |
| `CONTACT_EMAIL_NO_AT` | No @ symbol |
| `CONTACT_EMAIL_MULTIPLE_AT` | More than one @ |
| `CONTACT_EMAIL_EMPTY_LOCAL` | Nothing before @ |
| `CONTACT_EMAIL_EMPTY_DOMAIN` | Nothing after @ |
| `CONTACT_EMAIL_INVALID_SYNTAX` | Fails regex check |

## isDisposableDomain

```javascript
adapter.isDisposableDomain(domain) -> false
```

Always returns `false`. The basic adapter has no disposable data.

## canonicalize

```javascript
adapter.canonicalize(email) -> String | null
```

Gmail: removes dots and plus-tags, normalizes `googlemail.com` to `gmail.com`.
Other domains: returns lowercased email as-is.
Returns `null` for invalid input.
