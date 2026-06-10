---
description: Rebuild lost context and realign an agent that has drifted from JS helper module conventions - re-read the constitution, re-survey every module, self-audit line by line, report deviations
---

# Realign Workflow

A recovery harness. Run this when an agent has **drifted** from the framework's conventions while working in this repo. It does not fix code. It **rebuilds context** by re-reading the source of truth, re-deriving the conventions from real modules, and auditing the target module line by line — then reports every deviation and hands corrections to `/js-helper-module review`.

It exists because conventions drift when an agent trusts its working memory instead of the files. Every convention this repo enforces is **already written down** — in `codebase-superloom/docs/` and demonstrated by the modules already in `src/`. Realigning means reading those sources again and re-deriving the rules from them, never recalling or restating them.

## Operating Principle (READ FIRST)

> **Trust nothing in working memory.** Re-derive every convention from files on disk.
> Treat conversation summaries, prior plans, and retrieved memories as **suspect** until
> reconfirmed against `codebase-superloom/docs/` and real module code. `AGENTS.md` is a
> *derived, compact* index — `docs/` is the authority (the Golden Rule).

**Evidence rule (hard gate).** Every convention you assert anywhere in this run must cite where it comes from — a document path and section, or a reference-module `file:line`. A rule stated without a citation is treated as unverified: it does not count, and you must read the source before relying on it. If the final report contains any uncited claim, the run is incomplete.

This workflow is **read-only and idempotent**. Phases 1-4 mutate nothing, so it is always safe to re-run. The only output is a report (Phase 5). Fixes are a separate, user-confirmed step.

## When To Run

- An agent has lost the thread, or the user says so.
- After context compaction / a long conversation that touched many files.
- Resuming helper-module work after a gap.
- Before a `review` or `publish` when you are unsure the work matches conventions.

## Command Execution Rules

These prevent a known failure mode where an agent bloats a command with trailing filler
lines, blowing the output budget so the call aborts and the command never runs.

- **NEVER append `exit 0` (or any repeated filler) to a command.** One line, or a single `&&`-joined chain. Nothing follows it.
- **NEVER use `cd` inside the command.** Set the working directory via the tool's `Cwd` parameter. `cd [module_root]` lines below are illustrative of *location*, not literal text to send.
- **Pipe long output through `| tail -N`** to keep results small.
- **`// turbo`** marks a step as safe to auto-run (read-only or idempotent). Steps without it require normal judgement. No mutation step is ever auto-run.

---

## Phase 0: Activate and Scope

1. **Declare the target.** State which module(s) are in focus (default: the currently active module). Everything in Phase 3 is scoped to these.

2. **Suspend edits.** Make no source changes until Phase 5 is presented and the user confirms.

3. **Drop assumptions.** Write one line: "Re-grounding from files; ignoring prior summaries until reconfirmed."

## Phase 1: Re-read the Constitution

Read the source of truth in authority order. Do not skim summaries — the nuance lives in the full text.

1. **Read this repo's `AGENTS.md` fully**, then `codebase-superloom/AGENTS.md`. Treat both as the *derived index*, not the authority.

2. **Enumerate every doc**, so none is skipped:
   // turbo
   ```bash
   # Cwd = codebase-superloom
   find docs -name '*.md' | sort
   ```

3. **Read every file the enumeration returns — all of them, in full.** Do not cherry-pick and do not skim. Whatever a document states is the rule. The `foundations/`, `modules/`, `dev/`, and `testing/` subtrees carry the rules for code style, module structure, process, and tests — give those the closest reading, but read the whole set so nothing is missed.

4. **Re-read the sibling workflows** in this repo: `.devin/workflows/js-helper-module.md` and `.devin/workflows/js-helper-module-refactor.md`.

5. **Output a binding-rules checklist** — a short list that *links back* to the doc each rule comes from. Do not restate the rules in detail; the doc is the authority.

## Phase 2: Survey Sibling Modules (derive the fingerprint from reality)

Convention is whatever the real, passing modules do. Re-derive it; do not recall it.

1. **Enumerate every module:**
   // turbo
   ```bash
   # Cwd = codebase-js-helper-modules
   find src/helper-modules-core src/helper-modules-server src/helper-modules-client -maxdepth 1 -type d | sort
   ```

2. **Categorize each** using `docs/modules/module-categorization.md` (stateless singleton, stateful factory, adapter-backed factory, store adapter, vendor wrapper).

3. **Read one reference module per category in full** — every file: `[name].js`, `[name].config.js`, `[name].errors.js`, `[name].validators.js`, `package.json`, `_test/loader.js`, `_test/package.json`, `_test/test.js`, `README.md`, `ROBOTS.md`, and `docs/`.

4. **Record the convention fingerprint** the target will be diffed against: the shape that recurs across the reference modules — loader, file layout, package and test wiring, public surface, documentation set. Capture what the modules actually do, observed from their source, not what you remember they do.

## Phase 3: Line-by-line Self-audit of the Target Module

