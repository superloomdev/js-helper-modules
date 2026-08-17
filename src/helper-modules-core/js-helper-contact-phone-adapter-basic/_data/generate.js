// Info: Country data generation script for helper-contact-phone-adapter-basic.
// Reads libphonenumber-js metadata.min.json and extracts calling code and
// phone number length bounds for every country. Outputs a frozen object
// to basic.country-data.js.
//
// Source: libphonenumber-js metadata.min.json (MIT license)
// Source of truth: Google's PhoneNumberMetadata.xml
// Generated: re-run this script to refresh the data file.
//
// Usage: node _data/generate.js
'use strict';


const fs = require('fs');
const path = require('path');
const metadata = require('libphonenumber-js/metadata.min.json');


// Extract calling code and length bounds for each country
const countryData = {};

const countries = metadata.countries;
const countryCodes = Object.keys(countries);

countryCodes.forEach(function (code) {

  const entry = countries[code];

  // entry[0] = phone_code (calling code)
  const callingCode = entry[0];

  // entry[3] = possible_lengths (array of valid national number lengths)
  const possibleLengths = entry[3];

  // Derive min and max from the possible lengths array
  const minLength = Math.min.apply(null, possibleLengths);
  const maxLength = Math.max.apply(null, possibleLengths);

  countryData[code.toLowerCase()] = Object.freeze({
    calling_code: callingCode,
    min_length: minLength,
    max_length: maxLength
  });

});


// Build the output file content
const header = [
  '// Info: Generated country data for helper-contact-phone-adapter-basic.',
  '// Source: libphonenumber-js metadata.min.json (MIT license)',
  '// Source of truth: Google PhoneNumberMetadata.xml',
  '// Generated: ' + new Date().toISOString().split('T')[0],
  '// Do not edit by hand - re-run _data/generate.js to refresh.',
  "'use strict';", // eslint-disable-line quotes
  '',
  ''
].join('\n');

const body = 'module.exports = Object.freeze(' + JSON.stringify(countryData, null, 2).replace(/"/g, "'") + ');'; // eslint-disable-line quotes

const outputPath = path.join(__dirname, '..', 'basic.country-data.js');
fs.writeFileSync(outputPath, header + body + '\n');

// Report
const outputSize = fs.statSync(outputPath).size;
console.log('Generated: basic.country-data.js');
console.log('Countries: ' + countryCodes.length);
console.log('File size: ' + outputSize + ' bytes (' + Math.round(outputSize / 1024) + ' KB)');
