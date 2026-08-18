// Info: Test loader for helper-contact-phone-adapter-basic.
// Builds a Lib container with Utils, loads the adapter, and loads
// the parent core with this adapter wired in.
'use strict';


// Build Lib container
const Lib = {};
Lib.Utils = require('helper-utils')(Lib, {});

// Load the adapter under test
const Adapter = require('helper-contact-phone-adapter-basic')(Lib, {});

// Load the parent core with this adapter
const ContactPhone = require('helper-contact-phone')(Lib, {
  Adapter: Adapter
});

// Load the country data for assertions
const COUNTRY_DATA = require('helper-contact-phone-adapter-basic/data/basic.country-data.json');


module.exports = {
  Lib: Lib,
  Adapter: Adapter,
  ContactPhone: ContactPhone,
  COUNTRY_DATA: COUNTRY_DATA
};
