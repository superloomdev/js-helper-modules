// Info: Refresh scripts/icon-map.json from the component library's authored
// semantic-name -> upstream-glyph table. Dev only - not published.
//
// The component library repository owns the one hand-authored mapping
// (data/icons.json, one row per semantic name with a column per icon set).
// This template commits a snapshot of its own column so that regeneration
// is reproducible from this repository alone, and records the source file's
// sha256 so a stale snapshot is detectable.
//
// Run: node scripts/sync-icon-map.js [path-to-icons.json]
//      SUPERLOOM_ICONS_SOURCE=<path> overrides the default location.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// The column of data/icons.json this template consumes
const ICON_SET = 'carbon';

const here = dirname(fileURLToPath(import.meta.url));
const workspaceDefault = resolve(here, '..', '..', '..', '..', '..', 'codebase-rnw-components-v2', 'data', 'icons.json');
const sourcePath = process.argv[2] || process.env.SUPERLOOM_ICONS_SOURCE || workspaceDefault;

const raw = readFileSync(sourcePath, 'utf8');
const source = JSON.parse(raw);
const sha256 = createHash('sha256').update(raw).digest('hex');

// One glyph name per semantic name, in the source's (alphabetical) order
const icons = {};
for (const name of Object.keys(source.icons)) {
  const glyph = source.icons[name][ICON_SET];
  if (typeof glyph !== 'string' || glyph.length === 0) {
    throw new Error('icons.json: ' + name + ' has no ' + ICON_SET + ' glyph');
  }
  icons[name] = glyph;
}

const snapshot = {
  source: 'rnw-components-v2/data/icons.json',
  source_sha256: sha256,
  set: ICON_SET,
  upstream: source.sources[ICON_SET],
  icons: icons
};

writeFileSync(resolve(here, 'icon-map.json'), JSON.stringify(snapshot, null, 2) + '\n');
console.log('icon-map.json: ' + Object.keys(icons).length + ' names, source sha256 ' + sha256);
