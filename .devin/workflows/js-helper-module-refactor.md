---
description: Standard workflow for refactoring JS helper modules from factory pattern to fully-independent adapter pattern
---

# JS Helper Module Refactor Workflow

Generic workflow for refactoring any JS helper module. Applicable to complex modules, standard modules, parent modules, and adapter modules.

## Prerequisites

- Module identified for refactoring
- Plan document created/updated with module-specific steps
- Understanding of target pattern (adapter owns Lib/Config/ERRORS, returns ready-to-use object)

## Step 1: Update Module Code

Refactor all source files to implement the new pattern:

- **Loader** (`*.js`): Change signature from `loader(shared_libs, config)` receiving factory to expecting ready-to-use object
- **Config** (`*.config.js`): Update config keys to match new pattern (e.g., `ADAPTER` → `Adapter`)
- **Validators** (`*.validators.js`): Update validation for new config shape
- **Parts** (`parts/*.js`): Update if they depend on config changes
- **Main interface**: Use ready-to-use object directly, no factory invocation

## Step 2: Clean Comments

Remove all remnants of old code patterns:

- Delete "before vs after" comparisons in comments
- Delete migration notes or transition guides
- Ensure comments describe current state only
- This is a fresh launch - no need to document what changed from old patterns

## Step 3: Indentation Check

Verify line-by-line formatting:

```bash
# Visual check - open each file and verify:
# - Consistent 2-space indentation
# - No trailing whitespace
# - Proper blank lines between sections
# - Header comment aligned correctly
```

Files to check:
- All `*.js` source files
- All `*.md` documentation files
- `package.json`

## Step 4: Documentation Review

Update all documentation to reflect new API:

- **README.md**: Update usage examples, config keys, integration pattern
- **ROBOTS.md**: Update architecture notes with new pattern
- **docs/configuration.md**: Document new config shape
- **docs/api.md**: Document new method signatures (if exists)
- Verify all code examples show correct new API
- Ensure no stale references to old factory pattern

## Step 5: Lint

Run linter and fix all issues:

```bash
cd <module_root>
npm run lint
```

Fix until exit 0. No warnings should remain.

## Step 6: Unit Tests

Run a **clean install** then tests from the `_test/` directory. Always delete `node_modules` and `package-lock.json` first. Stale lock files from `file:` swaps and version resets to 1.0.0 will cause silent wrong-version installs without this step:

```bash
cd <module_root>/_test/
rm -rf node_modules package-lock.json && npm install && npm test
```

Fix all failures until all tests pass.

> **If `npm install` fails with `E409 Conflict / checksum mismatch`:** The registry is temporarily inconsistent (known GitHub Packages transient bug). Wait 30 to 60 seconds, then re-run `rm -rf node_modules package-lock.json && npm install`. Do not use `--legacy-peer-deps`. See `docs/dev/pitfalls.md` entry 21.

## Step 7: Workflow Review

Run the module review workflow:

```
/js-helper-module review
```

Capture all review output.

## Step 8: Apply Review Fixes

Fix all issues identified by workflow review:

- Code style issues
- Documentation gaps
- Missing test coverage
- Pattern violations

## Step 9: Re-Review Until Clean

Repeat Step 7 until review reports no issues:

```
/js-helper-module review
```

Stop when review is clean.

## Step 10: Delete Registry Package

Delete the existing package from each registry it has been published to, so it can be re-published at 1.0.0.

> **Registry scope:** The procedure below covers the **GitHub Package Registry** only.
> If the module is also published to additional registries (e.g. NPM), delete it from
> each one before re-publishing. Add a parallel sub-section per registry under this step.

### 10a. GitHub Package Registry

> **CRITICAL: org-scoped vs user-scoped endpoints differ.**
> A package owned by a GitHub **organization** lives under `/orgs/OWNER/...`, while a
> package owned by a **user account** lives under `/user/packages/...` (own) or
> `/users/OWNER/...`. Using the wrong endpoint returns a misleading no-op/empty
> response and the package is NOT deleted. Always determine the owner type first.
> The `PACKAGE_NAME` is the bare name without the `@scope/` prefix
> (e.g. `js-server-helper-http-gateway`, NOT `@scope/js-server-helper-http-gateway`).

