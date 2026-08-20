// Info: Test loader for helper-contact-email-adapter-extended.
// The basic adapter and a second core instance are also built so the
// swap proof can drive both adapters through identical call sites.
'use strict';


const Lib = {};
Lib.Utils = require('helper-utils')(Lib, {});

const Adapter = require('helper-contact-email-adapter-extended')(Lib, {});
const BasicAdapter = require('helper-contact-email-adapter-basic')(Lib, {});

const ContactEmail = require('helper-contact-email')(Lib, { Adapter: Adapter });
const ContactEmailBasic = require('helper-contact-email')(Lib, { Adapter: BasicAdapter });


module.exports = {
  Lib: Lib,
  Adapter: Adapter,
  BasicAdapter: BasicAdapter,
  ContactEmail: ContactEmail,
  ContactEmailBasic: ContactEmailBasic
};
