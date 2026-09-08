// Info: Material 3 to Superloom token mapping table.
//
// Maps every Material token at the pinned upstream to a Superloom contract key.
// Material names appear only in this file; the generator reads this table and
// produces themes in Superloom's vocabulary.
//
// V2b candidate: Material's brand/plain typeface distinction (both 'Roboto' at
// this pin) maps to font.family.sans. A future V2b could add
// font.family.display / font.family.text to preserve the distinction.
export default Object.freeze({

  color: {
    // Primary / interactive
    primary: 'color.interactive',
    on_primary: 'color.text_on_color',
    primary_container: 'color.button_primary',
    on_primary_container: 'color.text_on_color_disabled',
    primary_fixed: 'color.button_primary_hover',
    primary_fixed_dim: 'color.link_primary',
    on_primary_fixed: 'color.text_on_color',
    on_primary_fixed_variant: 'color.text_on_color',

    // Secondary
    secondary: 'color.button_secondary',
    on_secondary: 'color.text_on_color',
    secondary_container: 'color.button_secondary_hover',
    on_secondary_container: 'color.text_on_color',
    secondary_fixed: 'color.button_tertiary',
    secondary_fixed_dim: 'color.link_secondary',
    on_secondary_fixed: 'color.text_on_color',
    on_secondary_fixed_variant: 'color.text_on_color',

    // Tertiary
    tertiary: 'color.button_tertiary_hover',
    on_tertiary: 'color.text_on_color',
    tertiary_container: 'color.notification_background_info',
    on_tertiary_container: 'color.text_on_color',
    tertiary_fixed: 'color.notification_background_success',
    tertiary_fixed_dim: 'color.link_visited',
    on_tertiary_fixed: 'color.text_on_color',
    on_tertiary_fixed_variant: 'color.text_on_color',

    // Error
    error: 'color.support_error',
    on_error: 'color.text_on_color',
    error_container: 'color.notification_background_error',
    on_error_container: 'color.text_error',

    // Background / surface
    background: 'color.background',
    on_background: 'color.text_primary',
    surface: 'color.background',
    on_surface: 'color.text_primary',
    surface_bright: 'color.background_hover',
    surface_container: 'color.layer_02',
    surface_container_high: 'color.layer_03',
    surface_container_highest: 'color.layer_active_01',
    surface_container_low: 'color.layer_01',
    surface_container_lowest: 'color.layer_hover_01',
    surface_dim: 'color.background_selected',
    surface_variant: 'color.field_01',
    on_surface_variant: 'color.text_secondary',
    surface_tint: 'color.highlight',

    // Inverse
    inverse_surface: 'color.background_inverse',
    inverse_on_surface: 'color.text_inverse',
    inverse_primary: 'color.focus_inverse',

    // Outline / border
    outline: 'color.border_subtle_01',
    outline_variant: 'color.border_subtle_02',

    // Misc
    shadow: 'color.shadow',
    scrim: 'color.overlay'
  },

  type: {
    body_large: 'type.body02',
    body_medium: 'type.body01',
    body_small: 'type.caption01',
    display_large: 'type.display01',
    display_medium: 'type.display02',
    display_small: 'type.display03',
    headline_large: 'type.heading05',
    headline_medium: 'type.heading04',
    headline_small: 'type.heading03',
    title_large: 'type.heading02',
    title_medium: 'type.heading01',
    title_small: 'type.heading_compact_01',
    label_large: 'type.label01',
    label_medium: 'type.label02',
    label_small: 'type.legal01'
  },

  motion: {
    // Dururations: short -> fast, medium -> moderate, long -> slow, extra-long -> extra_slow
    duration_short1: 'motion.duration_fast_01',
    duration_short2: 'motion.duration_fast_02',
    duration_short3: 'motion.duration_fast_03',
    duration_short4: 'motion.duration_fast_04',
    duration_medium1: 'motion.duration_moderate_01',
    duration_medium2: 'motion.duration_moderate_02',
    duration_medium3: 'motion.duration_moderate_03',
    duration_medium4: 'motion.duration_moderate_04',
    duration_long1: 'motion.duration_slow_01',
    duration_long2: 'motion.duration_slow_02',
    duration_long3: 'motion.duration_slow_03',
    duration_long4: 'motion.duration_slow_04',
    duration_extra_long1: 'motion.duration_extra_slow_01',
    duration_extra_long2: 'motion.duration_extra_slow_02',
    duration_extra_long3: 'motion.duration_extra_slow_03',
    duration_extra_long4: 'motion.duration_extra_slow_04',

    // Easings: standard -> standard_productive, emphasized -> standard_expressive,
    // accelerate -> entrance, decelerate -> exit, linear -> linear
    easing_standard: 'motion.easing_standard_productive',
    easing_emphasized: 'motion.easing_standard_expressive',
    easing_standard_accelerate: 'motion.easing_entrance_productive',
    easing_standard_decelerate: 'motion.easing_exit_productive',
    easing_emphasized_accelerate: 'motion.easing_entrance_expressive',
    easing_emphasized_decelerate: 'motion.easing_exit_expressive',
    easing_linear: 'motion.easing_linear'
  },

  shape: {
    corner_none: 'shape.radius_00',
    corner_extra_small: 'shape.radius_04',
    corner_small: 'shape.radius_08',
    corner_medium: 'shape.radius_12',
    corner_large: 'shape.radius_16',
    corner_extra_large: 'shape.radius_28',
    corner_full: 'shape.radius_max'
  },

  elevation: {
    level0: 'shadow.level_01',
    level1: 'shadow.level_01',
    level2: 'shadow.level_02',
    level3: 'shadow.level_03',
    level4: 'shadow.level_04',
    level5: 'shadow.level_05'
  },

  state: {
    hover_state_layer_opacity: 'state.hover_opacity',
    focus_state_layer_opacity: 'state.focus_opacity',
    pressed_state_layer_opacity: 'state.pressed_opacity',
    dragged_state_layer_opacity: 'state.dragged_opacity',
    disabled_container_opacity: 'state.disabled_container_opacity',
    disabled_label_text_opacity: 'state.disabled_content_opacity'
  },

  tint: {
    level1: 'tint.level_01',
    level2: 'tint.level_02',
    level3: 'tint.level_03',
    level4: 'tint.level_04',
    level5: 'tint.level_05'
  }

});
