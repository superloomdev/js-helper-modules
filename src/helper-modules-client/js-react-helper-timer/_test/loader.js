// Info: Test loader for js-react-helper-timer
'use strict';

const Utils = require('helper-utils')();
const Debug = require('helper-debug')({ Utils: Utils });
const React = require('react');

// Load the module under test
const Timer = require('helper-timer')({
  React: React,
  Utils: Utils,
  Debug: Debug
}, {});


/********************************************************************
Export the loaded module and its dependencies for test files.

@return {Object} result.Timer - The loaded timer module instance
@return {Object} result.Utils - The Utils dependency instance
@return {Object} result.React - The React instance
*********************************************************************/
module.exports = function loader () {

  return {
    Timer: Timer,
    Utils: Utils,
    React: React
  };

};
