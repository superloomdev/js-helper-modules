// Info: Data generation script for helper-contact-email-adapter-extended.
// Extracts the disposable email domain list from disposable-email-domains-js
// and writes it as a JSON array for fast lookups.
//
// Source: disposable-email-domains-js (syncs from disposable/disposable on GitHub)
// License: MIT
//
// Re-run: npm run generate
// Output: data/disposable-domains.json
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { disposableEmailBlocklist } = require('disposable-email-domains-js');

const domains = disposableEmailBlocklist();

// Write the output file as a pure JSON array (no comments, no module.exports)
const outputPath = path.join(import.meta.dirname, '..', 'data', 'disposable-domains.json');
fs.writeFileSync(outputPath, JSON.stringify(domains, null, 2) + '\n');

console.log('Generated ' + outputPath);
console.log('Domains: ' + domains.length);
console.log('Size: ' + fs.statSync(outputPath).size + ' bytes');
