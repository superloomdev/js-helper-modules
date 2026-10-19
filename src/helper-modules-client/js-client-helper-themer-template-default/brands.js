// Info: Sample brand layers for the Superloom default template (v9, D30).
//
// Each brand is `{ name, light: { tokens }, dark: { tokens } }`; the host
// applies the layer matching its scheme's polarity on top of the base.
// `rounded` and `acme` are copied from
// codebase-demo-client-rnw-v2/src/themes/brand-layers.js.

export default Object.freeze({

  // Rounded: two tokens. `feedback.field` switches fields to four-sided
  // borders and `shape.radius_00` rounds every square corner together
  rounded: Object.freeze({
    name: 'rounded',
    light: Object.freeze({
      tokens: Object.freeze({
        'feedback.field': 'outline',
        'shape.radius_00': 8
      })
    }),
    dark: Object.freeze({
      tokens: Object.freeze({
        'feedback.field': 'outline',
        'shape.radius_00': 8
      })
    })
  }),

  // Acme: a sparse brand over any profile. One interactive color and its
  // focus ring, a sans family the hosts carry, two radii, and three glyphs
  // of its own
  acme: Object.freeze({
    name: 'acme',
    light: Object.freeze({
      tokens: Object.freeze({
        'color.interactive': '#c2410c',
        'color.focus': '#c2410c',
        'font.family.sans': 'Roboto',
        'shape.radius_04': 6,
        'shape.radius_08': 12,
        'icon.close': { icon: true, viewBox: '0 0 24 24', paths: [{ d: 'M5 5h3l4 5 4-5h3l-5.5 7 5.5 7h-3l-4-5-4 5H5l5.5-7z' }] },
        'icon.checkmark': { icon: true, viewBox: '0 0 24 24', paths: [{ d: 'M3 12l2-2 5 5 9-9 2 2-11 11z' }] },
        'icon.search': { icon: true, viewBox: '0 0 24 24', paths: [{ d: 'M10 3a7 7 0 015.6 11.2l5.2 5.2-1.4 1.4-5.2-5.2A7 7 0 1110 3zm0 2a5 5 0 100 10 5 5 0 000-10z' }] }
      })
    }),
    dark: Object.freeze({
      tokens: Object.freeze({
        'color.interactive': '#c2410c',
        'color.focus': '#c2410c',
        'font.family.sans': 'Roboto',
        'shape.radius_04': 6,
        'shape.radius_08': 12,
        'icon.close': { icon: true, viewBox: '0 0 24 24', paths: [{ d: 'M5 5h3l4 5 4-5h3l-5.5 7 5.5 7h-3l-4-5-4 5H5l5.5-7z' }] },
        'icon.checkmark': { icon: true, viewBox: '0 0 24 24', paths: [{ d: 'M3 12l2-2 5 5 9-9 2 2-11 11z' }] },
        'icon.search': { icon: true, viewBox: '0 0 24 24', paths: [{ d: 'M10 3a7 7 0 015.6 11.2l5.2 5.2-1.4 1.4-5.2-5.2A7 7 0 1110 3zm0 2a5 5 0 100 10 5 5 0 000-10z' }] }
      })
    })
  })

});
