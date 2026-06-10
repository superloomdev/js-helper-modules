// Info: Default configuration for the js-client-helper-styler package — the knobs a host may
// override when calling a module loader. Pure data (key-value map), following
// the JS helper module convention.
//
// There are currently NO config knobs: the engine's assembly logging is emitted
// at DEBUG level and controlled by the injected logger's own level threshold
// (raise it to silence), not by a flag. This file is kept (and still merged by
// the loaders) so the loader signature stays uniform and future knobs have a home.
//
// Compatibility: Node.js 18+ and React Native (Hermes).
'use strict';


module.exports = {};
