// Info: Test loader for helper-contact-email-adapter-extended.
// The basic adapter and a second core instance are also built so the
// swap proof can drive both adapters through identical call sites.

import utilsLoader from 'helper-utils';
import adapterExtendedLoader from 'helper-contact-email-adapter-extended';
import adapterBasicLoader from 'helper-contact-email-adapter-basic';
import contactEmailLoader from 'helper-contact-email';

const Lib = {};
Lib.Utils = utilsLoader(Lib, {});

const Adapter = adapterExtendedLoader(Lib, {});
const BasicAdapter = adapterBasicLoader(Lib, {});

const ContactEmail = contactEmailLoader(Lib, { Adapter: Adapter });
const ContactEmailBasic = contactEmailLoader(Lib, { Adapter: BasicAdapter });


export {
  Lib,
  Adapter,
  BasicAdapter,
  ContactEmail,
  ContactEmailBasic
};