Read each source file top to bottom — then read it a second time, because formatting and structural issues routinely hide on a single pass. For every dimension in the audit map below, first derive the concrete rule from its governing document and from the reference modules read in Phase 2, then audit the target against that rule. Do not assume a rule from memory — if you cannot point to where it is written or demonstrated, go read it. Record each deviation as `file:line -> rule it violates (with citation) -> corrective action`.

After reading, run the gates (set `Cwd`, never `cd`):

// turbo
```bash
# Lint  (Cwd = [module_root])
npm run lint 2>&1 | tail -20
```

// turbo
```bash
# Tests (Cwd = [module_root]/_test) - clean install avoids stale file: swaps
rm -rf node_modules package-lock.json && npm install && npm test 2>&1 | tail -40
```

Stale-name and cross-reference scrub. Renamed symbols and leftover legacy or branding tokens are a classic drift signature; hunt them across code, tests, and docs:

// turbo
```bash
# Cwd = codebase-js-helper-modules - replace [old-name] with any suspected stale token
git grep -n "[old-name]" -- 'src/**' '*.md' '*.yml'
```

### Audit Map

These are the *dimensions* to audit, each paired with where its rules actually live. For each one: open the source, extract the rules it states, confirm them against the reference modules, then audit the target. This workflow deliberately does not repeat the rules — that is what the documents are for, and copying them here would itself become a source of drift.

| Dimension | Where its rules live |
|---|---|
| Code formatting, comments, spacing | `foundations/code-formatting-js.md` |
| Module structure, loader, public/private surface, exports | `modules/module-structure-js.md`, `modules/factory-vs-singleton-decision.md` |
| Dependency and peer-dependency wiring | `modules/peer-dependencies.md` |
| Test layout, loader, and dependency wiring | `dev/testing-local-modules.md` |
| Error handling and catalogs | `foundations/error-handling.md` |
| Validation | `foundations/validation-approach.md` |
| Documentation files and their content | `dev/documentation-authoring.md`, `modules/module-readme-structure.md` |
| Naming consistency (no stale or legacy tokens anywhere) | the cross-reference scrub above + the reference modules |

This table is a starting set, not a closed list. If the target needs a dimension not shown, find its governing document yourself and audit against that.

### Converge

Do not proceed to the report after a single pass. Re-run this phase until **two consecutive passes surface zero new deviations**. A run whose most recent pass still found issues has not converged — audit again. Convergence, not effort, is the exit condition.

## Phase 4: Diagnose, Re-anchor, and Self-improve

1. **Diagnose the drift.** Before re-anchoring, answer briefly and honestly: Did I start from a scratch, demo, or experimental area whose conventions differ? Did I carry a pattern in from another codebase? Which governing document did I act without reading? Did I rely on a summary, plan, or memory instead of source? Did a rename leave stale tokens behind? The answers are the root cause — carry them into the self-improve step.

2. **Re-anchor the plan.** List `__dev__/plans/` by mtime, read the most recent plan, and state the plan + in-progress step (the planning protocol). Confirm it still matches the work in focus.
   // turbo
   ```bash
   # Cwd = project-superloom (workspace root, outside any repo)
   ls -t __dev__/plans/*.md | head -5
   ```

3. **Self-improve hook.** Feed the drift diagnosis from step 1 back into the framework: if it exposed a rule or failure mode **not yet in `docs/`**, capture it via `/learn` into the correct pitfall file **before** any fix, then run `/compile-agents-md`. This honors the Golden Rule and teaches the framework so the lesson is not re-learned.

## Phase 5: Report and Hand Off (gated)

1. **Present the realignment report in chat** (do not persist a file). Every convention named must carry its citation (the evidence rule). Structure:
   - **Conventions re-derived** — the binding-rules checklist from Phase 1, each line citing its doc.
   - **Drift diagnosis** — the root cause from Phase 4.
   - **Deviations found** — a table of `file:line -> rule violated (with citation) -> corrective action`, grouped by audit dimension.
   - **Gate results** — lint and test status, and confirmation the audit converged (two clean consecutive passes).
   - **Plan state** — active plan + in-progress step.

2. **Do not auto-fix.** Hand the corrective actions to the existing review workflow:
   ```
   /js-helper-module review
   ```

3. **STOP and ask.** Wait for explicit user confirmation before any source change.

---

## Verification Checklist (this run)

- [ ] Target module(s) declared; edits suspended
- [ ] `AGENTS.md` (both repos) read; treated as derived index
- [ ] Every `docs/*.md` enumerated and read in full
- [ ] Sibling workflows re-read
- [ ] Every module enumerated and categorized; one reference per category read in full
- [ ] Fingerprint recorded
- [ ] Each target file read at least twice; audited line by line against the audit map (rules derived from docs + reference modules)
- [ ] Audit converged: two consecutive passes with zero new deviations
- [ ] Every asserted convention carries a citation (doc path/section or reference-module `file:line`)
- [ ] Lint run; tests run via clean install
- [ ] Stale-name / cross-reference scrub run
- [ ] Drift root cause diagnosed; plan re-anchored; new failure modes captured via `/learn` if any
- [ ] Report presented in chat; fixes handed to `/js-helper-module review`; stopped for user confirmation
