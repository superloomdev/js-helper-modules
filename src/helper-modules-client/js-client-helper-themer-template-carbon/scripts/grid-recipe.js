// Info: The carbon template's answer to every cell of the contract's role
// grid, from Carbon's own component styles (pinned `@carbon/styles`): each
// cell an alias to the Carbon token that part draws in, resolved in each
// scheme. The facts behind the cells that are not today's plain tokens:
// a button's focus ring is `border-color: $focus` with `box-shadow: inset 0
// 0 0 1px $focus, inset 0 0 0 2px $background` (2px of focus colour inside
// the edge, then a 1px page-colour line; `button/_mixins.scss`), a tertiary
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
// label colour while that fill shows (`engaged`)
const ON_PAGE = Object.freeze({
  tertiary: { hover: 'button_tertiary_hover', active: 'button_tertiary_active', label: 'button_tertiary', engaged: 'text_inverse', border: 'button_tertiary', focus: 'button_tertiary' },
  ghost: { hover: 'background_hover', active: 'background_active', label: 'link_primary', engaged: 'link_primary_hover', border: null, focus: null },
  danger_tertiary: { hover: 'button_danger_hover', active: 'button_danger_active', label: 'button_danger_secondary', engaged: 'text_on_color', border: 'button_danger_secondary', borderHover: 'button_danger_hover', borderActive: 'button_danger_active', focus: 'button_danger_primary' },
  danger_ghost: { hover: 'button_danger_hover', active: 'button_danger_active', label: 'button_danger_secondary', engaged: 'text_on_color', border: null, focus: null }
});

const NONE = 'rgba(0, 0, 0, 0)';


/********************************************************************
An alias to a colour leaf, or the transparent colour for none.

@param {String|null} leaf - Colour leaf

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
    // Button family: a ring drawn inside the edge with a page-colour line inside it
    'color.button_focus_ring': colorOf('focus'),
    'color.button_focus_gap': colorOf('background'),
    'control.button_focus_width': '{focus.width}',
    'control.button_focus_offset': -2,
    'control.button_focus_gap_width': '{border.width_01}',
    'control.button_ghost_padding_start': '{control.button_padding_start}',
    'control.button_ghost_padding_end': '{control.button_padding_start}',
    'control.button_min_width': 0,
    // Selection family: an icon-coloured box, filled when checked, no state layer
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
