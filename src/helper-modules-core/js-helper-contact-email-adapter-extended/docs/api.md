# API Reference - helper-contact-email-adapter-extended

## validateSyntax

Uses `validator.isEmail()` with `require_tld`, `domain_specific_validation`. Granular reason codes for structural failures before the regex check.

## isDisposableDomain

Checks against a committed Set of ~5K disposable domains. O(1) lookup.

## canonicalize

Uses `validator.normalizeEmail()` which handles Gmail, Outlook, iCloud, Yahoo, and Fastmail folding rules.
