---
description: TEMPORARY (Plan 0053) - bring ONE helper module to the frozen standard end to end - re-ground from docs, hand-read every file, apply 0051 fixes + 0052 docs standard + naming by manual edits only, verify to convergence, present all changes for approval, publish at 1.0.0, then stop and ask
---

# Unify Module Workflow (TEMPORARY - Plan 0053)

> **This workflow is temporary.** It is the per-module engine for the Plan 0053 unification wave
> (`__dev__/plans/0053-helper-module-unification-wave.md`). Delete it at wave wrap-up.
> It operates on **exactly one module per run**, end to end: re-ground -> audit -> fix -> verify to
> convergence -> present all changes for user approval -> publish at 1.0.0 -> STOP and ask. It is
> deliberately exhaustive: it exists because the previous wave shipped "complete" modules that were
> still wrong.

Invoke as: `/unify-module [module-path]`
Example: `/unify-module src/helper-modules-core/js-helper-utils`

## Operating Principle (READ FIRST - this is why the last wave failed)

> **Trust nothing in working memory.** Re-derive every rule from files on disk, every run.
> Treat conversation summaries, prior plans, retrieved memories, and even this file's prose as
> **suspect** until reconfirmed against `codebase-superloom/docs/` and real reference modules.
> `AGENTS.md` is a *derived* index - `docs/` is the authority (the Golden Rule).

**Evidence rule (hard gate).** Every rule you assert and every fix you make must cite its source -
a `docs/` path + section, or a reference-module `file:line`. An uncited rule does not count: go read
the source before you rely on it. The previous wave failed precisely by keyword-spotting from memory
instead of sweeping every file against the cited source of truth.

**Convergence, not effort, is the exit condition.** No phase is "done" after one pass. The audit
(Phase D) must reach **two consecutive passes with zero new deviations** before you publish.

## Execution Contract (binding for every agent, at every capability level)

This workflow is written to be executable without judgment calls. Follow it literally:

1. **One module per run.** The `[module-path]` argument scopes everything. Never touch a second
   module's files except during a rename sweep (Phase C step 6), and then only the exact renamed token.
2. **Phases run in order: A -> B -> C -> D -> E -> F -> G.** Never skip, merge, reorder, or
   parallelize phases. Never start Phase C before the Phase B gap list is complete and cited.
3. **No improvisation.** Use only the commands written in this file (substituting `[module-path]` /
   `[module_root]` / `[old-token]`). If a situation has no matching instruction, STOP and ask the user.
4. **When uncertain, STOP.** An ambiguous rule, a convention the docs do not settle, a test that fails
   for unclear reasons, a command output you cannot interpret - all of these mean: stop, report exactly
   what you see, and ask. Working around uncertainty is how the previous wave shipped broken modules.
5. **Do not create files outside the module** - no scratch scripts, no notes files, no temporary
   `.js`/`.sh` helpers anywhere in the repo. Plan-state updates go only to the 0053 plan file.
6. **Never mark a checklist item done without having performed it in this run.** Summaries of past
   runs do not count as evidence.

## Manual-Edit Rule (hard gate - no scripts, no bulk edits)

**Every content change is made by hand, file by file, with the editor tool, after reading the whole
file.** This is deliberate: the point of the wave is a human-grade review of every line, and scripted
edits skip exactly the reading that catches real bugs.

- **FORBIDDEN:** writing one-off scripts (`.sh`, `.js`, `.py`) to modify files; bulk `sed -i` / `awk` /
  `perl -pi` / `xargs`-driven rewrites across files; any "find and replace across the module" performed
  in the terminal; codemods of any kind.
- **ALLOWED:** terminal text tools (`grep`, `git grep`, `diff`, `tail`) for **read-only detection and
  verification** - finding where things are, confirming they are gone. They never modify a file.
- The one narrow exception stays narrow: nothing. Even a 40-file mechanical change (e.g. an em-dash
  sweep) is applied by opening each file and editing it, because the file must be read anyway.
- If an edit feels too repetitive to do by hand, that is the signal to re-read the file, not to script it.

## Command Execution Rules

- **NEVER use `cd`** inside a command. Set the working directory with the tool's `Cwd` parameter.
  `[module_root]` / `[module_root]/_test` below denote *location*, not literal text.
