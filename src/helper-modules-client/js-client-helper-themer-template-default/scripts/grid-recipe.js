// Info: The default template's answer to every cell of the contract's role
// grid. The default draws the primary reference's anatomy with its own
// colors, so each cell points at the semantic token or scale step that
// part draws in today: an alias, resolved in each scheme, so the neutral
// template's rendering does not move when a component starts reading a
// cell. A cell the contract adds and this table does not answer stops the
// generator.

// Kinds whose rest container is a fill; the others draw on the page
const FILLED = Object.freeze({
  primary: { fill: 'button_primary', hover: 'button_primary_hover', active: 'button_primary_active', label: 'text_on_color' },
  secondary: { fill: 'button_secondary', hover: 'button_secondary_hover', active: 'button_secondary_active', label: 'text_on_color' },
  danger: { fill: 'button_danger_primary', hover: 'button_danger_hover', active: 'button_danger_active', label: 'text_on_color' },
  tonal: { fill: 'button_tonal', hover: 'button_tonal_hover', active: 'button_tonal_active', label: 'text_on_button_tonal' },
  elevated: { fill: 'button_elevated', hover: 'button_elevated_hover', active: 'button_elevated_active', label: 'link_primary', engaged: 'link_primary_hover' }
});

// Kinds drawn on the page: a fill only while hovered or pressed, and the
// label color while that fill shows (`engaged`)
const ON_PAGE = Object.freeze({
  tertiary: { hover: 'button_tertiary_hover', active: 'button_tertiary_active', label: 'button_tertiary', engaged: 'text_inverse', border: 'button_tertiary', focus: 'button_tertiary' },
  ghost: { hover: 'background_hover', active: 'background_active', label: 'link_primary', engaged: 'link_primary_hover', border: null, focus: null },
  danger_tertiary: { hover: 'button_danger_hover', active: 'button_danger_active', label: 'button_danger_secondary', engaged: 'text_on_color', border: 'button_danger_secondary', borderHover: 'button_danger_hover', borderActive: 'button_danger_active', focus: 'button_danger_primary' },
  danger_ghost: { hover: 'button_danger_hover', active: 'button_danger_active', label: 'button_danger_secondary', engaged: 'text_on_color', border: null, focus: null }
});

const NONE = 'rgba(0, 0, 0, 0)';


/********************************************************************
An alias to a color leaf, or the transparent color for none.

@param {String|null} leaf - Color leaf

@return {String}
*********************************************************************/
function colorOf (leaf) {

  return leaf === null ? NONE : '{color.' + leaf + '}';

}


/********************************************************************
The cells of one button kind.

@param {String} kind - Kind name

@return {Object} - Token name -> entry
*********************************************************************/
function buttonCells (kind) {

  const out = {};
  const entry = FILLED[kind] || ON_PAGE[kind];
  const put = function (part, state, value) {
    out['color.button_' + kind + '_' + part + state] = value;
  };
  if (FILLED[kind]) {
    const k = FILLED[kind];
    put('container', '', colorOf(k.fill));
    put('container', '_hover', colorOf(k.hover));
    put('container', '_active', colorOf(k.active));
    put('container', '_focus', colorOf(k.fill));
    put('container', '_disabled', colorOf('button_disabled'));
    put('label', '', colorOf(k.label));
    put('label', '_hover', colorOf(k.engaged || k.label));
    put('label', '_active', colorOf(k.engaged || k.label));
    put('label', '_focus', colorOf(k.label));
    put('label', '_disabled', colorOf('text_on_color_disabled'));
    for (const state of ['', '_hover', '_active']) {
      put('border', state, NONE);
    }
    put('border', '_disabled', colorOf('button_disabled'));
  } else {
    const k = ON_PAGE[kind];
    put('container', '', NONE);
    put('container', '_hover', colorOf(k.hover));
    put('container', '_active', colorOf(k.active));
    put('container', '_focus', colorOf(k.focus));
    put('container', '_disabled', NONE);
    put('label', '', colorOf(k.label));
    put('label', '_hover', colorOf(k.engaged));
    put('label', '_active', colorOf(k.engaged));
    put('label', '_focus', k.focus === null ? colorOf(k.label) : colorOf(k.engaged));
    put('label', '_disabled', colorOf(k.disabledLabel || 'text_disabled'));
    put('border', '', colorOf(k.border));
    put('border', '_hover', colorOf(k.borderHover !== undefined ? k.borderHover : k.border));
    put('border', '_active', colorOf(k.borderActive !== undefined ? k.borderActive : (kind === 'tertiary' ? null : k.border)));
    put('border', '_disabled', k.border === null ? NONE : colorOf('button_disabled'));
  }
  // The dark scheme's background_selected is the secondary fill itself, so
  // the secondary's selected face takes the kind's active container instead
  // (the label stays the kind's own)
  put('container', '_selected', kind === 'secondary' ? '{color.button_secondary_container_active}' : colorOf('background_selected'));
  put('label', '_selected', kind === 'secondary' ? '{color.button_secondary_label}' : colorOf(entry.selectedLabel || 'text_primary'));
  const lifted = kind === 'elevated' ? '{shadow.level_01}' : '{shadow.level_00}';
  out['shadow.button_' + kind] = lifted;
  out['shadow.button_' + kind + '_hover'] = lifted;
  out['shadow.button_' + kind + '_active'] = lifted;
  out['shadow.button_' + kind + '_disabled'] = '{shadow.level_00}';

  return out;

}


