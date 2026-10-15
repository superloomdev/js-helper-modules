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
//
// Version 6 extends the role grid with the families the remaining anchor
// components draw (`list`, `switch`, `tag`, `progress`, `tooltip`, `tab`,
// `dialog`, `notification`) and member cells where one member of an
// existing family draws differently (`text_area`, `radio`, `icon_button`,
// `menu`, `tooltip_compact`, `dialog_close`). It adds five anatomy enums
// (`field_counter`, `switch_state_text`, `progress_indeterminate`,
// `tab_indicator`, `dialog_close`) and two icon roles
// (`selected_indicator`, `switch_checked_indicator`). An amendment inside its
// milestone adds `anatomy.list_selected_mark`: whether a selected list item
// draws its mark at all (the glyph it draws stays the icon role). A second
// amendment adds `anatomy.menu_icon_seat`: whether a menu with any icon
// reserves the icon seat for every item (`shared`) or each item carries
// its own (`item`). A third amendment adds `anatomy.dialog_label`: whether
// a dialog draws an eyebrow label above its heading (`shown`) or not
// (`hidden`), `control.dialog_header_space`: the space between the
// header block and the body, and `control.dialog_min_height`: the
// dialog's minimum height. A fourth amendment adds `color.menu_divider`:
// a menu's separator color, `control.tab_contained_height` and
// `control.tab_contained_padding_block`: the contained tab variant's
// height and label block inset, `control.tab_item_gap`: the space a
// system's tab anatomy reserves after each item, and
// `anatomy.switch_edge`: whether a switch's edge is a drawn `border`
// that costs room or a `skin` it paints free. A fifth amendment adds a
// menu's width floor (`control.menu_min_width`, and
// `control.menu_icon_min_width` where any item carries an icon), the
// space a menu reserves between an item's icon and its label
// (`control.menu_item_gap`), a menu item icon's ink where a system
// colors it apart from the label (`color.menu_item_icon` and its hover
// and disabled), the icon button's selected paints as member cells
// (`color.icon_button_<kind>_container_selected` for every kind,
// `color.icon_button_<kind>_icon_selected` for primary and secondary;
// ghost and tertiary already carry the selected icon cell), the toggle
// icon button's unselected face (`color.icon_button_<kind>_container_unselected`
// and `_icon_unselected` for every kind) - a selected filled or tonal
// icon button paints the button's face, so its selected pair is audited
// against the toggle's unselected pair - and
// `anatomy.field_counter_format`: whether a field's counter prints the
// count against the limit (`tight`, "4/100") or spaced from it
// (`spaced`, "4 / 100"). A sixth amendment adds the menu item shortcut's
// own type and ink (`type.menu_item_shortcut`, `color.menu_item_shortcut`
// and its hover): the primary draws it in the item's type and colour, the
// second in a smaller supporting type and a quieter ink.
//
// Version 7 extends the role grid with the families the remaining
// atom-tier rows draw (`divider`, `link`, `loading`, `progress_step`,
// `skeleton`, `view`), member cells where a member of an existing family
// draws differently (the button set, the button skeleton, the combo
// button, the inline loading line, the saving status, the closable,
// interactive, selectable and skeleton tags, the landing view), one button
// kind (`quick_action`, the chat button's outlined quick action, which
// gets every cell a kind gets), three anatomy enums (`loading_motion`,
// `tag_close`, `tag_selected_mark`) and the motion of the two animated
// families (`motion.loading_rotation`, `motion.loading_arc_cycle`,
// `motion.skeleton_cycle`). A batch-6 amendment adds the progress step's
// focus width, vertical icon inset and line thickness, and secondary-label
// offsets, plus the selectable tag's own pressed layer. A batch-6 B3
// round-3 amendment adds the loading arc's motion easing. A milestone-3
// amendment adds the small tag's template-dependent height.
//
// Version 8 marks Carbon's `$layer-sets` contextual sets as leveled, so a
// token that reaches a set member through its alias chain also resolves at
// levels 2 and 3 (the member shifted that many places along its set). It
// extends the role grid with the milestone-4 census families (the field
// action and skeleton seats, the time picker, the number input divider,
// the selection groups, the slider, the select's group label, the popover,
// the definition tooltip and toggletip, the inverse link, the floating
// action button, the tag set), adds `anatomy.field_action` (the in-field
// action's shape: `square` or `icon_button`) and `icon.visibility_on`, and
// removes `anatomy.slider_handle`, the `quick_action` button kind with its
// focus gap cell, and the `view_*` and `landing_*` cells (the roster cut
// excluded every row that read them).


