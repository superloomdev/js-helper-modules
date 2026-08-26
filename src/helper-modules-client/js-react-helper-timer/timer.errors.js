// Info: Error catalog for js-react-helper-timer


// Export frozen error catalog
export default Object.freeze({

  INVALID_DURATION: {
    type: 'helper-timer/invalid-duration',
    message: 'duration_ms must be a positive number'
  },

  INVALID_DIRECTION: {
    type: 'helper-timer/invalid-direction',
    message: 'direction must be "down" or "up"'
  },

  INVALID_TICK_MS: {
    type: 'helper-timer/invalid-tick-ms',
    message: 'tick_ms must be a positive number'
  },

  INVALID_CALLBACK: {
    type: 'helper-timer/invalid-callback',
    message: 'onTick and onDone must be functions'
  },

  TIMER_NOT_FOUND: {
    type: 'helper-timer/not-found',
    message: 'No timer found for the given key'
  }

});
