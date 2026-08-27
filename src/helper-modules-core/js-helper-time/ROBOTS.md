# helper-time

Date/Time utility library. Platform-agnostic date math, timezone handling, formatting. Native JS Date and Intl APIs, no external dependencies.

## Type
Core module. Stateless utility. Factory pattern for interface uniformity with other helpers.

## Peer Dependencies
- `helper-utils` (injected as `Lib.Utils`)

## Direct Dependencies
None.

## Loader Pattern (Factory)

```javascript
import time from 'helper-time';

Lib.Time = time(Lib, { /* config overrides */ });
```

Each loader call returns an independent `Time` interface with its own `Lib` captured in closure. Functions are pure - no shared module-level state.
Companion files: `time.config.js` (empty), `time.errors.js` (empty frozen catalog), `time.validators.js` (no-op `validateConfig`).

## Config Keys

None. The loader accepts a config argument for interface uniformity but no function reads it at runtime.

## Exported Functions (24 total)

All functions are synchronous. Unixtime values are in **seconds**.

### Day and Time Calculations

formatDayName(year, month, day) → String | async:no - 'sunday' | ... | 'saturday'
buildEpochDay(hours?, minutes?, seconds?) → Integer | async:no - seconds past midnight
disjoinEpochDay(day_in_seconds) → Array | async:no - [hours, minutes, seconds]
parseTime24(time_24h) → Integer | async:no - '2330' → 84600

### Unixtime and Date Conversions

parseUnixtimeToDate(unixtime) → Date | async:no
buildUnixtimeFromDate(date) → Integer | async:no - seconds since epoch
formatUnixtimeToDateString(unixtime) → String | async:no - ISO 8601
parseDateStringToUnixtime(date_string) → Integer | async:no
formatUnixtimeToUtcString(unixtime) → String | async:no - 'Wed, 21 Oct 2015 07:28:00 GMT'
parseUtcStringToUnixtime(date_string) → Integer | async:no
buildUnixDay(unixtime) → Integer | async:no - start of day (00:00:00 UTC) as unixtime

### Date Data Set (structured { year, month, day, hh, mm, ss })

buildDateDataSet(year, month, day, hours?, minutes?, seconds?) → Object | async:no - plural-key build shape
parseDateStringToDataSet(date_string) → Object | async:no - singular-key parse shape (String values)
buildDataSetFromDate(date) → Object | async:no - singular-key parse shape
buildDateFromDateDataSet(date_data) → Date | async:no - UTC
formatDateDataSetToDateString(date_data) → String | async:no - ISO 8601
buildUnixtimeFromDateDataSet(date_data) → Integer | async:no

### Time Formatting

formatHourMinTo12HourTime(hours, minutes) → String | async:no - '4:30 PM'
formatSeconds(seconds) → String | async:no - '10:05 AM'; '' for null/undefined/empty

### Timezone Operations

buildTimeWithOffset(unixtime, offset) → Integer | async:no
getTimezoneOffset(unixtime, timezone) → Integer | async:no - DST-aware, seconds
buildTimezoneTime(unixtime, timezone) → Integer | async:no - wall-clock as unixtime
buildTimezoneDate(unixtime, timezone) → Date | async:no - wall-clock Date

### Calendar

getLastDayOfMonth(year, month) → String | async:no - '28' / '29' / '30' / '31'

## Patterns

- **Factory per loader:** every loader call returns its own `Time` interface. No module-level singletons.
- **Pure functions:** all operations are deterministic transformations. No I/O, no side effects.
- **Unixtime in seconds:** every unixtime param and return is in SECONDS (not milliseconds)
- **Timezone strings:** standard IANA names (`'America/New_York'`, `'UTC'`, `'Asia/Kolkata'`)
- **Data Set shape variants:** plural keys (`hours`, `minutes`, `seconds`) produced by `buildDateDataSet()`; singular keys (`hour`, `minute`, `second`) produced by `parseDateStringToDataSet()` / `buildDataSetFromDate()`. Both consumable by `buildDateFromDateDataSet()`, which uses plural keys and treats missing time components as 0.
- **Lib.Utils usage:** only `Lib.Utils.isNullOrUndefined` in `formatSeconds`. All other functions are self-contained.
