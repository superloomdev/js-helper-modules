// Info: Material upstream tokens deliberately not mapped to Superloom keys.
//
// Each entry has a Material token name and a reason. The generator never
// copies these. Listed here so the assertion that every upstream token is
// either mapped or deliberately absent is verifiable.
export default Object.freeze({

  // Material 2 compatibility curves, not Material 3 design.
  'easing-m2': 'Material 2 compatibility curve, not Material 3 design',
  'easing-m2-accelerate': 'Material 2 compatibility curve, not Material 3 design',
  'easing-m2-decelerate': 'Material 2 compatibility curve, not Material 3 design',

  // Composite corners are anatomy (per-side), not design tokens.
  'corner-extra-large-top': 'Composite corner (anatomy), not a design token',
  'corner-extra-small-top': 'Composite corner (anatomy), not a design token',
  'corner-large-end': 'Composite corner (anatomy), not a design token',
  'corner-large-start': 'Composite corner (anatomy), not a design token',
  'corner-large-top': 'Composite corner (anatomy), not a design token',

  // Path is null upstream (not supported).
  'path': 'Null upstream, not supported'

});
