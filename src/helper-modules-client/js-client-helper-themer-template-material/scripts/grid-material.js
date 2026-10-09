// Info: The material template's answer to every cell of the contract's role
// grid, read from the pinned component token files (`@material/web` 2.5.0,
// `_md-comp-*.scss`) and resolved in each scheme. A color Material states
// as a role at an opacity stays translucent (`rgba`, exact over any
// backdrop); a hover or pressed fill of a filled container is the state
// layer flattened over that container (one opaque paint), of a transparent
// container the state layer itself; a pressed control keeps its hover
// layer under the pressed one, as md-ripple draws them; a focused container
// draws no state layer. Button kinds Material has no component for are built from the
// nearest Material component with Material's own roles substituted (a
// destructive kind from `error`), as the destructive kinds already are.
// Parts Material does not draw (a checkbox label, a field ring) take the
// template's own semantic roles. A cell this module does not answer stops
// the generator; none is completed from the default template. A cell drawn
// in a system role the template maps onto one of its keys is that key (an
// alias, or an `alpha` or `mix` rule over it), so a brand layer that
// changes the key reaches every cell drawn in it.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const NONE = 'rgba(0, 0, 0, 0)';

// Kind -> the Material component it is drawn as, and the roles substituted for kinds Material lacks
const BUTTON_SOURCES = Object.freeze({
  primary: { file: 'filled-button', roles: {} },
  secondary: { file: 'filled-button', roles: { primary: 'secondary', 'on-primary': 'on-secondary' } },
  tertiary: { file: 'outlined-button', roles: {} },
  ghost: { file: 'text-button', roles: {} },
  danger: { file: 'filled-button', roles: { primary: 'error', 'on-primary': 'on-error' } },
  danger_tertiary: { file: 'outlined-button', roles: { primary: 'error', outline: 'error' } },
  danger_ghost: { file: 'text-button', roles: { primary: 'error' } },
  tonal: { file: 'filled-tonal-button', roles: {} },
  elevated: { file: 'elevated-button', roles: {} }
});


/********************************************************************
A reader over the component token files.

@param {Array} dirs - Token directories, searched in order

@return {Function} - (file, name) -> { role } | { px } | { number } | { level } | { typescale } | null
*********************************************************************/
function createTokenReader (dirs) {

  const cache = {};
  const contentOf = function (file) {
    if (cache[file] === undefined) {
      cache[file] = dirs.map(function (dir) {
        try {
          return readFileSync(resolve(dir, '_md-comp-' + file + '.scss'), 'utf8');
        } catch {
          return '';
        }
      }).join('\n');
    }
    return cache[file];
  };

  return function (file, name) {
    const content = contentOf(file);
    const start = content.search(new RegExp('\\n\\s+\'' + name + '\':'));
    if (start === -1) {
      return null;
    }
    const rest = content.slice(start + 1);
    const next = rest.slice(1).search(/\n\s+'[a-z0-9-]+':|\n\s*\)/);
    const value = next === -1 ? rest : rest.slice(0, next + 1);
    const sys = /map\.get\(\$deps, 'md-sys-color', '([a-z0-9-]+)'\)/.exec(value);
    if (sys) {
      return { role: sys[1] };
    }
    const state = /map\.get\(\$deps, 'md-sys-state', '([a-z-]+)'\)/.exec(value);
    if (state) {
      const system = dirs.map(function (dir) {
        try {
          return readFileSync(resolve(dir, '_md-sys-state.scss'), 'utf8');
        } catch {
          return '';
        }
      }).join('\n');
      const match = new RegExp('\'' + state[1] + '\':\\s*if\\(\\$exclude-hardcoded-values, null, ([0-9.]+)\\)').exec(system);
      return match ? { number: Number(match[1]) } : null;
    }
    const level = /map\.get\(\$deps, 'md-sys-elevation', 'level(\d)'\)/.exec(value);
    if (level) {
      return { level: Number(level[1]) };
    }
    const typescale = /map\.get\(\$deps, 'md-sys-typescale', '([a-z-]+)-(?:font|size|weight|line-height)'\)/.exec(value);
    if (typescale) {
      return { typescale: typescale[1] };
    }
    const shape = /map\.get\(\$deps, 'md-sys-shape', '([a-z-]+)'\)/.exec(value);
    if (shape) {
      return { shape: shape[1] };
    }
    const px = /if\(\$exclude-hardcoded-values, null, (-?[0-9.]+)px\)/.exec(value);
    if (px) {
      return { px: Number(px[1]) };
    }
    const number = /if\(\$exclude-hardcoded-values, null, (-?[0-9.]+)\)/.exec(value);
    if (number) {
      return { number: Number(number[1]) };
    }
    return null;
  };

}


