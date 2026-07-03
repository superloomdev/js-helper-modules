# Schemas. `helper-money`

The validated contracts at the module boundary: the configuration schema, the function input contracts, and the return conventions. For the per-function reference see [API Reference](api.md). For configuration keys see [Configuration](configuration.md).

---

## Configuration Schema

```javascript
{
  // Required: Minimum length for currency codes (ISO 4217 standard = 3)
  CURRENCY_CODE_MIN_LENGTH: 3, // Positive integer
  
  // Required: Maximum length for currency codes (allows future extensions)
  CURRENCY_CODE_MAX_LENGTH: 3, // Positive integer, >= MIN_LENGTH
  
  // Required: Regex pattern to validate currency code format (letters only)
  CURRENCY_CODE_SANITIZE_REGEX: /[^a-zA-Z]/g // RegExp instance
}
```

### Configuration Notes

- **CURRENCY_CODE_MIN_LENGTH/MAX_LENGTH**: Define valid currency code length bounds. Default supports ISO 4217 (3-letter codes).
- **CURRENCY_CODE_SANITIZE_REGEX**: Pattern used to strip non-letter characters from currency codes. Default allows only letters a-z (case-insensitive).

---

## Function Input Contracts

### Currency Code Parameters

All functions accepting `currency_code` follow this contract:

```javascript
currency_code: String // Case-insensitive, validated against known currencies
```

- **Validation**: Must be a known currency code in the module's currency database
- **Case handling**: Case-insensitive (USD, usd, Usd all valid)
- **Length**: Must satisfy `CURRENCY_CODE_MIN_LENGTH` and `CURRENCY_CODE_MAX_LENGTH`
- **Format**: Must match `CURRENCY_CODE_SANITIZE_REGEX` after sanitization
- **Error handling**: Functions throw `TypeError` for invalid codes; `validateCurrencyCode()` returns error array

### Amount Parameters

```javascript
amount: Number // Finite number, validated for arithmetic operations
```

- **Validation**: Must be a finite number (not NaN, Infinity, or -Infinity)
- **Error handling**: Functions throw `TypeError` for non-finite numbers

### Optional Parameters

```javascript
decimals: Number | null | undefined // Optional override for decimal places
no_pad: Boolean = false // Optional flag to disable trailing zero padding
apply_min_unit: Boolean = false // Optional flag to apply minimum transactional unit rounding
```

- **decimals**: When provided, must be a positive integer and overrides currency's default decimal places
- **no_pad**: Controls whether formatted amounts include trailing zeros for whole numbers
- **apply_min_unit**: When true, rounds amounts to the currency's minimum transactional unit

---

## Return Conventions

### Metadata Functions

```javascript
getCurrencySymbol('USD') -> '$'
getCurrencyIsoAlpha('usd') -> 'USD'
getCurrencyDecimals('JPY') -> 0

getCurrencySymbol('XXX') -> null
```

- **Success**: Returns the requested metadata value (string, number, or object)
- **Unknown currency**: Returns `null` for all metadata functions
- **Invalid input**: Throws `TypeError` for non-string or malformed currency codes

### Validation Functions

```javascript
validateCurrencyCode('USD') -> false

validateCurrencyCode('XX') -> [
  {
    type: 'MONEY_CURRENCY_CODE_LENGTH',
    message: 'Currency code must be exactly 3 letters'
  }
]
```

- **Valid input**: Returns `false` (no errors)
- **Invalid input**: Returns array of error objects from the error catalog
- **Error objects**: Each has `type` and `message` properties

### Arithmetic Functions

```javascript
roundAmount(12.345, 'USD') -> 12.35
formatAmount(12.3, 'USD') -> '12.30'
sum([1.1, 2.2, 3.3], 'USD') -> 6.6
```

- **Success**: Returns the computed value (number or string)
- **Invalid input**: Throws `TypeError` for invalid currency codes or amounts
- **Rounding**: All arithmetic uses float-safe integer-based operations to avoid floating-point errors

---

## Error Catalog

All validation errors use standardized error objects:

```javascript
{
  type: 'MONEY_CURRENCY_CODE_REQUIRED',
  message: 'Currency code is required'
}

{
  type: 'MONEY_CURRENCY_CODE_TYPE', 
  message: 'Currency code must be a string'
}

{
  type: 'MONEY_CURRENCY_CODE_LENGTH',
  message: 'Currency code must be exactly 3 letters'
}

{
  type: 'MONEY_CURRENCY_CODE_FORMAT',
  message: 'Currency code must contain only letters'
}

{
  type: 'MONEY_CURRENCY_CODE_UNKNOWN',
  message: 'Currency code is not recognized'
}
```

---

## Currency Data Structure

The module's currency database (`data/currencies.json`) uses this structure:

```javascript
{
  "usd": {
    "symbol": {
      "native": "$",
      "standard": "USD"
    },
    "symbol_minor": {
      "native": "¢",
      "standard": "USD"
    },
    "iso_alpha": "USD",
    "iso_numeric": "840",
    "name_en": "United States Dollar",
    "decimals": 2,
    "min_transactional_unit": 0.01,
    "denominations": {
      "minor": ["1", "5", "10", "25", "50"],
      "major": ["1", "2", "5", "10", "20", "50", "100"]
    }
  }
}
```

### Currency Fields

- **symbol**: Native and standard currency symbols
- **symbol_minor**: Minor currency symbols (cents, paise, etc.)
- **iso_alpha**: ISO 4217 alphabetic code (uppercase)
- **iso_numeric**: ISO 4217 numeric code (zero-padded string)
- **name_en**: English name of the currency
- **decimals**: Number of decimal places for the currency
- **min_transactional_unit**: smallest amount that can be transacted
- **denominations**: Available banknote/coin denominations (optional)

---

## Factory Pattern

The module uses the Superloom factory pattern:

```javascript
const Money = require('helper-money');

// Create instance with default config
const money = Money(Lib);

// Create instance with config overrides
const money = Money(Lib, {
  CURRENCY_CODE_MIN_LENGTH: 3
});
```

- **Per-instance config**: Each instance has its own merged configuration
- **Dependency injection**: `Lib` container provides Utils dependency
- **Immutable defaults**: Base configuration cannot be mutated across instances
- **Config validation**: Invalid configuration throws at construction time
