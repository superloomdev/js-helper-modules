// Info: Test loader for helper-contact-phone-adapter-extended.
// Builds a Lib container with Utils, loads the extended adapter, and
// loads the parent core with this adapter wired in. The basic adapter
// and a second core instance are also built so the swap proof can call
// both adapters through identical call sites.
'use strict';


// Build Lib container
const Lib = {};
Lib.Utils = require('helper-utils')(Lib, {});

// Load the extended adapter under test
const Adapter = require('helper-contact-phone-adapter-extended')(Lib, {});

// Load the sibling basic adapter so the swap proof has something to compare against
const BasicAdapter = require('helper-contact-phone-adapter-basic')(Lib, {});

// Load the parent core with this adapter
const ContactPhone = require('helper-contact-phone')(Lib, {
  Adapter: Adapter
});

// Load a second core instance wired to the basic adapter, same call sites
const ContactPhoneBasic = require('helper-contact-phone')(Lib, {
  Adapter: BasicAdapter
});


module.exports = {
  Lib: Lib,
  Adapter: Adapter,
  BasicAdapter: BasicAdapter,
  ContactPhone: ContactPhone,
  ContactPhoneBasic: ContactPhoneBasic
};
