// Info: Test loader for helper-contact-address-adapter-basic.
import utilsLoader from 'helper-utils';
import adapterBasicLoader from 'helper-contact-address-adapter-basic';
import contactAddressLoader from 'helper-contact-address';


const Lib = {};
Lib.Utils = utilsLoader(Lib, {});

const Adapter = adapterBasicLoader(Lib, {});
const ContactAddress = contactAddressLoader(Lib, { Adapter: Adapter });


export default {
  Lib: Lib,
  Adapter: Adapter,
  ContactAddress: ContactAddress
};