/////////////////////////// Module-Loader START ////////////////////////////////

// The role grid (v5 amendment). Kinds of the button family, in the order
// the component documents them
const BUTTON_KINDS = Object.freeze(['primary', 'secondary', 'tertiary', 'ghost', 'danger', 'danger_tertiary', 'danger_ghost', 'tonal', 'elevated']);
const BUTTON_FILL_STATES = Object.freeze(['', '_hover', '_active', '_focus', '_disabled', '_selected']);
const BUTTON_BORDER_STATES = Object.freeze(['', '_hover', '_active', '_disabled']);
const BUTTON_ELEVATION_STATES = Object.freeze(['', '_hover', '_active', '_disabled']);

// The leveled semantic sets (v8): the contextual ordering a layered
// surface reads. A token whose authored value reaches a member of one set
// through its alias chain also resolves at levels 2 and 3 - the member
// shifted that many places along its set, capped at the last entry.
const LEVELED_SETS = Object.freeze({
  layer: Object.freeze(['layer_01', 'layer_02', 'layer_03']),
  layer_active: Object.freeze(['layer_active_01', 'layer_active_02', 'layer_active_03']),
  layer_background: Object.freeze(['layer_background_01', 'layer_background_02', 'layer_background_03']),
  layer_hover: Object.freeze(['layer_hover_01', 'layer_hover_02', 'layer_hover_03']),
  layer_selected: Object.freeze(['layer_selected_01', 'layer_selected_02', 'layer_selected_03']),
  layer_selected_hover: Object.freeze(['layer_selected_hover_01', 'layer_selected_hover_02', 'layer_selected_hover_03']),
  layer_accent: Object.freeze(['layer_accent_01', 'layer_accent_02', 'layer_accent_03']),
  layer_accent_hover: Object.freeze(['layer_accent_hover_01', 'layer_accent_hover_02', 'layer_accent_hover_03']),
  layer_accent_active: Object.freeze(['layer_accent_active_01', 'layer_accent_active_02', 'layer_accent_active_03']),
  field: Object.freeze(['field_01', 'field_02', 'field_03']),
  field_hover: Object.freeze(['field_hover_01', 'field_hover_02', 'field_hover_03']),
  border_subtle: Object.freeze(['border_subtle_00', 'border_subtle_01', 'border_subtle_02', 'border_subtle_03']),
  border_subtle_selected: Object.freeze(['border_subtle_selected_01', 'border_subtle_selected_02', 'border_subtle_selected_03']),
  border_strong: Object.freeze(['border_strong_01', 'border_strong_02', 'border_strong_03']),
  border_tile: Object.freeze(['border_tile_01', 'border_tile_02', 'border_tile_03'])
});

