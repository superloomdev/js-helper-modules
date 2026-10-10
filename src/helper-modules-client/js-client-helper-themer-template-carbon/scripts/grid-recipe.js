// Info: The carbon template's answer to every cell of the contract's role
// grid, from Carbon's own component styles (pinned `@carbon/styles`): each
// cell an alias to the Carbon token that part draws in, resolved in each
// scheme. The facts behind the cells that are not today's plain tokens:
// a button's focus ring is `border-color: $focus` with `box-shadow: inset 0
// 0 0 1px $focus, inset 0 0 0 2px $background` (2px of focus color inside
// the edge, then a 1px page-color line; `button/_mixins.scss`), a tertiary
// button fills with `$button-tertiary` and inks `$text-inverse` on focus and
// clears its border while pressed, a danger tertiary fills with
// `$button-danger-primary` and inks `$text-on-color` on focus and draws its
// border in `$button-danger-active` while pressed
// (`button/_button.scss`), a ghost inks
// `$link-primary-hover` while hovered or pressed, a danger tertiary draws its
// border in `$button-danger-hover` while hovered, a disabled outlined kind
// draws its border in `$button-disabled`; a field and a select draw their
// focus outline 2px inside the frame, a checkbox 1px outside its box; a
// select fills with `$field-hover` on hover, a text input does not change;
// a disabled text input keeps its `$border-strong` underline, a disabled
// select draws no border. A cell the contract adds and this table
// does not answer stops the generator.

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
    put('label', '_disabled', colorOf('text_disabled'));
    put('border', '', colorOf(k.border));
    put('border', '_hover', colorOf(k.borderHover || k.border));
    put('border', '_active', kind === 'tertiary' ? NONE : colorOf(k.borderActive || k.border));
    put('border', '_disabled', k.border === null ? NONE : colorOf('button_disabled'));
  }
  put('container', '_selected', colorOf('background_selected'));
  put('label', '_selected', colorOf('text_primary'));
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
    // (`list-box/_list-box.scss:572-680` and `menu/_menu.scss`): a layer fill
    // with the popover shadow, item labels in secondary text going primary on
    // hover and selected, hover `$layer-hover`, pressed `$layer-selected`, the
    // selected row `$layer-selected` (`--selected-hover` on hover), the item
    // divider `$border-subtle-01`
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
    // Menu members: the menu's own 4px block padding and 32px items, and a
    // danger item that fills `$button-danger-primary` and inks `$text-on-color`
    // while hovered (`menu/_menu.scss:215-222`)
    'control.menu_padding_block': '{spacing.spacing_02}',
    'control.menu_item_height': '{size.size_small}',
    'control.menu_divider_width': '{border.width_01}',
    'control.menu_icon_size': '{size.icon_01}',
    'color.menu_divider': colorOf('border_subtle_00'),
    'color.menu_item_danger_container_hover': colorOf('button_danger_primary'),
    'color.menu_item_danger_label': colorOf('text_secondary'),
    'color.menu_item_danger_label_hover': colorOf('text_on_color'),
    // Field member: the text area draws no hover fill and a transparent
    // disabled underline (`text-area/_text-area.scss:113-124`)
    'color.text_area_container_hover': colorOf('field_01'),
    'color.text_area_outline_disabled': NONE,
    'type.text_area_value': '{type.body01}',
    // Selection members: the radio's checked ring keeps the outline colour and
    // its ring, dot and focus offset differ from the box's
    // (`radio-button/_radio-button.scss`)
    'color.radio_outline_selected': '{color.selection_outline}',
    'color.radio_outline_selected_hover': '{color.selection_outline_hover}',
    'color.radio_outline_selected_active': '{color.selection_outline_active}',
    'color.radio_outline_selected_focus': '{color.selection_outline_focus}',
    'control.radio_size': 18,
    'control.radio_border': '{border.width_01}',
    'control.radio_dot_size': 8,
    'control.radio_focus_offset': 1.5,
    // v6 Switch family (`toggle/_toggle.scss`): a 48 x 24 track in `$toggle-off`
    // / `$support-success`, an 18 `$icon-on-color` handle, a `$support-success`
    // check in the small size's checked handle, a 2px `$focus` ring 1px out;
    // disabled draws `$button-disabled` / `$icon-on-color-disabled`
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
    // v6 Tag family (`tag/_tag.scss`): the read-only tag is the gray hue with
    // no outline; a 24 pill at the default size, padding 8 or 4 with an icon;
    // disabled is `$layer` with `$text-disabled`
    'color.tag_container': colorOf('tag_background_gray'),
    'color.tag_container_disabled': colorOf('layer_01'),
    'color.tag_label': colorOf('tag_color_gray'),
    'color.tag_label_disabled': colorOf('text_disabled'),
    'color.tag_outline': NONE,
    'color.tag_outline_disabled': NONE,
    'color.tag_icon': colorOf('tag_color_gray'),
    'color.tag_icon_disabled': colorOf('text_disabled'),
    'control.tag_height': '{size.size_xsmall}',
    'control.tag_radius': '{shape.radius_16}',
    'control.tag_padding_inline': '{spacing.spacing_03}',
    'control.tag_padding_icon': '{spacing.spacing_02}',
    'control.tag_outline_width': 0,
    'control.tag_icon_size': '{size.icon_01}',
    'type.tag_label': '{type.label01}',
    // v6 Progress family (`progress-bar/_progress-bar.scss`): an 8px square
    // track in `$border-subtle`, the indicator `$interactive` going
    // `$support-success` / `$support-error` when finished
    'color.progress_track': colorOf('border_subtle_00'),
    'color.progress_indicator': colorOf('interactive'),
    'color.progress_indicator_success': colorOf('support_success'),
    'color.progress_indicator_error': colorOf('support_error'),
    'control.progress_height': '{spacing.spacing_03}',
    'control.progress_radius': '{shape.radius_00}',
    // v6 Tooltip family (`tooltip/_tooltip.scss`, `popover/_popover.scss`):
    // inverse surface, 16 padding, radius 2, a 12 x 6 caret 12 from the
    // anchor, 288 wide at most; the compact member pads 2 with an 8 x 4 caret
    // 8 from the anchor
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
    'control.tooltip_compact_padding_block': '{spacing.spacing_01}',
    'control.tooltip_compact_caret_width': 8,
    'control.tooltip_compact_caret_height': 4,
    'control.tooltip_compact_offset': '{spacing.spacing_03}',
    'type.tooltip_compact_label': '{type.body_compact_01}',
    // v6 Tab family (`tabs/_tabs.scss`): a 40-high bar whose tabs underline in
    // `$border-subtle` (`$border-strong` on hover) and whose selected tab draws
    // a 2px `$border-interactive` full-width indicator, the contained kind on
    // `$layer-accent` with `$border-strong` separators; focus is the inset ring
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
    // `tabs/_tabs.scss:449`: the disabled label maps to the same color as $icon-disabled
    'color.tab_label_disabled': colorOf('icon_disabled'),
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
    // The contained kind seats on the next measure up, its label two
    // `$spacing-03` blocks in from each edge (`tabs/_tabs.scss`)
    'control.tab_contained_height': '{size.size_large}',
    'control.tab_contained_padding_block': '{spacing.spacing_03}',
    'control.tab_padding_inline': '{spacing.spacing_05}',
    // Each item carries a hidden dismissable seat that reserves a hairline
    'control.tab_item_gap': '{border.width_01}',
    'control.tab_divider_width': 0,
    'control.tab_track_width': '{border.width_02}',
    'control.tab_indicator_width': '{border.width_02}',
    'control.tab_indicator_radius': '{shape.radius_00}',
    'control.tab_focus_width': '{focus.width}',
    'control.tab_focus_offset': -2,
    'type.tab_label': '{type.body_compact_01}',
    'type.tab_label_selected': '{type.heading_compact_01}',
    // v6 Dialog family (`modal/_modal.scss`): `$layer` over `$overlay`, a 1px
    // `$border-subtle-01` frame, square, unshadowed, sized per size by
    // viewport percentage (0 bounds: unclamped); header 16/16, label-to-heading
    // 4, body 8/48, the 64 footer filled edge to edge
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
    // `_modal.scss`: `.cds--modal-header` margins `0.5rem` between itself and the content
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
    // v6 Notification family (`notification/_toast-notification.scss`):
    // `$background-inverse` toast 288 wide, a 3px `$support-<status>-inverse`
    // marker, a 20 status icon, and its own 0.2-alpha shadow
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
    // every phase but disabled (upstream .cds--btn--ghost.cds--btn--icon-only);
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
    'control.icon_button_size': '{control.button_height}',
    'control.icon_button_icon_size': '{size.icon_01}',
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