- **NEVER append `exit 0` or repeated filler** to a command. One line, or a single `&&` chain. Nothing follows it.
- **Pipe long output through `| tail -N`** to protect the output budget.
- **Battery greps exit non-zero when clean** (that is the pass condition). Never `&&`-chain sweep greps;
  chain with `;` when combining, and quote any `echo` labels (an unquoted `==X==` breaks zsh).
- **`// turbo`** marks a step safe to auto-run (read-only or idempotent). **No mutation step is ever
  auto-run** - registry delete, `git commit`, `git push`, and publish always require explicit approval.

## The `file:` Rule (hard gate)

In the module's `_test/package.json`, the **only** permitted `file:` dependency is **this module
itself** (`file:../`). Every shared helper (utils, debug, crypto, a sibling store/adapter, etc.) must
use a **registry semver range** (`^1.0.0`). A `file:` link to any other module copies source without
its own `node_modules` and breaks in CI (`docs/dev/pitfalls.md` entry 8). This is checked in Phase D.

---

## Phase A - Activate and Re-ground

1. **Declare the target.** State the single module path under work and its class
   (`docs/modules/module-categorization.md`). Everything below is scoped to it.

2. **Drop assumptions.** Write one line: "Re-grounding from files; ignoring prior summaries until reconfirmed."

3. **Re-read the frozen standard** (authority order; do not skim). At minimum, for this module's class:
   - `codebase-superloom/docs/dev/documentation-standards.md` (voice, banned vocab, naming - the two-form rule)
   - `codebase-superloom/docs/foundations/code-formatting-js.md` (spacing, comments, arrows, spelling, JSDoc, alias derivation)
   - `codebase-superloom/docs/modules/module-structure-js.md` + `factory-vs-singleton-decision.md`
   - `codebase-superloom/docs/modules/module-readme-structure.md` + `complex-module-docs-guide.md`
   - `codebase-superloom/docs/foundations/error-handling.md`, `validation-approach.md`
   - `codebase-superloom/docs/dev/testing-local-modules.md`, `docs/dev/pitfalls.md`
   - This module's section in `__dev__/reviews/0051-module-consistency-findings.md`

   **Proof-of-read (hard gate).** For each doc above, quote ONE rule verbatim (with its line/section)
   in the reply, read from disk **this run**. "Read earlier this session" or "read in the previous
   module's pass" does NOT count - a skipped re-read is exactly how citations drift into working-memory
   guesses. No quotes = Phase A is not done.

4. **Re-derive the fingerprint from the class skeleton + a clean sibling.** First read this module's
   class skeleton section in `module-structure-js.md` verbatim (factory skeleton for Class A/B/C/D,
   "Storage Adapter Skeleton" for Class F stores, "Adapter Skeleton" for Class F adapters, the Class G/H
   sections for extensions) - the skeleton, not memory, defines the loader shape, step comments,
   companion files, and `createInterface` slots. Then read one clean reference module of the same
   class in full (`s3`, `dynamodb`, `verify`/`verify-store-*`, `styler` - **never `utils`**). Capture the
   shape it actually uses: loader, file layout, banners, JSDoc, config/errors/validators, test wiring, docs set.
   If the skeleton and the reference module disagree, STOP and report - do not pick one silently
   (`migration-pitfalls.md` "Verification scoped to the fix list instead of the class skeleton").

   **Class F modules (stores AND adapters) - additional binding rules** (from `module-structure-js.md`
   "Storage Adapter Skeleton" / "Adapter Skeleton", revised 2026-07-04 to the injected-Lib shape):
   standard factory `loader(shared_libs, config)` - identical signature to every other helper module.
   `Lib` is picked **by reference** from the injected container (`const Lib = { Utils: shared_libs.Utils,
   Debug: shared_libs.Debug };`). TWO shapes are deprecated and must be converted on sight:
   (1) module-scope singleton (`let Lib;` at module scope); (2) self-built-Lib factory (`loader(config)`
   with `require('helper-utils')(Lib, {})` inside - duplicates instances, breaks mock injection).
   Conversion steps for a module on the self-built shape:
   - loader signature `(config)` -> `(shared_libs, config)`; replace the `require('helper-utils')(Lib, {})` /
     `require('helper-debug')(Lib, ...)` block with the by-reference pick (step comment: `// Dependencies
     for this instance - by reference from the shared container`)
   - remove `helper-utils` / `helper-debug` from the module's own `package.json` `peerDependencies`
     (the container supplies them); driver helpers still arrive via config keys (`lib_sql`, `lib_dynamodb`)
   - remove any `LOG_LEVEL` key from `*.config.js` and its docs row (log level is the caller's concern;
     the shared `Lib.Debug` instance carries the app-wide level)
   - update `_test/loader.js` to pass `Lib` when instantiating the module under test; drop the now-unneeded
     `helper-utils`/`helper-debug` deps from `_test/package.json` ONLY if the test loader itself no longer
     needs them (it usually still builds the container, so they usually stay)
   - docs sweep: README/ROBOTS/docs must not claim "builds its own Lib", "standalone", or "fully
     independent"; usage snippets show `require('...')(Lib, { ... })`
   Companion files `adapter.config.js` / `adapter.errors.js` / `adapter.validators.js` (or `store.*`)
   exist even when minimal or empty (inline `ERRORS` object or inline `if`/`throw` config validation in
   the loader is a violation); `createInterface(Lib, CONFIG, ERRORS, Validators)` fixed slots.

