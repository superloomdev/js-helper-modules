# Configuration - helper-contact-email-adapter-extended

## Loader Pattern

```javascript
import contactEmailAdapterExtended from 'helper-contact-email-adapter-extended';
import contactEmail from 'helper-contact-email';

const Adapter = contactEmailAdapterExtended(Lib, {});
Lib.ContactEmail = contactEmail(Lib, { Adapter });
```

## Dependencies

| Type | Package | Why |
|---|---|---|
| Runtime | `validator` | isEmail(), normalizeEmail() |
| Build-time | `disposable-email-domains-js` | Disposable domain list generation |

## Data Source

Disposable domains generated from `disposable-email-domains-js` (syncs from `disposable/disposable` on GitHub). ~5K domains. ~80 KB. Re-run: `npm run generate`.

## Config Keys

| Key | Type | Default | Description |
|---|---|---|---|
| `EMAIL_VALIDATION_OPTIONS` | `Object` | `{ require_tld: true, allow_utf8_local_part: false, domain_specific_validation: true }` | Options for `validator.isEmail()` |
