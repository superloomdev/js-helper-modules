// Info: Test loader for helper-contact-phone-adapter-basic. Builds the
// base Lib container (Utils, Debug) used by all tests, then loads the
// phone module with this basic adapter injected. Returns both Lib and
// a ready-to-use phone instance so tests can exercise the full pipeline
// end-to-end through the real adapter.
'use strict';


const ContactPhone             = require('helper-contact-phone');
const ContactPhoneAdapterBasic = require('helper-contact-phone-adapter-basic');


/********************************************************************
Build the dependency container and a configured phone module for tests.
The phone module is wired with this basic adapter so tests exercise the
real adapter data and logic through the core public interface.

@return {Object} - { Lib, contactPhone, adapter }
*********************************************************************/
module.exports = function loader () {

  // Dependencies for this instance
  const Lib = {};

  // Foundation modules
  Lib.Utils = require('helper-utils')(Lib, {});
  Lib.Debug = require('helper-debug')(Lib, {});

  // Contact Phone (with this basic adapter injected)
  const BasicAdapter = ContactPhoneAdapterBasic(Lib, {});
  const contactPhone = ContactPhone(Lib, { Adapter: BasicAdapter });

  return { Lib: Lib, contactPhone: contactPhone, adapter: BasicAdapter };

};