5. **Output a binding-rules checklist** - short, each line citing its `docs/` path/section or reference
   `file:line`. This is the bar the module is held to. No rule without a citation.

## Phase B - Build the Unified Fix List

1. **Enumerate every file first** and keep the listing as a per-file checklist for this run - no file
   may be skipped, sampled, or skimmed:
   // turbo
   ```bash
   # Cwd = codebase-js-helper-modules
   find [module-path] -type f -not -path '*/node_modules/*' -not -name 'package-lock.json' | sort
   ```

2. **Read every enumerated file in full, twice** (formatting and structural issues hide on pass 1):
   `[name].js`, `parts/*.js`, `[name].config.js`, `[name].errors.js`, `[name].validators.js`,
   `package.json`, `eslint.config.js`, `.npmignore`, `README.md`, `ROBOTS.md`, `docs/*.md`,
   `_test/loader.js`, `_test/package.json`, `_test/test.js`, `_test/docker-compose.yml` (if present).
   Read from line 1 to the last line - never rely on offsets, summaries, or search hits as a substitute
   for reading the file. Tick each file on the checklist only after both passes.

   **Read-evidence table (hard gate).** After both passes, output a table in the reply:
   `file | lines | pass 1 done | pass 2 done | one pass-2-only observation`. The pass-2 observation must be
   something a grep cannot find (a structural note, a banner-width check, a return-shape confirmation,
   "clean - verified banners and 3/2/1 spacing"). Greps and sweeps are NOT a substitute for pass 2 -
   they catch mechanical issues only; the two-read rule exists for structural ones. No table = Phase B
   is not done and Phase C may not start.

3. **Assemble the gap list** as the union of:
   - the module's **0051 findings** (S1/S2/S3 + Tier-A), each re-confirmed against current source;
   - a **fresh line-by-line audit** against the Phase A checklist (do not rely on 0051 alone - it predates this pass);
   - a **skeleton conformance diff**: the module's entry file compared element by element against the
     Phase A class skeleton - info banner shape, loader statement groups **and their step comments**,
     companion-file wiring, validators loader signature (`(Lib, ERRORS)`), `createInterface` slots,
     section banners. Record every structural mismatch as a gap item;
   - the **Universal Companion Files audit** (`module-structure-js.md` "Universal Companion Files"):
     (a) `[name].config.js`, `[name].errors.js`, `[name].validators.js` all exist - create empty/no-op
     ones if missing; (b) the loader wires all four fixed slots and calls `Validators.validateConfig(CONFIG)`;
     (c) `createInterface` signature is `(Lib, CONFIG, ERRORS, Validators, [Parts,] [store|adapter|state])` -
     unused slots KEPT (crypto precedent), never removed as dead code; (d) **single-require rule**: only
     `[name].js` requires the companions and `data/*.json` - validators/parts receive `ERRORS` and static
     data **by injection** (`(Lib, ERRORS[, static data])` for the validators loader), never by self-require;
   - **0052 doc-standard gaps** (voice, `schemas.md` if the validators enforce real contracts, config/root hygiene, loader-first README, ROBOTS-last);
   - the **naming conversion** (any `@superloomdev/...` outside `package.json` -> alias `helper-...`).

