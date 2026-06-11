---
description: Unified workflow for JS helper modules - create new, create migrate, review, or publish
---

# JS Helper Module Workflow

One workflow for the full lifecycle of a JavaScript helper module. Pick the mode that matches your task:

| Mode | When to use |
|---|---|
| `create new` | Building a module from scratch |
| `create migrate` | Porting an existing module from another codebase into this repo |
| `review` | Post-build quality pass on code and documentation |
| `publish` | CI/CD registration, version bump, release |

---

## Common Standards

Read this section before any mode. These principles apply universally.

### Module Categories

Identify which category the module belongs to before starting. Each category has different structural expectations.

| Category | Characteristics | Pattern | Reference examples |
|---|---|---|---|
| Stateless singleton | No factory, flat config, no per-instance state | Pattern 1 | utils, debug, time |
| Stateful factory | `createInterface`, per-instance state or config | Pattern 2 | money, geo, contact |
| Adapter-backed factory | Factory + pluggable store adapter | Pattern 2 + Store | auth, verify, distinct-queue |
| Store adapter | Implements a store contract for a parent module | Pattern 2 (Class F) | verify-store-dynamodb, auth-store-mongodb |
| Vendor wrapper | Wraps a cloud SDK or external service | Pattern 2 | nosql-aws-dynamodb, storage-aws-s3 |
| Extension module (Class H) | Framework-specific binding for a parent module (Class G) | Extension pattern | styler-ext-react |

Reference examples are for pattern recognition, not copy-paste. Read them to understand the shape, then apply first principles.

**Adapter-backed module lifecycle:** When a module uses pluggable store adapters, development follows a strict sequence:

1. **Core module first.** Build and test the core module using an in-memory mock store (`_test/memory-store.js`). This mock implements the full store contract in plain arrays/objects — no external dependencies. The core module is published before any adapter work begins.
2. **Adapters second.** Each adapter is a separate module created after the core is published. Adapters depend on the core module's error catalog (passed via `ERRORS` at loader time) and implement the contract validated by the core's `Validators.validateStoreContract`.
3. **One adapter at a time.** Build, test, and publish adapters individually. Each has its own `docker-compose.yml` with the relevant database emulator.
4. **Contract test suite.** Each adapter's `_test/store-contract-suite.js` contains shared tests that validate the 4-method contract against a real (emulated) backend. The core module's `_test/memory-store.js` serves as the behavioural reference.

**Extension module lifecycle:** Similar to adapter-backed modules but with a different dependency pattern:

1. **Parent module first.** Build and test the parent module with its standard dependencies. The parent can be any class (A through E).
2. **Extension second.** Build the extension module after the parent is published. The extension imports the parent directly (not the other way around). The extension receives both the parent module AND the framework dependency (React, Vue, etc.) at loader time.
3. **Entry point naming.** Extension modules use `extension.js` as the main entry point (not `index.js`). This makes the module type discoverable by filename and keeps the convention consistent with store/adapter naming.
4. **Naming convention.** Extension modules follow `[parent-name]-ext-[framework]`. Example: `js-client-helper-styler-ext-react` (works with React DOM, React Native, React Native Web).
5. **Documentation split.** Parent module owns `docs/configuration.md`, templates, derivation rules. Extension module owns `docs/api.md` (hooks/components) and `docs/philosophy.md` (extension pattern explanation).

### Store Adapter Implementation Rules

When implementing a store adapter, you call the wrapper module's API (e.g., `js-server-helper-nosql-mongodb`), not native database driver methods directly.

**Before writing any adapter code:**
1. **Read the wrapper's exported methods** — grep for `^    \w+: (async )?function` in the wrapper module to see available methods
2. **Map required operations to wrapper methods** — document in THOUGHTS.md which wrapper method implements each store contract requirement
3. **Never use native driver method names in code** — if you find yourself typing `deleteMany`, `findOne`, `insertOne`, you are using native names. Use the wrapper's exported names (e.g., `deleteRecordsByFilter`, `getRecord`, `writeRecord`, `query`)

