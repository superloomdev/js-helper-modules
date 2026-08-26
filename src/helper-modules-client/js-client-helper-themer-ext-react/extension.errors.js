// Info: Error catalog for helper-themer-ext-react.
//
// This module is a React extension: it holds no I/O and performs no
// asynchronous work, so every failure it can produce is a programmer
// error. The catalog feeds thrown messages in the framework's
// programmer-error format.
export default Object.freeze({

  // ~~~~~~~~~~~~~~~~~~~~ Dependency Injection ~~~~~~~~~~~~~~~~~~~~

  MUST_HAVE_REACT: 'is required (inject React via the loader)',
  MUST_HAVE_THEMER: 'is required (inject a built Themer instance via the loader)',

  // ~~~~~~~~~~~~~~~~~~~~ Provider Props ~~~~~~~~~~~~~~~~~~~~

  MUST_BE_PLAIN_OBJECT: 'must be a plain object',
  MUST_BE_LAYER_ARRAY: 'must be an array of layer objects',
  MUST_BE_PLATFORM: 'must be one of: web, native',
  MUST_BE_FUNCTION: 'must be a function'

});