4. Record each item as `file:line -> rule (citation) -> action`, grouped S1 -> S2 -> S3 -> Tier-A -> docs -> naming.
   Mark anything you cannot cite as `VERIFY` and read the source before acting.

## Phase C - Apply Fixes (in order)

Apply in this order so risky logic changes land first and cosmetics last:

1. **S1 correctness**, then **S2 consistency**, then **S3 cosmetic** - code first.
2. **Tier-A mechanical sweeps** (see battery in Phase D): em-dashes -> ` - `; `.js` Unicode arrows -> `->`
   (arrows are allowed in `.md`); British -> American spelling; remove banned vocab; remove `void identifier;`
   and `_param` (use `// eslint-disable-line no-unused-vars` on the signature instead); remove `docs/` paths from code comments.
3. **Naming (two-form rule).** Convert every `@superloomdev/...` (scope) **and** `js-...helper-...` (bare)
   reference **outside `package.json`** to the alias `helper-...` - README incl. H1 + family links,
   `docs/*.md` body + H1 titles, `ROBOTS.md` body + H1, `// Info:` banners, error-catalog headers,
   error prefixes/messages, code comments. Leave `package.json` (`name` + sibling deps) at scope. Rule source:
   `documentation-standards.md` "Brand Usage" + `error-handling.md` "Programmer Error Message Format".
   Before editing `.js`/`_test` strings, confirm tests do not assert on the old token.
4. **Documentation, in compile order** (`0031` / `module-readme-structure.md`): `README.md` ->
   `docs/api.md` -> `docs/configuration.md` -> `docs/schemas.md` (if validators) -> `docs/data-model.md` /
   class extras -> **`ROBOTS.md` LAST** (compiled from the finalized README + api + configuration; every signature must match).
5. **Config + root hygiene.** `[name].config.js` = only keys the code reads, each with a one-line reason; no
   dead keys, no worked examples (move to `docs/configuration.md`). Root Markdown = only `README.md` + `ROBOTS.md`
   (+ unpublished `THOUGHTS.md`).
6. **Rename discipline (hard).** On any public/identifier rename (e.g. `arrayDistint` -> `arrayDistinct`),
   immediately sweep and fix **all internal callers across the repo** in the same pass - never leave the tree broken:
   // turbo
   ```bash
   # Cwd = codebase-js-helper-modules
   git grep -n "[old-token]" -- 'src/**' '*.md' '*.yml'
   ```

## Phase D - Verify to Convergence (the anti-rerun gate)

Run all checks. If any finds an issue, return to Phase C, fix, and **re-run the entire phase**. Repeat
until **two consecutive full passes find zero new deviations.** Only then proceed to Phase E.

1. **Lint** (must exit 0):
   // turbo
   ```bash
   # Cwd = [module_root]
   npm run lint 2>&1 | tail -20
   ```

2. **Tests via clean install** (must be all green; clean install avoids stale `file:`/1.0.0 swaps):
   // turbo
   ```bash
   # Cwd = [module_root]/_test
   rm -rf node_modules package-lock.json && npm install && npm test 2>&1 | tail -40
   ```
   > If `npm install` fails with `E409 Conflict / checksum mismatch`, the registry is transiently
   > inconsistent (GitHub Packages). Wait 30-60s and re-run. Do **not** use `--legacy-peer-deps` (`pitfalls.md` 21).

