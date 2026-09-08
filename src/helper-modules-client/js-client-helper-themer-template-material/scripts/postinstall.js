// Info: Postinstall patch for @material/material-color-utilities@0.4.0.
//
// The package ships broken ESM imports (missing .js extensions) that Node.js 24
// strict ESM resolution rejects. This script adds the extensions after install.
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const mcuDir = resolve(here, '..', 'node_modules', '@material', 'material-color-utilities');

if (!existsSync(mcuDir)) {
  process.exit(0);
}

function walkJs (dir) {
  const results = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      results.push.apply(results, walkJs(full));
    } else if (name.endsWith('.js')) {
      results.push(full);
    }
  }
  return results;
}

let patched = 0;
for (const file of walkJs(mcuDir)) {
  let content = readFileSync(file, 'utf8');
  const original = content;

  // Fix relative imports missing .js extension
  content = content.replace(
    /from '(\.\.?\/[a-z_]+(?:\/[a-z_]+)?)'/g,
    function (match, p1) {
      if (p1.endsWith('.js')) {
        return match;
      }
      return 'from \'' + p1 + '.js\'';
    }
  );

  if (content !== original) {
    writeFileSync(file, content);
    patched++;
  }
}

if (patched) {
  console.log('Patched ' + patched + ' files in @material/material-color-utilities');
}