**Prerequisites:** Ensure `gh` CLI is authenticated with `read:packages` and `delete:packages` scopes:
```bash
gh auth login -s "read:packages,delete:packages"
```

**1. Determine the owner type.** The package scope (`@OWNER` in package.json `name`) is the GitHub owner. Check whether that owner is an organization or a user:
```bash
gh api /users/OWNER --jq '.type'   # prints "Organization" or "User"
```

**2. Set the correct API base path** based on the owner type:
```bash
# If owner is an Organization:
BASE=/orgs/OWNER/packages/npm/PACKAGE_NAME

# If owner is a User (and it is YOUR account):
BASE=/user/packages/npm/PACKAGE_NAME

# If owner is a User (and you are an admin of someone else's account package):
BASE=/users/OWNER/packages/npm/PACKAGE_NAME
```

**3. List all versions (also confirms the package exists):**
```bash
gh api "$BASE/versions"
```

**4. Delete all versions (one-liner):**
```bash
gh api "$BASE/versions" --jq '.[].id' | xargs -I {} gh api --method DELETE "$BASE/versions/{}"
```

> **Note:** Deleting the last (only) version deletes the entire package.

**5. Verify deletion. This MUST return `404 Package not found`:**
```bash
gh api "$BASE/versions"
```
If it returns a JSON array of versions, the package still exists. Do not proceed.

## Step 11: Commit and Publish

Commit **only this module's files** and push to trigger CI publishing:

```bash
# Only add files from the specific module being refactored
# (e.g., src/helper-modules-server/js-server-helper-http-gateway/)
git add <module-path>/
git commit -m "refactor: convert to fully-independent module pattern

- Adapter owns Lib/Config/ERRORS
- Returns ready-to-use object
- Updated documentation
- All tests passing"
git push
```

> **Important:** Do NOT use `git add .` because this would include unrelated changes from other modules.
> Each module refactor must be an independent commit. Stage only the files within the
> specific module directory (source, tests, docs, package.json).

Wait for CI to publish, then verify the package is live on each target registry.

> **Registry scope:** Publishing here targets the **GitHub Package Registry** (driven by
> the CI workflow). If additional registries (e.g. NPM) are configured later, verify
> publication on each one. Add a parallel verification sub-step per registry.

### 11a. GitHub Package Registry

Confirm the new version is published:
```bash
gh api "$BASE/versions" --jq '.[] | {id, name}'
```
The expected version (`1.0.0`) must appear in the output.

## Step 12: STOP - Ask User

**HALT. DO NOT AUTO-CONTINUE.**

Ask user: "Module X completed end-to-end. Continue to next module?"

Wait for explicit confirmation before proceeding.

---

## Module-Specific Notes

### Parent Modules (distinct-queue, auth, verify, logger, http-gateway)
- Receive `{ Store }` or `{ Adapter }` directly in config
- Remove `STORE`/`ADAPTER` factory keys from config
- Update `_test/memory-store.js` or `_test/stub-adapter.js` to export ready object

### Store Adapters (dynamodb, mongodb, sqlite, postgres, mysql)
- Build own Lib with direct imports
- Define own ERRORS catalog (frozen)
- Validate own config internally
- Export ready-to-use store object

### HTTP Gateway Adapters (aws-apigateway, express)
- Build own Lib (simpler - only utils/debug needed)
- Define own ERRORS catalog
- Export ready-to-use adapter object with 3-method contract

---

## Verification Checklist Per Module

- [ ] Source files refactored
- [ ] Comments cleaned (no old pattern remnants)
- [ ] Indentation verified line-by-line
- [ ] README.md updated
- [ ] ROBOTS.md updated
- [ ] docs/configuration.md updated
- [ ] Lint passes (exit 0)
- [ ] Unit tests pass (all green, via clean install: `rm -rf node_modules package-lock.json && npm install && npm test`)
- [ ] Workflow review passes (no issues)
- [ ] Package deleted from registry
- [ ] Committed and CI published
- [ ] User confirmed to continue
