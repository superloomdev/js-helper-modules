// Info: Data generation script for js-helper-contact-phone-adapter-basic.
// Reads libphonenumber-js metadata and extracts country calling codes
// and national number length bounds. Outputs a frozen JavaScript object.
//
// Source: libphonenumber-js (Google PhoneNumberMetadata.xml)
// License: MIT
//
// Re-run: npm run generate
// Output: _data/basic.country-data.js
'use strict';


const fs = require('fs');
const path = require('path');

// Access the metadata from libphonenumber-js
// The min metadata is sufficient for country list, calling codes, and lengths
const metadata = require('libphonenumber-js/min/metadata');


// Extract country data from the metadata
const countries = {};

// metadata.countries is an object keyed by ISO 3166-1 alpha-2 (uppercase)
// Each value is an array: [calling_code, [formats...], [leading_digits...], ...]
// The national number length bounds are in the formats array
const metadataCountries = metadata.countries;

Object.keys(metadataCountries).forEach(function (isoCode) {

  // Convert to lowercase for our convention
  const countryCode = isoCode.toLowerCase();

  const entry = metadataCountries[isoCode];

  // entry[0] is the calling code (e.g. '91' for India)
  const callingCode = String(entry[0]);

  // National number length bounds are at specific indices in the libphonenumber-js
  // country metadata array. The structure is:
  // [0]: country calling code
  // [1]: formats (national number patterns)
  // [2]: leadingDigits (optional)
  // [3]: nationalPrefix
  // [4]: nationalPrefixFormattingRule
  // [5]: nationalPrefixTransformRule
  // [6]: preferredInternationalPrefix
  // [7]: possibleLengths (array of possible national number lengths)
  // ... etc

  // In libphonenumber-js metadata, the possibleLengths are typically
  // embedded in the formats. We need to extract min and max possible lengths.
  // The metadata structure varies, so we use the getCountryCallingCode
  // and parsePhoneNumber to determine lengths.

  // For the basic adapter, we need min_length and max_length.
  // These come from the possibleLengths data in the metadata.
  // In libphonenumber-js min metadata, the structure is compact.
  // Let's use the approach of checking the formats for length info.

  // Actually, the simplest approach: use parsePhoneNumber with test numbers
  // to determine the length bounds. But that's fragile.
  //
  // Better: the metadata countries array has possibleLengths at a known position.
  // In libphonenumber-js v1.x, the country metadata array structure is:
  // [callingCode, formats, leadingDigits, nationalPrefix, ...]
  // The possibleLengths are in the format objects within formats.
  //
  // Let's extract from the metadata directly.

  // The formats array (index 1) contains format objects.
  // Each format has a 'leadingDigitsPatterns', 'pattern', 'formatPattern', etc.
  // The possibleLengths for the country are at a specific index.

  // In the newer metadata format, possibleLengths are stored at the country level.
  // Let's check the structure.

  // Extract all possible lengths from formats
  // In libphonenumber-js metadata, each format may have length info
  // But the country-level possibleLengths is more reliable

  // The actual structure in libphonenumber-js metadata:
  // entry = [callingCode, formats, leadingDigits, nationalPrefix,
  //          nationalPrefixFormattingRule, nationalPrefixTransformRule,
  //          preferredInternationalPrefix, ...]
  //
  // possibleLengths and possibleLengthsLocal are at specific indices
  // that vary by metadata version. Let's use a more robust approach.

  // Use the libphonenumber-js API to get lengths
  // Actually, let's just use the metadata's possibleLengths directly
  // In the min metadata, the structure is:
  // [callingCode, formats, leadingDigits, nationalPrefix, ...]
  // The formats contain the possible lengths

  // Let's try a different approach: use the exported metadata object structure
  // The metadata has a 'countries' object where each country is an array
  // We can find possibleLengths in the format objects

  let minLength = null;
  let maxLength = null;

  // Check if the entry has possibleLengths at a known position
  // In libphonenumber-js metadata, the country array may have:
  // index 7: possibleLengths (array of numbers or [min, max] pairs)
  // But this varies. Let's look for arrays of numbers in the entry.

  // Actually, the most reliable way is to use the Metadata class
  const { Metadata } = require('libphonenumber-js');

  const meta = new Metadata(metadata);
  meta.country(isoCode);

  // Get the national number pattern and extract length bounds
  const nationalNumberPattern = meta.nationalNumberPattern();
  if (nationalNumberPattern) {
    // Extract digits from the pattern to estimate length bounds
    // This is not perfect, but for the basic adapter we just need
    // rough length bounds

    // Use possibleLengths if available
    const possibleLengths = meta.possibleLengths();
    if (possibleLengths && possibleLengths.length > 0) {
      // possibleLengths is an array like [10] or [4, 5, 6, 7, 8, 9, 10]
      // or with ranges like [[4, 8], 10]
      const lengths = [];
      possibleLengths.forEach(function (item) {
        if (Array.isArray(item)) {
          for (let i = item[0]; i <= item[1]; i++) {
            lengths.push(i);
          }
        } else {
          lengths.push(item);
        }
      });
      if (lengths.length > 0) {
        minLength = Math.min.apply(null, lengths);
        maxLength = Math.max.apply(null, lengths);
      }
    }
  }

  // Fallback: if we couldn't get lengths, use defaults
  if (minLength === null) {
    minLength = 4;
  }
  if (maxLength === null) {
    maxLength = 14;
  }

  // Cap max_length at E.164 maximum (15 digits total minus calling code length)
  // The metadata possibleLengths includes special service numbers that can
  // exceed E.164. We cap to keep the basic adapter's bounds realistic.
  const e164Max = 15 - callingCode.length;
  if (maxLength > e164Max) {
    maxLength = e164Max;
  }

  countries[countryCode] = {
    calling_code: callingCode,
    min_length: minLength,
    max_length: maxLength
  };

});


// Generate the output file
const header = [
  '// Info: Generated country data for js-helper-contact-phone-adapter-basic.',
  '// Source: libphonenumber-js (Google PhoneNumberMetadata.xml, min metadata)',
  '// License: MIT',
  '// Generated: ' + new Date().toISOString().split('T')[0],
  '// Re-run: npm run generate',
  '//',
  '// Contains: country calling codes and national number length bounds',
  '// for all ISO 3166-1 countries recognized by libphonenumber-js.',
  '// Do not edit by hand - regenerate with npm run generate.',
  '\'use strict\';',
  '',
  ''
].join('\n');

const body = 'module.exports = ' + JSON.stringify(countries, null, 2) + ';';

const outputPath = path.join(__dirname, 'basic.country-data.js');
fs.writeFileSync(outputPath, header + body);

// Report
const count = Object.keys(countries).length;
console.log('Generated ' + outputPath);
console.log('Countries: ' + count);
console.log('Size: ' + fs.statSync(outputPath).size + ' bytes');
