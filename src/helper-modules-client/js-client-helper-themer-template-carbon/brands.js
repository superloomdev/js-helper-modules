// Info: Sample brand layers for the Carbon template (v9, D29/D30).
//
// Each brand is `{ name, light: { tokens }, dark: { tokens } }`; the host
// applies the layer matching its scheme's polarity.

export default Object.freeze({

  // Superloom (D29 as D32 amends): a purple identity on four radii. The
  // dark primary keeps the light steps 60/70/80 - purple-50 fails the
  // brand's own contrast gate (D32c)
  superloom: Object.freeze({
    name: 'superloom',
    light: Object.freeze({
      tokens: Object.freeze({
        'shape.radius_00': 4,
        'color.interactive': '#8a3ffc',
        'color.focus': '#8a3ffc',
        'color.link_primary': '#8a3ffc',
        'color.button_primary': '#8a3ffc',
        'color.button_primary_hover': '#6929c4',
        'color.button_primary_active': '#491d8b'
      })
    }),
    dark: Object.freeze({
      tokens: Object.freeze({
        'shape.radius_00': 4,
        'color.interactive': '#a56eff',
        'color.focus': '#a56eff',
        'color.link_primary': '#a56eff',
        'color.button_primary': '#8a3ffc',
        'color.button_primary_hover': '#6929c4',
        'color.button_primary_active': '#491d8b'
      })
    })
  }),

  // Rounded: two tokens, copied from
  // codebase-demo-client-rnw-v2/src/themes/brand-layers.js
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
  })

});
