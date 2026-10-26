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
    // Selection: the standard button's selected cells come from the outlined
    // segmented recipe (`_md-comp-outlined-segmented-button.scss`) - except
    // tonal, whose rest face IS the segmented selected face (both draw
    // secondary-container); the tonal's selected face takes the secondary
    // roles instead. The icon button's own toggle recipe lives on the
    // icon_button members below
    put('container', '_selected', kind === 'tonal'
      ? roleEntry('secondary')
      : required(colorToken('outlined-segmented-button', 'selected-container-color'), 'selected container'));
    put('label', '_selected', kind === 'tonal'
      ? roleEntry('on-secondary')
      : required(colorToken('outlined-segmented-button', 'selected-label-text-color'), 'segmented selected label'));
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
    // v8 review amendment: the pinned rendered fields use normal (zero)
    // tracking, not their generic typescale's - a fresh copy carries the
    // override so the general roles keep theirs
    'type.field_value': Object.assign({}, options.typeSet(required(read(field, 'input-text-font'), 'input text type').typescale), { letter_spacing: 0 }),
    'type.field_label': Object.assign({}, options.typeSet(required(read(field, 'label-text-font'), 'label type').typescale), { letter_spacing: 0 }),
    'type.field_helper': Object.assign({}, options.typeSet(required(read(field, 'supporting-text-font'), 'supporting text type').typescale), { letter_spacing: 0 })
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
    // `menu/internal/_menu.scss:44`: the menu floors at `min-width: 112px`,
    // icons or not
    'control.menu_min_width': 112,
    'control.menu_icon_min_width': 112,
    // `labs/item/internal/_item.scss:39`: a 16px gap between item children
    'control.menu_item_gap': 16,
    // `_md-comp-list.scss`: the leading icon takes its own color slots, the
    // disabled one at the disabled opacity
    'color.menu_item_icon': required(colorToken(listItem, 'list-item-leading-icon-color'), 'menu item icon'),
    'color.menu_item_icon_hover': required(colorToken(listItem, 'list-item-hover-leading-icon-icon-color'), 'menu item hover icon'),
    'color.menu_item_icon_disabled': translucent(listItem, 'list-item-disabled-leading-icon-color', 'list-item-disabled-leading-icon-opacity'),
    // `_md-comp-list.scss`: the trailing supporting text takes its own
    // type and color slots; the upstream list item states no hover colour
    // for it (the state layer carries hover)
    'type.menu_item_shortcut': options.typeSet(required(read(listItem, 'list-item-trailing-supporting-text-font'), 'menu shortcut type').typescale),
    'color.menu_item_shortcut': required(colorToken(listItem, 'list-item-trailing-supporting-text-color'), 'menu shortcut'),
    'color.menu_item_shortcut_hover': required(colorToken(listItem, 'list-item-trailing-supporting-text-color'), 'menu shortcut'),
    'color.menu_divider': required(colorToken('divider', 'color'), 'divider color'),
    'color.menu_item_danger_label': roleEntry('error'),
    'color.menu_item_danger_label_hover': roleEntry('error'),
    'color.menu_item_danger_container_hover': layered(menuSurface, [[rolePaint('error'), numberToken(listItem, 'list-item-hover-state-layer-opacity')]])
  });

  // ~~~~~~~~~~~~~~~~~~~~ Field member: the text area aliases its family ~~~~~
  Object.assign(out, {
    'color.text_area_container_hover': '{color.field_container_hover}',
    'color.text_area_outline_disabled': '{color.field_outline_disabled}',
    'type.text_area_value': '{type.field_value}',
    // metrics amendment S: the primary's skeleton block, fixed at 100
    // (text-area/_text-area.scss:229-238)
    'control.text_area_skeleton_height': 100
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
    // v7 batch 6 B3 amendment: the untyped interactive tag's hover state
    // layer (the flat assist chip hovers on-surface at the state opacity)
    'color.tag_container_hover': translucent(chipFile, 'hover-state-layer-color', 'hover-state-layer-opacity'),
    'color.tag_container_disabled': NONE,
    'color.tag_label': required(colorToken(chipFile, 'label-text-color'), 'chip label'),
    'color.tag_label_disabled': translucent(chipFile, 'disabled-label-text-color', 'disabled-label-text-opacity'),
    'color.tag_outline': required(colorToken(chipFile, 'flat-outline-color'), 'chip outline'),
    'color.tag_outline_disabled': translucent(chipFile, 'flat-disabled-outline-color', 'flat-disabled-outline-opacity'),
    'color.tag_icon': required(colorToken(chipFile, 'with-icon-icon-color'), 'chip icon'),
    'color.tag_icon_disabled': translucent(chipFile, 'with-icon-disabled-icon-color', 'with-icon-disabled-icon-opacity'),
    'control.tag_height': numberToken(chipFile, 'container-height'),
    // v7 milestone 3 amendment: the second system has no small chip, so
    // 24 - the smallest box that holds the 20px label line with a block
    // inset - not the spec sum 18 the label overflows
    'control.tag_height_small': 24,
    'control.tag_radius': radiusOf(chipFile, 'container-shape'),
    'control.tag_padding_inline': numberToken(chipFile, 'leading-space'),
    'control.tag_padding_icon': numberToken(chipFile, 'with-leading-icon-leading-space'),
    'control.tag_outline_width': numberToken(chipFile, 'flat-outline-width'),
    'control.tag_icon_size': numberToken(chipFile, 'with-icon-icon-size'),
    // v7 batch 6 B3 round 3 amendment: the chips' token file names
    // label-text-tracking, but @material/web 2.5.0 chips/internal/*.scss
    // never applies a letter spacing - the rendered label computes
    // letter-spacing: normal. Font, size, line height and weight stay
    // what the chip file gives; the tracking is overridden to 0
    'type.tag_label': Object.assign({}, options.typeSet(required(read(chipFile, 'label-text-font'), 'chip label type').typescale), { letter_spacing: 0 })
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
    // `tabs/internal`: the bar paints nothing of its own; each tab's container
    // carries the fill and the bar's divider is not drawn in the primary kind
    'color.tab_container': NONE,
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
    // Material has no contained kind; the nearest answer is the bar's own
    // measure and a plain block inset
    'control.tab_contained_height': numberToken(tabFile, 'container-height'),
    'control.tab_contained_padding_block': 8,
    // `tabs/internal/_primary-tab.scss`: 16px inline padding, no reserved
    // space between items
    'control.tab_padding_inline': 16,
    'control.tab_item_gap': 0,
    // `tabs/internal/_tabs.scss`: md-tabs draws a full-width md-divider under
    // the bar (1px, probe evidence/0160/m2/probes/p1-tabs.json)
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
    // The upstream dialog floors its height at `min-height: 140px`
    'control.dialog_min_height': 140,
    // The headline block sits flush against the content (the upstream's
    // spacing is inside the slotted children)
    'control.dialog_header_space': 0,
    // `_dialog.scss:190-193`: the content pads 24 on every side. With actions
    // the content's bottom drops to 8 and the actions row pads 16 on top
    // (`:216-222`), the same 24 between text and buttons, so the body keeps 24
    // and the actions row pads its sides and bottom only
    'control.dialog_body_padding_top': 24,
    'control.dialog_body_padding_bottom': 24,
    // The actions content height is 0: the row's room comes from its padding
    // and the buttons' own seats (upstream zone 16 + 40 + 24 = 80; the 100px
    // measured on the reference page was a page artifact,
    // evidence/0160/m2/probes/p2-p3-modal.json)
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
  // Selected toggle states come from each kind's icon-button file:
  // filled/tonal draw `selected-container-color` with `toggle-selected-icon-color`,
  // outlined `selected-container-color` / `selected-icon-color`, and the plain
  // icon button has no container - its `selected-icon-color` already sits in
  // the ink map above
  out['color.icon_button_primary_container_selected'] = required(colorToken('filled-icon-button', 'selected-container-color'), 'filled icon button selected container');
  out['color.icon_button_secondary_container_selected'] = required(colorToken('filled-tonal-icon-button', 'selected-container-color'), 'tonal icon button selected container');
  out['color.icon_button_tertiary_container_selected'] = required(colorToken('outlined-icon-button', 'selected-container-color'), 'outlined icon button selected container');
  out['color.icon_button_ghost_container_selected'] = NONE;
  out['color.icon_button_primary_icon_selected'] = required(colorToken('filled-icon-button', 'toggle-selected-icon-color'), 'filled icon button selected icon');
  out['color.icon_button_secondary_icon_selected'] = required(colorToken('filled-tonal-icon-button', 'toggle-selected-icon-color'), 'tonal icon button selected icon');
  // The toggle's unselected face: filled and tonal draw their
  // `unselected-container-color` and `toggle-unselected-icon-color`; the
  // outlined and plain kinds keep a transparent container and their
  // unselected icon color
  out['color.icon_button_primary_container_unselected'] = required(colorToken('filled-icon-button', 'unselected-container-color'), 'filled icon button unselected container');
  out['color.icon_button_secondary_container_unselected'] = required(colorToken('filled-tonal-icon-button', 'unselected-container-color'), 'tonal icon button unselected container');
  out['color.icon_button_tertiary_container_unselected'] = NONE;
  out['color.icon_button_ghost_container_unselected'] = NONE;
  out['color.icon_button_primary_icon_unselected'] = required(colorToken('filled-icon-button', 'toggle-unselected-icon-color'), 'filled icon button unselected icon');
  out['color.icon_button_secondary_icon_unselected'] = required(colorToken('filled-tonal-icon-button', 'toggle-unselected-icon-color'), 'tonal icon button unselected icon');
  // The pinned outlined-icon-button and icon-button files carry no
  // `icon-color` key - every icon token is toggle-qualified, so the
  // unselected face reads `unselected-icon-color`
  out['color.icon_button_tertiary_icon_unselected'] = required(colorToken(outlinedIconButtonFile, 'unselected-icon-color'), 'outlined icon button unselected icon');
  out['color.icon_button_ghost_icon_unselected'] = required(colorToken(iconButtonFile, 'unselected-icon-color'), 'icon button unselected icon');
  out['control.icon_button_size'] = numberToken(iconButtonFile, 'state-layer-width');
  out['control.icon_button_icon_size'] = numberToken(iconButtonFile, 'icon-size');

  // ~~~~~~~~~~~~~~~~~~~~ v7: the button set, skeleton and combo members ~~~~
  // Material draws no button set, split button or button skeleton; the
  // request's decisions answer, the set gap and fluid ghost inset reading the
  // template's own cells
  Object.assign(out, {
    'control.button_set_item_max_width': 196,
    'control.button_set_gap': '{control.dialog_actions_gap}',
    'color.button_set_separator': NONE,
    'color.button_set_separator_disabled': NONE,
    'color.button_set_separator_stacked_disabled': NONE,
    'control.button_set_fluid_min_width': 176,
    'control.button_set_fluid_max_width': 232,
    'control.button_set_fluid_ghost_padding_start': '{control.button_padding_start}',
    'control.button_skeleton_width': 150,
    'control.combo_button_min_width': 160,
    'control.combo_button_max_width': 240
  });

  // ~~~~~~~~~~~~~~~~~~~~ v7: the divider family (md-divider) ~~~~~~~~~~~~~~~
  Object.assign(out, {
    'color.divider': required(colorToken('divider', 'color'), 'divider color'),
    'control.divider_width': numberToken('divider', 'thickness'),
    // `divider/internal/_divider.scss`: 16px inset at each end inside a list
    'control.divider_inset': 16
  });

  // ~~~~~~~~~~~~~~~~~~~~ v7: the link family ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  // Material has no link element; a link is text in primary under the same
  // focus ring every control draws
  Object.assign(out, {
    'color.link_label': roleEntry('primary'),
    'color.link_label_hover': roleEntry('primary'),
    'color.link_label_active': roleEntry('primary'),
    'color.link_label_visited': roleEntry('primary'),
    'color.link_label_disabled': atOpacity(rolePaint('on-surface'), 0.38),
    'color.link_focus_ring': required(colorToken('focus-ring', 'color', null, 'color.focus'), 'focus ring color'),
    'control.link_focus_width': numberToken('focus-ring', 'width'),
    'control.link_icon_gap': 8,
    'control.link_icon_size': 18,
    'control.link_icon_size_large': 20,
    'type.link_label': options.typeSet('label-large'),
    'type.link_label_small': options.typeSet('label-medium'),
    'type.link_label_large': options.typeSet('body-large')
  });

  // ~~~~~~~~~~~~~~~~~~~~ v7: the loading family (md-circular-progress) ~~~~~
  // The circular indicator is a 48px ring with a 4px stroke (24px and 3px
  // small); it spins every 1568ms while its arc cycles every 1333ms
  // (`progress/internal/_circular-progress.scss`), the request's decision
  Object.assign(out, {
    'color.loading_indicator': roleEntry('primary'),
    'color.loading_track': NONE,
    'color.loading_scrim': '{color.dialog_scrim}',
    'control.loading_size': 48,
    'control.loading_size_small': 24,
    'control.loading_stroke_width': 4,
    'control.loading_stroke_width_small': 3,
    'control.loading_arc': 0.81,
    'control.loading_arc_small': 0.48,
    'motion.loading_rotation': 1568,
    'motion.loading_arc_cycle': 1333,
    // v7 batch 6 B3 round 3 amendment: $indeterminate-easing
    // (@material/web progress/internal/_circular-progress.scss:49)
    'motion.loading_arc_easing': [0.4, 0, 0.2, 1]
  });

  // ~~~~~~~~~~~~~~~~~~~~ v7: the inline loading and saving members ~~~~~~~~~
  Object.assign(out, {
    'type.inline_loading_label': options.typeSet('body-medium'),
    'color.inline_loading_label': roleEntry('on-surface-variant'),
    'control.inline_loading_gap': 8,
    'color.inline_loading_success': roleEntry('primary'),
    'color.inline_loading_error': roleEntry('error'),
    'type.saving_label': options.typeSet('body-medium'),
    'color.saving_error_icon': roleEntry('error'),
    'control.saving_icon_gap': 16
  });

  // ~~~~~~~~~~~~~~~~~~~~ v7: the progress step family ~~~~~~~~~~~~~~~~~~~~~~
  // Material has no stepped progress; the request's decisions answer, the
  // connector drawn at the linear track's height
  Object.assign(out, {
    'color.progress_step_icon': roleEntry('primary'),
    'color.progress_step_icon_incomplete': roleEntry('on-surface-variant'),
    'color.progress_step_icon_disabled': atOpacity(rolePaint('on-surface'), 0.38),
    'color.progress_step_icon_invalid': roleEntry('error'),
    'color.progress_step_line': roleEntry('surface-container-highest'),
    'color.progress_step_line_complete': roleEntry('primary'),
    'color.progress_step_label': roleEntry('on-surface'),
    'color.progress_step_label_hover': roleEntry('primary'),
    'color.progress_step_label_focus': roleEntry('primary'),
    'color.progress_step_label_disabled': atOpacity(rolePaint('on-surface'), 0.38),
    'color.progress_step_secondary_label': roleEntry('on-surface-variant'),
    'control.progress_step_width': 128,
    'control.progress_step_min_width': 112,
    'control.progress_step_vertical_min_height': 58,
    'control.progress_step_icon_gap': 8,
    'control.progress_step_icon_top': 10,
    'control.progress_step_line_width': '{control.progress_height}',
    'control.progress_step_label_max_width': 88,
    'control.progress_step_label_max_width_vertical': 160,
    'control.progress_step_label_gap': 8,
    'control.progress_step_skeleton_label_width': 40,
    'control.progress_step_skeleton_label_height': 14,
    // v7 batch 6 amendment: the pressable label takes the platform's own
    // focus ring width; the vertical connector stays as thick as the
    // horizontal line
    'control.progress_step_focus_width': numberToken('focus-ring', 'width'),
    'control.progress_step_vertical_icon_top': 1,
    'control.progress_step_vertical_line_width': '{control.progress_step_line_width}',
    'control.progress_step_secondary_label_top': 28,
    'control.progress_step_secondary_label_start': 24,
    'type.progress_step_label': options.typeSet('label-large'),
    'type.progress_step_secondary_label': options.typeSet('body-small')
  });

  // ~~~~~~~~~~~~~~~~~~~~ v7: the skeleton family ~~~~~~~~~~~~~~~~~~~~~~~~~~~
  // Material has no skeleton element; the request's decisions answer, the
  // shimmer an on-surface sweep at the hover opacity
  Object.assign(out, {
    'color.skeleton_container': roleEntry('surface-container-highest'),
    'color.skeleton_shimmer': atOpacity(rolePaint('on-surface'), 0.08),
    'control.skeleton_radius': 4,
    'control.skeleton_placeholder_size': 100,
    'control.skeleton_text_height': 16,
    'control.skeleton_text_gap': 8,
    'control.skeleton_heading_height': 24,
    'motion.skeleton_cycle': 3000
  });

  // ~~~~~~~~~~~~~~~~~~~~ v7: the tag members ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  // The dismissible tag's close is the input chip's trailing icon, inset from
  // the edge; the operational and selectable tags are the assist and filter
  // chips, the selected filter chip filling secondary-container
  const inputChip = 'input-chip';
  const filterChip = 'filter-chip';
  Object.assign(out, {
    'control.tag_skeleton_width': 60,
    'control.tag_close_gap': numberToken(inputChip, 'icon-label-space'),
    'control.tag_close_icon_size': numberToken(inputChip, 'with-trailing-icon-trailing-icon-size'),
    'control.tag_close_inset': numberToken(inputChip, 'with-trailing-icon-trailing-space'),
    // v8 review amendment: chips/internal/_trailing-icon.scss pins the close's
    // md-focus-ring to the ripple circle with inset: unset - the measured offset
    // is 0, not the generic tag ring's 2
    'control.tag_close_focus_offset': 0,
    'color.tag_close_container_hover': translucent(inputChip, 'unselected-hover-state-layer-color', 'unselected-hover-state-layer-opacity'),
    'color.tag_close_focus_ring': required(colorToken('focus-ring', 'color', null, 'color.focus'), 'focus ring color'),
    // v8 review amendment: the dismissible tag's close is the input chip's
    // trailing action - it presses the unselected role, not the assist chip's
    'color.tag_close_layer_active': translucent(inputChip, 'unselected-pressed-state-layer-color', 'unselected-pressed-state-layer-opacity'),
    // v7 batch 6 B3 round 2 amendment: the untyped dismissible tag's label
    // (the input chip's label role differs from the flat chip's)
    'color.tag_dismissible_label': required(colorToken(inputChip, 'unselected-label-text-color'), 'input chip label'),
    'control.tag_interactive_outline_width': numberToken('assist-chip', 'flat-outline-width'),
    // v7 milestone 3 amendment: the interactive small tag is the plain
    // small tag - under the `inset` outline nothing grows the box, so it
    // aliases control.tag_height_small
    'control.tag_interactive_height_small': '{control.tag_height_small}',
    'color.tag_interactive_layer_active': translucent('assist-chip', 'pressed-state-layer-color', 'pressed-state-layer-opacity'),
    'color.tag_interactive_outline_disabled': translucent(filterChip, 'flat-disabled-unselected-outline-color', 'flat-disabled-unselected-outline-opacity'),
    // v7 batch 6 B3 round 2 amendment: the untyped interactive tag's outline
    // (the flat assist chip's outline)
    'color.tag_interactive_outline': required(colorToken('assist-chip', 'flat-outline-color'), 'assist chip flat outline'),
    'color.tag_focus_ring': required(colorToken('focus-ring', 'color', null, 'color.focus'), 'focus ring color'),
    'control.tag_focus_width': numberToken('focus-ring', 'width'),
    'control.tag_focus_offset': numberToken('focus-ring', 'outward-offset'),
    // The flat filter chip draws no unselected fill; the selected face fills
    // secondary-container and its hover layers on-secondary-container over it
    'color.tag_selectable_container': NONE,
    'color.tag_selectable_container_hover': translucent(filterChip, 'unselected-hover-state-layer-color', 'unselected-hover-state-layer-opacity'),
    'color.tag_selectable_container_selected': required(colorToken(filterChip, 'flat-selected-container-color'), 'filter chip selected container'),
    'color.tag_selectable_container_selected_hover': layered(
      required(paintOf(filterChip, 'flat-selected-container-color'), 'filter chip selected container'),
      [[required(paintOf(filterChip, 'selected-hover-state-layer-color'), 'filter chip selected hover layer'), numberToken(filterChip, 'selected-hover-state-layer-opacity')]]
    ),
    'color.tag_selectable_label': required(colorToken(filterChip, 'unselected-label-text-color'), 'filter chip label'),
    'color.tag_selectable_label_selected': required(colorToken(filterChip, 'selected-label-text-color'), 'filter chip selected label'),
    // v7 batch 6 B3 round 2 amendment: the filter chip's disabled selected
    // pair - its own container token, and the selected label color at the
    // disabled label opacity
    'color.tag_selectable_container_selected_disabled': translucent(filterChip, 'flat-disabled-selected-container-color', 'flat-disabled-selected-container-opacity'),
    'color.tag_selectable_label_selected_disabled': atOpacity(
      required(paintOf(filterChip, 'selected-label-text-color'), 'filter chip selected label'),
      numberToken(filterChip, 'disabled-label-text-opacity')
    ),
    'color.tag_selectable_outline': required(colorToken(filterChip, 'flat-unselected-outline-color'), 'filter chip outline'),
    'control.tag_selectable_outline_width_selected': numberToken(filterChip, 'flat-selected-outline-width'),
    // v7 batch 6 amendment: the filter chip's pressed layer (the
    // selected chip's state layer answers on-surface-variant at 0.12)
    'color.tag_selectable_layer_active': translucent(filterChip, 'selected-pressed-state-layer-color', 'selected-pressed-state-layer-opacity'),
    // v8 review amendment: the unselected filter chip presses its own role
    // (on-secondary-container), different from the selected one
    // (_md-comp-filter-chip.scss:130-159)
    'color.tag_selectable_layer_unselected_active': translucent(filterChip, 'unselected-pressed-state-layer-color', 'unselected-pressed-state-layer-opacity')
  });

  // ~~~~~~~~~~~~~~~~~~~~ v8: the field action (census PasswordInput) ~~~~~~~
  // Material draws the in-frame action as an icon button: a 24px glyph
  // `with-trailing-icon-trailing-space` 12 from the end, a 40px state-layer
  // circle centred on it, the text ending `icon-input-space` 16 before the
  // glyph (`_md-comp-outlined-text-field.scss`, `_md-comp-icon-button.scss`)
  Object.assign(out, {
    'control.field_action_inset': numberToken(field, 'with-trailing-icon-trailing-space'),
    'control.field_action_size': numberToken(iconButtonFile, 'state-layer-width'),
    'control.field_action_gap': numberToken(field, 'icon-input-space'),
    'color.field_leading_icon': required(colorToken(field, 'leading-icon-color'), 'field leading icon'),
    'color.field_action_container_hover': translucent(iconButtonFile, 'unselected-hover-state-layer-color', 'unselected-hover-state-layer-opacity'),
    'color.field_action_container_active': translucent(iconButtonFile, 'unselected-pressed-state-layer-color', 'unselected-pressed-state-layer-opacity'),
    // census PasswordInput: material and default alias the family cells
    'color.password_toggle_container_hover': '{color.field_action_container_hover}',
    'color.password_toggle_container_active': '{color.field_action_container_active}',
    // census TextInputSkeleton S: the label block 75 x 14 (no skeleton element)
    'control.field_skeleton_label_width': 75,
    'control.field_skeleton_label_height': 14,
    // census TimePicker S: body-large digits need a 112 field; 140 while
    // invalid (the width plus the 24px error glyph and its 4px gap)
    'type.time_picker_value': options.typeSet('body-large'),
    'control.time_picker_input_width': 112,
    'control.time_picker_input_width_invalid': 140,
    'control.time_picker_select_gap': 8,
    // census NumberInput S: the stepper dividers in outline-variant
    'color.number_input_divider': roleEntry('outline-variant'),
    'control.number_input_divider_height': 16,
    // v8 review amendment: the second system's stepper presses its own
    // state layer (icon-button unselected pressed)
    'color.number_input_action_container_active': '{color.field_action_container_active}',
    // rework amendment S: the primary's field width floor, already
    // authored in the explicit default mapping (NumberInput,
    // number-input/_number-input.scss:47-72)
    'control.number_input_min_width': 150,
    // census Search S: the disabled close and magnifier on-surface at 0.38
    'color.search_icon_disabled': atOpacity(rolePaint('on-surface'), 0.38),
    // metrics amendment S: the second field's disabled placeholder keeps
    // its existing role (search/_search.scss:116-125)
    'color.search_placeholder_disabled': '{color.field_placeholder_disabled}',
    // review amendment: the disabled search's outline is the field's own
    // disabled outline in the second system
    'color.search_outline_disabled': '{color.field_outline_disabled}',
    // census CheckboxGroup / RadioButtonGroup / skeletons S (no group
    // element, no skeleton element)
    'control.checkbox_group_gap': 6,
    'control.radio_group_gap_horizontal': 16,
    'control.radio_group_gap_vertical': 6,
    'control.selection_skeleton_label_width': 100,
    // review amendment: the radio skeleton's fixed 18-high label bar -
    // the explicit default mapping (census RadioButtonSkeleton)
    'control.radio_skeleton_label_height': 18,
    // rework amendment S: the primary's 18 skeleton circle, unlike a
    // live switch handle (toggle/_toggle.scss:226-231)
    'control.toggle_skeleton_circle_size': 18,
    'control.toggle_skeleton_bar_width': 24,
    'control.toggle_skeleton_bar_height': 8
  });

  // ~~~~~~~~~~~~~~~~~~~~ v8: the slider family (md-slider) ~~~~~~~~~~~~~~~~~
  const sliderFile = 'slider';
  const sliderLayer = function (name) {
    return translucent(sliderFile, name + '-state-layer-color', name + '-state-layer-opacity');
  };
  Object.assign(out, {
    'control.slider_gap': 16,
    // Legacy cell: an inferred pad, NOT a host-height metric - the
    // rendered host is 40 (control.slider_height); kept unused until the
    // next contract cleanup
    'control.slider_padding_block': 22,
    'control.slider_min_width': 200,
    'control.slider_max_width': 640,
    'type.slider_range_label': options.typeSet('body-medium'),
    'color.slider_range_label': roleEntry('on-surface-variant'),
    'control.slider_track_height': numberToken(sliderFile, 'active-track-height'),
    'control.slider_track_radius': radiusOf(sliderFile, 'active-track-shape'),
    'color.slider_track': required(colorToken(sliderFile, 'inactive-track-color'), 'slider track'),
    'color.slider_track_filled': required(colorToken(sliderFile, 'active-track-color'), 'slider active track'),
    'color.slider_track_filled_focus': required(colorToken(sliderFile, 'active-track-color'), 'slider active track'),
    // md-slider draws no tick
    'control.slider_tick_height': 0,
    'control.slider_handle_size': numberToken(sliderFile, 'handle-height'),
    'control.slider_handle_size_active': numberToken(sliderFile, 'handle-height'),
    'color.slider_handle': required(colorToken(sliderFile, 'handle-color'), 'slider handle'),
    'color.slider_handle_focus': required(colorToken(sliderFile, 'focus-handle-color'), 'slider focus handle'),
    'color.slider_handle_gap_focus': NONE,
    'control.slider_state_layer_size': numberToken(sliderFile, 'state-layer-size'),
    'color.slider_state_layer_hover': sliderLayer('hover'),
    // The rendered ripple mounts hovered and pressed classes only
    // (ripple/internal/ripple.js); keyboard focus shows the md-focus-ring,
    // not the spec's unused focus wash - explicitly transparent
    'color.slider_state_layer_focus': NONE,
    'color.slider_state_layer_active': sliderLayer('pressed'),
    'shadow.slider_handle': elevation(sliderFile, 'handle-elevation'),
    'color.slider_disabled': translucent(sliderFile, 'disabled-handle-color', 'disabled-handle-opacity'),
    'color.slider_track_disabled': translucent(sliderFile, 'disabled-inactive-track-color', 'disabled-inactive-track-opacity'),
    // census Slider S: the number field 64 wide, 96 invalid
    'control.slider_input_width': 64,
    'control.slider_input_width_invalid': 96,
    // census SliderSkeleton S: the range label blocks 20 x 12
    'control.slider_skeleton_range_width': 20,
    'control.slider_skeleton_range_height': 12,
    // v8 metrics amendment (b9-material-probe): the host is the
    // state-layer-sized 40 box, not 48; the track sits 18 in from each
    // end (state-layer 40/2 minus the 2px tick container), the handle
    // travels inset 20, keyboard focus shows the md-focus-ring's 48 ring
    // at offset 0, and a disabled number field keeps the field outline
    'control.slider_height': numberToken(sliderFile, 'state-layer-size'),
    'control.slider_track_inset': numberToken(sliderFile, 'state-layer-size') / 2 - numberToken(sliderFile, 'with-tick-marks-container-size'),
    'control.slider_handle_inset': numberToken(sliderFile, 'state-layer-size') / 2,
    'control.slider_focus_size': 48,
    'control.slider_focus_offset': 0,
    'control.slider_focus_width': numberToken('focus-ring', 'width'),
    'control.slider_focus_gap_width': 0,
    'control.slider_input_outline_width_disabled': '{control.field_outline_width}',
    'color.slider_focus_ring': required(colorToken('focus-ring', 'color', null, 'color.focus'), 'slider focus ring'),
    'shadow.slider_handle_disabled': elevation(sliderFile, 'disabled-handle-elevation')
  });

  // ~~~~~~~~~~~~~~~~~~~~ v8: select members (census group 4) ~~~~~~~~~~~~~~~~
  Object.assign(out, {
    // census MultiSelect S: the option checkbox seats 28 in
    'control.multi_select_checkbox_inset': 28,
    // census SelectItemGroup S: the group label is label-medium in
    // on-surface-variant
    'type.select_group_label': options.typeSet('label-medium'),
    'color.select_group_label': roleEntry('on-surface-variant')
  });

  // ~~~~~~~~~~~~~~~~~~~~ v8: the popover family (census Popover) ~~~~~~~~~~~
  // Material has no popover element; the request's decisions answer: the
  // menu's surface, on-surface text, an outline-variant border, radius 4,
  // a 12 x 6 caret, offset 8, at level 2
  Object.assign(out, {
    'color.popover_container': roleEntry('surface-container'),
    'color.popover_label': roleEntry('on-surface'),
    'color.popover_border': roleEntry('outline-variant'),
    'control.popover_radius': 4,
    'control.popover_caret_width': 12,
    'control.popover_caret_height': 6,
    'control.popover_offset': 8,
    'shadow.popover': '{shadow.level_02}',
    // census DefinitionTooltip: the term's underline is `outline`, `primary`
    // while engaged; the bubble reads the tooltip's own cells
    'color.definition_term_underline': roleEntry('outline'),
    'color.definition_term_underline_hover': roleEntry('primary'),
    'control.definition_tooltip_max_width': '{control.tooltip_max_width}',
    'control.definition_tooltip_padding_block': '{control.tooltip_padding_block}',
    'control.definition_tooltip_padding_inline': '{control.tooltip_padding_inline}',
    // census Toggletip: the trigger in on-surface-variant going on-surface
    // while open, at the tooltip's offset; the content caps at 288
    'color.toggletip_icon': roleEntry('on-surface-variant'),
    'color.toggletip_icon_active': roleEntry('on-surface'),
    'control.toggletip_offset': '{control.tooltip_offset}',
    'control.toggletip_max_width': 288,
    // census ToggletipContent S: inverse links and focus draw inverse-primary
    'color.link_label_inverse': roleEntry('inverse-primary'),
    'color.link_label_inverse_hover': roleEntry('inverse-primary'),
    'color.focus_ring_inverse': roleEntry('inverse-primary')
  });

  // ~~~~~~~~~~~~~~~~~~~~ v8: the fab family (md-fab) ~~~~~~~~~~~~~~~~~~~~~~~
  // census FloatingActionButton: variants surface / primary / secondary /
  // tertiary, a state layer in the icon colour at the hover and pressed
  // opacities, elevation 3 rising to 4 while hovered
  const fabFiles = Object.freeze({
    surface: 'fab-surface',
    primary: 'fab-primary',
    secondary: 'fab-secondary',
    tertiary: 'fab-tertiary'
  });
  for (const variant of Object.keys(fabFiles)) {
    const fabFile = fabFiles[variant];
    out['color.fab_' + variant + '_container'] = required(colorToken(fabFile, 'container-color'), fabFile + ' container');
    out['color.fab_' + variant + '_icon'] = required(colorToken(fabFile, 'icon-color'), fabFile + ' icon');
    out['color.fab_' + variant + '_layer_hover'] = translucent(fabFile, 'hover-state-layer-color', 'hover-state-layer-opacity');
    out['color.fab_' + variant + '_layer_active'] = translucent(fabFile, 'pressed-state-layer-color', 'pressed-state-layer-opacity');
  }
  Object.assign(out, {
    'control.fab_size': numberToken('fab-surface', 'container-height'),
    'control.fab_size_small': numberToken('fab-surface-small', 'container-height'),
    'control.fab_size_large': numberToken('fab-surface-large', 'container-height'),
    'control.fab_icon_size': numberToken('fab-surface', 'icon-size'),
    'control.fab_icon_size_large': numberToken('fab-surface-large', 'icon-size'),
    'control.fab_radius': radiusOf('fab-surface', 'container-shape'),
    'control.fab_radius_small': radiusOf('fab-surface-small', 'container-shape'),
    'control.fab_radius_large': radiusOf('fab-surface-large', 'container-shape'),
    'shadow.fab': elevation('fab-surface', 'container-elevation'),
    'shadow.fab_hover': elevation('fab-surface', 'hover-container-elevation'),
    // md-fab's label reads only label-text-{font,size,line-height,weight} (fab/internal/_shared.scss:138-146), so it carries no tracking
    'type.fab_label': Object.assign({}, options.typeSet(required(read('extended-fab-surface', 'label-text-font'), 'extended fab label').typescale), { letter_spacing: 0 }),
    // census: the extended fab pads 16 around its content, 12 before the label
    'control.fab_extended_padding': 16,
    'control.fab_label_gap': 12,
    // census TagSet S: members 8 apart
    'control.tag_set_gap': 8
  });

  // ~~~~~~~~~~~~~~~~~~~~ v9: the adaptive cells ~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  // Material's own touch minimum is the 48px target (D32b); it ships no
  // form variants (D24). The selection label is the type set its
  // checkbox/radio label resolves today (`type.body_compact_01`) - the
  // alias is zero visible change
  Object.assign(out, {
    'control.target_min': 48,
    'control.text_scale_max': 2,
    'type.selection_label': '{type.body_compact_01}'
  });

  // ~~~~~~~~~~~~~~~~~~~~ v9: tab members ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  // The icon is the primary tab's 24px glyph; the close button and overflow
  // buttons have no Material tab twin, so the values stand as Superloom
  // decisions or read the surface roles (`scroll` anatomy never draws the
  // buttons). The vertical variant and skeleton have no twin either
  const surfacePaint = rolePaint('surface');
  const listHoverOpacity = numberToken(listItem, 'list-item-hover-state-layer-opacity');
  const listPressedOpacity = numberToken(listItem, 'list-item-pressed-state-layer-opacity');
  const onSurfacePaint = rolePaint('on-surface');
  const surfaceLayer = function (states) {
    return layered(surfacePaint, states.map(function (name) {
      return [onSurfacePaint, name === 'hover' ? listHoverOpacity : combined([listHoverOpacity, listPressedOpacity])];
    }));
  };
  Object.assign(out, {
    'control.tab_icon_size': numberToken(tabFile, 'with-icon-icon-size'),
    'control.tab_icon_gap': 8,
    'control.tab_close_size': 24,
    'control.tab_close_icon_size': 18,
    'control.tab_dismiss_padding_end': 40,
    'control.tab_contained_dismiss_padding_end': 47,
    'color.tab_close_icon': roleEntry('on-surface-variant'),
    'color.tab_close_icon_selected': roleEntry('on-surface'),
    'color.tab_close_icon_disabled': atOpacity(onSurfacePaint, 0.38),
    // census: material's secondary label is its `body-small` typescale
    'type.tab_secondary_label': options.typeSet('body-small'),
    'control.tab_contained_tall_height': 64,
    'control.tab_overflow_button_width': 40,
    'control.tab_contained_overflow_button_width': 48,
    'control.tab_overflow_fade_width': 8,
    'color.tab_overflow_button': roleEntry('surface'),
    'color.tab_overflow_button_hover': surfaceLayer(['hover']),
    'color.tab_overflow_button_active': surfaceLayer(['pressed']),
    'color.tab_contained_overflow_button': roleEntry('surface-container'),
    'color.tab_contained_overflow_button_hover': layered(rolePaint('surface-container'), [[onSurfacePaint, listHoverOpacity]]),
    'color.tab_contained_overflow_button_active': layered(rolePaint('surface-container'), [[onSurfacePaint, combined([listHoverOpacity, listPressedOpacity])]]),
    'color.tab_overflow_icon': roleEntry('on-surface'),
    'control.tab_panel_padding': 16,
    'color.tab_panel_contained_container': roleEntry('surface'),
    'control.tab_vertical_height': 64,
    'control.tab_vertical_indicator_width': 3,
    'color.tab_vertical_container': roleEntry('surface'),
    'color.tab_vertical_item': roleEntry('surface'),
    'color.tab_vertical_item_hover': surfaceLayer(['hover']),
    'color.tab_vertical_track': roleEntry('outline-variant'),
    'color.tab_vertical_track_hover': roleEntry('outline'),
    'color.tab_vertical_divider': roleEntry('outline-variant'),
    'control.tab_vertical_fade_height': 64,
    'control.tab_vertical_label_lines': 2,
    'control.tab_vertical_list_ratio': 0.25,
    'control.tab_skeleton_width': 160,
    'control.tab_skeleton_bar_height': 14
  });

  // ~~~~~~~~~~~~~~~~~~~~ v9: the content switcher (md-outlined-segmented-button)
  // The rail is the segment's 1px `outline` at half its 40px height; the
  // selected face fills `secondary-container`; separators are the full-height
  // outline (`full` anatomy); the label is `label-large`
  const segmented = 'outlined-segmented-button';
  const segmentedHeight = numberToken(segmented, 'container-height');
  const segmentedLayer = function (states) {
    return layered(surfacePaint, states.map(function (name) {
      return [required(paintOf(segmented, 'unselected-' + name + '-state-layer-color'), segmented + ' unselected ' + name + ' layer'), numberToken(segmented, name + '-state-layer-opacity')];
    }));
  };
  Object.assign(out, {
    'control.content_switcher_radius': segmentedHeight / 2,
    'control.content_switcher_outline_width': numberToken(segmented, 'outline-width'),
    'control.content_switcher_padding_block': 0,
    'control.content_switcher_padding_inline': 12,
    'control.content_switcher_padding_inline_large': 12,
    'control.content_switcher_separator_height': segmentedHeight,
    'control.content_switcher_focus_width': numberToken('focus-ring', 'width'),
    'control.content_switcher_icon_size': numberToken(segmented, 'with-icon-icon-size'),
    'control.content_switcher_icon_size_large': numberToken(segmented, 'with-icon-icon-size'),
    'control.content_switcher_icon_gap': 8,
    'color.content_switcher_outline': required(colorToken(segmented, 'outline-color'), 'segmented outline'),
    'color.content_switcher_outline_disabled': translucent(segmented, 'disabled-outline-color', 'disabled-outline-opacity'),
    'color.content_switcher_label': required(colorToken(segmented, 'unselected-label-text-color'), 'segmented label'),
    'color.content_switcher_label_hover': required(colorToken(segmented, 'unselected-hover-label-text-color'), 'segmented hover label'),
    'color.content_switcher_label_selected': required(colorToken(segmented, 'selected-label-text-color'), 'segmented selected label'),
    'color.content_switcher_label_disabled': translucent(segmented, 'disabled-label-text-color', 'disabled-label-text-opacity'),
    'color.content_switcher_container_hover': segmentedLayer(['hover']),
    'color.content_switcher_container_selected': required(colorToken(segmented, 'selected-container-color'), 'segmented selected container'),
    'color.content_switcher_container_selected_disabled': atOpacity(onSurfacePaint, 0.12),
    'color.content_switcher_separator': required(colorToken(segmented, 'outline-color'), 'segmented separator'),
    'color.content_switcher_separator_disabled': translucent(segmented, 'disabled-outline-color', 'disabled-outline-opacity'),
    'color.content_switcher_focus': roleEntry('secondary'),
    'color.content_switcher_focus_inset': roleEntry('surface'),
    'color.content_switcher_icon': required(colorToken(segmented, 'unselected-with-icon-icon-color'), 'segmented icon'),
    'color.content_switcher_icon_hover': required(colorToken(segmented, 'unselected-hover-icon-color'), 'segmented hover icon'),
    'color.content_switcher_icon_only': required(colorToken(segmented, 'unselected-with-icon-icon-color'), 'segmented icon-only'),
    'color.content_switcher_icon_selected': required(colorToken(segmented, 'selected-with-icon-icon-color'), 'segmented selected icon'),
    'color.content_switcher_icon_disabled': translucent(segmented, 'disabled-icon-color', 'disabled-icon-opacity'),
    // No low-contrast segment in Material (S): the cells alias the regular ones
    'color.content_switcher_low_contrast_container': NONE,
    'color.content_switcher_low_contrast_container_active': '{color.content_switcher_low_contrast_container_hover}',
    'color.content_switcher_low_contrast_container_hover': '{color.content_switcher_container_hover}',
    'color.content_switcher_low_contrast_container_selected': '{color.content_switcher_container_selected}',
    'color.content_switcher_low_contrast_outline': '{color.content_switcher_outline}',
    'color.content_switcher_low_contrast_label_selected': '{color.content_switcher_label_selected}',
    'color.content_switcher_low_contrast_icon': '{color.content_switcher_icon}',
    'color.content_switcher_low_contrast_icon_selected': '{color.content_switcher_icon_selected}',
    'type.content_switcher_label': options.typeSet(required(read(segmented, 'label-text-font'), 'segmented label type').typescale),
    'type.content_switcher_label_selected_low_contrast': '{type.content_switcher_label}'
  });

  // ~~~~~~~~~~~~~~~~~~~~ v9: menu members ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  // The 280px menu maximum is Material's own; the submenu offsets have no
  // Material counterpart and stand at Carbon's. The border variant is
  // `outline-variant`; the explicit background is `surface`. The selected
  // item fills `secondary-container` (the menu file's own selected cells).
  // The danger item has no Material twin: no inner ring, the surface as the
  // stand-in paint
  Object.assign(out, {
    'control.menu_max_width': 280,
    'control.menu_viewport_margin': 8,
    'control.menu_submenu_offset_end': -6,
    'control.menu_submenu_offset_start': 10,
    'control.menu_submenu_offset_block': -6,
    'color.menu_border': roleEntry('outline-variant'),
    'color.menu_container_background': roleEntry('surface'),
    'control.menu_item_danger_focus_inset_width': 0,
    'color.menu_item_danger_focus_inset': roleEntry('surface'),
    'color.menu_item_container_selected': required(colorToken(menuFile, 'list-item-selected-container-color'), 'menu selected container'),
    'color.menu_item_label_selected': required(colorToken(menuFile, 'list-item-selected-label-text-color'), 'menu selected label'),
    // Material insets its list divider 16px a side instead of breathing block
    'control.menu_divider_margin_block': 8,
    'control.menu_button_min_width': 192,
    'color.overflow_menu_trigger_hover': atOpacity(onSurfacePaint, listHoverOpacity),
    'color.overflow_menu_trigger_open': roleEntry('surface-container'),
    'color.overflow_menu_icon': roleEntry('on-surface-variant'),
    'control.overflow_menu_width': 160,
    'control.overflow_menu_connector_size': 3,
    'control.overflow_menu_connector_size_side': 6,
    'control.overflow_menu_option_max_width': 180
  });

  // ~~~~~~~~~~~~~~~~~~~~ v9: modal members ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  // md-dialog clamps its width (280-560) rather than sizing by ratio: every
  // ratio stands at 1 and the clamps apply (S). The dialog enters without a
  // translate, fades nothing when scrolling (`hidden` anatomy), keeps no end
  // gutter, and its trailing actions carry Carbon's geometry unused
  Object.assign(out, {
    'control.dialog_width_ratio': 1,
    'control.dialog_width_ratio_xs': 1,
    'control.dialog_width_ratio_sm': 1,
    'control.dialog_width_ratio_lg': 1,
    'control.dialog_height_ratio': 1,
    'control.dialog_height_ratio_xs': 1,
    'control.dialog_height_ratio_sm': 1,
    'control.dialog_height_ratio_lg': 1,
    'control.dialog_enter_offset': 0,
    'control.dialog_scroll_fade_height': 48,
    'control.dialog_scroll_fade_start': 80,
    'control.dialog_scroll_fade_min_height': 300,
    'control.dialog_scroll_end_space': 24,
    'control.dialog_text_gutter_ratio': 0,
    'control.dialog_action_ratio': 0.5,
    'control.dialog_action_ratio_three': 0.25,
    'control.dialog_action_padding_top': 14,
    'control.dialog_action_padding_bottom': 32
  });

  // ~~~~~~~~~~~~~~~~~~~~ v9: notification members ~~~~~~~~~~~~~~~~~~~~~~~~~~
  // No snackbar element and no low-contrast kind: the insets stand at
  // Carbon's (S), the inline width at its 736 ceiling, the ghost action's
  // hover is the inverse surface's state layer, the kind outlines map onto
  // the error and primary role families at 0.4, and the warning glyph's
  // inner mark reads on-surface
  Object.assign(out, {
    'control.notification_inline_width': 736,
    'control.notification_min_height': 48,
    'control.notification_details_inset': 13,
    // At md and up the close and the action sit in flow (_inline-notification.scss:268-310); compact draws the below-md wrap
    'control.notification_details_inset_end': 13,
    'control.notification_icon_top': 14,
    'control.notification_toast_icon_top': 16,
    'control.notification_icon_gap': 16,
    'control.notification_text_padding_block': 15,
    'control.notification_toast_text_padding_bottom': 23,
    'control.notification_title_gap': 4,
    'control.notification_action_height': 32,
    'control.notification_action_inset': 0,
    'color.notification_action_container_hover': layered(rolePaint('inverse-surface'), [[rolePaint('inverse-on-surface'), listHoverOpacity]]),
    'control.notification_toast_action_inset': 50,
    'control.notification_action_end_space': 8,
    'color.notification_outline_error': atOpacity(rolePaint('error'), 0.4),
    'color.notification_outline_success': atOpacity(rolePaint('primary'), 0.4),
    'color.notification_outline_info': atOpacity(rolePaint('primary'), 0.4),
    'color.notification_outline_warning': atOpacity(rolePaint('error'), 0.4),
    'control.notification_outline_width': 1,
    'color.notification_warning_icon_inner': roleEntry('on-surface')
  });

  // ~~~~~~~~~~~~~~~~~~~~ v9: the accordion family ~~~~~~~~~~~~~~~~~~~~~~~~~~
  // No disclosure widget (no twin): the values map Material's list roles -
  // `outline-variant` rules, `surface` rows with the on-surface hover layer,
  // a `secondary` focus, the 24px chevron in on-surface-variant, and the
  // body-large title (each S)
  Object.assign(out, {
    'control.accordion_divider_width': 1,
    'color.accordion_divider': roleEntry('outline-variant'),
    'color.accordion_divider_hover': roleEntry('outline-variant'),
    'control.accordion_flush_inset': 16,
    'control.accordion_heading_padding_inline': 16,
    'color.accordion_heading_label': roleEntry('on-surface'),
    'color.accordion_heading_label_disabled': atOpacity(onSurfacePaint, 0.38),
    'color.accordion_heading_container_hover': surfaceLayer(['hover']),
    'color.accordion_focus': roleEntry('secondary'),
    'control.accordion_focus_width': 2,
    'control.accordion_icon_size': 24,
    'control.accordion_icon_top': 2,
    'color.accordion_icon': roleEntry('on-surface-variant'),
    'color.accordion_icon_disabled': atOpacity(onSurfacePaint, 0.38),
    'type.accordion_title': options.typeSet('body-large'),
    'control.accordion_title_gap': 16,
    'control.accordion_content_padding_top': 8,
    'control.accordion_content_padding_bottom': 24,
    'control.accordion_content_padding_end': 48,
    'control.accordion_content_end_ratio': 0.25
  });

  // ~~~~~~~~~~~~~~~~~~~~ v9: the breadcrumb family ~~~~~~~~~~~~~~~~~~~~~~~~~
  // No breadcrumb twin (S): body-medium / label-medium type, on-surface-variant
  // slash, on-surface current page, a primary overflow glyph pressed to
  // on-surface, and the surface-container caret
  Object.assign(out, {
    'type.breadcrumb': options.typeSet('body-medium'),
    'type.breadcrumb_small': options.typeSet('label-medium'),
    'control.breadcrumb_gap': 8,
    'control.breadcrumb_gap_small': 4,
    'color.breadcrumb_separator': roleEntry('on-surface-variant'),
    'color.breadcrumb_current': roleEntry('on-surface'),
    'control.breadcrumb_link_min_width_small': 12,
    'control.breadcrumb_overflow_width': 16,
    'control.breadcrumb_overflow_height': 18,
    'control.breadcrumb_overflow_height_small': 16,
    'control.breadcrumb_overflow_icon_offset': 4,
    'control.breadcrumb_overflow_underline_width': 12,
    'control.breadcrumb_overflow_caret_size': 7,
    'color.breadcrumb_overflow_icon': roleEntry('primary'),
    'color.breadcrumb_overflow_icon_hover': roleEntry('primary'),
    'color.breadcrumb_overflow_icon_active': roleEntry('on-surface'),
    'color.breadcrumb_overflow_caret': roleEntry('surface-container'),
    'control.breadcrumb_skeleton_width': 100,
    'control.breadcrumb_skeleton_height': 16
  });

  // ~~~~~~~~~~~~~~~~~~~~ v9: the text list family ~~~~~~~~~~~~~~~~~~~~~~~~~~
  // No typographic-list twin (S): body-large items in on-surface at Carbon's
  // measures; the markers are text in the same label color
  Object.assign(out, {
    'type.text_list': options.typeSet('body-large'),
    'type.text_list_expressive': options.typeSet('body-large'),
    'color.text_list_label': roleEntry('on-surface'),
    'control.text_list_indent': 16,
    'control.text_list_nested_indent': 32,
    'control.text_list_nested_item_padding': 4,
    'control.text_list_marker_offset': 16,
    'control.text_list_nested_marker_offset': 8,
    'control.text_list_ordinal_offset': 24
  });

  // ~~~~~~~~~~~~~~~~~~~~ v9: the contained list family ~~~~~~~~~~~~~~~~~~~~~
  // No contained-list twin (S): the title-small header on `surface`,
  // label-medium disclosed header in on-surface-variant, `outline-variant`
  // rules, the body-large item with the list's own hover and pressed layers,
  // and the 24px icon column
  Object.assign(out, {
    'type.contained_list_header': options.typeSet('title-small'),
    'color.contained_list_header_container': roleEntry('surface'),
    'color.contained_list_header_label': roleEntry('on-surface'),
    'color.contained_list_divider': roleEntry('outline-variant'),
    'control.contained_list_padding_inline': 16,
    'control.contained_list_gap': 16,
    'type.contained_list_header_disclosed': options.typeSet('label-medium'),
    'color.contained_list_header_container_disclosed': roleEntry('surface'),
    'color.contained_list_header_label_disclosed': roleEntry('on-surface-variant'),
    'control.contained_list_header_height_disclosed': 40,
    'color.contained_list_search_container': roleEntry('surface'),
    'color.contained_list_search_border': roleEntry('outline-variant'),
    'type.contained_list_item': options.typeSet('body-large'),
    'color.contained_list_item_label': roleEntry('on-surface'),
    'color.contained_list_item_label_disabled': atOpacity(onSurfacePaint, 0.38),
    'color.contained_list_item_container_hover': listLayer(null, ['hover']),
    'color.contained_list_item_container_active': listLayer(null, ['hover', 'pressed']),
    'control.contained_list_action_space': 48,
    'control.contained_list_icon_size': 24,
    'control.contained_list_icon_gap': 8,
    'control.contained_list_icon_top': 2
  });

  // ~~~~~~~~~~~~~~~~~~~~ v9: CopyButton and SkipToContent ~~~~~~~~~~~~~~~~~~
  // The copy button is an icon button on `surface` with the state layers;
  // the skip link (web only) is `surface` with on-surface-variant text under
  // a `secondary` border, label-large (S)
  Object.assign(out, {
    'color.copy_button_container': roleEntry('surface'),
    'color.copy_button_container_hover': surfaceLayer(['hover']),
    'color.copy_button_container_active': surfaceLayer(['pressed']),
    'control.skip_link_height': 48,
    'control.skip_link_padding_inline': 16,
    'control.skip_link_border_width': 4,
    'color.skip_link_container': roleEntry('surface'),
    'color.skip_link_label': roleEntry('on-surface-variant'),
    'color.skip_link_border': roleEntry('secondary'),
    'type.skip_link': options.typeSet('label-large')
  });

  // ~~~~~~~~~~~~~~~~~~~~ v9: the folded follow-ups ~~~~~~~~~~~~~~~~~~~~~~~~~
  // (`## v9 Choice/Action Follow-Ups`): the selected list item presses its
  // hover layer over the selected container; the extended fab's end padding
  // is the measured 20 (`_shared.scss:61-65`); the popover caps at 368; the
  // ComboBox geometry stands at Carbon's (S: no combobox twin)
  Object.assign(out, {
    'color.list_item_container_selected_active': layered(
      required(paintOf(menuFile, 'list-item-selected-container-color'), 'menu selected container'),
      [
        [required(paintOf(listItem, 'list-item-hover-state-layer-color'), 'list item hover state layer'), numberToken(listItem, 'list-item-hover-state-layer-opacity')],
        [required(paintOf(listItem, 'list-item-pressed-state-layer-color'), 'list item pressed state layer'), numberToken(listItem, 'list-item-pressed-state-layer-opacity')]
      ]
    ),
    'control.fab_extended_padding_end': 20,
    'control.popover_max_width': 368,
    'control.combo_box_clear_size': 24,
    'control.combo_box_clear_inset_end': 45,
    'control.combo_box_input_padding_end': 70,
    'control.combo_box_input_padding_end_invalid': 105,
    'control.combo_box_invalid_icon_inset_end': 82
  });

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
