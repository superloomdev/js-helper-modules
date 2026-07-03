# helper-utils - AI Agent Reference

## Module Type
Foundation module. Zero runtime dependencies. All other modules may depend on this; this module NEVER imports any other.

## Peer Dependencies
None (foundation).

## Direct Dependencies
None.

## Loader Pattern (Singleton)

```javascript
Lib.Utils = require('helper-utils')(Lib, {});
```

`shared_libs` accepted for interface uniformity but unused - Utils has no external lib dependencies.
`config` accepted for interface uniformity, merged over defaults from `utils.config.js`. No config keys exist yet.
Companion files: `utils.config.js` (empty defaults), `utils.errors.js` (empty frozen catalog), `utils.validators.js` (no-op `validateConfig`).

## Config Keys
None.

## Exported Functions (54 total)

### Type Checks
isNull(arg) → Boolean | async:no
isNullOrUndefined(arg) → Boolean | async:no
isUndefined(arg) → Boolean | async:no
isBoolean(arg) → Boolean | async:no
isNumber(arg) → Boolean | async:no - excludes NaN
isString(arg) → Boolean | async:no
isInteger(num) → Boolean | async:no
isObject(arg) → Boolean | async:no - any non-null object (includes arrays, Date, etc.)
isFunction(arg) → Boolean | async:no
isError(arg) → Boolean | async:no
isEmptyString(str) → Boolean | async:no
isEmptyObject(obj) → Boolean | async:no
isEmpty(arg) → Boolean | async:no - handles null, '', [], {}
inArray(arr, element) → Boolean | async:no

### Data Manipulation
stringToJSON(str) → Object|null | async:no - safe parse, returns null on failure
stringReverse(str) → String | async:no
safeJoin(list, separator) → String | async:no
arrayDistinct(arr) → Array | async:no - deduplicate
splitWithTrim(str, delimiter) → String[] | async:no
stringToNumber(str) → Number | async:no
stringToArray(delimiter, str) → String[] | async:no
keyValueToObject(keys, values) → Object | async:no
overrideObject(base_obj, ...new_objs) → Object | async:no - shallow merge; SKIPS strictly-null values (null override keeps base), does NOT skip undefined, never deep-merges. NOT a drop-in for Object.assign - see Gotchas
setNonEmptyKey(obj, key, new_val) → Object | async:no - only set if new_val is non-empty
fallback(new_val, fallback_val) → any | async:no - return new_val if non-empty, else fallback
deepCopyObject(obj) → Object | async:no
compareObjects(a, b) → Boolean | async:no - deep equality

### Sanitization
sanitizeObject(obj, whitelist, blacklist) → Object | async:no
sanitizeArray(list, sanitize_func) → Array | async:no
sanitizeUsingRegx(str, regx) → String | async:no
sanitizeInteger(num) → Number | async:no
sanitizeBoolean(bool) → Boolean | async:no

### Validation
validateString(str, min_length, max_length) → Boolean | async:no
validateStringRegx(str, regx, min_length, max_length) → Boolean | async:no
validateNumber(num, min_value, max_value) → Boolean | async:no
absenteeKeysCheckObject(obj, required_keys, ...) → Boolean | async:no
invalidKeysCheckObject(obj, allowed_keys, ...) → Boolean | async:no
checkObjectData(obj, validators, ...) → Boolean | async:no
checkNewObjectsList(list, validators, ...) → Boolean | async:no
checkEditObjectsList(list, validators, ...) → Boolean | async:no

### Time
getUnixTime(date) → Number | async:no - seconds
getUnixTimeInMilliSeconds(date) → Number | async:no - milliseconds

### Math
round(num, digits_after_decimal) → Number | async:no
roundWithCascading(num, digits_after_decimal, safety) → Number | async:no

### Errors & Misc
error(err_obj, context) → Error | async:no - normalize error
nullFunc() → undefined | async:no - no-op
moduleAvailable(module_name) → Boolean | async:no - safe require check

### URL/Path Parsing
disjoinUrl(url) → Object | async:no
disjoinPathname(pathname) → Object | async:no

### CSV
convertCsvToData(csv_data) → Array | async:no
convertDataToCsv(records) → String | async:no - headers extracted from first record
convertDataToCsv2(fields, records) → String | async:no - headers explicitly specified

### Random
generateRandomString(length) → String | async:no

## Patterns
- **Foundation:** This module has zero dependencies. All other modules may import it freely
- **Singleton with loader:** One shared object for all callers. Loader initializes Validators and returns the module-scope Utils object. `shared_libs` and `config` accepted for interface uniformity
- **Exception to DRY rule:** Foundation modules cannot use `Lib.Utils` (they ARE it). Raw type checks are allowed INSIDE this module only. All other modules MUST use this module's functions instead of inline checks
- **Pure functions:** No side effects, no I/O, no async
- **Self-contained:** Implements all type checks and data helpers needed across the framework

## Gotchas
- **`overrideObject` ≠ `Object.assign`.** It is a shallow merge that SKIPS strictly-`null` values (a `null` override keeps the base value), does NOT skip `undefined` (undefined overwrites), and never deep-merges nested objects (nested objects are replaced wholesale). Use it only for "layer non-null overrides onto defaults". When a caller must set a key to `null` to clear a non-null default (e.g. config merging like `{ JWT: null }`), use `Object.assign` instead - `overrideObject` would silently retain the default and change behavior. Do NOT blanket-replace `Object.assign` with `overrideObject` during audits.