/********************************************************************
Every grid cell's entry.

@param {Object} grid - `contract.grid`

@return {Object} - Token name -> entry
*********************************************************************/
export default function buildGridRecipe (grid) {

  const recipe = {
    // Field family: a filled frame on an underline, the label above in secondary text
    'color.field_container': colorOf('field_01'),
    'color.field_container_hover': colorOf('field_hover_01'),
    'color.field_container_disabled': colorOf('field_01'),
    'color.text_input_container_hover': colorOf('field_01'),
    'color.field_outline': colorOf('border_strong_01'),
    'color.field_outline_hover': colorOf('border_strong_01'),
    'color.field_outline_focus': colorOf('border_strong_01'),
    // A disabled text input keeps its strong border; a disabled select draws none (its member cell)
    'color.field_outline_disabled': colorOf('border_strong_01'),
    'color.field_outline_invalid': colorOf('border_strong_01'),
    'color.field_outline_invalid_hover': colorOf('border_strong_01'),
    'color.field_outline_invalid_focus': colorOf('border_strong_01'),
    'color.select_outline_disabled': NONE,
    'color.select_indicator_focus': colorOf('icon_primary'),
    'color.field_ring_invalid': colorOf('support_error'),
    'color.field_focus_ring': colorOf('focus'),
    'color.field_label': colorOf('text_secondary'),
    'color.field_label_hover': colorOf('text_secondary'),
    'color.field_label_focus': colorOf('text_secondary'),
    'color.field_label_disabled': colorOf('text_disabled'),
    'color.field_label_invalid': colorOf('text_secondary'),
    'color.field_label_invalid_hover': colorOf('text_secondary'),
    'color.field_label_invalid_focus': colorOf('text_secondary'),
    'color.field_value': colorOf('text_primary'),
    'color.field_value_disabled': colorOf('text_disabled'),
    'color.field_placeholder': colorOf('text_placeholder'),
    'color.field_placeholder_disabled': colorOf('text_disabled'),
    'color.field_helper': colorOf('text_helper'),
    'color.field_helper_disabled': colorOf('text_disabled'),
    'color.field_message_invalid': colorOf('text_error'),
    'color.field_indicator': colorOf('icon_primary'),
    'color.field_indicator_hover': colorOf('icon_primary'),
    'color.field_indicator_focus': colorOf('icon_primary'),
    'color.field_indicator_disabled': colorOf('icon_disabled'),
    'color.field_indicator_invalid': colorOf('icon_primary'),
    'color.field_indicator_invalid_hover': colorOf('icon_primary'),
    'color.field_indicator_invalid_focus': colorOf('icon_primary'),
    'color.field_invalid_icon': colorOf('support_error'),
    'color.field_invalid_icon_hover': colorOf('support_error'),
    'color.field_invalid_icon_focus': colorOf('support_error'),
    'control.field_outline_width': '{border.width_01}',
    'control.field_outline_width_focus': '{border.width_01}',
    'control.field_invalid_ring_width': '{border.width_02}',
    'control.field_focus_width': '{focus.width}',
    'control.field_focus_offset': -2,
    'control.field_padding_inline': '{spacing.spacing_05}',
    'control.field_icon_inset': '{spacing.spacing_05}',
    'control.field_icon_gap': '{spacing.spacing_03}',
    'control.field_message_inset': 0,
    'control.field_message_gap': '{spacing.spacing_02}',
    'type.field_value': '{type.body_compact_01}',
    'type.field_label': '{type.label01}',
    'type.field_helper': '{type.helper_text_01}',
    // Button family: a ring drawn inside the edge with a page-color line inside it
    'color.button_focus_ring': colorOf('focus'),
    'color.button_focus_gap': colorOf('background'),
    'control.button_focus_width': '{focus.width}',
    'control.button_focus_offset': -2,
    'control.button_focus_gap_width': '{border.width_01}',
    'control.button_ghost_padding_start': '{control.button_padding_start}',
    'control.button_ghost_padding_end': '{control.button_padding_start}',
    'control.button_min_width': 0,
    // Selection family: an icon-colored box, filled when checked, no state layer
    'color.selection_outline': colorOf('icon_primary'),
    'color.selection_outline_hover': colorOf('icon_primary'),
    'color.selection_outline_active': colorOf('icon_primary'),
    'color.selection_outline_focus': colorOf('icon_primary'),
    'color.selection_outline_disabled': colorOf('icon_disabled'),
    'color.selection_outline_invalid': colorOf('support_error'),
    'color.selection_container': colorOf('control_checked'),
    'color.selection_container_hover': colorOf('control_checked'),
    'color.selection_container_active': colorOf('control_checked'),
    'color.selection_container_focus': colorOf('control_checked'),
    'color.selection_container_disabled': colorOf('icon_disabled'),
    'color.selection_container_invalid': colorOf('control_checked'),
    'color.selection_mark': colorOf('icon_inverse'),
    'color.selection_mark_disabled': colorOf('icon_inverse'),
    'color.selection_layer_hover': NONE,
    'color.selection_layer_active': NONE,
    'color.selection_layer_selected_hover': NONE,
    'color.selection_layer_selected_active': NONE,
    'color.selection_label': colorOf('text_primary'),
    'color.selection_label_disabled': colorOf('text_disabled'),
    'color.selection_helper': colorOf('text_helper'),
    'color.selection_message_invalid': colorOf('text_error'),
    'color.selection_invalid_icon': colorOf('support_error'),
    'color.selection_focus_ring': colorOf('focus'),
    'control.selection_focus_width': '{focus.width}',
    'control.selection_focus_offset': 1,
    'control.selection_focus_radius': '{shape.radius_02}',
    'control.selection_layer_size': '{size.size_medium}',
    // v6 List family: the option list a select, dropdown or menu draws
    'color.list_container': colorOf('layer_01'),
    'color.list_item_label': colorOf('text_secondary'),
    'color.list_item_label_hover': colorOf('text_primary'),
    'color.list_item_label_selected': colorOf('text_primary'),
    'color.list_item_label_disabled': colorOf('text_disabled'),
    'color.list_item_container_hover': colorOf('layer_hover_01'),
    'color.list_item_container_active': colorOf('layer_selected_01'),
    'color.list_item_container_selected': colorOf('layer_selected_01'),
    'color.list_item_container_selected_hover': colorOf('layer_selected_hover_01'),
    'color.list_item_divider': colorOf('border_subtle_01'),
    'control.list_item_height': '{control.option_height}',
    'control.list_item_padding_inline': '{spacing.spacing_05}',
    'control.list_item_divider_width': '{border.width_01}',
    'control.list_padding_block': 0,
    'control.list_radius': '{shape.radius_00}',
    'type.list_item': '{type.body_compact_01}',
    'shadow.list': '{shadow.level_01}',
    // Menu members: a danger item; geometry aliases the shared list's
    'control.menu_padding_block': '{control.list_padding_block}',
    'control.menu_item_height': '{control.list_item_height}',
    'control.menu_divider_width': '{control.list_item_divider_width}',
    'control.menu_icon_size': '{size.icon_01}',
    // The primary reference floors the menu at 10rem, 12rem when any item
    // carries an icon (@carbon/styles `menu/_menu.scss` `min-inline-size`),
    // and spaces the icon from the label by $spacing-03
    'control.menu_min_width': 160,
    'control.menu_icon_min_width': 192,
    'control.menu_item_gap': '{spacing.spacing_03}',
    // The item icon follows its label's ink (upstream `currentColor`)
    'color.menu_item_icon': '{color.list_item_label}',
    'color.menu_item_icon_hover': '{color.list_item_label_hover}',
    'color.menu_item_icon_disabled': '{color.list_item_label_disabled}',
    // The item shortcut draws in the item's own type and colour
    'type.menu_item_shortcut': '{type.list_item}',
    'color.menu_item_shortcut': '{color.list_item_label}',
    'color.menu_item_shortcut_hover': '{color.list_item_label_hover}',
    'color.menu_divider': colorOf('border_subtle_00'),
    'color.menu_item_danger_container_hover': colorOf('button_danger_primary'),
    'color.menu_item_danger_label': colorOf('text_secondary'),
    'color.menu_item_danger_label_hover': colorOf('text_on_color'),
    // Field member: the text area aliases its family
    'color.text_area_container_hover': '{color.field_container_hover}',
    'color.text_area_outline_disabled': '{color.field_outline_disabled}',
    'type.text_area_value': '{type.field_value}',
    // Selection members: the radio aliases the family's ring and focus
    'color.radio_outline_selected': '{color.selection_outline}',
    'color.radio_outline_selected_hover': '{color.selection_outline_hover}',
    'color.radio_outline_selected_active': '{color.selection_outline_active}',
    'color.radio_outline_selected_focus': '{color.selection_outline_focus}',
    'control.radio_size': '{control.checkbox_size}',
    'control.radio_border': '{border.width_01}',
    'control.radio_dot_size': 8,
    'control.radio_focus_offset': '{control.selection_focus_offset}',
    // v6 Switch family: a two-state track with a handle, no outline or state layer
    'color.switch_outline': NONE,
    'color.switch_outline_hover': NONE,
    'color.switch_outline_focus': NONE,
    'color.switch_outline_active': NONE,
    'color.switch_outline_disabled': NONE,
    'color.switch_track': colorOf('toggle_off'),
    'color.switch_track_hover': colorOf('toggle_off'),
    'color.switch_track_focus': colorOf('toggle_off'),
    'color.switch_track_active': colorOf('toggle_off'),
    'color.switch_track_disabled': colorOf('button_disabled'),
    'color.switch_track_selected': colorOf('support_success'),
    'color.switch_track_selected_hover': colorOf('support_success'),
    'color.switch_track_selected_focus': colorOf('support_success'),
    'color.switch_track_selected_active': colorOf('support_success'),
    'color.switch_track_selected_disabled': colorOf('button_disabled'),
    'color.switch_handle': colorOf('icon_on_color'),
    'color.switch_handle_hover': colorOf('icon_on_color'),
    'color.switch_handle_focus': colorOf('icon_on_color'),
    'color.switch_handle_active': colorOf('icon_on_color'),
    'color.switch_handle_disabled': colorOf('icon_on_color_disabled'),
    'color.switch_handle_selected': colorOf('icon_on_color'),
    'color.switch_handle_selected_hover': colorOf('icon_on_color'),
    'color.switch_handle_selected_focus': colorOf('icon_on_color'),
    'color.switch_handle_selected_active': colorOf('icon_on_color'),
    'color.switch_handle_selected_disabled': colorOf('icon_on_color_disabled'),
    'color.switch_mark': colorOf('support_success'),
    'color.switch_mark_disabled': colorOf('button_disabled'),
    'color.switch_layer_hover': NONE,
    'color.switch_layer_active': NONE,
    'color.switch_layer_selected_hover': NONE,
    'color.switch_layer_selected_active': NONE,
    'color.switch_focus_ring': colorOf('focus'),
    'control.switch_track_width': 48,
    'control.switch_track_height': 24,
    'control.switch_outline_width': 0,
    'control.switch_handle_size': 18,
    'control.switch_handle_size_selected': 18,
    'control.switch_handle_size_pressed': 18,
    'control.switch_focus_width': '{focus.width}',
    'control.switch_focus_offset': 1,
    // v6 Tag family: a neutral gray pill, read-only
    'color.tag_container': colorOf('tag_background_gray'),
    // v7 batch 6 B3 amendment: the untyped interactive tag hovers on the
    // neutral tag's own hover
    'color.tag_container_hover': colorOf('tag_hover_gray'),
    'color.tag_container_disabled': colorOf('layer_01'),
    'color.tag_label': colorOf('tag_color_gray'),
    'color.tag_label_disabled': colorOf('text_disabled'),
    'color.tag_outline': NONE,
    'color.tag_outline_disabled': NONE,
    'color.tag_icon': colorOf('tag_color_gray'),
    'color.tag_icon_disabled': colorOf('text_disabled'),
    'control.tag_height': '{size.size_xsmall}',
    // v7 milestone 3 amendment: the small tag's height is the template's
    // answer (the label's line box must fit the pill), not the spec sum
    // size.icon_01 + spacing.spacing_01 the specs used - which is this 18
    'control.tag_height_small': 18,
    'control.tag_radius': '{shape.radius_16}',
    'control.tag_padding_inline': '{spacing.spacing_03}',
    'control.tag_padding_icon': '{spacing.spacing_02}',
    'control.tag_outline_width': 0,
    'control.tag_icon_size': '{size.icon_01}',
    'type.tag_label': '{type.label01}',
    // v6 Progress family: a square track with an interactive fill
    'color.progress_track': colorOf('border_subtle_00'),
    'color.progress_indicator': colorOf('interactive'),
    'color.progress_indicator_success': colorOf('support_success'),
    'color.progress_indicator_error': colorOf('support_error'),
    'control.progress_height': '{spacing.spacing_03}',
    'control.progress_radius': '{shape.radius_00}',
    // v6 Tooltip family: inverse surface, a caret, 288 wide at most
    'color.tooltip_container': colorOf('background_inverse'),
    'color.tooltip_label': colorOf('text_inverse'),
    'type.tooltip_label': '{type.body01}',
    'control.tooltip_padding_block': '{spacing.spacing_05}',
    'control.tooltip_padding_inline': '{spacing.spacing_05}',
    'control.tooltip_radius': '{shape.radius_02}',
    'control.tooltip_caret_width': 12,
    'control.tooltip_caret_height': 6,
    'control.tooltip_offset': '{spacing.spacing_04}',
    'control.tooltip_max_width': 288,
    // The compact member aliases the family
    'control.tooltip_compact_padding_block': '{control.tooltip_padding_block}',
    'control.tooltip_compact_caret_width': '{control.tooltip_caret_width}',
    'control.tooltip_compact_caret_height': '{control.tooltip_caret_height}',
    'control.tooltip_compact_offset': '{control.tooltip_offset}',
    'type.tooltip_compact_label': '{type.tooltip_label}',
    // v6 Tab family: per-tab underlines, a contained kind on the accent layer
    'color.tab_container': NONE,
    'color.tab_divider': NONE,
    'color.tab_track': colorOf('border_subtle_00'),
    'color.tab_track_hover': colorOf('border_strong_01'),
    'color.tab_track_disabled': colorOf('border_subtle_00'),
    'color.tab_indicator': colorOf('border_interactive'),
    'color.tab_label': colorOf('text_secondary'),
    'color.tab_label_hover': colorOf('text_primary'),
    'color.tab_label_selected': colorOf('text_primary'),
    'color.tab_label_selected_hover': colorOf('text_primary'),
    'color.tab_label_disabled': colorOf('text_disabled'),
    'color.tab_layer_hover': NONE,
    'color.tab_layer_active': NONE,
    'color.tab_layer_selected_hover': NONE,
    'color.tab_layer_selected_active': NONE,
    'color.tab_focus_ring': colorOf('focus'),
    'color.tab_contained_container': colorOf('layer_accent_01'),
    'color.tab_contained_container_hover': colorOf('layer_accent_hover_01'),
    'color.tab_contained_container_selected': colorOf('layer_01'),
    'color.tab_contained_separator': colorOf('border_strong_01'),
    'control.tab_height': '{size.size_medium}',
    'control.tab_contained_height': '{size.size_large}',
    'control.tab_contained_padding_block': '{spacing.spacing_03}',
    'control.tab_padding_inline': '{spacing.spacing_05}',
    'control.tab_item_gap': '{border.width_01}',
    'control.tab_divider_width': 0,
    'control.tab_track_width': '{border.width_02}',
    'control.tab_indicator_width': '{border.width_02}',
    'control.tab_indicator_radius': '{shape.radius_00}',
    'control.tab_focus_width': '{focus.width}',
    'control.tab_focus_offset': -2,
    'type.tab_label': '{type.body_compact_01}',
    'type.tab_label_selected': '{type.heading_compact_01}',
    // v6 Dialog family: a layer over an overlay scrim, square, unshadowed; 0 bounds are unclamped, the per-size width rule governs
    'color.dialog_scrim': colorOf('overlay'),
    'color.dialog_container': colorOf('layer_01'),
    'color.dialog_border': colorOf('border_subtle_01'),
    'color.dialog_heading': colorOf('text_primary'),
    'color.dialog_body': colorOf('text_primary'),
    'control.dialog_border_width': '{border.width_01}',
    'control.dialog_radius': '{shape.radius_00}',
    'control.dialog_min_width': 0,
    'control.dialog_max_width': 0,
    'control.dialog_min_height': 0,
    'control.dialog_padding_inline': '{spacing.spacing_05}',
    'control.dialog_padding_top': '{spacing.spacing_05}',
    'control.dialog_header_gap': '{spacing.spacing_02}',
    'control.dialog_header_space': '{spacing.spacing_03}',
    'control.dialog_body_padding_top': '{spacing.spacing_03}',
    'control.dialog_body_padding_bottom': '{spacing.spacing_09}',
    'control.dialog_actions_height': '{size.size_xlarge}',
    'control.dialog_actions_gap': 0,
    'control.dialog_actions_padding': 0,
    'control.dialog_close_icon_size': '{size.icon_02}',
    'type.dialog_heading': '{type.heading03}',
    'type.dialog_body': '{type.body01}',
    'shadow.dialog': '{shadow.level_00}',
    // v6 Notification family: an inverse toast with a 3px status marker and a 0.2-alpha shadow
    'color.notification_container': colorOf('background_inverse'),
    'color.notification_text': colorOf('text_inverse'),
    'color.notification_close_icon': colorOf('icon_inverse'),
    'color.notification_action': colorOf('link_inverse'),
    'color.notification_marker_error': colorOf('support_error_inverse'),
    'color.notification_marker_success': colorOf('support_success_inverse'),
    'color.notification_marker_info': colorOf('support_info_inverse'),
    'color.notification_marker_warning': colorOf('support_warning_inverse'),
    'control.notification_width': 288,
    'control.notification_radius': '{shape.radius_00}',
    'control.notification_marker_width': 3,
    'control.notification_icon_size': '{size.icon_02}',
    'type.notification_title': '{type.heading_compact_01}',
    'type.notification_body': '{type.body_compact_01}',
    'shadow.notification': { shadow: true, layers: [{ x: 0, y: 2, blur: 6, spread: 0, color: 'rgba(0, 0, 0, 0.2)' }] },
    // v6 Icon button members: the icon-only ghost inks icon-primary through
    // every phase but disabled (the primary reference's ghost icon-only);
    // the outlined kind's icon follows its label (currentColor)
    'color.icon_button_ghost_icon': '{color.icon_primary}',
    'color.icon_button_ghost_icon_hover': '{color.icon_primary}',
    'color.icon_button_ghost_icon_active': '{color.icon_primary}',
    'color.icon_button_ghost_icon_focus': '{color.icon_primary}',
    'color.icon_button_ghost_icon_disabled': '{color.icon_disabled}',
    'color.icon_button_ghost_icon_selected': '{color.icon_primary}',
    'color.icon_button_tertiary_icon': '{color.button_tertiary_label}',
    'color.icon_button_tertiary_icon_hover': '{color.button_tertiary_label_hover}',
    'color.icon_button_tertiary_icon_active': '{color.button_tertiary_label_active}',
    'color.icon_button_tertiary_icon_focus': '{color.button_tertiary_label_focus}',
    'color.icon_button_tertiary_icon_disabled': '{color.button_tertiary_label_disabled}',
    'color.icon_button_tertiary_icon_selected': '{color.button_tertiary_label_selected}',
    // The icon button's selected face and ink alias the kind's selected cells
    'color.icon_button_primary_container_selected': '{color.button_primary_container_selected}',
    'color.icon_button_secondary_container_selected': '{color.button_secondary_container_selected}',
    'color.icon_button_ghost_container_selected': '{color.button_ghost_container_selected}',
    'color.icon_button_tertiary_container_selected': '{color.button_tertiary_container_selected}',
    'color.icon_button_primary_icon_selected': '{color.button_primary_label_selected}',
    'color.icon_button_secondary_icon_selected': '{color.button_secondary_label_selected}',
    // The toggle's unselected face is the kind's rest: container and ink
    // alias the rest cells the kind paints with
    'color.icon_button_primary_container_unselected': '{color.button_primary_container}',
    'color.icon_button_secondary_container_unselected': '{color.button_secondary_container}',
    'color.icon_button_ghost_container_unselected': '{color.button_ghost_container}',
    'color.icon_button_tertiary_container_unselected': '{color.button_tertiary_container}',
    'color.icon_button_primary_icon_unselected': '{color.button_primary_label}',
    'color.icon_button_secondary_icon_unselected': '{color.button_secondary_label}',
    'color.icon_button_ghost_icon_unselected': '{color.icon_button_ghost_icon}',
    'color.icon_button_tertiary_icon_unselected': '{color.icon_button_tertiary_icon}',
    'control.icon_button_size': '{control.button_height}',
    'control.icon_button_icon_size': '{size.icon_01}',
    // v7 Button set members: hairline separators between adjacent items,
    // the same semantic roles the primary reference draws them in
    'color.button_set_separator': colorOf('button_separator'),
    'color.button_set_separator_disabled': colorOf('icon_on_color_disabled'),
    'color.button_set_separator_stacked_disabled': colorOf('layer_selected_disabled'),
    'control.button_set_item_max_width': 196,
    'control.button_set_gap': 0,
    'control.button_set_fluid_min_width': 176,
    'control.button_set_fluid_max_width': 232,
    'control.button_set_fluid_ghost_padding_start': '{spacing.spacing_07}',
    // v7 Button skeleton member
    'control.button_skeleton_width': 150,
    // v7 Combo button members
    'control.combo_button_min_width': 160,
    'control.combo_button_max_width': 240,
    // v7 Divider family: a subtle line, indented from the edge
    'color.divider': colorOf('border_subtle_01'),
    'control.divider_width': '{border.width_01}',
    'control.divider_inset': '{spacing.spacing_05}',
    // v7 Link family: the primary reference's link colours and types
    'color.link_label': colorOf('link_primary'),
    'color.link_label_hover': colorOf('link_primary_hover'),
    'color.link_label_active': colorOf('link_primary'),
    'color.link_label_visited': colorOf('link_visited'),
    'color.link_label_disabled': colorOf('text_disabled'),
    'color.link_focus_ring': colorOf('focus'),
    'control.link_focus_width': 1,
    'control.link_icon_gap': '{spacing.spacing_03}',
    'control.link_icon_size': 16,
    'control.link_icon_size_large': 20,
    'type.link_label': '{type.body_compact_01}',
    'type.link_label_small': '{type.helper_text_01}',
    'type.link_label_large': '{type.body_compact_02}',
    // v7 Loading family: an interactive arc on an accent track over a scrim
    'color.loading_indicator': colorOf('interactive'),
    'color.loading_track': colorOf('layer_accent_01'),
    'color.loading_scrim': colorOf('overlay'),
    'control.loading_size': 88,
    'control.loading_size_small': 16,
    'control.loading_stroke_width': 8.8,
    'control.loading_stroke_width_small': 2.56,
    'control.loading_arc': 0.81,
    'control.loading_arc_small': 0.48,
    'motion.loading_rotation': 690,
    'motion.loading_arc_cycle': 690,
    // v7 batch 6 B3 round 3 amendment: the arc's expand and rotate steps
    // run on the standard productive curve
    'motion.loading_arc_easing': '{motion.easing_standard_productive}',
    // v7 Inline loading member: the label beside the spinner
    'type.inline_loading_label': '{type.label02}',
    'color.inline_loading_label': colorOf('text_secondary'),
    'control.inline_loading_gap': '{spacing.spacing_03}',
    'color.inline_loading_success': colorOf('support_success'),
    'color.inline_loading_error': colorOf('support_error'),
    // v7 Saving member: the status line's error glyph
    'type.saving_label': '{type.body_compact_01}',
    'color.saving_error_icon': colorOf('button_danger_primary'),
    'control.saving_icon_gap': '{spacing.spacing_05}',
    // v7 Progress step family: interactive steps on a subtle line
    'color.progress_step_icon': colorOf('interactive'),
    'color.progress_step_icon_incomplete': colorOf('icon_primary'),
    'color.progress_step_icon_disabled': colorOf('icon_disabled'),
    'color.progress_step_icon_invalid': colorOf('support_error'),
    'color.progress_step_line': colorOf('border_subtle_01'),
    'color.progress_step_line_complete': colorOf('interactive'),
    'color.progress_step_label': colorOf('text_primary'),
    'color.progress_step_label_hover': colorOf('link_primary_hover'),
    'color.progress_step_label_focus': colorOf('focus'),
    'color.progress_step_label_disabled': colorOf('text_disabled'),
    'color.progress_step_secondary_label': colorOf('text_secondary'),
    'control.progress_step_width': 128,
    'control.progress_step_min_width': 112,
    'control.progress_step_vertical_min_height': 58,
    'control.progress_step_icon_gap': '{spacing.spacing_03}',
    'control.progress_step_icon_top': 10,
    'control.progress_step_line_width': 2,
    'control.progress_step_label_max_width': 88,
    'control.progress_step_label_max_width_vertical': 160,
    'control.progress_step_label_gap': '{spacing.spacing_03}',
    'control.progress_step_skeleton_label_width': 40,
    'control.progress_step_skeleton_label_height': 14,
    // the pressable label's focus ring draws no offset, a 1px outline
    'control.progress_step_focus_width': 1,
    // vertical anatomy: the icon sits 1px from the seat's top, the line
    // is a 1px connector
    'control.progress_step_vertical_icon_top': 1,
    'control.progress_step_vertical_line_width': 1,
    // the secondary label is absolute under the icon at the label's
    // x position and two spacing steps down
    'control.progress_step_secondary_label_top': 28,
    'control.progress_step_secondary_label_start': 24,
    'type.progress_step_label': '{type.body_compact_01}',
    'type.progress_step_secondary_label': '{type.label01}',
    // v7 Skeleton family: the shimmer one ramp step past the container
    'color.skeleton_container': colorOf('skeleton_background'),
    'color.skeleton_shimmer': { op: 'rampStep', args: [3] },
    'control.skeleton_radius': 0,
    'control.skeleton_placeholder_size': 100,
    'control.skeleton_text_height': 16,
    'control.skeleton_text_gap': '{spacing.spacing_03}',
    'control.skeleton_heading_height': 24,
    'motion.skeleton_cycle': 3000,
    // v7 Tag members: the skeleton's width, the closable tag's affordance,
    // the interactive tags' outline and ring, the selectable tag's face
    'control.tag_skeleton_width': 60,
    'control.tag_close_gap': '{spacing.spacing_01}',
    'control.tag_close_icon_size': 16,
    'control.tag_close_inset': 0,
    'color.tag_close_container_hover': colorOf('tag_hover_gray'),
    'color.tag_close_focus_ring': colorOf('focus'),
    // v7 batch 6 B3 round 2 amendment: the untyped dismissible tag's label
    // reads the neutral tag label
    'color.tag_dismissible_label': colorOf('tag_label'),
    'control.tag_interactive_outline_width': 1,
    // v7 batch 6 B3 amendment: the small interactive tag's measured 20px
    // (18 min-height beaten by the 16 label line plus the border and the
    // button's own block padding)
    'control.tag_interactive_height_small': 20,
    'color.tag_interactive_layer_active': NONE,
    'color.tag_interactive_outline_disabled': colorOf('border_disabled'),
    // v7 batch 6 B3 round 2 amendment: the untyped interactive tag's outline
    // (its gray border where the plain tag draws none)
    'color.tag_interactive_outline': colorOf('tag_border_gray'),
    'color.tag_focus_ring': colorOf('focus'),
    'control.tag_focus_width': 2,
    'control.tag_focus_offset': 1,
    'color.tag_selectable_container': colorOf('layer_01'),
    'color.tag_selectable_container_hover': colorOf('layer_hover_01'),
    'color.tag_selectable_container_selected': colorOf('layer_selected_inverse'),
    'color.tag_selectable_container_selected_hover': colorOf('layer_selected_inverse'),
    'color.tag_selectable_label': colorOf('text_primary'),
    'color.tag_selectable_label_selected': colorOf('text_inverse'),
    // v7 batch 6 B3 round 2 amendment: selected and disabled reads the cells
    // the component answers today - color.tag_container_disabled and
    // color.tag_label_disabled
    'color.tag_selectable_container_selected_disabled': colorOf('tag_container_disabled'),
    'color.tag_selectable_label_selected_disabled': colorOf('tag_label_disabled'),
    'color.tag_selectable_outline': colorOf('border_inverse'),
    // v7 batch 6 amendment: the primary draws no pressed layer on the
    // selectable tag - the selection fill already darkens on press
    'color.tag_selectable_layer_active': NONE,
    'control.tag_selectable_outline_width_selected': 1,
    // v8 Field actions (census PasswordInput): under the square anatomy the
    // seat is the field's height flush with the frame end, so only the state
    // fills carry; the default answers what the primary reference does
    'control.field_action_inset': 0,
    'control.field_action_size': 40,
    'control.field_action_gap': 16,
    'color.field_leading_icon': colorOf('icon_secondary'),
    'color.field_action_container_hover': colorOf('field_hover_01'),
    'color.field_action_container_active': colorOf('background_selected'),
    // census PasswordInput: material and default alias the family cells
    'color.password_toggle_container_hover': '{color.field_action_container_hover}',
    'color.password_toggle_container_active': '{color.field_action_container_active}',
    // v8 Field skeleton (census TextInputSkeleton): the label block is 75 x 14
    'control.field_skeleton_label_width': 75,
    'control.field_skeleton_label_height': 14,
    // v8 Time picker (census TimePicker): mono digits in a 78 field, 98.8 invalid
    'type.time_picker_value': '{type.code02}',
    'control.time_picker_input_width': 78,
    'control.time_picker_input_width_invalid': 98.8,
    'control.time_picker_select_gap': '{spacing.spacing_01}',
    // v8 Number input (census NumberInput): 1px dividers 16 tall between the steppers
    'color.number_input_divider': colorOf('border_subtle_00'),
    'control.number_input_divider_height': 16,
    // v8 Search (census Search): the disabled close and magnifier
    'color.search_icon_disabled': colorOf('icon_on_color_disabled'),
    // v8 Selection groups (census CheckboxGroup, RadioButtonGroup)
    'control.checkbox_group_gap': 6,
    'control.radio_group_gap_horizontal': '{spacing.spacing_05}',
    'control.radio_group_gap_vertical': 6,
    // v8 Selection skeletons (census CheckboxSkeleton, ToggleSkeleton)
    'control.selection_skeleton_label_width': 100,
    'control.toggle_skeleton_bar_width': 24,
    'control.toggle_skeleton_bar_height': 8,
    // v8 Slider family (census Slider): the primary reference's square
    // 2px track, inverse-selected fill, 14px handle growing to 20 while
    // held, a page-colored gap ring while focused, no state layer
    'control.slider_gap': '{spacing.spacing_05}',
    'control.slider_padding_block': 16,
    'control.slider_min_width': 200,
    'control.slider_max_width': 640,
    'type.slider_range_label': '{type.body_compact_01}',
    'color.slider_range_label': colorOf('text_primary'),
    'control.slider_track_height': 2,
    'control.slider_track_radius': '{shape.radius_00}',
    'color.slider_track': colorOf('border_subtle_00'),
    'color.slider_track_filled': colorOf('layer_selected_inverse'),
    'color.slider_track_filled_focus': colorOf('border_interactive'),
    'control.slider_tick_height': 4,
    'control.slider_handle_size': 14,
    'control.slider_handle_size_active': 20,
    'color.slider_handle': colorOf('layer_selected_inverse'),
    'color.slider_handle_focus': colorOf('interactive'),
    'color.slider_handle_gap_focus': colorOf('layer_01'),
    'control.slider_state_layer_size': 0,
    'color.slider_state_layer_hover': NONE,
    'color.slider_state_layer_focus': NONE,
    'color.slider_state_layer_active': NONE,
    'shadow.slider_handle': '{shadow.level_00}',
    'color.slider_disabled': colorOf('border_disabled'),
    'color.slider_track_disabled': colorOf('border_disabled'),
    'control.slider_input_width': 64,
    'control.slider_input_width_invalid': 96,
    // v8 SliderSkeleton (census SliderSkeleton): the range label blocks
    'control.slider_skeleton_range_width': 20,
    'control.slider_skeleton_range_height': 12,
    // v8 Select members (census MultiSelect, SelectItemGroup): the option
    // checkbox seats 28 in; the group header is a small secondary label
    'control.multi_select_checkbox_inset': 28,
    'type.select_group_label': '{type.label01}',
    'color.select_group_label': colorOf('text_secondary'),
    // v8 Popover family (census Popover): a layer surface, subtle border,
    // 12 x 6 caret, offset 8 - the default draws the primary's open look
    'color.popover_container': colorOf('layer_01'),
    'color.popover_label': colorOf('text_primary'),
    'color.popover_border': colorOf('border_subtle_00'),
    'control.popover_radius': '{shape.radius_02}',
    'control.popover_caret_width': 12,
    'control.popover_caret_height': 6,
    'control.popover_offset': '{spacing.spacing_03}',
    'shadow.popover': { shadow: true, layers: [{ x: 0, y: 2, blur: 2, spread: 0, color: 'rgba(0, 0, 0, 0.2)' }] },
    // v8 DefinitionTooltip (census DefinitionTooltip): a dotted term
    // underline going interactive while engaged; the bubble is the
    // tooltip's own cells at a narrower cap and tighter padding
    'color.definition_term_underline': colorOf('border_strong_01'),
    'color.definition_term_underline_hover': colorOf('border_interactive'),
    'control.definition_tooltip_max_width': 176,
    'control.definition_tooltip_padding_block': '{spacing.spacing_03}',
    'control.definition_tooltip_padding_inline': '{spacing.spacing_05}',
    // v8 Toggletip (census Toggletip): a secondary glyph going primary while
    // open, offset 13, the inverse content capped at 288
    'color.toggletip_icon': colorOf('icon_secondary'),
    'color.toggletip_icon_active': colorOf('icon_primary'),
    'control.toggletip_offset': 13,
    'control.toggletip_max_width': 288,
    // v8 inverse links and focus (census ToggletipContent): ink on the
    // inverse surfaces the Toggletip and tooltip draw
    'color.link_label_inverse': colorOf('link_inverse'),
    'color.link_label_inverse_hover': colorOf('link_inverse_hover'),
    'color.focus_ring_inverse': colorOf('focus_inverse'),
    // v8 FAB family (census FloatingActionButton, carbon S): a button-faced
    // action a level over the page - layer container for surface, the
    // button fills for the colored variants, the accent layer for tertiary
    'color.fab_surface_container': colorOf('layer_01'),
    'color.fab_surface_icon': colorOf('icon_primary'),
    'color.fab_primary_container': colorOf('button_primary'),
    'color.fab_primary_icon': colorOf('icon_on_color'),
    'color.fab_secondary_container': colorOf('button_secondary'),
    'color.fab_secondary_icon': colorOf('icon_on_color'),
    'color.fab_tertiary_container': colorOf('layer_accent_01'),
    'color.fab_tertiary_icon': colorOf('icon_primary'),
    // census FloatingActionButton: carbon S the button hover/active fills -
    // the layer-faced variants take the layer states the tertiary button
    // draws, the filled variants their button's
    'color.fab_surface_layer_hover': colorOf('layer_hover_01'),
    'color.fab_surface_layer_active': colorOf('layer_active_01'),
    'color.fab_primary_layer_hover': colorOf('button_primary_hover'),
    'color.fab_primary_layer_active': colorOf('button_primary_active'),
    'color.fab_secondary_layer_hover': colorOf('button_secondary_hover'),
    'color.fab_secondary_layer_active': colorOf('button_secondary_active'),
    'color.fab_tertiary_layer_hover': colorOf('layer_accent_hover_01'),
    'color.fab_tertiary_layer_active': colorOf('layer_accent_active_01'),
    'control.fab_size': '{size.size_large}',
    'control.fab_size_small': '{size.size_small}',
    'control.fab_size_large': '{size.size_xlarge}',
    'control.fab_icon_size': '{size.icon_02}',
    'control.fab_icon_size_large': '{size.icon_04}',
    'control.fab_radius': '{shape.radius_00}',
    'control.fab_radius_small': '{shape.radius_00}',
    'control.fab_radius_large': '{shape.radius_00}',
    'shadow.fab': '{shadow.level_02}',
    'shadow.fab_hover': '{shadow.level_02}',
    'type.fab_label': '{type.body_compact_01}',
    'control.fab_extended_padding': '{spacing.spacing_05}',
    'control.fab_label_gap': '{spacing.spacing_03}',
    // v8 TagSet (census TagSet): members a spacing step apart
    'control.tag_set_gap': '{spacing.spacing_03}',
    // No elevation
    'shadow.level_00': { shadow: true, layers: [{ x: 0, y: 0, blur: 0, spread: 0, color: NONE }] }
  };
  for (const kind of Object.keys(FILLED).concat(Object.keys(ON_PAGE))) {
    Object.assign(recipe, buttonCells(kind));
  }

  // Every cell answered, nothing beyond the grid
  const cells = Object.keys(grid).flatMap(function (group) {
    return grid[group].map(function (cell) {
      return group + '.' + cell;
    });
  });
  const missing = cells.filter(function (name) {
    return recipe[name] === undefined;
  });
  const extra = Object.keys(recipe).filter(function (name) {
    return !cells.includes(name);
  });
  if (missing.length > 0 || extra.length > 0) {
    throw new Error('grid recipe: missing ' + JSON.stringify(missing) + ', not in the grid ' + JSON.stringify(extra));
  }

  return recipe;

}