**Two contexts, two vocabularies:**

| Context | Reference | Example |
|---------|-----------|---------|
| **Schema docs** (`docs/schema.md`) | Database concepts for reader understanding | "Uses `deleteMany` to remove multiple records" |
| **Implementation** (`store.js`) | Wrapper API for actual calls | `lib_mongodb.deleteRecordsByFilter(...)` |

**Common wrapper method mapping (verify in actual wrapper module):**
- SQL wrappers: `getRecord`, `writeRecord`, `deleteRecord`, `query`
- MongoDB wrapper: `getRecord`, `writeRecord`, `deleteRecord`, `deleteRecordsByFilter`, `query`, `createIndex`
- DynamoDB wrapper: `getRecord`, `writeRecord`, `deleteRecord`, `batchWriteAndDeleteRecords`, `query`, `scan`

### Module Types

| Type | Directory | Constraints |
|---|---|---|
| Core | `src/helper-modules-core/js-helper-[name]/` | Platform-agnostic, no Node.js-specific APIs |
| Server | `src/helper-modules-server/js-server-helper-[name]/` | Node.js APIs, cloud SDKs, database drivers allowed |
| Client | `src/helper-modules-client/js-client-helper-[name]/` | Browser-compatible, minimize bundle size |

### First Principles

These are not rules to memorize. They are thinking tools to apply during every decision:

1. **Every return field must have a consumer.** If nobody reads a field, remove it from the return shape
2. **Every function must have a caller.** If nothing calls it, delete it
3. **Docs describe what IS.** Never document things that do not exist ("reserved for future use") or things that are absent ("no X flag")
4. **No implementation leakage in caller-facing docs.** Internal utility names, internal field names, and algorithmic details belong in code comments or THOUGHTS.md, not in README or api.md
5. **Delegate to base modules.** If a base module already provides the capability, use it. `Lib.Utils` for type checks, validation, random strings, timestamps. `Lib.Debug` for logging. `Lib.Crypto` for hashing and encryption. `Lib.Time` for date math. Never reinvent what the framework already offers
6. **Consistent examples.** Pick one domain example per module and use it everywhere in that module's docs and tests
7. **Error handling follows framework conventions.** Full rules in `docs/foundations/error-handling.md` (in codebase-superloom). Read that document for the complete error design philosophy, throw/return boundaries, and error object shapes

### Documentation File Responsibilities

| File | Audience | Contains |
|---|---|---|
| `README.md` | Humans (developers integrating the module) | What it does, why, API table, usage snippets, install, config, testing status |
| `ROBOTS.md` | AI agents (code generators, assistants) | Compact reference: functions, signatures, return shapes, critical behaviour rules |
| `docs/api.md` | Humans (detailed reference) | Every function with full parameter tables, return shapes, lifecycle steps, error catalog |
| `docs/configuration.md` | Humans | Loader pattern, every config key, store config shapes, peer dependencies |
| `docs/data-model.md` | Humans (adapter-backed modules only) | Record shape, field semantics, core concepts, sort key design |
| `THOUGHTS.md` | Internal contributors | Engineering decision journal: rejected approaches, trade-offs, limitations. Not published to npm |

Not every module needs every file. Stateless singletons may only need README + ROBOTS. Adapter-backed modules need the full set.

**Note on `docs/runtime.md`:** This file is NOT part of the standard. Deployment-specific notes (e.g., connection pool size in serverless) belong in the README under a "Deployment Notes" heading, or in THOUGHTS.md if they are design rationale. A separate runtime doc is not warranted unless the module has fundamentally different behaviour across runtimes.

### Code Standards (applies to all modes)

**Read these documents before writing code. They are the source of truth:**

| Document | Location (in codebase-superloom) | Covers |
|---|---|---|
| Code formatting | `docs/foundations/code-formatting-js.md` | Spacing, quotes, comments, section headers, naming |
| Module structure | `docs/modules/module-structure-js.md` | Loader patterns, factory vs singleton, public/private layout |
| Error handling | `docs/foundations/error-handling.md` | Throw vs return, error object shapes, frozen catalogs |

