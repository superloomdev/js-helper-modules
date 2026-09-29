// Info: Convert pinned Material Symbols SVG files into contract icon literals.
// Dev only - imported by scripts/generate.js, not published.
//
// One icon literal per semantic name: { icon: true, viewBox, paths }.
// Material Symbols publishes one glyph per name and style, a single <path>
// on a '0 -960 960 960' grid, so there are no size variants. The outlined
// style is the reference; the file is @material-symbols/svg-400/outlined/<name>.svg.
//
// Conversion rules: exactly one <path> per file is kept as { d }; a fill-rule
// attribute is kept as fillRule; any other element, attribute or a second
// path throws - a mapping change, never a silent drop.
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const moduleRoot = resolve(here, '..');

const STYLE = 'outlined';

/********************************************************************
Parse one Material Symbols SVG file into an icon literal.

@param {String} svg - File content
@param {String} label - Glyph label for error messages

@return {Object} - Icon literal
*********************************************************************/
function parseSymbol (svg, label) {
  const viewBoxMatch = svg.match(/<svg[^>]*\sviewBox="([^"]+)"/);
  if (!viewBoxMatch) {
    throw new Error(label + ': no viewBox');
  }

  const inner = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').trim();
  const elements = inner.match(/<[a-zA-Z][^>]*>/g) || [];
  if (elements.length !== 1 || !/^<path\b/.test(elements[0])) {
    const names = [];
    for (const element of elements) {
      names.push(element.split(/[\s>]/)[0]);
    }
    throw new Error(label + ': expected exactly one <path>, found ' + names.join(' '));
  }

  const path = elements[0];
  const attrs = {};
  for (const m of path.matchAll(/([a-zA-Z-]+)="([^"]*)"/g)) {
    attrs[m[1]] = m[2];
  }
  for (const key of Object.keys(attrs)) {
    if (key !== 'd' && key !== 'fill-rule') {
      throw new Error(label + ': unsupported path attribute ' + key);
    }
  }
  if (!attrs.d) {
    throw new Error(label + ': path without d');
  }

  const entry = { d: attrs.d };
  if (attrs['fill-rule']) {
    entry.fillRule = attrs['fill-rule'];
  }
  return { icon: true, viewBox: viewBoxMatch[1], paths: [entry] };
}

/********************************************************************
Build every icon literal named by the map from the pinned package.

@param {Object} map - Semantic name -> Material Symbols glyph name
@param {Object} [options] - { packageRoot } override for tests

@return {Object} - { version, style, tokens: { 'icon.<name>': literal } }
*********************************************************************/
export default function buildMaterialIcons (map, options) {
  const packageRoot = (options && options.packageRoot) || resolve(moduleRoot, 'node_modules', '@material-symbols', 'svg-400');
  const pkg = JSON.parse(readFileSync(resolve(packageRoot, 'package.json'), 'utf8'));

  const tokens = {};
  for (const name of Object.keys(map)) {
    const glyph = map[name];
    const label = 'icon.' + name;
    const file = resolve(packageRoot, STYLE, glyph + '.svg');
    if (!existsSync(file)) {
      throw new Error(label + ': Material Symbols glyph ' + glyph + ' is not in @material-symbols/svg-400@' + pkg.version + ' (' + STYLE + ')');
    }
    tokens[label] = parseSymbol(readFileSync(file, 'utf8'), label);
  }

  return { version: pkg.version, style: STYLE, tokens: tokens };
}
