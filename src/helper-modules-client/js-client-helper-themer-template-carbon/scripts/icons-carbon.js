// Info: Convert pinned @carbon/icons descriptors into contract icon literals.
// Dev only - imported by scripts/generate.js, not published.
//
// One icon literal per semantic name: { icon: true, viewBox, paths, sizes? }.
// The largest published glyph is the default; the 16, 20 and 24 pixel
// variants, when the set publishes them, go under `sizes` as
// { viewBox, paths } - each in its own coordinate space - so a component
// renders the set's own small glyph instead of a scaled large one.
//
// Conversion rules, applied to every descriptor element:
//   path                       kept as { d } (+ fillRule when declared)
//   path with data-icon-path   dropped - a transparent inner-path helper
//   path with rotate(...)      rotation baked into a straight-segment path
//   circle, rect               converted to an equivalent path
//   anything else              throws - a mapping change, never a silent drop
//
// This file has an identical twin in the default template package; both
// consume the same pinned @carbon/icons metadata.
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const moduleRoot = resolve(here, '..');

const SIZE_VARIANTS = [16, 20, 24];

/********************************************************************
Format a number for path data: at most four decimals, no trailing
zeros, no negative zero.

@param {Number} n - Number

@return {String} - Formatted number
*********************************************************************/
function num (n) {
  const rounded = Math.round(n * 10000) / 10000;
  return String(rounded === 0 ? 0 : rounded);
}

/********************************************************************
Bake a `rotate(a cx cy)` transform into a path made of absolute
M, L, H, V and Z commands only.

@param {String} d - Path data
@param {String} transform - SVG transform attribute
@param {String} label - Glyph label for error messages

@return {String} - Rotated path data
*********************************************************************/
function bakeRotate (d, transform, label) {
  const match = transform.match(/^rotate\((-?[0-9.]+) (-?[0-9.]+) (-?[0-9.]+)\)$/);
  if (!match) {
    throw new Error(label + ': unsupported transform ' + transform);
  }
  const angle = Number(match[1]) * Math.PI / 180;
  const cx = Number(match[2]);
  const cy = Number(match[3]);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  // z and Z both close the path; every other lowercase letter is a relative command
  const tokens = d.replace(/z/g, 'Z').match(/[MLHVZ]|-?[0-9]*\.?[0-9]+/g);
  if (!tokens || /[a-y]|[ACQST]/.test(d)) {
    throw new Error(label + ': transform on a path with curves or relative commands');
  }

  const out = [];
  let x = 0;
  let y = 0;
  let i = 0;
  while (i < tokens.length) {
    const cmd = tokens[i++];
    if (cmd === 'Z') {
      out.push('Z');
      continue;
    }
    if (cmd === 'M' || cmd === 'L') {
      x = Number(tokens[i++]);
      y = Number(tokens[i++]);
    } else if (cmd === 'H') {
      x = Number(tokens[i++]);
    } else if (cmd === 'V') {
      y = Number(tokens[i++]);
    } else {
      throw new Error(label + ': unexpected path token ' + cmd);
    }
    const rx = cx + (x - cx) * cos - (y - cy) * sin;
    const ry = cy + (x - cx) * sin + (y - cy) * cos;
    out.push((cmd === 'M' ? 'M' : 'L') + num(rx) + ' ' + num(ry));
  }
  return out.join('');
}

