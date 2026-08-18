// Info: Test loader for helper-contact-address-adapter-extended.
'use strict';


const Lib = {};
Lib.Utils = require('helper-utils')(Lib, {});

const Adapter = require('helper-contact-address-adapter-extended')(Lib, {});
const ContactAddress = require('helper-contact-address')(Lib, { Adapter: Adapter });


module.exports = {
  Lib: Lib,
  Adapter: Adapter,
  ContactAddress: ContactAddress
};