The AI agent must read the relevant document(s) above when executing any mode of this workflow. Do not rely on summaries — the full rules contain nuance that summaries lose.

**Non-negotiable formatting rules** (commonly missed — enforce in every mode):

- **Every logical block gets a single-line step comment** explaining what the next 2-5 lines do. No bare code blocks without a preceding comment.
- **Level 2 section headers** (`// ~~~~~~~~~~~~~~~~~~~~ [Name] ~~~~~~~~~~~~~~~~~~~~` + purpose comment) must group related functions inside public and private objects when there are 3+ functions or 2+ responsibility groups. Purpose comment: one line is ideal, up to 4 lines is acceptable when the grouping needs real motivation.
- **TWO empty lines** between function definitions (within the same object). ONE empty line between a section header and its first JSDoc block.

### Required Files (every module)

| File | Purpose |
|---|---|
| `[module-name].js` | Main implementation |
| `[module-name].config.js` | Configuration defaults (if module needs config) |
| `[module-name].errors.js` | Frozen error catalog (if module returns errors) |
| `[module-name].validators.js` | Input validation functions (if module validates options) |
| `package.json` | Package identity, dependencies, scripts |
| `eslint.config.js` | ESLint v9+ config (copy from `js-helper-utils`) |
| `.npmignore` | Controls what ships to npm (copy from `js-helper-utils`) |
| `README.md` | Human documentation |
| `ROBOTS.md` | AI agent reference |
| `THOUGHTS.md` | Engineering decision journal (not published to npm) |
| `_test/test.js` | Unit tests |
| `_test/loader.js` | Test loader (only file that reads `process.env`) |
| `_test/package.json` | Test dependencies (`"private": true`, module as `"file:../"`) |

---

## create new

Build a module from scratch. You already know what problem it solves and have designed the interface.

### Steps

1. **Determine module type and category.** Use the tables above. This decides directory path and pattern choice.

2. **Create module directory.**
   ```
   src/helper-modules-core/js-helper-[name]/        # Core
   src/helper-modules-server/js-server-helper-[name]/  # Server
   src/helper-modules-client/js-client-helper-[name]/  # Client
   ```

3. **Create main implementation file.** Pick Pattern 1 or Pattern 2 based on the category table. Full templates in `docs/modules/module-structure-js.md`.

   **Pattern 1 (Singleton):**
   - Config loading at top with override guard
   - `module.exports = function loader (Lib, config) { ... return ModuleName; }`

   **Pattern 2 (Factory):**
   - Loader builds `Lib`, `CONFIG`, returns `createInterface(Lib, CONFIG)`
   - Inside `createInterface`: public functions first, private functions second
   - Public in `const ModuleName = { ... }`, private in `const _ModuleName = { ... }`

4. **Create config file** (if applicable). Pure defaults, no `process.env`.

5. **Create errors file** (if module returns operational errors). Use `Object.freeze()` on every error object.

6. **Create validators file** (if module validates caller options). One validation function per public method.

7. **Create `package.json`.**
   ```json
   {
     "name": "@superloomdev/js-[server-]helper-[name]",
     "description": "[One-line description]",
     "version": "1.0.0",
     "main": "[module-name].js",
     "private": false,
     "license": "MIT",
     "author": { "name": "sj00" },
     "publishConfig": { "registry": "https://npm.pkg.github.com" },
     "engines": { "node": ">=24" },
     "devDependencies": {
       "eslint": "^10.2.0",
       "@eslint/js": "^10.0.1"
     },
     "scripts": {
       "lint": "eslint .",
       "lint:fix": "eslint . --fix",
       "test": "node --test _test/test.js"
     }
   }
   ```

8. **Create `eslint.config.js` and `.npmignore`.** Copy from `src/helper-modules-core/js-helper-utils/`.