/********************************************************************
Convert one descriptor element into a path entry, or null when the
element is a dropped helper.

@param {Object} element - Descriptor element { elem, attrs }
@param {String} label - Glyph label for error messages

@return {Object|null} - { d, fillRule? } or null
*********************************************************************/
function convertElement (element, label) {
  const attrs = element.attrs || {};

  if (element.elem === 'path') {
    if (attrs['data-icon-path'] !== undefined || attrs.fill === 'none' || attrs.opacity === '0') {
      return null;
    }
    let d = attrs.d;
    if (attrs.transform) {
      d = bakeRotate(d, attrs.transform, label);
    }
    const entry = { d: d };
    if (attrs['fill-rule']) {
      entry.fillRule = attrs['fill-rule'];
    }
    return entry;
  }

  if (element.elem === 'circle') {
    const cx = Number(attrs.cx);
    const cy = Number(attrs.cy);
    const r = Number(attrs.r);
    return {
      d: 'M' + num(cx - r) + ' ' + num(cy) +
        'a' + num(r) + ' ' + num(r) + ' 0 1 0 ' + num(2 * r) + ' 0' +
        'a' + num(r) + ' ' + num(r) + ' 0 1 0 ' + num(-2 * r) + ' 0z'
    };
  }

  if (element.elem === 'rect') {
    if (attrs.rx !== undefined || attrs.ry !== undefined || attrs.transform !== undefined) {
      throw new Error(label + ': rounded or transformed rect is not supported');
    }
    const x = Number(attrs.x || 0);
    const y = Number(attrs.y || 0);
    return { d: 'M' + num(x) + ' ' + num(y) + 'h' + num(Number(attrs.width)) + 'v' + num(Number(attrs.height)) + 'h' + num(-Number(attrs.width)) + 'z' };
  }

  throw new Error(label + ': unsupported element <' + element.elem + '>');
}

/********************************************************************
Convert one descriptor's content into a non-empty path list.

@param {Object} descriptor - Carbon descriptor
@param {String} label - Glyph label for error messages

@return {Array} - Path entries
*********************************************************************/
function convertPaths (descriptor, label) {
  const paths = [];
  for (const element of descriptor.content) {
    const entry = convertElement(element, label);
    if (entry) {
      paths.push(entry);
    }
  }
  if (paths.length === 0) {
    throw new Error(label + ': no visible path survived conversion');
  }
  return paths;
}

/********************************************************************
Build every icon literal named by the map from the pinned package.

@param {Object} map - Semantic name -> Carbon glyph name
@param {Object} [options] - { packageRoot } override for tests

@return {Object} - { version, tokens: { 'icon.<name>': literal } }
*********************************************************************/
export default function buildCarbonIcons (map, options) {
  const packageRoot = (options && options.packageRoot) || resolve(moduleRoot, 'node_modules', '@carbon', 'icons');
  const pkg = JSON.parse(readFileSync(resolve(packageRoot, 'package.json'), 'utf8'));
  const metadata = JSON.parse(readFileSync(resolve(packageRoot, 'metadata.json'), 'utf8'));

  const byName = new Map();
  for (const icon of metadata.icons) {
    byName.set(icon.name, icon);
  }

  const tokens = {};
  for (const name of Object.keys(map)) {
    const glyph = map[name];
    const icon = byName.get(glyph);
    if (!icon) {
      throw new Error('icon.' + name + ': Carbon glyph ' + glyph + ' is not in @carbon/icons@' + pkg.version);
    }

    // Outputs by pixel width; the largest is the default glyph
    const outputs = [];
    for (const o of icon.output) {
      outputs.push({ width: Number(o.descriptor.attrs.width), descriptor: o.descriptor });
    }
    outputs.sort(function (a, b) {
      return b.width - a.width;
    });
    const largest = outputs[0];

    const literal = {
      icon: true,
      viewBox: largest.descriptor.attrs.viewBox,
      paths: convertPaths(largest.descriptor, 'icon.' + name + '@' + largest.width)
    };
    const sizes = {};
    for (const o of outputs) {
      if (o.width !== largest.width && SIZE_VARIANTS.indexOf(o.width) !== -1) {
        sizes[String(o.width)] = {
          viewBox: o.descriptor.attrs.viewBox,
          paths: convertPaths(o.descriptor, 'icon.' + name + '@' + o.width)
        };
      }
    }
    if (Object.keys(sizes).length > 0) {
      literal.sizes = sizes;
    }
    tokens['icon.' + name] = literal;
  }

  return { version: pkg.version, tokens: tokens };
}