3. **Systematic sweep battery** (each must return nothing for this module). Set `Cwd = codebase-js-helper-modules`,
   replace `[module-path]`:
   // turbo
   ```bash
   git grep -n "—" -- '[module-path]' ':!*/node_modules/*'
   ```
   // turbo
   ```bash
   git grep -nE "→|–" -- '[module-path]/**/*.js' ':!*/node_modules/*'
   ```
   // turbo
   ```bash
   git grep -niE "behaviour|colour|favour|licence|optimis|organis|initialis|standardis|serialis|authoris|analyse|centralis|normalis|recognis|synchronis|customis" -- '[module-path]' ':!*/node_modules/*'
   ```
   // turbo
   ```bash
   git grep -niE "comprehensive|seamless|robust|powerful|blazing|effortless|leverage|battle-tested|cutting-edge|world-class|in order to|feel free to|please note|out of the box|a wide range of" -- '[module-path]' ':!*/node_modules/*'
   ```
   // turbo
   ```bash
   git grep -nE "\bvoid [a-zA-Z_]+;|\(_[a-zA-Z]" -- '[module-path]/**/*.js' ':!*/node_modules/*'
   ```
   // turbo
   ```bash
   git grep -n "docs/" -- '[module-path]/**/*.js' ':!*/node_modules/*'
   ```
   // turbo
   ```bash
   git grep -n "@superloomdev/" -- '[module-path]/**/*.md' '[module-path]/**/*.js' ':!*/node_modules/*'
   ```
   // turbo
   ```bash
   git grep -nE "\bjs-(server-|client-)?helper-[a-z][a-z-]*" -- '[module-path]/**/*.md' '[module-path]/**/*.js' ':!*/node_modules/*'
   ```
   The last two enforce the two-form naming rule: neither the scope nor the bare package name may appear
   outside `package.json`. Sole permitted bare-name hits: URLs/links that address a real repo directory path
   (an address, not a name) - judge each manually.
   **Manual checks** (not greppable): table cells do not end with a period; README has no signatures/config
   tables/`npm install`; `ROBOTS.md` signatures match `docs/api.md` exactly (spot-check 3).

4. **Companion-files + injection checks** (Universal Companion Files rule):
   // turbo
   ```bash
   # Cwd = codebase-js-helper-modules - all three companion files must exist
   ls [module-path] | grep -E "\.(config|errors|validators)\.js$"
   ```
   // turbo
   ```bash
   # Must return NOTHING - validators/parts never self-require errors or data
   git grep -nE "require\('\./[a-z-]+\.errors'\)|require\('\./data/" -- '[module-path]/**/*.validators.js' '[module-path]/parts/*.js' ':!*/node_modules/*'
   ```
   Then confirm by reading `[name].js`: the loader requires ERRORS + data once, injects them into the
   validators loader, and forwards `(Lib, CONFIG, ERRORS, Validators, ...)` to `createInterface`.

5. **`file:` rule check** - the only `file:` in `_test/package.json` is this module:
   // turbo
   ```bash
   # Cwd = [module_root]/_test
   grep -n "file:" package.json
   ```