// Member name -> { set, index }, derived once so a chain lookup is O(1)
const LEVELED_INDEX = Object.freeze(Object.keys(LEVELED_SETS).reduce(function (out, set) {
  LEVELED_SETS[set].forEach(function (member, index) {
    out[member] = Object.freeze({ set: set, index: index });
  });
  return out;
}, {}));

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
    ],
    [
      // v6: the option list a select, dropdown or menu draws
      'list_container',
      'list_item_label', 'list_item_label_hover', 'list_item_label_selected', 'list_item_label_disabled',
      'list_item_container_hover', 'list_item_container_active', 'list_item_container_selected', 'list_item_container_selected_hover',
      'list_item_divider',
      // v6: a menu's danger item and its separator
      'menu_item_danger_container_hover', 'menu_item_danger_label', 'menu_item_danger_label_hover',
      'menu_divider',
      // v6 fifth amendment: the item icon's own ink where a menu colors
      // it apart from the label
      'menu_item_icon', 'menu_item_icon_hover', 'menu_item_icon_disabled',
      // v6 sixth amendment: the menu item shortcut's own ink
      'menu_item_shortcut', 'menu_item_shortcut_hover',
      // v6: field members that differ from their family
      'text_area_container_hover', 'text_area_outline_disabled',
      // v6: selection members that differ from their family
      'radio_outline_selected', 'radio_outline_selected_hover', 'radio_outline_selected_active', 'radio_outline_selected_focus',
      // v6: the switch family
      'switch_outline', 'switch_outline_hover', 'switch_outline_focus', 'switch_outline_active', 'switch_outline_disabled',
      'switch_track', 'switch_track_hover', 'switch_track_focus', 'switch_track_active', 'switch_track_disabled',
      'switch_track_selected', 'switch_track_selected_hover', 'switch_track_selected_focus', 'switch_track_selected_active', 'switch_track_selected_disabled',
      'switch_handle', 'switch_handle_hover', 'switch_handle_focus', 'switch_handle_active', 'switch_handle_disabled',
      'switch_handle_selected', 'switch_handle_selected_hover', 'switch_handle_selected_focus', 'switch_handle_selected_active', 'switch_handle_selected_disabled',
      'switch_mark', 'switch_mark_disabled',
      'switch_layer_hover', 'switch_layer_active', 'switch_layer_selected_hover', 'switch_layer_selected_active',
      'switch_focus_ring',
      // v6: the tag family (the hues stay semantic tag_* tokens)
      'tag_container', 'tag_container_disabled', 'tag_label', 'tag_label_disabled', 'tag_outline', 'tag_outline_disabled', 'tag_icon', 'tag_icon_disabled',
      // v6: the progress family
      'progress_track', 'progress_indicator', 'progress_indicator_success', 'progress_indicator_error',
      // v6: the tooltip family
      'tooltip_container', 'tooltip_label',
      // v6: the tab family
      'tab_container', 'tab_divider',
      'tab_track', 'tab_track_hover', 'tab_track_disabled',
      'tab_indicator',
      'tab_label', 'tab_label_hover', 'tab_label_selected', 'tab_label_selected_hover', 'tab_label_disabled',
      'tab_layer_hover', 'tab_layer_active', 'tab_layer_selected_hover', 'tab_layer_selected_active',
      'tab_focus_ring',
      'tab_contained_container', 'tab_contained_container_hover', 'tab_contained_container_selected', 'tab_contained_separator',
      // v6: the dialog family
      'dialog_scrim', 'dialog_container', 'dialog_border', 'dialog_heading', 'dialog_body',
      // v6: the notification family
      'notification_container', 'notification_text', 'notification_close_icon', 'notification_action',
      'notification_marker_error', 'notification_marker_success', 'notification_marker_info', 'notification_marker_warning',
      // v6: button members that differ from their family
      'icon_button_ghost_icon', 'icon_button_ghost_icon_hover', 'icon_button_ghost_icon_active', 'icon_button_ghost_icon_focus', 'icon_button_ghost_icon_disabled', 'icon_button_ghost_icon_selected',
      'icon_button_tertiary_icon', 'icon_button_tertiary_icon_hover', 'icon_button_tertiary_icon_active', 'icon_button_tertiary_icon_focus', 'icon_button_tertiary_icon_disabled', 'icon_button_tertiary_icon_selected',
      // v6 fifth amendment: the icon button's selected face and ink as
      // member cells, so the button family's selected recipe stays the
      // labelled button's
      'icon_button_primary_container_selected', 'icon_button_secondary_container_selected', 'icon_button_ghost_container_selected', 'icon_button_tertiary_container_selected',
      'icon_button_primary_icon_selected', 'icon_button_secondary_icon_selected',
      // and the toggle's unselected face: a selected filled or tonal icon
      // button paints the button's face, so the pair it must differ from is
      // the toggle's own unselected face, not the button's
      'icon_button_primary_container_unselected', 'icon_button_secondary_container_unselected', 'icon_button_ghost_container_unselected', 'icon_button_tertiary_container_unselected',
      'icon_button_primary_icon_unselected', 'icon_button_secondary_icon_unselected', 'icon_button_ghost_icon_unselected', 'icon_button_tertiary_icon_unselected',
      // v7: the button set's separators between adjacent items
      'button_set_separator', 'button_set_separator_disabled', 'button_set_separator_stacked_disabled',
      // v7: the divider family
      'divider',
      // v7: the link family
      'link_label', 'link_label_hover', 'link_label_active', 'link_label_visited', 'link_label_disabled', 'link_focus_ring',
      // v7: the loading family
      'loading_indicator', 'loading_track', 'loading_scrim',
      // v7: the inline loading member
      'inline_loading_label', 'inline_loading_success', 'inline_loading_error',
      // v7: the saving member
      'saving_error_icon',
      // v7: the progress step member
      'progress_step_icon', 'progress_step_icon_incomplete', 'progress_step_icon_disabled', 'progress_step_icon_invalid',
      'progress_step_line', 'progress_step_line_complete',
      'progress_step_label', 'progress_step_label_hover', 'progress_step_label_focus', 'progress_step_label_disabled', 'progress_step_secondary_label',
      // v7: the skeleton family
      'skeleton_container', 'skeleton_shimmer',
      // v7: the closable tag member
      'tag_close_container_hover', 'tag_close_focus_ring',
      // v7 batch 6 B3 round 2 amendment: the untyped dismissible tag's label
      // (the input chip's label role differs from the flat chip's)
      'tag_dismissible_label',
      // v7: the interactive tag members
      'tag_interactive_layer_active', 'tag_interactive_outline_disabled', 'tag_focus_ring',
      // v7 batch 6 B3 amendment: the untyped interactive tag's hover reads
      // the neutral tag cells
      'tag_container_hover',
      // v7 batch 6 B3 round 2 amendment: the untyped interactive tag's
      // outline (the chips outline where the plain tag draws none)
      'tag_interactive_outline',
      // v7: the selectable tag member
      'tag_selectable_container', 'tag_selectable_container_hover', 'tag_selectable_container_selected', 'tag_selectable_container_selected_hover',
      'tag_selectable_label', 'tag_selectable_label_selected', 'tag_selectable_outline',
      // v7 batch 6 B3 round 2 amendment: the selected and disabled
      // selectable tag (the filter chip answers its own pair)
      'tag_selectable_container_selected_disabled', 'tag_selectable_label_selected_disabled',
      // v7 batch 6 amendment: the selectable tag's pressed layer (the
      // second's filter chip presses on-surface-variant where the
      // interactive layer answers on-surface, so the member gets its own)
      'tag_selectable_layer_active',
      // v8: field members - the leading icon's ink, the in-field action's
      // state fills, the password toggle's, the number input's divider,
      // the search icon's disabled ink
      'field_leading_icon', 'field_action_container_hover', 'field_action_container_active',
      'password_toggle_container_hover', 'password_toggle_container_active',
      'number_input_divider', 'search_icon_disabled',
      // v8 metrics amendment: the disabled search placeholder - upstream
      // hides it in the field fill (search/_search.scss)
      'search_placeholder_disabled',
      // v8: the slider family
      'slider_range_label', 'slider_track', 'slider_track_filled', 'slider_track_filled_focus',
      'slider_handle', 'slider_handle_focus', 'slider_handle_gap_focus',
      'slider_state_layer_hover', 'slider_state_layer_focus', 'slider_state_layer_active',
      'slider_disabled', 'slider_track_disabled',
      // v8: the select member
      'select_group_label',
      // v8: the popover, definition tooltip and toggletip members and the
      // inverse link
      'popover_container', 'popover_label', 'popover_border',
      'definition_term_underline', 'definition_term_underline_hover',
      'toggletip_icon', 'toggletip_icon_active',
      'link_label_inverse', 'link_label_inverse_hover', 'focus_ring_inverse',
      // v8: the floating action button family
      'fab_surface_container', 'fab_surface_icon', 'fab_primary_container', 'fab_primary_icon',
      'fab_secondary_container', 'fab_secondary_icon', 'fab_tertiary_container', 'fab_tertiary_icon',
      'fab_surface_layer_hover', 'fab_surface_layer_active', 'fab_primary_layer_hover', 'fab_primary_layer_active',
      'fab_secondary_layer_hover', 'fab_secondary_layer_active', 'fab_tertiary_layer_hover', 'fab_tertiary_layer_active'
    ]
  )),
  control: Object.freeze([
    'field_outline_width', 'field_outline_width_focus', 'field_invalid_ring_width', 'field_focus_width', 'field_focus_offset',
    'field_padding_inline', 'field_icon_inset', 'field_icon_gap', 'field_message_inset', 'field_message_gap',
    'button_focus_width', 'button_focus_offset', 'button_focus_gap_width', 'button_ghost_padding_start', 'button_ghost_padding_end', 'button_min_width',
    'selection_focus_width', 'selection_focus_offset', 'selection_focus_radius', 'selection_layer_size',
    // v6: the option list
    'list_item_height', 'list_item_padding_inline', 'list_item_divider_width', 'list_padding_block', 'list_radius',
    // v6: a menu's own geometry where it differs from the list it shares
    'menu_padding_block', 'menu_item_height', 'menu_divider_width', 'menu_icon_size',
    // v6 fifth amendment: a menu's width floor and icon-to-label space
    'menu_min_width', 'menu_icon_min_width', 'menu_item_gap',
    // v6: field and selection members that differ from their family
    'radio_size', 'radio_border', 'radio_dot_size', 'radio_focus_offset',
    // v6: the switch family
    'switch_track_width', 'switch_track_height', 'switch_outline_width',
    'switch_handle_size', 'switch_handle_size_selected', 'switch_handle_size_pressed',
    'switch_focus_width', 'switch_focus_offset',
    // v6: the tag family
    'tag_height', 'tag_radius', 'tag_padding_inline', 'tag_padding_icon', 'tag_outline_width', 'tag_icon_size',
    // v7 milestone 3 amendment: the small tag's height is the template's
    // answer (the label's line box must fit the pill), not a spec sum
    'tag_height_small',
    // v6: the progress family
    'progress_height', 'progress_radius',
    // v6: the tooltip family and its compact member
    'tooltip_padding_block', 'tooltip_padding_inline', 'tooltip_radius', 'tooltip_caret_width', 'tooltip_caret_height', 'tooltip_offset', 'tooltip_max_width',
    'tooltip_compact_padding_block', 'tooltip_compact_caret_width', 'tooltip_compact_caret_height', 'tooltip_compact_offset',
    // v6: the tab family
    'tab_height', 'tab_padding_inline', 'tab_divider_width', 'tab_track_width', 'tab_indicator_width', 'tab_indicator_radius', 'tab_focus_width', 'tab_focus_offset',
    // v6: the dialog family
    'dialog_border_width', 'dialog_radius', 'dialog_min_width', 'dialog_max_width', 'dialog_padding_inline', 'dialog_padding_top', 'dialog_header_gap',
    'dialog_body_padding_top', 'dialog_body_padding_bottom', 'dialog_actions_height', 'dialog_actions_gap', 'dialog_actions_padding', 'dialog_close_icon_size',
    // v6 third amendment: the space between the header block and the body
    // and the dialog's minimum height where a system floors it
    'dialog_header_space', 'dialog_min_height',
    // v6 fourth amendment: the contained tab's height and its label's block
    // inset, where a system seats a variant at a taller measure
    'tab_contained_height', 'tab_contained_padding_block',
    // the space a system's tab anatomy reserves after each item
    'tab_item_gap',
    // v6: the notification family
    'notification_width', 'notification_radius', 'notification_marker_width', 'notification_icon_size',
    // v6: the icon button member
    'icon_button_size', 'icon_button_icon_size',
    // v7: the button set member
    'button_set_item_max_width', 'button_set_gap', 'button_set_fluid_min_width', 'button_set_fluid_max_width', 'button_set_fluid_ghost_padding_start',
    // v7: the button skeleton member
    'button_skeleton_width',
    // v7: the combo button member
    'combo_button_min_width', 'combo_button_max_width',
    // v7: the divider family
    'divider_width', 'divider_inset',
    // v7: the link family
    'link_focus_width', 'link_icon_gap', 'link_icon_size', 'link_icon_size_large',
    // v7: the loading family
    'loading_size', 'loading_size_small', 'loading_stroke_width', 'loading_stroke_width_small', 'loading_arc', 'loading_arc_small',
    // v7: the inline loading member
    'inline_loading_gap',
    // v7: the saving member
    'saving_icon_gap',
    // v7: the progress step member
    'progress_step_width', 'progress_step_min_width', 'progress_step_vertical_min_height', 'progress_step_icon_gap', 'progress_step_icon_top',
    'progress_step_line_width', 'progress_step_label_max_width', 'progress_step_label_max_width_vertical', 'progress_step_label_gap',
    'progress_step_skeleton_label_width', 'progress_step_skeleton_label_height',
    // v7 batch 6 amendment: the pressable label's focus outline, the
    // vertical anatomy's icon inset and line thickness, and the secondary
    // label's absolute offsets - all values the primary states literally
    'progress_step_focus_width', 'progress_step_vertical_icon_top', 'progress_step_vertical_line_width',
    'progress_step_secondary_label_top', 'progress_step_secondary_label_start',
    // v7: the skeleton family
    'skeleton_radius', 'skeleton_placeholder_size', 'skeleton_text_height', 'skeleton_text_gap', 'skeleton_heading_height',
    // v7: the skeleton tag member
    'tag_skeleton_width',
    // v7: the closable tag member
    'tag_close_gap', 'tag_close_icon_size', 'tag_close_inset',
    // v7: the interactive tag members
    'tag_interactive_outline_width', 'tag_interactive_height_small', 'tag_focus_width', 'tag_focus_offset',
    // v7: the selectable tag member
    'tag_selectable_outline_width_selected',
    // v8: field members - the in-field action's geometry, the field
    // skeleton's label seat, the time picker's, the number input's divider
    'field_action_inset', 'field_action_size', 'field_action_gap',
    'field_skeleton_label_width', 'field_skeleton_label_height',
    'time_picker_input_width', 'time_picker_input_width_invalid', 'time_picker_select_gap',
    'number_input_divider_height',
    // v8 rework amendment: the number input's width floor
    // (number-input/_number-input.scss: min-inline-size 9.375rem)
    'number_input_min_width',
    // v8: the selection group gaps and the skeleton seats
    'checkbox_group_gap', 'radio_group_gap_horizontal', 'radio_group_gap_vertical',
    'selection_skeleton_label_width', 'toggle_skeleton_bar_width', 'toggle_skeleton_bar_height',
    // v8 rework amendment: the toggle skeleton's own circle - the census
    // draws 18, unlike a live switch handle (toggle/_toggle.scss)
    'toggle_skeleton_circle_size',
    // v8 metrics amendment: the text area skeleton's fixed block size
    // (text-area/_text-area.scss: block-size 100px)
    'text_area_skeleton_height',
    // v8: the slider family
    'slider_gap', 'slider_padding_block', 'slider_min_width', 'slider_max_width',
    'slider_track_height', 'slider_track_radius', 'slider_tick_height',
    'slider_handle_size', 'slider_handle_size_active', 'slider_state_layer_size',
    'slider_input_width', 'slider_input_width_invalid',
    'slider_skeleton_range_width', 'slider_skeleton_range_height',
    // v8: the select member
    'multi_select_checkbox_inset',
    // v8: the popover, definition tooltip and toggletip members
    'popover_radius', 'popover_caret_width', 'popover_caret_height', 'popover_offset',
    'definition_tooltip_max_width', 'definition_tooltip_padding_block', 'definition_tooltip_padding_inline',
    'toggletip_offset', 'toggletip_max_width',
    // v8: the floating action button family
    'fab_size', 'fab_size_small', 'fab_size_large', 'fab_icon_size', 'fab_icon_size_large',
    'fab_radius', 'fab_radius_small', 'fab_radius_large', 'fab_extended_padding', 'fab_label_gap',
    // v8: the tag set member
    'tag_set_gap'
  ]),
  type: Object.freeze([
    'field_value', 'field_label', 'field_helper',
    // v6
    'list_item', 'menu_item_shortcut', 'text_area_value', 'tag_label', 'tooltip_label', 'tooltip_compact_label', 'tab_label', 'tab_label_selected',
    'dialog_heading', 'dialog_body', 'notification_title', 'notification_body',
    // v7: the link, loading, saving and progress step labels
    'link_label', 'link_label_small', 'link_label_large',
    'inline_loading_label', 'saving_label',
    'progress_step_label', 'progress_step_secondary_label',
    // v8: the time picker value, the slider's range label, the select's
    // group label, the extended action button's label
    'time_picker_value', 'slider_range_label', 'select_group_label', 'fab_label'
  ]),
  shadow: Object.freeze(['level_00'].concat(BUTTON_KINDS.flatMap(function (kind) {
    return BUTTON_ELEVATION_STATES.map(function (state) {
      return 'button_' + kind + state;
    });
  }), [
    // v6
    'list', 'dialog', 'notification',
    // v8: the slider's handle, the popover, the floating action button
    'slider_handle', 'popover', 'fab', 'fab_hover'
  ])),
  motion: Object.freeze([
    // v7: the two animated families' cycles
    'loading_rotation', 'loading_arc_cycle',
    // v7 batch 6 B3 round 3 amendment: the arc anatomy's expand/rotate
    // easing (an array4 curve, not a duration)
    'loading_arc_easing',
    'skeleton_cycle'
  ])
});