/********************************************************************
Build every grid cell for one Material scheme.

@param {Object} options - { grid, scheme, dirs, hexFromArgb, typeSet }:
                          the contract's grid, the material-color-utilities
                          scheme, the token directories, its hex converter and
                          a converter from a typescale role to a type set

@return {Object} - Token name -> entry
*********************************************************************/
export default function buildMaterialGrid (options) {

  const read = createTokenReader(options.dirs);
  const scheme = options.scheme;

  // A system color role as #rrggbb
  const hexOf = function (role) {
    const camel = role.replace(/-([a-z])/g, function (match, c) {
      return c.toUpperCase();
    });
    if (scheme[camel] === undefined) {
      throw new Error('grid-material: no scheme color ' + role);
    }
    return options.hexFromArgb(scheme[camel]);
  };
  const channels = function (hex) {
    return [1, 3, 5].map(function (i) {
      return parseInt(hex.slice(i, i + 2), 16);
    });
  };
  const rgba = function (hex, alpha) {
    return alpha >= 1 ? hex : 'rgba(' + channels(hex).join(', ') + ', ' + Math.round(alpha * 1000) / 1000 + ')';
  };
  const flatten = function (base, layer, alpha) {
    const b = channels(base);
    const l = channels(layer);
    return '#' + b.map(function (value, i) {
      return Math.round(value * (1 - alpha) + l[i] * alpha).toString(16).padStart(2, '0');
    }).join('');
  };
  // A token's color, its role substituted where the kind asks for it
  // Translucent layers stacked into one translucent color: [[hex, alpha], ...] bottom first
  const stack = function (layers) {
    let alpha = 0;
    let rgb = [0, 0, 0];
    for (const entry of layers) {
      const c = channels(entry[0]);
      const next = entry[1] + alpha * (1 - entry[1]);
      rgb = rgb.map(function (value, i) {
        return (c[i] * entry[1] + value * alpha * (1 - entry[1])) / next;
      });
      alpha = next;
    }
    return 'rgba(' + rgb.map(Math.round).join(', ') + ', ' + Math.round(alpha * 1000) / 1000 + ')';
  };
  // The template key a system role is mapped onto (the first, or a preferred one), so a cell
  // drawn in that role follows a brand layer that changes the key
  const keyOf = function (role, prefer) {
    const keys = [].concat(options.mapping[role.replace(/-/g, '_')] || []);
    return prefer && keys.includes(prefer) ? prefer : keys.length > 0 ? keys[0] : null;
  };
  // A token's paint ({ hex, key }), its role substituted where the kind asks for it
  const paintOf = function (file, name, roles, prefer) {
    const value = read(file, name);
    if (value === null || value.role === undefined) {
      return null;
    }
    const role = (roles || {})[value.role] || value.role;
    return { hex: hexOf(role), key: keyOf(role, prefer) };
  };
  // A paint as a template entry: an alias to its key, else its color
  const entryOf = function (paint) {
    return paint === null ? null : paint.key === null ? paint.hex : '{' + paint.key + '}';
  };
  const colorToken = function (file, name, roles, prefer) {
    return entryOf(paintOf(file, name, roles, prefer));
  };
  // A paint at an opacity: the alpha rule over its key, else an rgba color
  const atOpacity = function (paint, alpha) {
    if (alpha >= 1) {
      return entryOf(paint);
    }
    return paint.key === null ? rgba(paint.hex, alpha) : { op: 'alpha', args: [paint.key, Math.round(alpha * 1000) / 1000] };
  };
  // Layers of one paint stacked: one opacity, 1 - the product of what each lets through
  const combined = function (alphas) {
    return 1 - alphas.reduce(function (through, alpha) {
      return through * (1 - alpha);
    }, 1);
  };
  // State layers [[paint, alpha], ...] over a container paint (null: transparent)
  const layered = function (container, layers) {
    const same = layers.every(function (entry) {
      return entry[0].hex === layers[0][0].hex && entry[0].key === layers[0][0].key;
    });
    if (!same) {
      return container === null ? stack(layers.map(function (entry) {
        return [entry[0].hex, entry[1]];
      })) : layers.reduce(function (base, entry) {
        return flatten(base, entry[0].hex, entry[1]);
      }, container.hex);
    }
    const paint = layers[0][0];
    const alpha = combined(layers.map(function (entry) {
      return entry[1];
    }));
    if (container === null) {
      return atOpacity(paint, alpha);
    }
    return container.key !== null && paint.key !== null
      ? { op: 'mix', args: [paint.key, container.key, Math.round(alpha * 100000) / 1000] }
      : flatten(container.hex, paint.hex, alpha);
  };
  const numberToken = function (file, name) {
    const value = read(file, name);
    if (value === null) {
      throw new Error('grid-material: ' + file + ' states no ' + name);
    }
    return value.px !== undefined ? value.px : value.number;
  };
  const required = function (value, label) {
    if (value === null || value === undefined) {
      throw new Error('grid-material: no value for ' + label);
    }
    return value;
  };
  // A color at the opacity its paired token states
  const translucent = function (file, colorName, opacityName, roles) {
    const paint = required(paintOf(file, colorName, roles), file + ' ' + colorName);
    return atOpacity(paint, read(file, opacityName) === null ? 1 : numberToken(file, opacityName));
  };
  const elevation = function (file, name) {
    const value = read(file, name);
    return value === null || value.level === undefined || value.level === 0 ? '{shadow.level_00}' : '{shadow.level_0' + value.level + '}';
  };
  // A system paint without a component token (a bare role)
  const rolePaint = function (role, prefer) {
    return { hex: hexOf(role), key: keyOf(role, prefer) };
  };
  const roleEntry = function (role, prefer) {
    return entryOf(rolePaint(role, prefer));
  };
  // A corner token's radius: an alias to the shape token it maps onto
  const radiusOf = function (file, name) {
    const value = read(file, name);
    if (value === null || value.shape === undefined) {
      throw new Error('grid-material: ' + file + ' states no shape ' + name);
    }
    const key = options.shapeMap[value.shape.replace(/-/g, '_')];
    if (!key) {
      throw new Error('grid-material: no shape mapping for ' + value.shape);
    }
    return '{' + key + '}';
  };

  const out = {};

  // ~~~~~~~~~~~~~~~~~~~~ Button family ~~~~~~~~~~~~~~~~~~~~
  for (const kind of Object.keys(BUTTON_SOURCES)) {
    const source = BUTTON_SOURCES[kind];
    const file = source.file;
    const roles = source.roles;
    const put = function (part, state, value) {
      out['color.button_' + kind + '_' + part + state] = value;
    };
    const containerPaint = paintOf(file, 'container-color', roles);
    const container = entryOf(containerPaint);
    // A pressed control keeps its hover layer under the pressed one (md-ripple draws both)
    const layer = function (state) {
      return layered(containerPaint, (state === 'pressed' ? ['hover', 'pressed'] : [state]).map(function (name) {
        return [required(paintOf(file, name + '-state-layer-color', roles), file + ' ' + name + ' state layer'), numberToken(file, name + '-state-layer-opacity')];
      }));
    };
    put('container', '', container === null ? NONE : container);
    put('container', '_hover', layer('hover'));
    put('container', '_active', layer('pressed'));
    put('container', '_focus', container === null ? NONE : container);
    put('container', '_disabled', container === null ? NONE : translucent(file, 'disabled-container-color', 'disabled-container-opacity', roles));
    put('label', '', required(colorToken(file, 'label-text-color', roles), file + ' label'));
    put('label', '_hover', required(colorToken(file, 'hover-label-text-color', roles), file + ' hover label'));
    put('label', '_active', required(colorToken(file, 'pressed-label-text-color', roles), file + ' pressed label'));
    put('label', '_focus', required(colorToken(file, 'focus-label-text-color', roles), file + ' focus label'));
    put('label', '_disabled', translucent(file, 'disabled-label-text-color', 'disabled-label-text-opacity', roles));
    // Selection is the segmented button's selected recipe, Material's own answer for a selected action
    put('container', '_selected', required(colorToken('outlined-segmented-button', 'selected-container-color'), 'segmented selected container'));
    put('label', '_selected', required(colorToken('outlined-segmented-button', 'selected-label-text-color'), 'segmented selected label'));
    const outline = colorToken(file, 'outline-color', roles);
    put('border', '', outline === null ? NONE : outline);
    put('border', '_hover', outline === null ? NONE : colorToken(file, 'hover-outline-color', roles) || outline);
    put('border', '_active', outline === null ? NONE : colorToken(file, 'pressed-outline-color', roles) || outline);
    put('border', '_disabled', outline === null ? NONE : translucent(file, 'disabled-outline-color', 'disabled-outline-opacity', roles));
    out['shadow.button_' + kind] = elevation(file, 'container-elevation');
    out['shadow.button_' + kind + '_hover'] = elevation(file, 'hover-container-elevation');
    out['shadow.button_' + kind + '_active'] = elevation(file, 'pressed-container-elevation');
    out['shadow.button_' + kind + '_disabled'] = elevation(file, 'disabled-container-elevation');
  }
  // The focus ring: 3px, 2px outside the container, in secondary, keyboard focus only
  out['color.button_focus_ring'] = required(colorToken('focus-ring', 'color', null, 'color.focus'), 'focus ring color');
  out['color.button_focus_gap'] = NONE;
  out['control.button_focus_width'] = numberToken('focus-ring', 'width');
  out['control.button_focus_offset'] = numberToken('focus-ring', 'outward-offset');
  out['control.button_focus_gap_width'] = 0;
  out['control.button_ghost_padding_start'] = numberToken('text-button', 'leading-space');
  out['control.button_ghost_padding_end'] = numberToken('text-button', 'trailing-space');
  // `button/internal/_shared.scss`: "Buttons have a default min-width of 64px"
  out['control.button_min_width'] = 64;

  // ~~~~~~~~~~~~~~~~~~~~ Field family ~~~~~~~~~~~~~~~~~~~~
  const field = 'outlined-text-field';
  const fieldColor = function (name) {
    return required(colorToken(field, name), field + ' ' + name);
  };
  Object.assign(out, {
    'color.field_container': NONE,
    'color.field_container_hover': NONE,
    'color.field_container_disabled': NONE,
    'color.text_input_container_hover': NONE,
    'color.field_outline': fieldColor('outline-color'),
    'color.field_outline_hover': fieldColor('hover-outline-color'),
    'color.field_outline_focus': fieldColor('focus-outline-color'),
    'color.field_outline_disabled': translucent(field, 'disabled-outline-color', 'disabled-outline-opacity'),
    'color.field_outline_invalid': fieldColor('error-outline-color'),
    'color.field_outline_invalid_hover': fieldColor('error-hover-outline-color'),
    'color.field_outline_invalid_focus': fieldColor('error-focus-outline-color'),
    'color.select_outline_disabled': translucent('outlined-select', 'text-field-disabled-outline-color', 'text-field-disabled-outline-opacity'),
    'color.select_indicator_focus': required(colorToken('outlined-select', 'text-field-focus-trailing-icon-color'), 'select focus trailing icon'),
    'color.field_ring_invalid': NONE,
    'color.field_focus_ring': NONE,
    'color.field_label': fieldColor('label-text-color'),
    'color.field_label_hover': fieldColor('hover-label-text-color'),
    'color.field_label_focus': fieldColor('focus-label-text-color'),
    'color.field_label_disabled': translucent(field, 'disabled-label-text-color', 'disabled-label-text-opacity'),
    'color.field_label_invalid': fieldColor('error-label-text-color'),
    'color.field_label_invalid_hover': fieldColor('error-hover-label-text-color'),
    'color.field_label_invalid_focus': fieldColor('error-focus-label-text-color'),
    'color.field_value': fieldColor('input-text-color'),
    'color.field_value_disabled': translucent(field, 'disabled-input-text-color', 'disabled-input-text-opacity'),
    'color.field_placeholder': fieldColor('input-text-placeholder-color'),
    'color.field_placeholder_disabled': translucent(field, 'disabled-input-text-color', 'disabled-input-text-opacity'),
    'color.field_helper': fieldColor('supporting-text-color'),
    'color.field_helper_disabled': translucent(field, 'disabled-supporting-text-color', 'disabled-supporting-text-opacity'),
    'color.field_message_invalid': fieldColor('error-supporting-text-color'),
    'color.field_indicator': fieldColor('trailing-icon-color'),
    'color.field_indicator_hover': fieldColor('hover-trailing-icon-color'),
    'color.field_indicator_focus': fieldColor('focus-trailing-icon-color'),
    'color.field_indicator_disabled': translucent(field, 'disabled-trailing-icon-color', 'disabled-trailing-icon-opacity'),
    'color.field_indicator_invalid': fieldColor('error-trailing-icon-color'),
    'color.field_indicator_invalid_hover': fieldColor('error-hover-trailing-icon-color'),
    'color.field_indicator_invalid_focus': fieldColor('error-focus-trailing-icon-color'),
    'color.field_invalid_icon': fieldColor('error-trailing-icon-color'),
    'color.field_invalid_icon_hover': fieldColor('error-hover-trailing-icon-color'),
    'color.field_invalid_icon_focus': fieldColor('error-focus-trailing-icon-color'),
    'control.field_outline_width': numberToken(field, 'outline-width'),
    // `field/internal/_outlined-field.scss` draws the focused outline inside the resting one, so both widths show
    'control.field_outline_width_focus': numberToken(field, 'outline-width') + numberToken(field, 'focus-outline-width'),
    'control.field_invalid_ring_width': 0,
    'control.field_focus_width': 0,
    'control.field_focus_offset': 0,
    'control.field_padding_inline': numberToken(field, 'leading-space'),
    'control.field_icon_inset': numberToken(field, 'with-trailing-icon-trailing-space'),
    'control.field_icon_gap': numberToken(field, 'icon-input-space'),
    'control.field_message_inset': numberToken('outlined-field', 'supporting-text-leading-space'),
    'control.field_message_gap': numberToken('outlined-field', 'supporting-text-top-space'),
    'type.field_value': options.typeSet(required(read(field, 'input-text-font'), 'input text type').typescale),
    'type.field_label': options.typeSet(required(read(field, 'label-text-font'), 'label type').typescale),
    'type.field_helper': options.typeSet(required(read(field, 'supporting-text-font'), 'supporting text type').typescale)
  });

  // ~~~~~~~~~~~~~~~~~~~~ Selection family ~~~~~~~~~~~~~~~~~~~~
  const box = 'checkbox';
  const boxColor = function (name) {
    return required(colorToken(box, name), box + ' ' + name);
  };
  // A pressed box keeps its hover layer under the pressed one
  const boxLayer = function (selection, state) {
    const names = state === 'pressed' ? ['hover', 'pressed'] : [state];
    return layered(null, names.map(function (name) {
      const prefix = selection + '-' + name;
      return [required(paintOf(box, prefix + '-state-layer-color'), box + ' ' + prefix + ' state layer'), numberToken(box, prefix + '-state-layer-opacity')];
    }));
  };
  Object.assign(out, {
    'color.selection_outline': boxColor('unselected-outline-color'),
    'color.selection_outline_hover': boxColor('unselected-hover-outline-color'),
    'color.selection_outline_active': boxColor('unselected-pressed-outline-color'),
    'color.selection_outline_focus': boxColor('unselected-focus-outline-color'),
    'color.selection_outline_disabled': translucent(box, 'unselected-disabled-outline-color', 'unselected-disabled-container-opacity'),
    'color.selection_outline_invalid': boxColor('unselected-error-outline-color'),
    'color.selection_container': boxColor('selected-container-color'),
    'color.selection_container_hover': boxColor('selected-hover-container-color'),
    'color.selection_container_active': boxColor('selected-pressed-container-color'),
    'color.selection_container_focus': boxColor('selected-focus-container-color'),
    'color.selection_container_disabled': translucent(box, 'selected-disabled-container-color', 'selected-disabled-container-opacity'),
    'color.selection_container_invalid': boxColor('selected-error-container-color'),
    'color.selection_mark': boxColor('selected-icon-color'),
    'color.selection_mark_disabled': boxColor('selected-disabled-icon-color'),
    'color.selection_layer_hover': boxLayer('unselected', 'hover'),
    'color.selection_layer_active': boxLayer('unselected', 'pressed'),
    'color.selection_layer_selected_hover': boxLayer('selected', 'hover'),
    'color.selection_layer_selected_active': boxLayer('selected', 'pressed'),
    // Material's checkbox is the box alone: its label and messages are drawn in the template's own text roles
    'color.selection_label': '{color.text_primary}',
    'color.selection_label_disabled': translucent(field, 'disabled-label-text-color', 'disabled-label-text-opacity'),
    'color.selection_helper': '{color.text_helper}',
    'color.selection_message_invalid': '{color.text_error}',
    'color.selection_invalid_icon': '{color.support_error}',
    'color.selection_focus_ring': required(colorToken('focus-ring', 'color', null, 'color.focus'), 'focus ring color'),
    'control.selection_focus_width': numberToken('focus-ring', 'width'),
    // `checkbox/internal/_checkbox.scss`: the ring is a 44px circle centered on the box
    'control.selection_focus_offset': (44 - numberToken(box, 'container-size')) / 2,
    'control.selection_focus_radius': '{shape.radius_max}',
    'control.selection_layer_size': numberToken(box, 'state-layer-size')
  });

  // ~~~~~~~~~~~~~~~~~~~~ List family (the option list and the menu) ~~~~~~~~~
  const menuFile = 'menu';
  const menuSurface = required(paintOf(menuFile, 'container-color'), 'menu container');
  const listItem = 'list';
  const listLayer = function (container, states) {
    return layered(container, states.map(function (name) {
      return [required(paintOf(listItem, 'list-item-' + name + '-state-layer-color'), listItem + ' ' + name + ' state layer'), numberToken(listItem, 'list-item-' + name + '-state-layer-opacity')];
    }));
  };
  Object.assign(out, {
    'color.list_container': entryOf(menuSurface),
    'color.list_item_label': required(colorToken(listItem, 'list-item-label-text-color'), 'list item label'),
    'color.list_item_label_hover': required(colorToken(listItem, 'list-item-hover-label-text-color'), 'list item hover label'),
    'color.list_item_label_selected': required(colorToken(menuFile, 'list-item-selected-label-text-color'), 'menu selected label'),
    'color.list_item_label_disabled': translucent(listItem, 'list-item-disabled-label-text-color', 'list-item-disabled-label-text-opacity'),
    'color.list_item_container_hover': listLayer(menuSurface, ['hover']),
    // A pressed item keeps its hover layer under the pressed one (md-ripple draws both)
    'color.list_item_container_active': listLayer(menuSurface, ['hover', 'pressed']),
    'color.list_item_container_selected': required(colorToken(menuFile, 'list-item-selected-container-color'), 'menu selected container'),
    'color.list_item_container_selected_hover': layered(required(paintOf(menuFile, 'list-item-selected-container-color'), 'menu selected container'), [
      [required(paintOf(listItem, 'list-item-hover-state-layer-color'), 'list item hover state layer'), numberToken(listItem, 'list-item-hover-state-layer-opacity')]
    ]),
    'color.list_item_divider': required(colorToken('divider', 'color'), 'divider color'),
    'control.list_item_height': numberToken(listItem, 'list-item-one-line-container-height'),
    'control.list_item_padding_inline': numberToken(listItem, 'list-item-leading-space'),
    'control.list_item_divider_width': numberToken('divider', 'thickness'),
    // `menu/internal/menu-styles.cssresult.js`: `.item-padding` pads the list 8px a side
    'control.list_padding_block': 8,
    'control.list_radius': radiusOf(menuFile, 'container-shape'),
    'type.list_item': options.typeSet(required(read(listItem, 'list-item-label-text-font'), 'list item type').typescale),
    'shadow.list': elevation(menuFile, 'container-elevation'),
    // Menu members: `menuitem/menu-item-styles.cssresult.js` one-line height 56
    // and a divider 8px either side; Material states no danger item, so the
    // destructive answer takes the error roles over the menu's own surface
    'control.menu_padding_block': 8,
    'control.menu_item_height': 56,
    'control.menu_divider_width': numberToken('divider', 'thickness'),
    'control.menu_icon_size': numberToken(listItem, 'list-item-leading-icon-size'),
    'color.menu_item_danger_label': roleEntry('error'),
    'color.menu_item_danger_label_hover': roleEntry('error'),
    'color.menu_item_danger_container_hover': layered(menuSurface, [[rolePaint('error'), numberToken(listItem, 'list-item-hover-state-layer-opacity')]])
  });

  // ~~~~~~~~~~~~~~~~~~~~ Field member: the text area aliases its family ~~~~~
  Object.assign(out, {
    'color.text_area_container_hover': '{color.field_container_hover}',
    'color.text_area_outline_disabled': '{color.field_outline_disabled}',
    'type.text_area_value': '{type.field_value}'
  });

  // ~~~~~~~~~~~~~~~~~~~~ Selection member: the radio's checked ring ~~~~~~~~~
  const radioFile = 'radio-button';
  Object.assign(out, {
    'control.radio_size': numberToken(radioFile, 'icon-size'),
    // `radio/internal/_radio.scss`: a 2px ring with a 10px inner circle
    'control.radio_border': 2,
    'control.radio_dot_size': 10,
    // The focus ring wraps the 40px state layer around the 20px ring
    'control.radio_focus_offset': (numberToken(radioFile, 'state-layer-size') - numberToken(radioFile, 'icon-size')) / 2,
    'color.radio_outline_selected': required(colorToken(radioFile, 'selected-icon-color'), 'radio selected ring'),
    'color.radio_outline_selected_hover': required(colorToken(radioFile, 'selected-hover-icon-color'), 'radio selected ring hover'),
    'color.radio_outline_selected_active': required(colorToken(radioFile, 'selected-pressed-icon-color'), 'radio selected ring pressed'),
    'color.radio_outline_selected_focus': required(colorToken(radioFile, 'selected-focus-icon-color'), 'radio selected ring focus')
  });

  // ~~~~~~~~~~~~~~~~~~~~ Switch family ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  const switchFile = 'switch';
  const switchColor = function (name) {
    return required(colorToken(switchFile, name), switchFile + ' ' + name);
  };
  const switchLayer = function (selection, states) {
    return layered(null, states.map(function (name) {
      const prefix = selection + '-' + name;
      return [required(paintOf(switchFile, prefix + '-state-layer-color'), switchFile + ' ' + prefix + ' state layer'), numberToken(switchFile, prefix + '-state-layer-opacity')];
    }));
  };
  Object.assign(out, {
    'control.switch_track_width': numberToken(switchFile, 'track-width'),
    'control.switch_track_height': numberToken(switchFile, 'track-height'),
    'control.switch_outline_width': numberToken(switchFile, 'track-outline-width'),
    'control.switch_handle_size': numberToken(switchFile, 'unselected-handle-height'),
    'control.switch_handle_size_selected': numberToken(switchFile, 'selected-handle-height'),
    'control.switch_handle_size_pressed': numberToken(switchFile, 'pressed-handle-height'),
    'control.switch_focus_width': numberToken('focus-ring', 'width'),
    'control.switch_focus_offset': numberToken('focus-ring', 'outward-offset'),
    'color.switch_outline': switchColor('unselected-track-outline-color'),
    'color.switch_outline_hover': switchColor('unselected-hover-track-outline-color'),
    'color.switch_outline_focus': switchColor('unselected-focus-track-outline-color'),
    'color.switch_outline_active': switchColor('unselected-pressed-track-outline-color'),
    'color.switch_outline_disabled': translucent(switchFile, 'disabled-unselected-track-outline-color', 'disabled-track-opacity'),
    'color.switch_track': switchColor('unselected-track-color'),
    'color.switch_track_hover': switchColor('unselected-hover-track-color'),
    'color.switch_track_focus': switchColor('unselected-focus-track-color'),
    'color.switch_track_active': switchColor('unselected-pressed-track-color'),
    'color.switch_track_disabled': translucent(switchFile, 'disabled-unselected-track-color', 'disabled-track-opacity'),
    'color.switch_track_selected': switchColor('selected-track-color'),
    'color.switch_track_selected_hover': switchColor('selected-hover-track-color'),
    'color.switch_track_selected_focus': switchColor('selected-focus-track-color'),
    'color.switch_track_selected_active': switchColor('selected-pressed-track-color'),
    'color.switch_track_selected_disabled': translucent(switchFile, 'disabled-selected-track-color', 'disabled-track-opacity'),
    'color.switch_handle': switchColor('unselected-handle-color'),
    'color.switch_handle_hover': switchColor('unselected-hover-handle-color'),
    'color.switch_handle_focus': switchColor('unselected-focus-handle-color'),
    'color.switch_handle_active': switchColor('unselected-pressed-handle-color'),
    'color.switch_handle_disabled': translucent(switchFile, 'disabled-unselected-handle-color', 'disabled-unselected-handle-opacity'),
    'color.switch_handle_selected': switchColor('selected-handle-color'),
    'color.switch_handle_selected_hover': switchColor('selected-hover-handle-color'),
    'color.switch_handle_selected_focus': switchColor('selected-focus-handle-color'),
    'color.switch_handle_selected_active': switchColor('selected-pressed-handle-color'),
    'color.switch_handle_selected_disabled': translucent(switchFile, 'disabled-selected-handle-color', 'disabled-selected-handle-opacity'),
    'color.switch_mark': switchColor('selected-icon-color'),
    'color.switch_mark_disabled': translucent(switchFile, 'disabled-selected-icon-color', 'disabled-selected-icon-opacity'),
    'color.switch_layer_hover': switchLayer('unselected', ['hover']),
    'color.switch_layer_active': switchLayer('unselected', ['hover', 'pressed']),
    'color.switch_layer_selected_hover': switchLayer('selected', ['hover']),
    'color.switch_layer_selected_active': switchLayer('selected', ['hover', 'pressed']),
    'color.switch_focus_ring': required(colorToken('focus-ring', 'color', null, 'color.focus'), 'focus ring color')
  });

  // ~~~~~~~~~~~~~~~~~~~~ Tag family (the flat assist chip) ~~~~~~~~~~~~~~~~~~
  const chipFile = 'assist-chip';
  Object.assign(out, {
    // The flat chip draws no fill; its label, outline and icon carry it
    'color.tag_container': NONE,
    'color.tag_container_disabled': NONE,
    'color.tag_label': required(colorToken(chipFile, 'label-text-color'), 'chip label'),
    'color.tag_label_disabled': translucent(chipFile, 'disabled-label-text-color', 'disabled-label-text-opacity'),
    'color.tag_outline': required(colorToken(chipFile, 'flat-outline-color'), 'chip outline'),
    'color.tag_outline_disabled': translucent(chipFile, 'flat-disabled-outline-color', 'flat-disabled-outline-opacity'),
    'color.tag_icon': required(colorToken(chipFile, 'with-icon-icon-color'), 'chip icon'),
    'color.tag_icon_disabled': translucent(chipFile, 'with-icon-disabled-icon-color', 'with-icon-disabled-icon-opacity'),
    'control.tag_height': numberToken(chipFile, 'container-height'),
    'control.tag_radius': radiusOf(chipFile, 'container-shape'),
    'control.tag_padding_inline': numberToken(chipFile, 'leading-space'),
    'control.tag_padding_icon': numberToken(chipFile, 'with-leading-icon-leading-space'),
    'control.tag_outline_width': numberToken(chipFile, 'flat-outline-width'),
    'control.tag_icon_size': numberToken(chipFile, 'with-icon-icon-size'),
    'type.tag_label': options.typeSet(required(read(chipFile, 'label-text-font'), 'chip label type').typescale)
  });

  // ~~~~~~~~~~~~~~~~~~~~ Progress family (linear progress) ~~~~~~~~~~~~~~~~~~
  const progressFile = 'linear-progress-indicator';
  Object.assign(out, {
    'color.progress_track': required(colorToken(progressFile, 'track-color'), 'progress track'),
    'color.progress_indicator': required(colorToken(progressFile, 'active-indicator-color'), 'progress indicator'),
    // Material has no success or error progress; the status roles answer
    'color.progress_indicator_success': '{color.support_success}',
    'color.progress_indicator_error': '{color.support_error}',
    'control.progress_height': numberToken(progressFile, 'track-height'),
    'control.progress_radius': radiusOf(progressFile, 'track-shape')
  });

  // ~~~~~~~~~~~~~~~~~~~~ Tooltip family (plain tooltip tokens; no element) ~~
  const tooltipFile = 'plain-tooltip';
  const tooltipLabel = options.typeSet(required(read(tooltipFile, 'supporting-text-font'), 'tooltip type').typescale);
  Object.assign(out, {
    'color.tooltip_container': required(colorToken(tooltipFile, 'container-color'), 'tooltip container'),
    'color.tooltip_label': required(colorToken(tooltipFile, 'supporting-text-color'), 'tooltip label'),
    'type.tooltip_label': tooltipLabel,
    // The token file ships colour, shape and type only, and @material/web has
    // no tooltip element; the geometry is Google's own M3 implementation,
    // Compose Material 3 (androidx 00709418ece1) `Tooltip.kt`:
    // PlainTooltipVerticalPadding 4, PlainTooltipHorizontalPadding 8,
    // SpacingBetweenTooltipAndAnchor 4, plainTooltipMaxWidth 200, caretShape null
    'control.tooltip_padding_block': 4,
    'control.tooltip_padding_inline': 8,
    'control.tooltip_radius': radiusOf(tooltipFile, 'container-shape'),
    'control.tooltip_caret_width': 0,
    'control.tooltip_caret_height': 0,
    'control.tooltip_offset': 4,
    'control.tooltip_max_width': 200,
    // The plain tooltip is already the compact member
    'control.tooltip_compact_padding_block': 4,
    'control.tooltip_compact_caret_width': 0,
    'control.tooltip_compact_caret_height': 0,
    'control.tooltip_compact_offset': 4,
    'type.tooltip_compact_label': tooltipLabel
  });

  // ~~~~~~~~~~~~~~~~~~~~ Tab family (primary navigation tab) ~~~~~~~~~~~~~~~~
  const tabFile = 'primary-navigation-tab';
  const tabLabel = options.typeSet(required(read(tabFile, 'with-label-text-label-text-font'), 'tab label type').typescale);
  const tabLayer = function (selection, states) {
    return layered(null, states.map(function (name) {
      const prefix = selection + '-' + name;
      return [required(paintOf(tabFile, prefix + '-state-layer-color'), tabFile + ' ' + prefix + ' state layer'), numberToken(tabFile, prefix + '-state-layer-opacity')];
    }));
  };
  Object.assign(out, {
    'color.tab_container': required(colorToken(tabFile, 'container-color'), 'tab container'),
    // `tabs/internal`: a divider under the bar
    'color.tab_divider': required(colorToken('divider', 'color'), 'divider color'),
    'color.tab_track': NONE,
    'color.tab_track_hover': NONE,
    'color.tab_track_disabled': NONE,
    'color.tab_indicator': required(colorToken(tabFile, 'active-indicator-color'), 'tab indicator'),
    'color.tab_label': required(colorToken(tabFile, 'with-label-text-inactive-label-text-color'), 'tab label'),
    'color.tab_label_hover': required(colorToken(tabFile, 'with-label-text-inactive-hover-label-text-color'), 'tab label hover'),
    'color.tab_label_selected': required(colorToken(tabFile, 'with-label-text-active-label-text-color'), 'tab label selected'),
    'color.tab_label_selected_hover': required(colorToken(tabFile, 'with-label-text-active-hover-label-text-color'), 'tab label selected hover'),
    // No disabled state in the tab tokens; the field's disabled answer applies
    'color.tab_label_disabled': translucent('outlined-text-field', 'disabled-label-text-color', 'disabled-label-text-opacity'),
    'color.tab_layer_hover': tabLayer('inactive', ['hover']),
    'color.tab_layer_active': tabLayer('inactive', ['hover', 'pressed']),
    'color.tab_layer_selected_hover': tabLayer('active', ['hover']),
    'color.tab_layer_selected_active': tabLayer('active', ['hover', 'pressed']),
    'color.tab_focus_ring': required(colorToken('focus-ring', 'color', null, 'color.focus'), 'focus ring color'),
    // Material has no contained kind; the nearest surface answer is a raised
    // container whose selected tab returns to the page
    'color.tab_contained_container': roleEntry('surface-container'),
    'color.tab_contained_container_hover': layered(required(rolePaint('surface-container'), 'surface container'), [
      [required(paintOf(tabFile, 'inactive-hover-state-layer-color'), 'tab inactive hover layer'), numberToken(tabFile, 'inactive-hover-state-layer-opacity')]
    ]),
    'color.tab_contained_container_selected': required(colorToken(tabFile, 'container-color'), 'tab container'),
    'color.tab_contained_separator': required(colorToken('divider', 'color'), 'divider color'),
    'control.tab_height': numberToken(tabFile, 'container-height'),
    // `tabs/internal/_primary-tab.scss`: 16px inline padding
    'control.tab_padding_inline': 16,
    'control.tab_divider_width': numberToken('divider', 'thickness'),
    'control.tab_track_width': 0,
    'control.tab_indicator_width': numberToken(tabFile, 'active-indicator-height'),
    // `active-indicator-shape` is the tuple (3px 3px 0 0): the top radius
    'control.tab_indicator_radius': 3,
    'control.tab_focus_width': numberToken('focus-ring', 'width'),
    'control.tab_focus_offset': numberToken('focus-ring', 'outward-offset'),
    'type.tab_label': tabLabel,
    'type.tab_label_selected': tabLabel
  });

  // ~~~~~~~~~~~~~~~~~~~~ Dialog family (md-dialog) ~~~~~~~~~~~~~~~~~~~~~~~~~~
  const dialogFile = 'dialog';
  Object.assign(out, {
    // `dialog/internal/_dialog.scss`: the scrim is the scrim role at 32%
    'color.dialog_scrim': atOpacity(rolePaint('scrim'), 0.32),
    'color.dialog_container': required(colorToken(dialogFile, 'container-color'), 'dialog container'),
    'color.dialog_border': NONE,
    'color.dialog_heading': required(colorToken(dialogFile, 'headline-color'), 'dialog heading'),
    'color.dialog_body': required(colorToken(dialogFile, 'supporting-text-color'), 'dialog body'),
    'control.dialog_border_width': 0,
    'control.dialog_radius': radiusOf(dialogFile, 'container-shape'),
    // `dialog/internal/_dialog.scss:40-42`: 280 to min(560px, 100% - 48px) wide
    'control.dialog_min_width': 280,
    'control.dialog_max_width': 560,
    'control.dialog_padding_inline': 24,
    'control.dialog_padding_top': 24,
    'control.dialog_header_gap': 8,
    // `_dialog.scss:190-193`: the content pads 24 on every side. With actions
    // the content's bottom drops to 8 and the actions row pads 16 on top
    // (`:216-222`), the same 24 between text and buttons, so the body keeps 24
    // and the actions row pads its sides and bottom only
    'control.dialog_body_padding_top': 24,
    'control.dialog_body_padding_bottom': 24,
    // The actions row is content height; text buttons trail with an 8px gap
    'control.dialog_actions_height': 0,
    'control.dialog_actions_gap': 8,
    'control.dialog_actions_padding': 24,
    'control.dialog_close_icon_size': numberToken(dialogFile, 'with-icon-icon-size'),
    'type.dialog_heading': options.typeSet(required(read(dialogFile, 'headline-font'), 'dialog heading type').typescale),
    'type.dialog_body': options.typeSet(required(read(dialogFile, 'supporting-text-font'), 'dialog body type').typescale),
    'shadow.dialog': elevation(dialogFile, 'container-elevation')
  });

  // ~~~~~~~~~~~~~~~~~~~~ Notification family (snackbar tokens; no element) ~~
  const snackbarFile = 'snackbar';
  const snackbarText = options.typeSet(required(read(snackbarFile, 'supporting-text-font'), 'snackbar type').typescale);
  Object.assign(out, {
    'color.notification_container': required(colorToken(snackbarFile, 'container-color'), 'snackbar container'),
    'color.notification_text': required(colorToken(snackbarFile, 'supporting-text-color'), 'snackbar text'),
    'color.notification_close_icon': required(colorToken(snackbarFile, 'icon-color'), 'snackbar close icon'),
    'color.notification_action': required(colorToken(snackbarFile, 'action-label-text-color'), 'snackbar action'),
    // Material draws no status marker; the inverse support roles answer
    'color.notification_marker_error': '{color.support_error_inverse}',
    'color.notification_marker_success': '{color.support_success_inverse}',
    'color.notification_marker_info': '{color.support_info_inverse}',
    'color.notification_marker_warning': '{color.support_warning_inverse}',
    // No snackbar element ships; Compose Material 3 (androidx 00709418ece1)
    // `Snackbar.kt` fills the width up to ContainerMaxWidth 600. No marker
    'control.notification_width': 600,
    'control.notification_radius': radiusOf(snackbarFile, 'container-shape'),
    'control.notification_marker_width': 0,
    'control.notification_icon_size': numberToken(snackbarFile, 'icon-size'),
    'type.notification_title': snackbarText,
    'type.notification_body': snackbarText,
    'shadow.notification': elevation(snackbarFile, 'container-elevation')
  });

  // ~~~~~~~~~~~~~~~~~~~~ Icon button members ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  const iconButtonFile = 'icon-button';
  const outlinedIconButtonFile = 'outlined-icon-button';
  const iconInk = function (file) {
    return {
      '': required(colorToken(file, 'unselected-icon-color'), file + ' icon'),
      '_hover': required(colorToken(file, 'unselected-hover-icon-color'), file + ' hover icon'),
      '_active': required(colorToken(file, 'unselected-pressed-icon-color'), file + ' pressed icon'),
      '_focus': required(colorToken(file, 'unselected-focus-icon-color'), file + ' focus icon'),
      '_disabled': translucent(file, 'disabled-icon-color', 'disabled-icon-opacity'),
      '_selected': required(colorToken(file, 'selected-icon-color'), file + ' selected icon')
    };
  };
  for (const [member, file] of [['icon_button_ghost', iconButtonFile], ['icon_button_tertiary', outlinedIconButtonFile]]) {
    const ink = iconInk(file);
    for (const state of Object.keys(ink)) {
      out['color.' + member + '_icon' + state] = ink[state];
    }
  }
  out['control.icon_button_size'] = numberToken(iconButtonFile, 'state-layer-width');
  out['control.icon_button_icon_size'] = numberToken(iconButtonFile, 'icon-size');

  // No elevation
  out['shadow.level_00'] = { shadow: true, layers: [{ x: 0, y: 0, blur: 0, spread: 0, color: NONE }] };

  // Every cell answered, nothing beyond the grid
  const cells = Object.keys(options.grid).flatMap(function (group) {
    return options.grid[group].map(function (cell) {
      return group + '.' + cell;
    });
  });
  const missing = cells.filter(function (name) {
    return out[name] === undefined;
  });
  const extra = Object.keys(out).filter(function (name) {
    return !cells.includes(name);
  });
  if (missing.length > 0 || extra.length > 0) {
    throw new Error('grid-material: missing ' + JSON.stringify(missing) + ', not in the grid ' + JSON.stringify(extra));
  }

  return out;

}