9. **Create test infrastructure.**
   - `_test/package.json`: `"private": true`, module referenced as `"file:../"`
   - `_test/loader.js`: Only file that reads `process.env`. Returns `{ Lib }` or `{ Lib, Config }`
   - `_test/test.js`: Uses `node:test` and `node:assert/strict`. One `describe` per function. Test names: `should [behavior] when [condition]`
   - For adapter-backed modules: `_test/memory-store.js` implementing the store contract in-memory

10. **Create documentation.** Follow the Documentation File Responsibilities table.

    **For Class F store adapters**, the README is **short and focused**:
    - Badges (3: Test + License + Node.js)
    - Short description + key innovation sentence (what makes this backend implementation clever)
    - Usage snippet
    - Configuration (prose explanation of `STORE_CONFIG` keys)
    - Extended Documentation links
    - Testing + License (MIT)

    **Details go in `docs/` not README:** schema, index design, query patterns, backend concepts.

11. **Register environment variables** (if module needs them). Add to all four files:
    - `docs/dev/.env.dev.example`
    - `docs/dev/.env.integration.example`
    - `__dev__/.env.dev`
    - `__dev__/.env.integration`

12. **Verify.**
    // turbo
    Run from `_test/` directory: `npm install && npm test`

---

## create migrate

Port an existing module from another codebase. The goal is not to copy-paste and reformat. It is to understand the original deeply, then design the new module from first principles, informed by the original.

### Steps

1. **Read the original module source.** Every file: implementation, config, tests, any documentation. Understand the public API, internal data structures, and dependencies.

2. **Trace how it is used.** Find callers in the consuming codebase. Read the actual call sites. Understand:
   - What problem does it solve in production?
   - Which functions are actually called? (Some may be dead code)
   - What data flows in and out?
   - What deployment context does it run in? (Lambda, long-running server, both)

3. **Extract the problem statement.** Write one paragraph:
   > "This module exists because [problem]. The core behaviour is [X]. Everything else is implementation detail."

   This paragraph becomes the seed for the README's "What It Does" section.

4. **Identify what to keep vs shed.**

   **Keep:**
   - The core algorithm and invariants
   - The data relationships and ordering guarantees
   - The deployment constraints that are still real

   **Shed:**
   - Legacy patterns (callbacks to async/await, old error handling)
   - Vendor-specific tricks that are now abstracted by store adapters
   - Unnecessary complexity (flags, retry counts, sentinel records that were never properly used)
   - Dead functions (present in code but never called)
   - Fields in return shapes that no caller reads

5. **Design the new interface from first principles.** Do not port the old API. Ask:
   - "What is the minimal set of functions that solves the problem?"
   - "What does the caller need in the return shape, and nothing more?"
   - "Which category does this module belong to?" (Use the category table)

   Document rejected approaches in `THOUGHTS.md`.

6. **Create a plan.** Write it in `__dev__/plans/` following `docs/dev/planning.md`. Include:
   - Architecture decisions and rationale
   - Final interface (functions, parameters, return shapes)
   - Record shape (if adapter-backed)
   - Deployment constraints

7. **Build.** Follow all steps from `create new` (steps 1-12 above). The module is now new code informed by old understanding, not restructured old code.

---

## review

Post-build quality pass. Two phases: code first, then documentation. Run this after a module is built and functionally working.

### Code Pass

Work through these questions for every public function:

1. **Trace every return field.** For each field in the return shape:
   - Who produces it? (Module internals or caller)
   - Who consumes it? (Caller, another method, or nothing)
   - If nothing consumes it, remove it

2. **Find dead code.**
   - Functions with zero callers: delete
   - Error definitions that are never returned: delete
   - Validators for removed methods: delete
   - Internal helpers that were scaffolded but unused: delete

3. **Check base module delegation.**
   - Type checks → should use `Lib.Utils`
   - Random strings → should use `Lib.Utils.generateRandomString()`
   - Timestamps → should use `Lib.Utils.getUnixTimeInMilliSeconds()`
   - Are we reinventing anything that a peer dependency already provides?

4. **Verify return shapes are minimal.** Only include what the caller acts on. Internal ordering signals, internal IDs, and debugging fields do not belong in the public return.