// A grid cell whose value type differs from its group's default emit
// declares its token definition here
const GRID_CELL_DEFS = Object.freeze({
  'motion.loading_arc_easing': Object.freeze({ emit: 'easing', values: ['array4'] })
});


/********************************************************************
The role grid's token definitions, one per cell, in group order.

@return {Object} - Token name -> definition
*********************************************************************/
function buildGridTokens () {

  const out = {};
  for (const group of Object.keys(GRID)) {
    for (const cell of GRID[group]) {
      const name = group + '.' + cell;
      out[name] = Object.freeze(Object.assign({ group: group, grid: true }, GRID_CELL_DEFS[name]));
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


    // ~~~~~~~~~~~~~~~~~~~~ anatomy.* (20 tokens) ~~~~~~~~~~~~~~~~~~~

    'anatomy.label': Object.freeze({ group: 'anatomy', values: ['above', 'floating'] }),
    'anatomy.switch_handle': Object.freeze({ group: 'anatomy', values: ['fixed', 'grows'] }),
    'anatomy.status_marker': Object.freeze({ group: 'anatomy', values: ['bar_icon', 'plain'] }),
    'anatomy.dialog_actions': Object.freeze({ group: 'anatomy', values: ['stretched', 'trailing'] }),
    'anatomy.button_label': Object.freeze({ group: 'anatomy', values: ['top', 'center'] }),
    // v6
    'anatomy.field_counter': Object.freeze({ group: 'anatomy', values: ['label', 'message'] }),
    'anatomy.switch_state_text': Object.freeze({ group: 'anatomy', values: ['shown', 'hidden'] }),
    'anatomy.switch_edge': Object.freeze({ group: 'anatomy', values: ['border', 'skin'] }),
    'anatomy.progress_indeterminate': Object.freeze({ group: 'anatomy', values: ['sweep', 'travel'] }),
    'anatomy.tab_indicator': Object.freeze({ group: 'anatomy', values: ['full', 'content'] }),
    'anatomy.dialog_close': Object.freeze({ group: 'anatomy', values: ['shown', 'hidden'] }),
    'anatomy.dialog_label': Object.freeze({ group: 'anatomy', values: ['shown', 'hidden'] }),
    'anatomy.list_selected_mark': Object.freeze({ group: 'anatomy', values: ['shown', 'hidden'] }),
    'anatomy.menu_icon_seat': Object.freeze({ group: 'anatomy', values: ['shared', 'item'] }),
    // v6 fifth amendment
    'anatomy.field_counter_format': Object.freeze({ group: 'anatomy', values: ['tight', 'spaced'] }),
    // v7
    'anatomy.loading_motion': Object.freeze({ group: 'anatomy', values: ['spin', 'arc'] }),
    'anatomy.tag_close': Object.freeze({ group: 'anatomy', values: ['circle', 'inset'] }),
    'anatomy.tag_selected_mark': Object.freeze({ group: 'anatomy', values: ['shown', 'hidden'] }),
    // v7 batch 6 B3 amendment: the interactive tag's outline, drawn as a
    // layout border or as an inset ring that moves nothing
    'anatomy.tag_interactive_outline': Object.freeze({ group: 'anatomy', values: ['border', 'inset'] }),
    // v8: the in-field action's shape - a square seat filling the field's
    // height or the second system's circular icon button
    'anatomy.field_action': Object.freeze({ group: 'anatomy', values: ['square', 'icon_button'] }),


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


    // ~~~~~~~~~~~~~~~~~~~~ icon.* (86 tokens) ~~~~~~~~~~~~~~~~~~~
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
    'icon.save': Object.freeze({ group: 'icon' }),
    'icon.search': Object.freeze({ group: 'icon' }),
    'icon.selected_indicator': Object.freeze({ group: 'icon' }),
    'icon.settings': Object.freeze({ group: 'icon' }),
    'icon.share': Object.freeze({ group: 'icon' }),
    'icon.subtract': Object.freeze({ group: 'icon' }),
    'icon.success': Object.freeze({ group: 'icon' }),
    'icon.switch_checked_indicator': Object.freeze({ group: 'icon' }),
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
    'icon.visibility_on': Object.freeze({ group: 'icon' }),
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
    version: 8,
    grid: GRID,
    leveled: LEVELED_SETS,
    leveled_index: LEVELED_INDEX,
    groups: groups,
    tokens: tokens,
    meta: Object.freeze(meta)
  });

}

const contract = buildContract();

export default contract;
