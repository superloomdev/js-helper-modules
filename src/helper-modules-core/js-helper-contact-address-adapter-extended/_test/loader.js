// Info: Test loader for helper-contact-address-adapter-extended.
// The basic adapter and a second core instance are also built so the
// swap proof can drive both adapters through identical call sites.
import utilsLoader from 'helper-utils';
import adapterExtendedLoader from 'helper-contact-address-adapter-extended';
import adapterBasicLoader from 'helper-contact-address-adapter-basic';
import contactAddressLoader from 'helper-contact-address';


const Lib = {};
Lib.Utils = utilsLoader(Lib, {});

const Adapter = adapterExtendedLoader(Lib, {});
const BasicAdapter = adapterBasicLoader(Lib, {});

const ContactAddress = contactAddressLoader(Lib, { Adapter: Adapter });
const ContactAddressBasic = contactAddressLoader(Lib, { Adapter: BasicAdapter });


export default {
  Lib: Lib,
  Adapter: Adapter,
  BasicAdapter: BasicAdapter,
  ContactAddress: ContactAddress,
  ContactAddressBasic: ContactAddressBasic
};