5. **Check error catalog.** Every defined error must be returned by at least one code path. Remove "reserved" errors.

### Documentation Pass

Read each doc file asking: "If I knew nothing about this module and needed to integrate it in 15 minutes, could I?"

1. **Check for internal leakage.** Search for:
   - References to internal utility function names (e.g., `Lib.Utils.someFunction()`)
   - Internal field names exposed in caller-facing docs
   - Implementation algorithm details in README or api.md
   - These belong in code comments or THOUGHTS.md, not in public docs

2. **Check for factual errors.** Compare docs against the actual code:
   - Do parameter tables match real function signatures?
   - Do return shape tables match what the code actually returns?
   - Do "Set by" / "Produced by" attributions match reality?
   - Do lifecycle steps match the actual execution order?

3. **Check structure against standards.** Does each file have the sections it should? (See Documentation File Responsibilities table.) Missing sections:
   - api.md: intro paragraph, conventions table, TOC
   - README: badges, Why section, usage snippets, install command, license
   - ROBOTS.md: complete function list with return shapes

4. **Check for negative content.** "Why not X" sections, "No X flag", "Unlike Y" comparisons — these belong exclusively in THOUGHTS.md. Public docs describe what IS.

5. **Check example consistency.** One domain example used throughout all files in the module (docs, tests, README). No mixing of unrelated example domains.

---

## publish

Operational steps to register, version, and release a module. Run after `create` and `review` are complete.

### Package Identity

- [ ] `package.json` `name` is `@superloomdev/js-[server-]helper-[name]`
- [ ] `publishConfig.registry` is exactly `https://npm.pkg.github.com` (no trailing slash, no `/@superloomdev` suffix)
- [ ] `private: false`, `license: MIT`
- [ ] `scripts` includes: `lint`, `lint:fix`, `test`
- [ ] `engines.node` is `">=24"`
- [ ] No stale or unused dependencies
- [ ] New modules start at version `1.0.0`

### Dependency Version Verification

For every runtime and dev dependency:

- [ ] Run `npm view <package> version` to get latest stable
- [ ] Use caret ranges (`^major.minor.patch`)
- [ ] Run `npm install && npm test && npm run lint` — all must pass

### npmrc Audit

// turbo
- [ ] No `.npmrc` in module directory
// turbo
- [ ] No `.npmrc` in `_test/` directory
// turbo
- [ ] No `.npmrc` in project root
- [ ] Global `~/.npmrc` has:
  - `@superloomdev:registry=https://npm.pkg.github.com`
  - `//npm.pkg.github.com/:_authToken=${GITHUB_READ_PACKAGES_TOKEN}`
  - `registry=https://registry.npmjs.org/`
- [ ] `echo $npm_config_registry` is empty

### Required Files (verify physical presence)

// turbo
- [ ] `eslint.config.js` exists
// turbo
- [ ] `.npmignore` exists
// turbo
- [ ] `README.md` exists
// turbo
- [ ] `ROBOTS.md` exists
// turbo
- [ ] `_test/test.js` exists
// turbo
- [ ] `_test/loader.js` exists
// turbo
- [ ] `_test/package.json` exists
- [ ] Verify with `npm pack --dry-run`: only source, `README.md`, `ROBOTS.md`, `docs/`, `package.json` ship

### CI/CD Registration (first publish only)

**This is a one-time task.** Once a module's `test-*` and `publish-*` jobs exist in the CI workflow, subsequent version bumps are handled automatically by the detect job. You only add CI jobs when a module is first created.

Single unified workflow: `.github/workflows/ci-publish-helper-modules.yml`

The pipeline is **strictly sequential** — every module runs after the previous module's publish job. This ensures all dependencies are on the registry before any dependent module installs them.

**Placement rules:**

