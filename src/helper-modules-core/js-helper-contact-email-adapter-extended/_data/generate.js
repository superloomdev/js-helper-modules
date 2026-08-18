// Info: Data generation script for helper-contact-email-adapter-extended.
// Extracts the disposable email domain list from disposable-email-domains-js
// and writes it as a frozen Set for fast lookups.
//
// Source: disposable-email-domains-js (syncs from disposable/disposable on GitHub)
// License: MIT
//
// Re-run: npm run generate
// Output: _data/disposable-domains.js
'use strict';


const fs = require('fs');
const path = require('path');

const { disposableEmailBlocklist } = require('disposable-email-domains-js');

const domains = disposableEmailBlocklist();

// Generate the output file as a Set for O(1) lookups
const header = [
  '// Info: Generated disposable email domain list.',
  '// Source: disposable-email-domains-js (syncs from disposable/disposable on GitHub)',
  '// License: MIT',
  '// Generated: ' + new Date().toISOString().split('T')[0],
  '// Re-run: npm run generate',
  '//',
  '// Contains: ' + domains.length + ' disposable email domains',
  '// Do not edit by hand - regenerate with npm run generate.',
  '\'use strict\';',
  '',
  ''
].join('\n');

// Write as a Set constructor argument
const body = 'module.exports = new Set(' + JSON.stringify(domains) + ');';

const outputPath = path.join(__dirname, 'disposable-domains.js');
fs.writeFileSync(outputPath, header + body);

console.log('Generated ' + outputPath);
console.log('Domains: ' + domains.length);
console.log('Size: ' + fs.statSync(outputPath).size + ' bytes');
