// Info: Test loader for helper-contact-address-adapter-extended.
// The basic adapter and a second core instance are also built so the
// swap proof can drive both adapters through identical call sites.
'use strict';


const Lib = {};
Lib.Utils = require('helper-utils')(Lib, {});

const Adapter = require('helper-contact-address-adapter-extended')(Lib, {});
const BasicAdapter = require('helper-contact-address-adapter-basic')(Lib, {});

const ContactAddress = require('helper-contact-address')(Lib, { Adapter: Adapter });
const ContactAddressBasic = require('helper-contact-address')(Lib, { Adapter: BasicAdapter });


module.exports = {
  Lib: Lib,
  Adapter: Adapter,
  BasicAdapter: BasicAdapter,
  ContactAddress: ContactAddress,
  ContactAddressBasic: ContactAddressBasic
};