1. **Read the execution order** in the header comment at the top of the CI file. Each module is numbered and the chain is explicit.
2. **Find the correct position** by identifying the module's dependencies. The new module must be placed **after** the last dependency's publish job and **before** any module that depends on it.
3. **For adapter-backed modules:** the core module must appear before its store adapters. Store adapters chain after the core module's publish job.
4. **Chain the next module** by updating the `needs:` of the module that previously chained off your insertion point to now chain off the new module's `publish-*` job.

**Adding a test + publish job pair:**

- [ ] Add a `test-[suffix]:` job that `needs: [detect, publish-[previous-module]]`
- [ ] Add a `publish-[suffix]:` job that `needs: [detect, test-[suffix]]`
- [ ] Use `contains(fromJSON(...))` with the module's full `src/` path for both `if:` conditions
- [ ] The test job's `if:` must include `always() && !cancelled()` to bypass transitive `success()` — see `docs/dev/pitfalls.md`
- [ ] The publish job's `if:` must include `!cancelled()` and the explicit `needs['test-...'].result == 'success'` pattern
- [ ] Update the execution order header comment with the new module number
- [ ] Update the `needs:` of the **next** module's test job to chain off `publish-[new-module]`

**Reference an existing job pair** in the same file as a template. Copy the structure of a module with similar characteristics (offline vs service-dependent, adapter vs standalone).

**For service-dependent modules (uses Docker in tests):**
- [ ] `_test/docker-compose.yml` exists with emulator service
- [ ] `_test/ops/00-local-testing/` has setup guide
- [ ] Environment variables in the CI `env:` block match test loader expectations
- [ ] `pretest`/`posttest` in `_test/package.json` manage container lifecycle

### CI/CD Verification Commands

```bash
# Check test job exists
grep "^  test-[suffix]:" .github/workflows/ci-publish-helper-modules.yml

# Check publish job exists
grep "^  publish-[suffix]:" .github/workflows/ci-publish-helper-modules.yml

# Check working-directory paths
grep "working-directory.*js-server-helper-[module-name]" .github/workflows/ci-publish-helper-modules.yml

# Verify chain: next module should need publish-[suffix]
grep "publish-[suffix]" .github/workflows/ci-publish-helper-modules.yml
```

### Testing Verification

- [ ] `_test/loader.js` is the ONLY file reading `process.env`
- [ ] `_test/test.js` does NOT contain `process.env`
- [ ] `_test/package.json` has `"private": true` and module as `"file:../"`
- [ ] Tests follow naming: `should [behavior] when [condition]`
- [ ] One `describe` per function
// turbo
- [ ] Tests pass: run `npm install && npm test` from `_test/`

### Documentation Sync

- [ ] README, ROBOTS match committed source (no references to uncommitted code)
- [ ] `docs/testing/module-testing.md` updated with module entry
- [ ] `AGENTS.md` updated if architecture changed (run `/compile-agents-md`)
- [ ] Cross-reference check: no old module names remain in documentation

**Cross-reference search (for renamed modules):**
```bash
git grep "js-server-helper-<old-name>" -- \
  'docs/**' 'AGENTS.md' '.windsurf/**' \
  'src/**/*.md' 'src/**/*.js' '*.yml'
```

### Migration Changelog Entry

Document changes in `__dev__/migration-changelog.md`:
- Module name and version
- Architecture changes
- Public API changes (or note if unchanged)
- Config changes (removed/added keys)
- Dependency changes
- Test updates

**For gitignored files, use the safe terminal pattern:**
```bash
# Create temp file with write_to_file tool, then:
cat /tmp/migration-entry.md >> /path/to/__dev__/migration-changelog.md
rm /tmp/migration-entry.md
```

### Commit and Release

- [ ] `git status` — nothing unexpected uncommitted
- [ ] `git diff` — review staged changes, no secrets
- [ ] Version **bumped** in `package.json` (patch/minor/major per semver)
- [ ] Commit message: `feat(module-name): description` (single-line via `-m`)
- [ ] Push to `main` → CI runs tests, detects version bump, publishes
- [ ] **Single-line commit messages only.** Multi-line `-m` strings hang the IDE terminal. For structured bodies, use multiple `-m` flags or `git commit -F /tmp/commit-msg`
