// Info: The material template's answer to every cell of the contract's role
// grid, read from the pinned component token files (`@material/web` 2.5.0,
// `_md-comp-*.scss`) and resolved in each scheme. A colour Material states
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
// the generator; none is completed from the default template.

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

  // A system colour role as #rrggbb
  const hexOf = function (role) {
    const camel = role.replace(/-([a-z])/g, function (match, c) {
      return c.toUpperCase();
    });
    if (scheme[camel] === undefined) {
      throw new Error('grid-material: no scheme colour ' + role);
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
  // A token's colour, its role substituted where the kind asks for it
  // Translucent layers stacked into one translucent colour: [[hex, alpha], ...] bottom first
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
  const colorToken = function (file, name, roles) {
    const value = read(file, name);
    if (value === null || value.role === undefined) {
      return null;
    }
    return hexOf((roles || {})[value.role] || value.role);
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
  // A colour at the opacity its paired token states
  const translucent = function (file, colorName, opacityName, roles) {
    const hex = required(colorToken(file, colorName, roles), file + ' ' + colorName);
    return rgba(hex, read(file, opacityName) === null ? 1 : numberToken(file, opacityName));
  };
  const elevation = function (file, name) {
    const value = read(file, name);
    return value === null || value.level === undefined || value.level === 0 ? '{shadow.level_00}' : '{shadow.level_0' + value.level + '}';
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
    const container = colorToken(file, 'container-color', roles);
    // A pressed control keeps its hover layer under the pressed one (md-ripple draws both)
    const layer = function (state) {
      const layers = (state === 'pressed' ? ['hover', 'pressed'] : [state]).map(function (name) {
        return [required(colorToken(file, name + '-state-layer-color', roles), file + ' ' + name + ' state layer'), numberToken(file, name + '-state-layer-opacity')];
      });
      return container === null ? stack(layers) : layers.reduce(function (base, entry) {
        return flatten(base, entry[0], entry[1]);
      }, container);
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
  out['color.button_focus_ring'] = required(colorToken('focus-ring', 'color'), 'focus ring colour');
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
    return stack(names.map(function (name) {
      const prefix = selection + '-' + name;
      return [boxColor(prefix + '-state-layer-color'), numberToken(box, prefix + '-state-layer-opacity')];
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
    'color.selection_focus_ring': required(colorToken('focus-ring', 'color'), 'focus ring colour'),
    'control.selection_focus_width': numberToken('focus-ring', 'width'),
    // `checkbox/internal/_checkbox.scss`: the ring is a 44px circle centred on the box
    'control.selection_focus_offset': (44 - numberToken(box, 'container-size')) / 2,
    'control.selection_focus_radius': '{shape.radius_max}',
    'control.selection_layer_size': numberToken(box, 'state-layer-size')
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
