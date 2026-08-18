// Info: Test loader for helper-contact-email-adapter-extended.
'use strict';


const Lib = {};
Lib.Utils = require('helper-utils')(Lib, {});

const Adapter = require('helper-contact-email-adapter-extended')(Lib, {});
const ContactEmail = require('helper-contact-email')(Lib, { Adapter: Adapter });


module.exports = {
  Lib: Lib,
  Adapter: Adapter,
  ContactEmail: ContactEmail
};
