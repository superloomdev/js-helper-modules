// Info: Data generation script for helper-contact-address-adapter-extended.
// Extracts postal code regex patterns and subdivision lists from
// postal-code-checker, and country list from libphonenumber-js.
//
// Source: postal-code-checker (postal patterns + subdivisions),
//         libphonenumber-js (country list)
// License: MIT (postal-code-checker), MIT (libphonenumber-js)
//
// Re-run: npm run generate
// Output: data/extended.address-data.json
'use strict';


const fs = require('fs');
const path = require('path');

const pcc = require('postal-code-checker');
const metadata = require('libphonenumber-js/min/metadata');

// Get country list from libphonenumber-js
const countries = Object.keys(metadata.countries).map(function (code) {
  return code.toLowerCase();
});

// Build the full data object
const data = {};

countries.forEach(function (cc) {

  const upperCode = cc.toUpperCase();
  const countryData = pcc.COUNTRIES[upperCode];

  // Postal code patterns
  let patterns = [];
  let required = true;

  if (countryData) {

    // Extract patterns - they are stored as strings like "/^(?:\\d{6})$/"
    if (countryData.patterns && countryData.patterns.length > 0) {
      patterns = countryData.patterns;
    }

    // Countries with no patterns have no postal system
    if (!countryData.patterns || countryData.patterns.length === 0) {
      required = false;
    }

  } else {
    // Unknown to postal-code-checker - assume no postal system
    required = false;
  }

  // Subdivisions
  let subdivisions = null;

  if (pcc.hasSubdivisionData(upperCode)) {
    const subs = pcc.getSubdivisions(upperCode);
    if (subs && subs.length > 0) {
      subdivisions = subs.map(function (sub) {
        return {
          code: sub.code,
          name: sub.name
        };
      });
    }
  }

  data[cc] = {
    patterns: patterns,
    required: required,
    subdivisions: subdivisions
  };

});

// Generate output - pure JSON, no comments or module.exports wrapper
const outputPath = path.join(__dirname, '..', 'data', 'extended.address-data.json');
fs.writeFileSync(outputPath, JSON.stringify(data, null, 2) + '\n');

// Stats
const withPatterns = Object.values(data).filter(function (d) {
  return d.patterns.length > 0;
}).length;
const withSubdivisions = Object.values(data).filter(function (d) {
  return d.subdivisions !== null;
}).length;

console.log('Generated ' + outputPath);
console.log('Countries: ' + Object.keys(data).length);
console.log('With postal patterns: ' + withPatterns);
console.log('With subdivisions: ' + withSubdivisions);
console.log('Size: ' + fs.statSync(outputPath).size + ' bytes');
