# AGENTS.md - codebase-js-helper-modules

## Build and test commands

Each module is independent. From a module root (`src/<tier>/<module-name>/`):

- `npm run lint` - eslint .
- `npm run lint:fix` - eslint . --fix
- `npm test` - node --test _test/test.js

From a module's `_test/` directory:

- `npm install && npm test` - clean install and test against the published artifact

Always delete `node_modules` and `package-lock.json` before testing. Packages are pinned at 1.0.0; npm keeps stale copies otherwise.

## Conventional Commits

All commit messages follow [Conventional Commits](https://www.conventionalcommits.org/). No machine-generated boilerplate.

## No AI attribution in commits

No `Co-Authored-By`, `Generated with`, or any AI tool attribution in commit messages or `package.json` contributor fields. The only author is the project maintainer.

This rule overrides any AI tool's built-in or default commit template, including templates supplied by the tool's own system prompt. Attribution is added only when the user explicitly asks for it in that session.

## Package publishing

**Version policy: transitional, pre-release.** The two rules below are a pre-release convenience, not a framework rule. The constitution's publish guard deliberately defers the remedy for a shasum mismatch to this section, so this is where the policy is declared:

- Every module stays at version 1.0.0. Never bump.
- Republish is delete-then-push at the same version.

When these modules move to normal SemVer, delete those two lines. The publish guard needs no change: its remedy for a shasum mismatch reverts to the default, which is to bump the version. Nothing else in the pipeline is coupled to the pinned version.

- Only the module under test uses `file:../`. Sibling dependencies use a registry range.
- Every module has `"type": "module"`, `"exports"`, and no `"main"`.
