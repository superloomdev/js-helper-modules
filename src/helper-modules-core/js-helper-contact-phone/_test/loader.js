// Info: Test loader for helper-contact-phone. Builds the base Lib
// container (Utils, Debug) used by all tests, then loads the phone
// module with a stub adapter (stub-adapter.js) that implements the
// 3-method contract with a small known country set.
'use strict';


const ContactPhone = require('helper-contact-phone');


/********************************************************************
Build the dependency container and a configured phone module for tests.
The phone module is wired with a stub adapter so tests exercise the
core logic without depending on any real adapter package.

@return {Object} - { Lib, contactPhone }
*********************************************************************/
module.exports = function loader () {

  // Dependencies for this instance
  const Lib = {};

  // Foundation modules
  Lib.Utils = require('helper-utils')(Lib, {});
  Lib.Debug = require('helper-debug')(Lib, {});

  // Stub adapter with a small known country set for testing
  const StubAdapter = require('./stub-adapter')(Lib, {});

  // Contact Phone (with stub adapter injected)
  const contactPhone = ContactPhone(Lib, { Adapter: StubAdapter });

  return { Lib: Lib, contactPhone: contactPhone };

};
