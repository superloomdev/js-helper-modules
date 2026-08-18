// Info: Data generation script for helper-contact-address-adapter-basic.
// Extracts country list and postal code length bounds from libphonenumber-js
// metadata (country list) and hard-coded postal code length data.
//
// Source: libphonenumber-js (country list), postal-code-checker (postal lengths)
// License: MIT
//
// Re-run: npm run generate
// Output: _data/basic.postal-data.js
'use strict';


const fs = require('fs');
const path = require('path');

// Get country list from libphonenumber-js metadata
const metadata = require('libphonenumber-js/min/metadata');
const countries = Object.keys(metadata.countries).map(function (code) {
  return code.toLowerCase();
});

// Postal code length bounds per country.
// Countries with no postal system have required: false.
// Source: Google libaddressinput data, cross-referenced with postal-code-checker
const postalRules = {
  us: { min_length: 5, max_length: 10, required: true },
  in: { min_length: 6, max_length: 6, required: true },
  gb: { min_length: 6, max_length: 8, required: true },
  de: { min_length: 5, max_length: 5, required: true },
  jp: { min_length: 7, max_length: 7, required: true },
  fr: { min_length: 5, max_length: 5, required: true },
  ca: { min_length: 6, max_length: 7, required: true },
  au: { min_length: 4, max_length: 4, required: true },
  it: { min_length: 5, max_length: 5, required: true },
  es: { min_length: 5, max_length: 5, required: true },
  nl: { min_length: 4, max_length: 6, required: true },
  be: { min_length: 4, max_length: 4, required: true },
  ch: { min_length: 4, max_length: 4, required: true },
  at: { min_length: 4, max_length: 4, required: true },
  se: { min_length: 5, max_length: 5, required: true },
  no: { min_length: 4, max_length: 4, required: true },
  dk: { min_length: 4, max_length: 4, required: true },
  fi: { min_length: 5, max_length: 5, required: true },
  pt: { min_length: 7, max_length: 7, required: true },
  ie: { min_length: 3, max_length: 10, required: true },
  nz: { min_length: 4, max_length: 4, required: true },
  za: { min_length: 4, max_length: 4, required: true },
  br: { min_length: 8, max_length: 8, required: true },
  mx: { min_length: 5, max_length: 5, required: true },
  ru: { min_length: 6, max_length: 6, required: true },
  cn: { min_length: 6, max_length: 6, required: true },
  kr: { min_length: 5, max_length: 5, required: true },
  sg: { min_length: 6, max_length: 6, required: true },
  hk: { min_length: 0, max_length: 0, required: false },
  ae: { min_length: 0, max_length: 0, required: false },
  sa: { min_length: 5, max_length: 5, required: true },
  lk: { min_length: 5, max_length: 5, required: true },
  bd: { min_length: 4, max_length: 4, required: true },
  pk: { min_length: 5, max_length: 5, required: true },
  id: { min_length: 5, max_length: 5, required: true },
  th: { min_length: 5, max_length: 5, required: true },
  vn: { min_length: 6, max_length: 6, required: true },
  ph: { min_length: 4, max_length: 4, required: true },
  my: { min_length: 5, max_length: 5, required: true },
  tw: { min_length: 6, max_length: 318, required: true },
  ar: { min_length: 4, max_length: 8, required: true },
  cl: { min_length: 7, max_length: 7, required: true },
  co: { min_length: 6, max_length: 6, required: true },
  pe: { min_length: 5, max_length: 5, required: true },
  ve: { min_length: 4, max_length: 4, required: true },
  eg: { min_length: 5, max_length: 5, required: true },
  ng: { min_length: 6, max_length: 6, required: true },
  ke: { min_length: 5, max_length: 5, required: true },
  ma: { min_length: 5, max_length: 5, required: true },
  gh: { min_length: 0, max_length: 0, required: false },
  et: { min_length: 4, max_length: 4, required: true },
  tz: { min_length: 5, max_length: 5, required: true },
  ug: { min_length: 0, max_length: 0, required: false },
  qa: { min_length: 0, max_length: 0, required: false },
  kw: { min_length: 5, max_length: 5, required: true },
  bh: { min_length: 0, max_length: 0, required: false },
  om: { min_length: 3, max_length: 3, required: true },
  jo: { min_length: 5, max_length: 5, required: true },
  lb: { min_length: 4, max_length: 8, required: true },
  il: { min_length: 7, max_length: 7, required: true },
  ir: { min_length: 5, max_length: 5, required: true },
  iq: { min_length: 5, max_length: 5, required: true },
  sy: { min_length: 0, max_length: 0, required: false },
  ye: { min_length: 0, max_length: 0, required: false },
  am: { min_length: 4, max_length: 4, required: true },
  az: { min_length: 4, max_length: 4, required: true },
  ge: { min_length: 4, max_length: 4, required: true },
  tr: { min_length: 5, max_length: 5, required: true },
  gr: { min_length: 5, max_length: 5, required: true },
  pl: { min_length: 5, max_length: 5, required: true },
  cz: { min_length: 5, max_length: 5, required: true },
  sk: { min_length: 5, max_length: 5, required: true },
  hu: { min_length: 4, max_length: 4, required: true },
  ro: { min_length: 6, max_length: 6, required: true },
  bg: { min_length: 4, max_length: 4, required: true },
  hr: { min_length: 5, max_length: 5, required: true },
  si: { min_length: 4, max_length: 4, required: true },
  ee: { min_length: 5, max_length: 5, required: true },
  lv: { min_length: 4, max_length: 4, required: true },
  lt: { min_length: 5, max_length: 5, required: true },
  ua: { min_length: 5, max_length: 5, required: true },
  by: { min_length: 6, max_length: 6, required: true },
  md: { min_length: 4, max_length: 4, required: true }
};

// Build the full data object: every country gets a postal rule
const data = {};

countries.forEach(function (cc) {
  const rule = postalRules[cc];

  if (rule) {
    data[cc] = rule;
  } else {
    // Default: assume postal system exists with generous bounds
    data[cc] = { min_length: 0, max_length: 20, required: true };
  }
});

// Generate output
const header = [
  '// Info: Generated postal code data for helper-contact-address-adapter-basic.',
  '// Source: libphonenumber-js (country list), postal-code-checker (postal lengths)',
  '// License: MIT',
  '// Generated: ' + new Date().toISOString().split('T')[0],
  '// Re-run: npm run generate',
  '//',
  '// Contains: country list and postal code length bounds.',
  '// Countries with required: false have no postal system.',
  '// Do not edit by hand - regenerate with npm run generate.',
  '\'use strict\';',
  '',
  ''
].join('\n');

const body = 'module.exports = ' + JSON.stringify(data, null, 2) + ';';

const outputPath = path.join(__dirname, 'basic.postal-data.js');
fs.writeFileSync(outputPath, header + body + '\n');

console.log('Generated ' + outputPath);
console.log('Countries: ' + Object.keys(data).length);
console.log('Size: ' + fs.statSync(outputPath).size + ' bytes');
