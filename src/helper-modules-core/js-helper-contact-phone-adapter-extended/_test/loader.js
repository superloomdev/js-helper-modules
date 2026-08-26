// Info: Test loader for helper-contact-phone-adapter-extended.
// Builds a Lib container with Utils, loads the extended adapter, and
// loads the parent core with this adapter wired in. The basic adapter
// and a second core instance are also built so the swap proof can call
// both adapters through identical call sites.

import utilsLoader from 'helper-utils';
import adapterExtendedLoader from 'helper-contact-phone-adapter-extended';
import adapterBasicLoader from 'helper-contact-phone-adapter-basic';
import contactPhoneLoader from 'helper-contact-phone';


// Build Lib container
const Lib = {};
Lib.Utils = utilsLoader(Lib, {});

// Load the extended adapter under test
const Adapter = adapterExtendedLoader(Lib, {});

// Load the sibling basic adapter so the swap proof has something to compare against
const BasicAdapter = adapterBasicLoader(Lib, {});

// Load the parent core with this adapter
const ContactPhone = contactPhoneLoader(Lib, {
  Adapter: Adapter
});

// Load a second core instance wired to the basic adapter, same call sites
const ContactPhoneBasic = contactPhoneLoader(Lib, {
  Adapter: BasicAdapter
});


export {
  Lib,
  Adapter,
  BasicAdapter,
  ContactPhone,
  ContactPhoneBasic
};
