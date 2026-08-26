// Info: Test loader for helper-contact-phone-adapter-basic.
// Builds a Lib container with Utils, loads the adapter, and loads
// the parent core with this adapter wired in.

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

import utilsLoader from 'helper-utils';
import adapterBasicLoader from 'helper-contact-phone-adapter-basic';
import contactPhoneLoader from 'helper-contact-phone';


// Build Lib container
const Lib = {};
Lib.Utils = utilsLoader(Lib, {});

// Load the adapter under test
const Adapter = adapterBasicLoader(Lib, {});

// Load the parent core with this adapter
const ContactPhone = contactPhoneLoader(Lib, {
  Adapter: Adapter
});

// Load the country data for assertions
const COUNTRY_DATA = require('helper-contact-phone-adapter-basic/data/basic.country-data.json');


export {
  Lib,
  Adapter,
  ContactPhone,
  COUNTRY_DATA
};
