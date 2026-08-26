// Info: Test loader for js-react-helper-timer
import utilsLoader from 'helper-utils';
import debugLoader from 'helper-debug';
import React from 'react';
import timerLoader from 'helper-timer';

const Utils = utilsLoader();
const Debug = debugLoader({ Utils: Utils });

// Load the module under test
const Timer = timerLoader({
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
export default function loader () {

  return {
    Timer: Timer,
    Utils: Utils,
    React: React
  };

};
