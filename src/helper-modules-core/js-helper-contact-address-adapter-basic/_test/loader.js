// Info: Test loader for helper-contact-address-adapter-basic.
'use strict';


const Lib = {};
Lib.Utils = require('helper-utils')(Lib, {});

const Adapter = require('helper-contact-address-adapter-basic')(Lib, {});
const ContactAddress = require('helper-contact-address')(Lib, { Adapter: Adapter });


module.exports = {
  Lib: Lib,
  Adapter: Adapter,
  ContactAddress: ContactAddress
};
