// Info: Error catalog for helper-idle.
//
// Frozen on export. Injected into validators and createInterface.

module.exports = Object.freeze({

  INVALID_CALLBACK: {
    type: 'helper-idle/invalid-callback',
    message: 'Callback must be a function'
  },

  INVALID_THRESHOLD: {
    type: 'helper-idle/invalid-threshold',
    message: 'Threshold ms must be a positive number'
  },

  INVALID_CONFIG: {
    type: 'helper-idle/invalid-config',
    message: 'Configuration validation failed'
  }

});