5b. **Skeleton conformance re-diff (hard gate).** Re-open the class skeleton from Phase A next to the
   module's entry file and re-verify the structural elements one by one: loader statement groups each
   carry their step comment, companion files wired (no inline ERRORS, no inline config validation),
   validators loader takes `(Lib, ERRORS)`, `createInterface` slots fixed, banners standard. For Class F
   modules (stores and adapters) additionally grep for the mechanical violations of the injected-Lib shape:
   // turbo
   ```bash
   # Must return NOTHING - self-built Lib inside a Class F loader is a violation
   git grep -nE "require\('helper-(utils|debug)'\)\(" -- '[module-path]/*.js' ':!*/node_modules/*' ':!*/_test/*'
   ```
   // turbo
   ```bash
   # Must return NOTHING - scope-form requires and adapter-owned LOG_LEVEL are violations
   git grep -nE "require\('@superloomdev/|LOG_LEVEL" -- '[module-path]/*.js' ':!*/node_modules/*' ':!*/_test/*'
   ```
   Also verify the loader signature is `(shared_libs, config)` and `package.json` `peerDependencies`
   does not list `helper-utils`/`helper-debug`.
   The reply MUST contain a line `Skeleton conformance: [clean | N mismatches -> fixed]`. A convergence
   claim without it is invalid (`migration-pitfalls.md` "Verification scoped to the fix list instead of
   the class skeleton").

6. **Code/doc review pass (hard gate - produces a visible verdict).** Run the existing review workflow
   and apply anything it surfaces, then loop:
   ```
   /js-helper-module review
   ```
   Read `.devin/workflows/js-helper-module.md` (review section) from disk and execute its checks. The
   reply MUST contain a line of the form `Review verdict: [clean | N findings applied]`. A convergence
   claim without this verdict line is invalid. This step is skipped ONLY if the file does not exist -
   and then say so explicitly.

7. **State convergence explicitly:** "Pass N found zero new deviations; previous pass also clean - converged."
   This statement is valid ONLY if the reply also contains the Phase B read-evidence table and the
   step 6 review verdict. Convergence without evidence is the previous wave's failure mode.

## Phase E - Present All Changes (approval gate - never skip)

After convergence and **before anything touches the registry or git history**, show the user the
complete picture of what this pass changed and WAIT for approval.

0. **Filled Per-run Verification Checklist first (hard gate).** Open the Phase E report with the
   Per-run Verification Checklist (bottom of this file), every line ticked or explicitly marked
   `SKIPPED: [reason]`, each tick pointing to where in this conversation the evidence lives (the
   proof-of-read quotes, the read-evidence table, the review verdict, the sweep outputs). An unticked
   or unexplained line blocks Phase E. This is the user's one screen to catch silently skipped steps.

1. **Overview:**
   // turbo
   ```bash
   # Cwd = codebase-js-helper-modules
   git status --short -- [module-path]; git diff --stat -- [module-path]
   ```

2. **Grouped change report** (in the reply, not a file): for every changed file, list
   `file -> what changed -> why (rule citation from the Phase B gap list)`. Group as
   S1 -> S2 -> S3 -> Tier-A -> docs -> naming. Note anything intentionally NOT changed and why.

3. **Full diff on request:** offer `git --no-pager diff -- [module-path]`; run it if the user asks.

4. **STOP.** Ask: "These are all changes for [name]. Approve to proceed to publish?" Do not run any
   Phase F step until the user explicitly approves. If the user requests changes, apply them by hand
   and re-run **all** of Phase D (convergence resets), then this phase again.

## Phase F - Publish at 1.0.0 (delete-and-republish)

> Mutation steps. **None are auto-run.** Same-version republish: delete from the registry, then push;
> CI republishes 1.0.0 (`0031`; `js-helper-module-refactor` Steps 10-11).

1. **Auth scopes** (once per session): `gh auth login -s "read:packages,delete:packages"`.

2. **Determine owner type** (org vs user endpoints differ; wrong one is a silent no-op). `OWNER` = the
   `@OWNER` scope in `package.json` `name`; `PACKAGE_NAME` = the bare name without `@scope/`:
   ```bash
   gh api /users/OWNER --jq '.type'   # "Organization" or "User"
   ```

3. **Set the base path:**
   ```bash
   # Organization owner:
   BASE=/orgs/OWNER/packages/npm/PACKAGE_NAME
   # Your own user account:
   BASE=/user/packages/npm/PACKAGE_NAME
   ```
   > **Verified 2026-07-04 (utils pass):** `@superloomdev` is an **Organization**, so for this repo the
   > base is always `/orgs/superloomdev/packages/npm/PACKAGE_NAME`. Step 2's lookup can be skipped.

4. **List, then delete all versions:**
   ```bash
   gh api "$BASE/versions"
   gh api "$BASE/versions" --jq '.[].id' | xargs -I {} gh api --method DELETE "$BASE/versions/{}"
   ```

5. **Verify deletion - MUST return `404 Package not found`:**
   ```bash
   gh api "$BASE/versions"
   ```
   If it returns a versions array, the package still exists - do not proceed.

6. **Commit ONLY this module's files** (single-line message; never `git add .`):
   ```bash
   git add [module-path]/
   git commit -m "chore([name]): unify to frozen standard (0053) - fixes, docs, naming, 1.0.0"
   git push
   ```

7. **Confirm CI published 1.0.0:** watch `ci-helper-modules.yml` green, then:
   ```bash
   gh api "$BASE/versions" --jq '.[] | {id, name}'
   ```
   `1.0.0` must appear. If CI fails, return to Phase C, fix, and re-run Phase D before re-publishing.

## Phase G - Record, Self-improve, STOP

1. **Update plan state.** Tick the module in `__dev__/plans/0053-helper-module-unification-wave.md`;
   note any per-module surprise under its Discoveries.

2. **Self-improve (the workflow improves with the wave).** If this pass exposed a new failure mode or a
   gap in the standard or in this workflow:
   - capture the failure mode via `/learn` into the correct pitfall doc **before** moving on, then `/compile-agents-md`;
   - refine **this `unify-module.md`** (add the missing check/sweep) so the next module benefits.

3. **STOP and ask, with the next command ready.** Look up the **first unticked module** in the 0053
   plan's "Module sequence" and resolve its path (core modules live under `src/helper-modules-core/`,
   server modules under `src/helper-modules-server/`, client modules under `src/helper-modules-client/` -
   verify with `ls` if unsure). End the report with:

   > Module [name] unified, verified, and published at 1.0.0.
   > Next in sequence: **[next-name]**. To continue, run:
   > `/unify-module [next-module-path]`

   Example: `/unify-module src/helper-modules-core/js-helper-debug`

   Wait for explicit confirmation. **Never auto-continue.** If all modules are ticked, say so and point
   to the plan's Final step (wrap-up) instead.

