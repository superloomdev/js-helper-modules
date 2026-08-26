// Info: Test loader for helper-contact-email-adapter-basic.

import utilsLoader from 'helper-utils';
import adapterBasicLoader from 'helper-contact-email-adapter-basic';
import contactEmailLoader from 'helper-contact-email';

const Lib = {};
Lib.Utils = utilsLoader(Lib, {});

const Adapter = adapterBasicLoader(Lib, {});
const ContactEmail = contactEmailLoader(Lib, { Adapter: Adapter });


export {
  Lib,
  Adapter,
  ContactEmail
};
