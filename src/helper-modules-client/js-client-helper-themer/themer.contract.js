// Info: The Superloom token contract.
//
// One frozen registry above every component system. Themer publishes it
// through getContract(); component libraries consume subsets through
// validateContract(theme, { required, supported }). Reference theme
// packages map vendor design data into this vocabulary; the engine itself
// never embeds a vendor name.
//
// The contract is versioned. Version 1 is the initial Superloom contract
// in snake_case, with web-only concepts removed and Superloom additions
// for font roles, structure knobs, and shadow recipes.
//
// Version 2 adds the approved Section 14.5 items (C2 C3 C4 C5 C14 M3 M4
// M5 M6 M8 F1 M9 M9b M10 M11): new structure groups (grid, state, tint),
// the viewport, spring, and segments value types, per-breakpoint type
// sets, and the border width 3 slot (the former width_03 value 4 became
// width_04).
//
// Version 3 adds the stacking structure group so component systems read
// named surface order from the theme instead of carrying a private table.
//
// Version 4 adds the anatomy structure group (six enum tokens for shape
// choices design systems answer differently) and the icon value group (one
// token per semantic glyph name, carrying SVG path data), so a template is
// theme plus icons and a component system holds no glyph of its own.
//
// Version 5 adds the control structure group (per-component geometry a
// design system states for its own controls - button, field, checkbox,
// option - where the shared scales hold one value for every system), two
// role type sets (`type.button_label`, `type.field_label_raised`) and eight
// role colors (the tonal and elevated button fills, the text on a tonal
// fill, the checked-control fill), so a component reads a role, and each
// template answers the role with its own number.
//
// Version 5 was amended inside its milestone with the role grid: for each
// component family (field, button per kind, selection), one role per part
// it draws, per state it draws it in, per property (color, width, space,
// type set, elevation), so a per-template difference is data, never a
// branch in a component. It removes `feedback.focus`, whose ring the grid's
// focus width, offset and color cells now draw per family (an offset below
// zero draws the ring inside the edge). It also adds `shadow.level_00` (no elevation),
// the `feedback.focus_trigger` behavior (a focus ring on any focus, or on
// keyboard focus only) and four icon roles (`invalid`, `dropdown_indicator`,
// `checked_indicator`, `mixed_indicator`:
// the glyph a part shows is an icon role, never an enum), and removes
// `anatomy.caret`, whose choice the `dropdown_indicator` role now carries.
// A second amendment adds `anatomy.button_label`: where a button taller
// than the default height draws its label (`top`, where the default
// height puts it, or `center`), a choice one reference makes for its
// tall sizes that a component must not make in code.


/////////////////////////// Module-Loader START ////////////////////////////////

// The role grid (v5 amendment). Kinds of the button family, in the order
// the component documents them
const BUTTON_KINDS = Object.freeze(['primary', 'secondary', 'tertiary', 'ghost', 'danger', 'danger_tertiary', 'danger_ghost', 'tonal', 'elevated']);
const BUTTON_FILL_STATES = Object.freeze(['', '_hover', '_active', '_focus', '_disabled', '_selected']);
const BUTTON_BORDER_STATES = Object.freeze(['', '_hover', '_active', '_disabled']);
const BUTTON_ELEVATION_STATES = Object.freeze(['', '_hover', '_active', '_disabled']);

