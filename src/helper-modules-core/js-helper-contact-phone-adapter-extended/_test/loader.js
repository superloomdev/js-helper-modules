// Info: Test loader for helper-contact-phone-adapter-extended.
// Builds a Lib container with Utils, loads the extended adapter, and
// loads the parent core with this adapter wired in.
'use strict';


// Build Lib container
const Lib = {};
Lib.Utils = require('helper-utils')(Lib, {});

// Load the extended adapter under test
const Adapter = require('helper-contact-phone-adapter-extended')(Lib, {});

// Load the parent core with this adapter
const ContactPhone = require('helper-contact-phone')(Lib, {
  Adapter: Adapter
});


module.exports = {
  Lib: Lib,
  Adapter: Adapter,
  ContactPhone: ContactPhone
};
