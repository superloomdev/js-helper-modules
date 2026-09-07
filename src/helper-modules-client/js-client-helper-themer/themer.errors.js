// Info: Error catalog for helper-themer.
//
// This module is a pure engine: it performs synchronous derivation with no
// I/O, no network, and no external state, so its operational error set is
// empty and every failure it can produce is a programmer error. The catalog
// therefore feeds thrown messages rather than return envelopes.
//
// Each entry is the expected-shape clause of the programmer-error message
// format. The thrower composes the prefix and the field path around it, so
// the format stays in one place and every message reads alike.
export default Object.freeze({

  // ~~~~~~~~~~~~~~~~~~~~ Argument Shape ~~~~~~~~~~~~~~~~~~~~

  MUST_BE_PLAIN_OBJECT: 'must be a plain object',

  MUST_BE_LAYER_ARRAY: 'must be an array of layer objects',

  MUST_BE_PLATFORM: 'must be one of: web, native',

  MUST_BE_SHADOW_MODE: 'must be one of: legacy, box_shadow',


  // ~~~~~~~~~~~~~~~~~~~~ Template Entries ~~~~~~~~~~~~~~~~~~~~

  MUST_BE_KNOWN_ENTRY: 'must be a literal, alias, rule, generator, or type set',

  MUST_BE_DECLARED_TOKEN: 'must be a declared token or alias target',

  MUST_NOT_CYCLE: 'resolves through an alias cycle',

  MUST_BE_KNOWN_SCALE: 'must name a generator this engine provides',

  MUST_BE_KNOWN_OPERATION: 'must name an operation this engine provides',

  MUST_BE_KNOWN_GROUP: 'must name a known emitter group',

  MUST_BE_COLOR: 'must be a supported numeric color',

  MUST_HAVE_OPAQUE_BACKGROUND: 'must have an opaque compositing background',

  MUST_NOT_CONFLICT: 'must not be declared with its alternate field',

  MUST_BE_NON_EMPTY_ARRAY: 'must be a non-empty array',

  MUST_BE_KNOWN_POLARITY: 'must be one of: light, dark',

  MUST_BE_VALID_CONTRAST_RULE: 'must be a [String, String, Number?] triple naming two declared tokens',

  MUST_BE_KNOWN_CONTRAST_MODE: 'must be one of: correct, report',


  // ~~~~~~~~~~~~~~~~~~~~ Numeric Range ~~~~~~~~~~~~~~~~~~~~

  MUST_BE_POSITIVE_NUMBER: 'must be a number greater than zero',

  MUST_BE_NON_NEGATIVE_NUMBER: 'must be a number of zero or greater',

  MUST_BE_FINITE_NUMBER: 'must be a finite number',

  MUST_BE_UNIT_INTERVAL: 'must be a number between 0 and 1 inclusive',

  MUST_BE_CONTRAST_RATIO: 'must be a number between 1 and 21 inclusive',

  MUST_BE_CACHE_CAPACITY: 'must be a whole number of 1 or greater',

  MUST_BE_BOOLEAN: 'must be true or false',


  // ~~~~~~~~~~~~~~~~~~~~ Token Contract ~~~~~~~~~~~~~~~~~~~~

  CONTRACT_MISSING_TOKEN: 'is a required contract token absent from the theme',

  CONTRACT_UNKNOWN_TOKEN: 'is not a token in the contract',

  CONTRACT_INVALID_VALUE: 'is not a valid value for this token type',

  CONTRACT_UNSUPPORTED_TOKEN: 'is not supported by this component system'

});