// Group -> cell names. A member cell (`text_input_`, `select_`) exists only
// where a reference gives one member a different value than its family
const GRID = Object.freeze({
  color: Object.freeze([].concat(
    [
      'field_container', 'field_container_hover', 'field_container_disabled', 'text_input_container_hover',
      'field_outline', 'field_outline_hover', 'field_outline_focus', 'field_outline_disabled',
      'field_outline_invalid', 'field_outline_invalid_hover', 'field_outline_invalid_focus', 'select_outline_disabled', 'select_indicator_focus',
      'field_ring_invalid', 'field_focus_ring',
      'field_label', 'field_label_hover', 'field_label_focus', 'field_label_disabled',
      'field_label_invalid', 'field_label_invalid_hover', 'field_label_invalid_focus',
      'field_value', 'field_value_disabled', 'field_placeholder', 'field_placeholder_disabled',
      'field_helper', 'field_helper_disabled', 'field_message_invalid',
      'field_indicator', 'field_indicator_hover', 'field_indicator_focus', 'field_indicator_disabled',
      'field_indicator_invalid', 'field_indicator_invalid_hover', 'field_indicator_invalid_focus',
      'field_invalid_icon', 'field_invalid_icon_hover', 'field_invalid_icon_focus'
    ],
    BUTTON_KINDS.flatMap(function (kind) {
      return BUTTON_FILL_STATES.map(function (state) {
        return 'button_' + kind + '_container' + state;
      }).concat(BUTTON_FILL_STATES.map(function (state) {
        return 'button_' + kind + '_label' + state;
      }), BUTTON_BORDER_STATES.map(function (state) {
        return 'button_' + kind + '_border' + state;
      }));
    }),
    ['button_focus_ring', 'button_focus_gap'],
    [
      'selection_outline', 'selection_outline_hover', 'selection_outline_active', 'selection_outline_focus', 'selection_outline_disabled', 'selection_outline_invalid',
      'selection_container', 'selection_container_hover', 'selection_container_active', 'selection_container_focus', 'selection_container_disabled', 'selection_container_invalid',
      'selection_mark', 'selection_mark_disabled',
      'selection_layer_hover', 'selection_layer_active', 'selection_layer_selected_hover', 'selection_layer_selected_active',
      'selection_label', 'selection_label_disabled', 'selection_helper', 'selection_message_invalid', 'selection_invalid_icon', 'selection_focus_ring'
    ]
  )),
  control: Object.freeze([
    'field_outline_width', 'field_outline_width_focus', 'field_invalid_ring_width', 'field_focus_width', 'field_focus_offset',
    'field_padding_inline', 'field_icon_inset', 'field_icon_gap', 'field_message_inset', 'field_message_gap',
    'button_focus_width', 'button_focus_offset', 'button_focus_gap_width', 'button_ghost_padding_start', 'button_ghost_padding_end', 'button_min_width',
    'selection_focus_width', 'selection_focus_offset', 'selection_focus_radius', 'selection_layer_size'
  ]),
  type: Object.freeze(['field_value', 'field_label', 'field_helper']),
  shadow: Object.freeze(['level_00'].concat(BUTTON_KINDS.flatMap(function (kind) {
    return BUTTON_ELEVATION_STATES.map(function (state) {
      return 'button_' + kind + state;
    });
  })))
});


