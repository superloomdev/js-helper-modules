# Data Model - helper-contact-phone

## Country Code

ISO 3166-1 alpha-2, lowercase. The only country code format used across all three contact families.

Examples: `us`, `in`, `gb`, `de`, `jp`, `ae`.

## Calling Code

E.164 international dialing prefix, stored as a string without the leading `+`.

Examples: `1` (US/Canada), `91` (India), `44` (UK), `49` (Germany), `81` (Japan).

## National Number

The phone number digits without the calling code or leading `+`. Stored as a string of digits only.

Example: `9876543210` for an Indian mobile number.

## E.164 Number

The full international format: `+` followed by the calling code and national number.

Example: `+919876543210`.

Maximum 15 digits (excluding `+`), per ITU-T E.164.

## Phone ID

A storage-oriented encoding for database indexing. Not a display format.

Format: `country_code + '.' + reversed(national_number)`

Example: `in.0123456789` for India number `9876543210`.

The country code prefix enables `begins_with("in.")` queries in MongoDB/DynamoDB. The reversal distributes sequentially-issued numbers across a partitioned key space.

## Number Type

String classification returned by `getNumberType`. One of:

`MOBILE`, `FIXED_LINE`, `FIXED_LINE_OR_MOBILE`, `TOLL_FREE`, `PREMIUM_RATE`, `SHARED_COST`, `VOIP`, `PERSONAL_NUMBER`, `PAGER`, `UAN`, `VOICEMAIL`

The basic adapter always returns `null` (no type data). The extended adapter returns the actual type from `libphonenumber-js`.