---

## Per-class doc deltas (which `docs/` files this module ships)

Derive the authoritative set from `docs/modules/complex-module-docs-guide.md`; summary:

| Class | docs/ set | schemas.md? | README class section |
|---|---|---|---|
| A Foundation | api, configuration | if `*.validators.js` (e.g. money) | none |
| B Extended utility | api, configuration | if input contracts | "Behavior" |
| C Driver wrapper | api, configuration | connection/query contracts | "Hot-Swappable" |
| D Cloud wrapper | api, configuration, optional iam | as C | "Credentials and IAM" |
| E Feature module | api, configuration, schemas, data-model, optional runtime | yes | "Architecture Overview" + adapters |
| F Dependent adapter | store: api, configuration, schema, cleanup; adapter: api, configuration | no (parent owns contract) | none |
| G Feature + extensions | api, configuration, schemas (if validators), data-model | yes if validators | "Architecture Overview" + "Extensions" |
| H Extension | api, philosophy | no | "Extension vs Parent" |

## Loop-backs (when something recurs)

- A Phase D check fails -> back to Phase C, then re-run **all** of Phase D (convergence resets).
- `/js-helper-module review` surfaces an issue -> fix, re-run Phase D.
- The user requests changes at the Phase E gate -> apply by hand, re-run all of Phase D, re-present Phase E.
- CI fails in Phase F -> back to Phase C; re-verify; re-run Phase E; re-publish.
- A genuinely undecided convention appears -> **STOP and ask**; if resolved, record it in `docs/` (Phase G self-improve) before continuing.

## Per-run Verification Checklist

- [ ] Target module + class declared; assumptions dropped
- [ ] Frozen standard docs re-read; clean sibling fingerprint derived; binding-rules checklist cited
- [ ] File listing enumerated; EVERY file read in full twice and ticked; unified gap list built (0051 + fresh audit + 0052 docs + naming), each cited
- [ ] All edits made by hand with the editor tool - zero scripts, zero bulk terminal rewrites
- [ ] Fixes applied S1 -> S2 -> S3 -> Tier-A -> docs (ROBOTS last) -> naming; renames swept repo-wide
- [ ] Lint exit 0; clean-install tests green
- [ ] Sweep battery clean (em-dash, `.js` arrows, spelling, banned vocab, void/`_param`, `docs/`-in-comments, scope-leak, bare-name-leak)
- [ ] Universal Companion Files satisfied: config/errors/validators all exist; four fixed `createInterface` slots kept; single-require rule (ERRORS + data injected into validators, never self-required)
- [ ] Skeleton conformance diff done (Phase B) and re-verified (Phase D 5b) with the verdict line; Class F modules: loader `(shared_libs, config)`, Lib by reference (no self-built Lib), no LOG_LEVEL key, no scope-form requires, no helper-utils/helper-debug peerDependencies, companion files present
- [ ] `file:` rule satisfied (only this module is `file:`)
- [ ] `/js-helper-module review` clean
- [ ] Audit converged: two consecutive clean passes
- [ ] Phase E change report presented (grouped, cited); user explicitly approved before publish
- [ ] Package deleted (404 verified); module-only commit; CI published 1.0.0 (verified live)
- [ ] Plan ticked; new failure modes captured via `/learn`; workflow self-improved if needed
- [ ] STOPPED and asked the user before the next module, ending with the ready-to-run `/unify-module [next-module-path]` command