/********************************************************************
The role grid's token definitions, one per cell, in group order.

@return {Object} - Token name -> definition
*********************************************************************/
function buildGridTokens () {

  const out = {};
  for (const group of Object.keys(GRID)) {
    for (const cell of GRID[group]) {
      out[group + '.' + cell] = Object.freeze({ group: group, grid: true });
    }
  }

  return out;

}

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
    icon:       Object.freeze({ tier: 'value',     type: 'icon',    emit: 'raw' }),
    shape:      Object.freeze({ tier: 'structure', type: 'number',  emit: 'dimension' }),
    border:     Object.freeze({ tier: 'structure', type: 'number',  emit: 'dimension' }),
    focus:      Object.freeze({ tier: 'structure', type: 'number',  emit: 'dimension' }),
    motion:     Object.freeze({ tier: 'structure', type: 'motion',  emit: 'duration' }),
    feedback:   Object.freeze({ tier: 'structure', type: 'enum',    emit: 'raw' }),
    anatomy:    Object.freeze({ tier: 'structure', type: 'enum',    emit: 'raw' }),
    shadow:     Object.freeze({ tier: 'structure', type: 'shadow',  emit: 'shadow' }),
    breakpoint: Object.freeze({ tier: 'structure', type: 'number',  emit: 'raw' }),
    grid:       Object.freeze({ tier: 'structure', type: 'number',  emit: 'raw' }),
    state:      Object.freeze({ tier: 'structure', type: 'number',  emit: 'raw', range: [0, 1] }),
    tint:       Object.freeze({ tier: 'structure', type: 'number',  emit: 'raw', range: [0, 1] }),
    stacking:   Object.freeze({ tier: 'structure', type: 'number',  emit: 'raw' }),
    control:    Object.freeze({ tier: 'structure', type: 'number',  emit: 'dimension' })
  });


  // Token definitions: one entry per token in Section 5 order.
  // Each entry carries its group. Tokens that override the group's
  // default emission or carry an enum values list add those fields.
  const tokens = Object.freeze({

    // ~~~~~~~~~~~~~~~~~~~~ color.* (198 tokens) ~~~~~~~~~~~~~~~~~~~

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

    // button (23; v5 adds the tonal and elevated fills, the text on a tonal fill and the checked-control fill)
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
    'color.button_tonal': Object.freeze({ group: 'color' }),
    'color.button_tonal_active': Object.freeze({ group: 'color' }),
    'color.button_tonal_hover': Object.freeze({ group: 'color' }),
    'color.text_on_button_tonal': Object.freeze({ group: 'color' }),
    'color.button_elevated': Object.freeze({ group: 'color' }),
    'color.button_elevated_active': Object.freeze({ group: 'color' }),
    'color.button_elevated_hover': Object.freeze({ group: 'color' }),
    'color.control_checked': Object.freeze({ group: 'color' }),

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


    // ~~~~~~~~~~~~~~~~~~~~ spacing.* (17 tokens) ~~~~~~~~~~~~~~~~~~~

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
    'spacing.fluid_01': Object.freeze({ group: 'spacing', emit: 'viewport' }),
    'spacing.fluid_02': Object.freeze({ group: 'spacing', emit: 'viewport' }),
    'spacing.fluid_03': Object.freeze({ group: 'spacing', emit: 'viewport' }),
    'spacing.fluid_04': Object.freeze({ group: 'spacing', emit: 'viewport' }),


    // ~~~~~~~~~~~~~~~~~~~~ size.* (22 tokens) ~~~~~~~~~~~~~~~~~~~

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
    'size.icon_03': Object.freeze({ group: 'size' }),
    'size.icon_04': Object.freeze({ group: 'size' }),


    // ~~~~~~~~~~~~~~~~~~~~ type.* (60 tokens) ~~~~~~~~~~~~~~~~~~~

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

    // role type sets (v5): the set a control's label is drawn in
    'type.button_label': Object.freeze({ group: 'type' }),
    'type.field_label_raised': Object.freeze({ group: 'type' }),


    // ~~~~~~~~~~~~~~~~~~~~ font.* (12 tokens) ~~~~~~~~~~~~~~~~~~~

    'font.family.sans': Object.freeze({ group: 'font' }),
    'font.family.serif': Object.freeze({ group: 'font' }),
    'font.family.mono': Object.freeze({ group: 'font' }),
    'font.weight.light': Object.freeze({ group: 'font' }),
    'font.weight.regular': Object.freeze({ group: 'font' }),
    'font.weight.semibold': Object.freeze({ group: 'font' }),
    'font.weight.bold': Object.freeze({ group: 'font' }),
    'font.weight.thin': Object.freeze({ group: 'font' }),
    'font.weight.extralight': Object.freeze({ group: 'font' }),
    'font.weight.medium': Object.freeze({ group: 'font' }),
    'font.weight.extrabold': Object.freeze({ group: 'font' }),
    'font.weight.black': Object.freeze({ group: 'font' }),


    // ~~~~~~~~~~~~~~~~~~~~ motion.* (29 tokens) ~~~~~~~~~~~~~~~~~~~

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
    'motion.duration_fast_03': Object.freeze({ group: 'motion' }),
    'motion.duration_fast_04': Object.freeze({ group: 'motion' }),
    'motion.duration_moderate_03': Object.freeze({ group: 'motion' }),
    'motion.duration_moderate_04': Object.freeze({ group: 'motion' }),
    'motion.duration_slow_03': Object.freeze({ group: 'motion' }),
    'motion.duration_slow_04': Object.freeze({ group: 'motion' }),
    'motion.duration_extra_slow_01': Object.freeze({ group: 'motion' }),
    'motion.duration_extra_slow_02': Object.freeze({ group: 'motion' }),
    'motion.duration_extra_slow_03': Object.freeze({ group: 'motion' }),
    'motion.duration_extra_slow_04': Object.freeze({ group: 'motion' }),
    'motion.easing_linear': Object.freeze({ group: 'motion', emit: 'easing', values: ['array4'] }),
    'motion.spring_spatial_default': Object.freeze({ group: 'motion', emit: 'spring' }),
    'motion.spring_spatial_fast': Object.freeze({ group: 'motion', emit: 'spring' }),
    'motion.spring_spatial_slow': Object.freeze({ group: 'motion', emit: 'spring' }),
    'motion.spring_effects_default': Object.freeze({ group: 'motion', emit: 'spring' }),
    'motion.spring_effects_fast': Object.freeze({ group: 'motion', emit: 'spring' }),
    'motion.spring_effects_slow': Object.freeze({ group: 'motion', emit: 'spring' }),


    // ~~~~~~~~~~~~~~~~~~~~ shape.* (9 tokens) ~~~~~~~~~~~~~~~~~~~

    'shape.radius_00': Object.freeze({ group: 'shape' }),
    'shape.radius_02': Object.freeze({ group: 'shape' }),
    'shape.radius_04': Object.freeze({ group: 'shape' }),
    'shape.radius_08': Object.freeze({ group: 'shape' }),
    'shape.radius_16': Object.freeze({ group: 'shape' }),
    'shape.radius_24': Object.freeze({ group: 'shape' }),
    'shape.radius_max': Object.freeze({ group: 'shape' }),
    'shape.radius_12': Object.freeze({ group: 'shape' }),
    'shape.radius_28': Object.freeze({ group: 'shape' }),


    // ~~~~~~~~~~~~~~~~~~~~ border.* (4 tokens) ~~~~~~~~~~~~~~~~~~~

    'border.width_01': Object.freeze({ group: 'border' }),
    'border.width_02': Object.freeze({ group: 'border' }),
    'border.width_03': Object.freeze({ group: 'border' }),
    'border.width_04': Object.freeze({ group: 'border' }),


    // ~~~~~~~~~~~~~~~~~~~~ focus.* (2 tokens) ~~~~~~~~~~~~~~~~~~~

    'focus.width': Object.freeze({ group: 'focus' }),
    'focus.offset': Object.freeze({ group: 'focus' }),


    // ~~~~~~~~~~~~~~~~~~~~ feedback.* (3 tokens) ~~~~~~~~~~~~~~~~~~~

    'feedback.press': Object.freeze({ group: 'feedback', values: ['highlight', 'opacity', 'ripple'] }),
    'feedback.field': Object.freeze({ group: 'feedback', values: ['underline', 'outline'] }),
    'feedback.focus_trigger': Object.freeze({ group: 'feedback', values: ['any', 'keyboard'] }),


    // ~~~~~~~~~~~~~~~~~~~~ anatomy.* (6 tokens) ~~~~~~~~~~~~~~~~~~~

    'anatomy.label': Object.freeze({ group: 'anatomy', values: ['above', 'floating'] }),
    'anatomy.switch_handle': Object.freeze({ group: 'anatomy', values: ['fixed', 'grows'] }),
    'anatomy.status_marker': Object.freeze({ group: 'anatomy', values: ['bar_icon', 'plain'] }),
    'anatomy.dialog_actions': Object.freeze({ group: 'anatomy', values: ['stretched', 'trailing'] }),
    'anatomy.slider_handle': Object.freeze({ group: 'anatomy', values: ['round', 'bar'] }),
    'anatomy.button_label': Object.freeze({ group: 'anatomy', values: ['top', 'center'] }),


    // ~~~~~~~~~~~~~~~~~~~~ shadow.* (5 tokens) ~~~~~~~~~~~~~~~~~~~

    'shadow.level_01': Object.freeze({ group: 'shadow' }),
    'shadow.level_02': Object.freeze({ group: 'shadow' }),
    'shadow.level_03': Object.freeze({ group: 'shadow' }),
    'shadow.level_04': Object.freeze({ group: 'shadow' }),
    'shadow.level_05': Object.freeze({ group: 'shadow' }),


    // ~~~~~~~~~~~~~~~~~~~~ breakpoint.* (5 tokens) ~~~~~~~~~~~~~~~~~~~

    'breakpoint.sm': Object.freeze({ group: 'breakpoint' }),
    'breakpoint.md': Object.freeze({ group: 'breakpoint' }),
    'breakpoint.lg': Object.freeze({ group: 'breakpoint' }),
    'breakpoint.xlg': Object.freeze({ group: 'breakpoint' }),
    'breakpoint.max': Object.freeze({ group: 'breakpoint' }),


    // ~~~~~~~~~~~~~~~~~~~~ grid.* (13 tokens) ~~~~~~~~~~~~~~~~~~~

    'grid.columns_sm': Object.freeze({ group: 'grid' }),
    'grid.columns_md': Object.freeze({ group: 'grid' }),
    'grid.columns_lg': Object.freeze({ group: 'grid' }),
    'grid.columns_xlg': Object.freeze({ group: 'grid' }),
    'grid.columns_max': Object.freeze({ group: 'grid' }),
    'grid.gutter': Object.freeze({ group: 'grid' }),
    'grid.gutter_condensed': Object.freeze({ group: 'grid' }),
    'grid.gutter_narrow': Object.freeze({ group: 'grid' }),
    'grid.margin_sm': Object.freeze({ group: 'grid' }),
    'grid.margin_md': Object.freeze({ group: 'grid' }),
    'grid.margin_lg': Object.freeze({ group: 'grid' }),
    'grid.margin_xlg': Object.freeze({ group: 'grid' }),
    'grid.margin_max': Object.freeze({ group: 'grid' }),


    // ~~~~~~~~~~~~~~~~~~~~ state.* (6 tokens) ~~~~~~~~~~~~~~~~~~~

    'state.hover_opacity': Object.freeze({ group: 'state' }),
    'state.focus_opacity': Object.freeze({ group: 'state' }),
    'state.pressed_opacity': Object.freeze({ group: 'state' }),
    'state.dragged_opacity': Object.freeze({ group: 'state' }),
    'state.disabled_content_opacity': Object.freeze({ group: 'state' }),
    'state.disabled_container_opacity': Object.freeze({ group: 'state' }),


    // ~~~~~~~~~~~~~~~~~~~~ tint.* (5 tokens) ~~~~~~~~~~~~~~~~~~~

    'tint.level_01': Object.freeze({ group: 'tint' }),
    'tint.level_02': Object.freeze({ group: 'tint' }),
    'tint.level_03': Object.freeze({ group: 'tint' }),
    'tint.level_04': Object.freeze({ group: 'tint' }),
    'tint.level_05': Object.freeze({ group: 'tint' }),


    // ~~~~~~~~~~~~~~~~~~~~ stacking.* (5 tokens) ~~~~~~~~~~~~~~~~~~~

    'stacking.dropdown': Object.freeze({ group: 'stacking' }),
    'stacking.modal': Object.freeze({ group: 'stacking' }),
    'stacking.header': Object.freeze({ group: 'stacking' }),
    'stacking.overlay': Object.freeze({ group: 'stacking' }),
    'stacking.floating': Object.freeze({ group: 'stacking' }),


    // ~~~~~~~~~~~~~~~~~~~~ control.* (11 tokens) ~~~~~~~~~~~~~~~~~~~
    // Per-component geometry (v5). Dimensions a design system states for
    // its own controls; each template answers with its number.
    'control.button_height': Object.freeze({ group: 'control' }),
    'control.button_radius': Object.freeze({ group: 'control' }),
    'control.button_padding_start': Object.freeze({ group: 'control' }),
    'control.button_padding_end': Object.freeze({ group: 'control' }),
    'control.button_icon_size': Object.freeze({ group: 'control' }),
    'control.field_height': Object.freeze({ group: 'control' }),
    'control.field_radius': Object.freeze({ group: 'control' }),
    'control.field_icon_size': Object.freeze({ group: 'control' }),
    'control.checkbox_size': Object.freeze({ group: 'control' }),
    'control.checkbox_border': Object.freeze({ group: 'control' }),
    'control.option_height': Object.freeze({ group: 'control' }),


    // ~~~~~~~~~~~~~~~~~~~~ icon.* (78 tokens) ~~~~~~~~~~~~~~~~~~~
    // One token per semantic glyph name, alphabetical. Values are icon
    // literals: { icon: true, viewBox, paths, sizes? }.

    'icon.accessibility': Object.freeze({ group: 'icon' }),
    'icon.add': Object.freeze({ group: 'icon' }),
    'icon.add_filled': Object.freeze({ group: 'icon' }),
    'icon.ai_label': Object.freeze({ group: 'icon' }),
    'icon.arrow_right': Object.freeze({ group: 'icon' }),
    'icon.arrow_up': Object.freeze({ group: 'icon' }),
    'icon.arrows_vertical': Object.freeze({ group: 'icon' }),
    'icon.calendar': Object.freeze({ group: 'icon' }),
    'icon.caret_down': Object.freeze({ group: 'icon' }),
    'icon.caret_left': Object.freeze({ group: 'icon' }),
    'icon.caret_right': Object.freeze({ group: 'icon' }),
    'icon.caution': Object.freeze({ group: 'icon' }),
    'icon.checkbox': Object.freeze({ group: 'icon' }),
    'icon.checkbox_unchecked': Object.freeze({ group: 'icon' }),
    'icon.checked_indicator': Object.freeze({ group: 'icon' }),
    'icon.checkmark': Object.freeze({ group: 'icon' }),
    'icon.checkmark_filled': Object.freeze({ group: 'icon' }),
    'icon.checkmark_outline': Object.freeze({ group: 'icon' }),
    'icon.chevron_down': Object.freeze({ group: 'icon' }),
    'icon.chevron_left': Object.freeze({ group: 'icon' }),
    'icon.chevron_right': Object.freeze({ group: 'icon' }),
    'icon.chevron_up': Object.freeze({ group: 'icon' }),
    'icon.circle_dash': Object.freeze({ group: 'icon' }),
    'icon.circle_filled': Object.freeze({ group: 'icon' }),
    'icon.circle_solid': Object.freeze({ group: 'icon' }),
    'icon.circle_stroke': Object.freeze({ group: 'icon' }),
    'icon.close': Object.freeze({ group: 'icon' }),
    'icon.copy': Object.freeze({ group: 'icon' }),
    'icon.critical': Object.freeze({ group: 'icon' }),
    'icon.critical_severity': Object.freeze({ group: 'icon' }),
    'icon.cube': Object.freeze({ group: 'icon' }),
    'icon.diamond_filled': Object.freeze({ group: 'icon' }),
    'icon.document': Object.freeze({ group: 'icon' }),
    'icon.download': Object.freeze({ group: 'icon' }),
    'icon.dropdown_indicator': Object.freeze({ group: 'icon' }),
    'icon.edit': Object.freeze({ group: 'icon' }),
    'icon.error': Object.freeze({ group: 'icon' }),
    'icon.error_filled': Object.freeze({ group: 'icon' }),
    'icon.error_outline': Object.freeze({ group: 'icon' }),
    'icon.eye': Object.freeze({ group: 'icon' }),
    'icon.eye_off': Object.freeze({ group: 'icon' }),
    'icon.favorite': Object.freeze({ group: 'icon' }),
    'icon.grid': Object.freeze({ group: 'icon' }),
    'icon.group': Object.freeze({ group: 'icon' }),
    'icon.home': Object.freeze({ group: 'icon' }),
    'icon.in_progress': Object.freeze({ group: 'icon' }),
    'icon.incomplete': Object.freeze({ group: 'icon' }),
    'icon.info': Object.freeze({ group: 'icon' }),
    'icon.information_filled': Object.freeze({ group: 'icon' }),
    'icon.information_square_filled': Object.freeze({ group: 'icon' }),
    'icon.invalid': Object.freeze({ group: 'icon' }),
    'icon.layers': Object.freeze({ group: 'icon' }),
    'icon.loading': Object.freeze({ group: 'icon' }),
    'icon.low_severity': Object.freeze({ group: 'icon' }),
    'icon.menu': Object.freeze({ group: 'icon' }),
    'icon.mixed_indicator': Object.freeze({ group: 'icon' }),
    'icon.notification': Object.freeze({ group: 'icon' }),
    'icon.overflow': Object.freeze({ group: 'icon' }),
    'icon.overflow_vertical': Object.freeze({ group: 'icon' }),
    'icon.pending_filled': Object.freeze({ group: 'icon' }),
    'icon.radio_button': Object.freeze({ group: 'icon' }),
    'icon.radio_button_checked': Object.freeze({ group: 'icon' }),
    'icon.search': Object.freeze({ group: 'icon' }),
    'icon.settings': Object.freeze({ group: 'icon' }),
    'icon.share': Object.freeze({ group: 'icon' }),
    'icon.subtract': Object.freeze({ group: 'icon' }),
    'icon.success': Object.freeze({ group: 'icon' }),
    'icon.task_complete': Object.freeze({ group: 'icon' }),
    'icon.time': Object.freeze({ group: 'icon' }),
    'icon.tools': Object.freeze({ group: 'icon' }),
    'icon.trash': Object.freeze({ group: 'icon' }),
    'icon.undefined_filled': Object.freeze({ group: 'icon' }),
    'icon.undo': Object.freeze({ group: 'icon' }),
    'icon.unknown_filled': Object.freeze({ group: 'icon' }),
    'icon.user': Object.freeze({ group: 'icon' }),
    'icon.visibility': Object.freeze({ group: 'icon' }),
    'icon.visibility_off': Object.freeze({ group: 'icon' }),
    'icon.warning': Object.freeze({ group: 'icon' }),
    'icon.warning_alt_filled': Object.freeze({ group: 'icon' }),
    'icon.warning_alt_inverted_filled': Object.freeze({ group: 'icon' }),
    'icon.warning_filled': Object.freeze({ group: 'icon' }),
    'icon.warning_square_filled': Object.freeze({ group: 'icon' }),


    // ~~~~~~~~~~~~~~~~~~~~ role grid (v5 amendment) ~~~~~~~~~~~~~~~~~~~
    // One role per part a component family draws, per state, per property.
    ...buildGridTokens()

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
    version: 5,
    grid: GRID,
    groups: groups,
    tokens: tokens,
    meta: Object.freeze(meta)
  });

}

const contract = buildContract();

export default contract;
