// Info: Test loader for helper-contact-email-adapter-basic.
'use strict';


const Lib = {};
Lib.Utils = require('helper-utils')(Lib, {});

const Adapter = require('helper-contact-email-adapter-basic')(Lib, {});
const ContactEmail = require('helper-contact-email')(Lib, { Adapter: Adapter });


module.exports = {
  Lib: Lib,
  Adapter: Adapter,
  ContactEmail: ContactEmail
};
