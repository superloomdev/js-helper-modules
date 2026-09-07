// Info: The Superloom token contract.
//
// One frozen registry above every component system. Themer publishes it
// through getContract(); component libraries consume subsets through
// validateContract(theme, { required, supported }). Reference theme
// packages map vendor design data into this vocabulary; the engine itself
// never embeds a vendor name.
//
// The contract is versioned. Version 1 is the initial Superloom contract
// derived from Carbon v11 names in snake_case, with web-only concepts
// removed and Superloom additions for font roles, structure knobs, and
// shadow recipes.


/////////////////////////// Module-Loader START ////////////////////////////////

/********************************************************************
Build the contract registry.

The tokens map is hand-maintained in Section 5 order. The meta map
is derived from tokens by a plain loop before freezing, so it never
drifts from the token definitions.

@return {Object} - Frozen contract registry
*********************************************************************/
function buildContract () {

  // Group definitions: tier, value type, and default emission
  const groups = Object.freeze({
    color:      Object.freeze({ tier: 'value',     type: 'color',   emit: 'color' }),
    spacing:    Object.freeze({ tier: 'value',     type: 'number',  emit: 'dimension' }),
    size:       Object.freeze({ tier: 'value',     type: 'number',  emit: 'dimension' }),
    type:       Object.freeze({ tier: 'value',     type: 'typeSet', emit: 'typeSet' }),
    font:       Object.freeze({ tier: 'value',     type: 'font',    emit: 'raw' }),
    shape:      Object.freeze({ tier: 'structure', type: 'number',  emit: 'dimension' }),
    border:     Object.freeze({ tier: 'structure', type: 'number',  emit: 'dimension' }),
    focus:      Object.freeze({ tier: 'structure', type: 'number',  emit: 'dimension' }),
    motion:     Object.freeze({ tier: 'structure', type: 'motion',  emit: 'duration' }),
    feedback:   Object.freeze({ tier: 'structure', type: 'enum',    emit: 'raw' }),
    shadow:     Object.freeze({ tier: 'structure', type: 'shadow',  emit: 'shadow' }),
    breakpoint: Object.freeze({ tier: 'structure', type: 'number',  emit: 'raw' })
  });


  // Token definitions: one entry per token in Section 5 order.
  // Each entry carries its group. Tokens that override the group's
  // default emission or carry an enum values list add those fields.
  const tokens = Object.freeze({

    // ~~~~~~~~~~~~~~~~~~~~ color.* (190 tokens) ~~~~~~~~~~~~~~~~~~~

    // background (8)
    'color.background': Object.freeze({ group: 'color' }),
    'color.background_active': Object.freeze({ group: 'color' }),
    'color.background_brand': Object.freeze({ group: 'color' }),
    'color.background_hover': Object.freeze({ group: 'color' }),
    'color.background_inverse': Object.freeze({ group: 'color' }),
    'color.background_inverse_hover': Object.freeze({ group: 'color' }),
    'color.background_selected': Object.freeze({ group: 'color' }),
    'color.background_selected_hover': Object.freeze({ group: 'color' }),

    // layer (29)
    'color.layer_01': Object.freeze({ group: 'color' }),
    'color.layer_02': Object.freeze({ group: 'color' }),
    'color.layer_03': Object.freeze({ group: 'color' }),
    'color.layer_accent_01': Object.freeze({ group: 'color' }),
    'color.layer_accent_02': Object.freeze({ group: 'color' }),
    'color.layer_accent_03': Object.freeze({ group: 'color' }),
    'color.layer_accent_active_01': Object.freeze({ group: 'color' }),
    'color.layer_accent_active_02': Object.freeze({ group: 'color' }),
    'color.layer_accent_active_03': Object.freeze({ group: 'color' }),
    'color.layer_accent_hover_01': Object.freeze({ group: 'color' }),
    'color.layer_accent_hover_02': Object.freeze({ group: 'color' }),
    'color.layer_accent_hover_03': Object.freeze({ group: 'color' }),
    'color.layer_active_01': Object.freeze({ group: 'color' }),
    'color.layer_active_02': Object.freeze({ group: 'color' }),
    'color.layer_active_03': Object.freeze({ group: 'color' }),
    'color.layer_background_01': Object.freeze({ group: 'color' }),
    'color.layer_background_02': Object.freeze({ group: 'color' }),
    'color.layer_background_03': Object.freeze({ group: 'color' }),
    'color.layer_hover_01': Object.freeze({ group: 'color' }),
    'color.layer_hover_02': Object.freeze({ group: 'color' }),
    'color.layer_hover_03': Object.freeze({ group: 'color' }),
    'color.layer_selected_01': Object.freeze({ group: 'color' }),
    'color.layer_selected_02': Object.freeze({ group: 'color' }),
    'color.layer_selected_03': Object.freeze({ group: 'color' }),
    'color.layer_selected_disabled': Object.freeze({ group: 'color' }),
    'color.layer_selected_hover_01': Object.freeze({ group: 'color' }),
    'color.layer_selected_hover_02': Object.freeze({ group: 'color' }),
    'color.layer_selected_hover_03': Object.freeze({ group: 'color' }),
    'color.layer_selected_inverse': Object.freeze({ group: 'color' }),

    // field (6)
    'color.field_01': Object.freeze({ group: 'color' }),
    'color.field_02': Object.freeze({ group: 'color' }),
    'color.field_03': Object.freeze({ group: 'color' }),
    'color.field_hover_01': Object.freeze({ group: 'color' }),
    'color.field_hover_02': Object.freeze({ group: 'color' }),
    'color.field_hover_03': Object.freeze({ group: 'color' }),

    // text (9)
    'color.text_disabled': Object.freeze({ group: 'color' }),
    'color.text_error': Object.freeze({ group: 'color' }),
    'color.text_helper': Object.freeze({ group: 'color' }),
    'color.text_inverse': Object.freeze({ group: 'color' }),
    'color.text_on_color': Object.freeze({ group: 'color' }),
    'color.text_on_color_disabled': Object.freeze({ group: 'color' }),
    'color.text_placeholder': Object.freeze({ group: 'color' }),
    'color.text_primary': Object.freeze({ group: 'color' }),
    'color.text_secondary': Object.freeze({ group: 'color' }),

    // border (16)
    'color.border_disabled': Object.freeze({ group: 'color' }),
    'color.border_interactive': Object.freeze({ group: 'color' }),
    'color.border_inverse': Object.freeze({ group: 'color' }),
    'color.border_strong_01': Object.freeze({ group: 'color' }),
    'color.border_strong_02': Object.freeze({ group: 'color' }),
    'color.border_strong_03': Object.freeze({ group: 'color' }),
    'color.border_subtle_00': Object.freeze({ group: 'color' }),
    'color.border_subtle_01': Object.freeze({ group: 'color' }),
    'color.border_subtle_02': Object.freeze({ group: 'color' }),
    'color.border_subtle_03': Object.freeze({ group: 'color' }),
    'color.border_subtle_selected_01': Object.freeze({ group: 'color' }),
    'color.border_subtle_selected_02': Object.freeze({ group: 'color' }),
    'color.border_subtle_selected_03': Object.freeze({ group: 'color' }),
    'color.border_tile_01': Object.freeze({ group: 'color' }),
    'color.border_tile_02': Object.freeze({ group: 'color' }),
    'color.border_tile_03': Object.freeze({ group: 'color' }),

    // icon (7)
    'color.icon_disabled': Object.freeze({ group: 'color' }),
    'color.icon_interactive': Object.freeze({ group: 'color' }),
    'color.icon_inverse': Object.freeze({ group: 'color' }),
    'color.icon_on_color': Object.freeze({ group: 'color' }),
    'color.icon_on_color_disabled': Object.freeze({ group: 'color' }),
    'color.icon_primary': Object.freeze({ group: 'color' }),
    'color.icon_secondary': Object.freeze({ group: 'color' }),

    // interactive and focus (5)
    'color.interactive': Object.freeze({ group: 'color' }),
    'color.focus': Object.freeze({ group: 'color' }),
    'color.focus_inset': Object.freeze({ group: 'color' }),
    'color.focus_inverse': Object.freeze({ group: 'color' }),
    'color.highlight': Object.freeze({ group: 'color' }),

    // link (8)
    'color.link_inverse': Object.freeze({ group: 'color' }),
    'color.link_inverse_active': Object.freeze({ group: 'color' }),
    'color.link_inverse_hover': Object.freeze({ group: 'color' }),
    'color.link_inverse_visited': Object.freeze({ group: 'color' }),
    'color.link_primary': Object.freeze({ group: 'color' }),
    'color.link_primary_hover': Object.freeze({ group: 'color' }),
    'color.link_secondary': Object.freeze({ group: 'color' }),
    'color.link_visited': Object.freeze({ group: 'color' }),

    // support (11)
    'color.support_caution_major': Object.freeze({ group: 'color' }),
    'color.support_caution_minor': Object.freeze({ group: 'color' }),
    'color.support_caution_undefined': Object.freeze({ group: 'color' }),
    'color.support_error': Object.freeze({ group: 'color' }),
    'color.support_error_inverse': Object.freeze({ group: 'color' }),
    'color.support_info': Object.freeze({ group: 'color' }),
    'color.support_info_inverse': Object.freeze({ group: 'color' }),
    'color.support_success': Object.freeze({ group: 'color' }),
    'color.support_success_inverse': Object.freeze({ group: 'color' }),
    'color.support_warning': Object.freeze({ group: 'color' }),
    'color.support_warning_inverse': Object.freeze({ group: 'color' }),

    // misc (5)
    'color.toggle_off': Object.freeze({ group: 'color' }),
    'color.overlay': Object.freeze({ group: 'color' }),
    'color.skeleton_background': Object.freeze({ group: 'color' }),
    'color.skeleton_element': Object.freeze({ group: 'color' }),
    'color.shadow': Object.freeze({ group: 'color' }),

    // ai (21)
    'color.ai_aura_end': Object.freeze({ group: 'color' }),
    'color.ai_aura_hover_background': Object.freeze({ group: 'color' }),
    'color.ai_aura_hover_end': Object.freeze({ group: 'color' }),
    'color.ai_aura_hover_start': Object.freeze({ group: 'color' }),
    'color.ai_aura_start': Object.freeze({ group: 'color' }),
    'color.ai_aura_start_sm': Object.freeze({ group: 'color' }),
    'color.ai_border_end': Object.freeze({ group: 'color' }),
    'color.ai_border_start': Object.freeze({ group: 'color' }),
    'color.ai_border_strong': Object.freeze({ group: 'color' }),
    'color.ai_drop_shadow': Object.freeze({ group: 'color' }),
    'color.ai_inner_shadow': Object.freeze({ group: 'color' }),
    'color.ai_overlay': Object.freeze({ group: 'color' }),
    'color.ai_popover_background': Object.freeze({ group: 'color' }),
    'color.ai_popover_caret_bottom': Object.freeze({ group: 'color' }),
    'color.ai_popover_caret_bottom_background': Object.freeze({ group: 'color' }),
    'color.ai_popover_caret_bottom_background_actions': Object.freeze({ group: 'color' }),
    'color.ai_popover_caret_center': Object.freeze({ group: 'color' }),
    'color.ai_popover_shadow_outer_01': Object.freeze({ group: 'color' }),
    'color.ai_popover_shadow_outer_02': Object.freeze({ group: 'color' }),
    'color.ai_skeleton_background': Object.freeze({ group: 'color' }),
    'color.ai_skeleton_element_background': Object.freeze({ group: 'color' }),

    // button (15)
    'color.button_danger_active': Object.freeze({ group: 'color' }),
    'color.button_danger_hover': Object.freeze({ group: 'color' }),
    'color.button_danger_primary': Object.freeze({ group: 'color' }),
    'color.button_danger_secondary': Object.freeze({ group: 'color' }),
    'color.button_disabled': Object.freeze({ group: 'color' }),
    'color.button_primary': Object.freeze({ group: 'color' }),
    'color.button_primary_active': Object.freeze({ group: 'color' }),
    'color.button_primary_hover': Object.freeze({ group: 'color' }),
    'color.button_secondary': Object.freeze({ group: 'color' }),
    'color.button_secondary_active': Object.freeze({ group: 'color' }),
    'color.button_secondary_hover': Object.freeze({ group: 'color' }),
    'color.button_separator': Object.freeze({ group: 'color' }),
    'color.button_tertiary': Object.freeze({ group: 'color' }),
    'color.button_tertiary_active': Object.freeze({ group: 'color' }),
    'color.button_tertiary_hover': Object.freeze({ group: 'color' }),

    // notification (10)
    'color.notification_action_hover': Object.freeze({ group: 'color' }),
    'color.notification_action_tertiary_inverse': Object.freeze({ group: 'color' }),
    'color.notification_action_tertiary_inverse_active': Object.freeze({ group: 'color' }),
    'color.notification_action_tertiary_inverse_hover': Object.freeze({ group: 'color' }),
    'color.notification_action_tertiary_inverse_text': Object.freeze({ group: 'color' }),
    'color.notification_action_tertiary_inverse_text_on_color_disabled': Object.freeze({ group: 'color' }),
    'color.notification_background_error': Object.freeze({ group: 'color' }),
    'color.notification_background_info': Object.freeze({ group: 'color' }),
    'color.notification_background_success': Object.freeze({ group: 'color' }),
    'color.notification_background_warning': Object.freeze({ group: 'color' }),

    // tag (40)
    'color.tag_background_blue': Object.freeze({ group: 'color' }),
    'color.tag_background_cool_gray': Object.freeze({ group: 'color' }),
    'color.tag_background_cyan': Object.freeze({ group: 'color' }),
    'color.tag_background_gray': Object.freeze({ group: 'color' }),
    'color.tag_background_green': Object.freeze({ group: 'color' }),
    'color.tag_background_magenta': Object.freeze({ group: 'color' }),
    'color.tag_background_purple': Object.freeze({ group: 'color' }),
    'color.tag_background_red': Object.freeze({ group: 'color' }),
    'color.tag_background_teal': Object.freeze({ group: 'color' }),
    'color.tag_background_warm_gray': Object.freeze({ group: 'color' }),
    'color.tag_border_blue': Object.freeze({ group: 'color' }),
    'color.tag_border_cool_gray': Object.freeze({ group: 'color' }),
    'color.tag_border_cyan': Object.freeze({ group: 'color' }),
    'color.tag_border_gray': Object.freeze({ group: 'color' }),
    'color.tag_border_green': Object.freeze({ group: 'color' }),
    'color.tag_border_magenta': Object.freeze({ group: 'color' }),
    'color.tag_border_purple': Object.freeze({ group: 'color' }),
    'color.tag_border_red': Object.freeze({ group: 'color' }),
    'color.tag_border_teal': Object.freeze({ group: 'color' }),
    'color.tag_border_warm_gray': Object.freeze({ group: 'color' }),
    'color.tag_color_blue': Object.freeze({ group: 'color' }),
    'color.tag_color_cool_gray': Object.freeze({ group: 'color' }),
    'color.tag_color_cyan': Object.freeze({ group: 'color' }),
    'color.tag_color_gray': Object.freeze({ group: 'color' }),
    'color.tag_color_green': Object.freeze({ group: 'color' }),
    'color.tag_color_magenta': Object.freeze({ group: 'color' }),
    'color.tag_color_purple': Object.freeze({ group: 'color' }),
    'color.tag_color_red': Object.freeze({ group: 'color' }),
    'color.tag_color_teal': Object.freeze({ group: 'color' }),
    'color.tag_color_warm_gray': Object.freeze({ group: 'color' }),
    'color.tag_hover_blue': Object.freeze({ group: 'color' }),
    'color.tag_hover_cool_gray': Object.freeze({ group: 'color' }),
    'color.tag_hover_cyan': Object.freeze({ group: 'color' }),
    'color.tag_hover_gray': Object.freeze({ group: 'color' }),
    'color.tag_hover_green': Object.freeze({ group: 'color' }),
    'color.tag_hover_magenta': Object.freeze({ group: 'color' }),
    'color.tag_hover_purple': Object.freeze({ group: 'color' }),
    'color.tag_hover_red': Object.freeze({ group: 'color' }),
    'color.tag_hover_teal': Object.freeze({ group: 'color' }),
    'color.tag_hover_warm_gray': Object.freeze({ group: 'color' }),


    // ~~~~~~~~~~~~~~~~~~~~ spacing.* (13 tokens) ~~~~~~~~~~~~~~~~~~~

    'spacing.spacing_01': Object.freeze({ group: 'spacing' }),
    'spacing.spacing_02': Object.freeze({ group: 'spacing' }),
    'spacing.spacing_03': Object.freeze({ group: 'spacing' }),
    'spacing.spacing_04': Object.freeze({ group: 'spacing' }),
    'spacing.spacing_05': Object.freeze({ group: 'spacing' }),
    'spacing.spacing_06': Object.freeze({ group: 'spacing' }),
    'spacing.spacing_07': Object.freeze({ group: 'spacing' }),
    'spacing.spacing_08': Object.freeze({ group: 'spacing' }),
    'spacing.spacing_09': Object.freeze({ group: 'spacing' }),
    'spacing.spacing_10': Object.freeze({ group: 'spacing' }),
    'spacing.spacing_11': Object.freeze({ group: 'spacing' }),
    'spacing.spacing_12': Object.freeze({ group: 'spacing' }),
    'spacing.spacing_13': Object.freeze({ group: 'spacing' }),


    // ~~~~~~~~~~~~~~~~~~~~ size.* (20 tokens) ~~~~~~~~~~~~~~~~~~~

    'size.container_01': Object.freeze({ group: 'size' }),
    'size.container_02': Object.freeze({ group: 'size' }),
    'size.container_03': Object.freeze({ group: 'size' }),
    'size.container_04': Object.freeze({ group: 'size' }),
    'size.container_05': Object.freeze({ group: 'size' }),
    'size.size_xsmall': Object.freeze({ group: 'size' }),
    'size.size_small': Object.freeze({ group: 'size' }),
    'size.size_medium': Object.freeze({ group: 'size' }),
    'size.size_large': Object.freeze({ group: 'size' }),
    'size.size_xlarge': Object.freeze({ group: 'size' }),
    'size.size_2xlarge': Object.freeze({ group: 'size' }),
    'size.icon_01': Object.freeze({ group: 'size' }),
    'size.icon_02': Object.freeze({ group: 'size' }),
    'size.layout_01': Object.freeze({ group: 'size' }),
    'size.layout_02': Object.freeze({ group: 'size' }),
    'size.layout_03': Object.freeze({ group: 'size' }),
    'size.layout_04': Object.freeze({ group: 'size' }),
    'size.layout_05': Object.freeze({ group: 'size' }),
    'size.layout_06': Object.freeze({ group: 'size' }),
    'size.layout_07': Object.freeze({ group: 'size' }),


    // ~~~~~~~~~~~~~~~~~~~~ type.* (58 tokens) ~~~~~~~~~~~~~~~~~~~

    'type.body01': Object.freeze({ group: 'type' }),
    'type.body02': Object.freeze({ group: 'type' }),
    'type.body_compact_01': Object.freeze({ group: 'type' }),
    'type.body_compact_02': Object.freeze({ group: 'type' }),
    'type.body_long_01': Object.freeze({ group: 'type' }),
    'type.body_long_02': Object.freeze({ group: 'type' }),
    'type.body_short_01': Object.freeze({ group: 'type' }),
    'type.body_short_02': Object.freeze({ group: 'type' }),
    'type.caption01': Object.freeze({ group: 'type' }),
    'type.caption02': Object.freeze({ group: 'type' }),
    'type.code01': Object.freeze({ group: 'type' }),
    'type.code02': Object.freeze({ group: 'type' }),
    'type.display01': Object.freeze({ group: 'type' }),
    'type.display02': Object.freeze({ group: 'type' }),
    'type.display03': Object.freeze({ group: 'type' }),
    'type.display04': Object.freeze({ group: 'type' }),
    'type.expressive_heading_01': Object.freeze({ group: 'type' }),
    'type.expressive_heading_02': Object.freeze({ group: 'type' }),
    'type.expressive_heading_03': Object.freeze({ group: 'type' }),
    'type.expressive_heading_04': Object.freeze({ group: 'type' }),
    'type.expressive_heading_05': Object.freeze({ group: 'type' }),
    'type.expressive_heading_06': Object.freeze({ group: 'type' }),
    'type.expressive_paragraph_01': Object.freeze({ group: 'type' }),
    'type.fluid_display_01': Object.freeze({ group: 'type' }),
    'type.fluid_display_02': Object.freeze({ group: 'type' }),
    'type.fluid_display_03': Object.freeze({ group: 'type' }),
    'type.fluid_display_04': Object.freeze({ group: 'type' }),
    'type.fluid_heading_03': Object.freeze({ group: 'type' }),
    'type.fluid_heading_04': Object.freeze({ group: 'type' }),
    'type.fluid_heading_05': Object.freeze({ group: 'type' }),
    'type.fluid_heading_06': Object.freeze({ group: 'type' }),
    'type.fluid_paragraph_01': Object.freeze({ group: 'type' }),
    'type.fluid_quotation_01': Object.freeze({ group: 'type' }),
    'type.fluid_quotation_02': Object.freeze({ group: 'type' }),
    'type.heading01': Object.freeze({ group: 'type' }),
    'type.heading02': Object.freeze({ group: 'type' }),
    'type.heading03': Object.freeze({ group: 'type' }),
    'type.heading04': Object.freeze({ group: 'type' }),
    'type.heading05': Object.freeze({ group: 'type' }),
    'type.heading06': Object.freeze({ group: 'type' }),
    'type.heading07': Object.freeze({ group: 'type' }),
    'type.heading_compact_01': Object.freeze({ group: 'type' }),
    'type.heading_compact_02': Object.freeze({ group: 'type' }),
    'type.helper_text_01': Object.freeze({ group: 'type' }),
    'type.helper_text_02': Object.freeze({ group: 'type' }),
    'type.label01': Object.freeze({ group: 'type' }),
    'type.label02': Object.freeze({ group: 'type' }),
    'type.legal01': Object.freeze({ group: 'type' }),
    'type.legal02': Object.freeze({ group: 'type' }),
    'type.productive_heading_01': Object.freeze({ group: 'type' }),
    'type.productive_heading_02': Object.freeze({ group: 'type' }),
    'type.productive_heading_03': Object.freeze({ group: 'type' }),
    'type.productive_heading_04': Object.freeze({ group: 'type' }),
    'type.productive_heading_05': Object.freeze({ group: 'type' }),
    'type.productive_heading_06': Object.freeze({ group: 'type' }),
    'type.productive_heading_07': Object.freeze({ group: 'type' }),
    'type.quotation01': Object.freeze({ group: 'type' }),
    'type.quotation02': Object.freeze({ group: 'type' }),


    // ~~~~~~~~~~~~~~~~~~~~ font.* (7 tokens) ~~~~~~~~~~~~~~~~~~~

    'font.family.sans': Object.freeze({ group: 'font' }),
    'font.family.serif': Object.freeze({ group: 'font' }),
    'font.family.mono': Object.freeze({ group: 'font' }),
    'font.weight.light': Object.freeze({ group: 'font' }),
    'font.weight.regular': Object.freeze({ group: 'font' }),
    'font.weight.semibold': Object.freeze({ group: 'font' }),
    'font.weight.bold': Object.freeze({ group: 'font' }),


    // ~~~~~~~~~~~~~~~~~~~~ motion.* (12 tokens) ~~~~~~~~~~~~~~~~~~~

    'motion.duration_fast_01': Object.freeze({ group: 'motion' }),
    'motion.duration_fast_02': Object.freeze({ group: 'motion' }),
    'motion.duration_moderate_01': Object.freeze({ group: 'motion' }),
    'motion.duration_moderate_02': Object.freeze({ group: 'motion' }),
    'motion.duration_slow_01': Object.freeze({ group: 'motion' }),
    'motion.duration_slow_02': Object.freeze({ group: 'motion' }),
    'motion.easing_standard_productive': Object.freeze({ group: 'motion', emit: 'easing', values: ['array4'] }),
    'motion.easing_standard_expressive': Object.freeze({ group: 'motion', emit: 'easing', values: ['array4'] }),
    'motion.easing_entrance_productive': Object.freeze({ group: 'motion', emit: 'easing', values: ['array4'] }),
    'motion.easing_entrance_expressive': Object.freeze({ group: 'motion', emit: 'easing', values: ['array4'] }),
    'motion.easing_exit_productive': Object.freeze({ group: 'motion', emit: 'easing', values: ['array4'] }),
    'motion.easing_exit_expressive': Object.freeze({ group: 'motion', emit: 'easing', values: ['array4'] }),


    // ~~~~~~~~~~~~~~~~~~~~ shape.* (7 tokens) ~~~~~~~~~~~~~~~~~~~

    'shape.radius_00': Object.freeze({ group: 'shape' }),
    'shape.radius_02': Object.freeze({ group: 'shape' }),
    'shape.radius_04': Object.freeze({ group: 'shape' }),
    'shape.radius_08': Object.freeze({ group: 'shape' }),
    'shape.radius_16': Object.freeze({ group: 'shape' }),
    'shape.radius_24': Object.freeze({ group: 'shape' }),
    'shape.radius_max': Object.freeze({ group: 'shape' }),


    // ~~~~~~~~~~~~~~~~~~~~ border.* (3 tokens) ~~~~~~~~~~~~~~~~~~~

    'border.width_01': Object.freeze({ group: 'border' }),
    'border.width_02': Object.freeze({ group: 'border' }),
    'border.width_03': Object.freeze({ group: 'border' }),


    // ~~~~~~~~~~~~~~~~~~~~ focus.* (2 tokens) ~~~~~~~~~~~~~~~~~~~

    'focus.width': Object.freeze({ group: 'focus' }),
    'focus.offset': Object.freeze({ group: 'focus' }),


    // ~~~~~~~~~~~~~~~~~~~~ feedback.* (1 token) ~~~~~~~~~~~~~~~~~~~

    'feedback.press': Object.freeze({ group: 'feedback', values: ['highlight', 'opacity', 'ripple'] }),


    // ~~~~~~~~~~~~~~~~~~~~ shadow.* (3 tokens) ~~~~~~~~~~~~~~~~~~~

    'shadow.level_01': Object.freeze({ group: 'shadow' }),
    'shadow.level_02': Object.freeze({ group: 'shadow' }),
    'shadow.level_03': Object.freeze({ group: 'shadow' }),


    // ~~~~~~~~~~~~~~~~~~~~ breakpoint.* (5 tokens) ~~~~~~~~~~~~~~~~~~~

    'breakpoint.sm': Object.freeze({ group: 'breakpoint' }),
    'breakpoint.md': Object.freeze({ group: 'breakpoint' }),
    'breakpoint.lg': Object.freeze({ group: 'breakpoint' }),
    'breakpoint.xlg': Object.freeze({ group: 'breakpoint' }),
    'breakpoint.max': Object.freeze({ group: 'breakpoint' })

  });


  // Derive meta from tokens: for every token, { group: token.emit || groups[token.group].emit }
  const meta = {};
  const tokenKeys = Object.keys(tokens);
  for (let i = 0; i < tokenKeys.length; i++) {
    const key = tokenKeys[i];
    const token = tokens[key];
    const emit = token.emit || groups[token.group].emit;
    meta[key] = Object.freeze({ group: emit });
  }


  return Object.freeze({
    version: 1,
    groups: groups,
    tokens: tokens,
    meta: Object.freeze(meta)
  });

}

const contract = buildContract();

export default contract;
