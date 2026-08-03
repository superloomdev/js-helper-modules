'use strict';

const Utils = require('helper-utils')();
const Debug = require('helper-debug')({ Utils: Utils });

const Font = require('helper-font')({
  Utils: Utils,
  Debug: Debug
});

module.exports = {
  Font: Font,
  Utils: Utils,
  Debug: Debug
};
