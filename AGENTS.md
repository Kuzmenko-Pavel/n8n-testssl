# AGENTS.md

## Purpose

This repository contains a self-hosted n8n community node package named `n8n-nodes-testssl`.
It wraps vendored upstream `testssl.sh` assets and exposes them as an imperative n8n node for TLS/SSL scanning workflows.

This file is for coding agents and maintainers working inside this repository. Follow it to avoid breaking packaging, licensing, runtime, or CI assumptions.

## Project Identity

- Package name: `n8n-nodes-testssl`
- Primary node: `TestSSL`
- Internal node name: `testSsl`
- Runtime model: self-hosted n8n only
- Primary supported platform: Linux `x86_64`
- Required shell runtime: `/bin/bash`
- License posture: `GPL-2.0-only`

Do not treat this repository like a generic verified n8n community node. It is intentionally optimized for self-hosted environments because it spawns a local scanner and ships platform-specific binaries.

## Non-Negotiable Architectural Decisions

These decisions are already made. Do not undo them unless the user explicitly asks for a redesign.

1. Vendored runtime, not postinstall download
   - Upstream `testssl.sh` runtime assets are committed under `vendor/testssl/`.
   - The package must work after install without downloading scanner assets.
   - Do not reintroduce a `postinstall` downloader as the primary strategy.

2. GPL-aware repository and package
   - The repository distributes GPL-licensed upstream assets.
   - Do not switch the package back to MIT or another incompatible license expression.
   - Keep `NOTICE.md`, root `LICENSE`, and vendored upstream notices aligned.

3. Self-hosted only
   - Do not present this as n8n Cloud verified or Cloud-ready.
   - Do not optimize for verified-node restrictions over the actual runtime requirements here.

4. Safe child-process execution
   - Never use `shell: true`.
   - Never construct one shell command string from user input.
   - Execution must remain `spawn('/bin/bash', [scriptPath, ...args], { shell: false })`.

5. Flat JSON is canonical
   - Machine parsing must use `--jsonfile`.
   - Pretty JSON is not the canonical parser input.

6. Curated input surface only
   - Do not expose raw arbitrary CLI text fields.
   - Do not expose path-writing or path-reading flags like `--jsonfile`, `--logfile`, `--htmlfile`, `--csvfile`, `--outprefix`, `--file`, or similar.

## Repository Layout

Core areas:

- `nodes/TestSsl/`
  - main n8n node
  - validators
  - arg builder
  - process runner
  - parser / normalizer / summarizer
  - icon
- `vendor/testssl/`
  - vendored upstream runtime subset
- `scripts/`
  - maintainer-only vendor sync / verify / perms scripts
- `test/`
  - unit tests
  - fixture-driven parser coverage
  - smoke checks
- `.github/workflows/`
  - CI and publish workflows

Important files:

- `package.json`
- `README.md`
- `NOTICE.md`
- `LICENSE`
- `vendor/testssl/UPSTREAM.json`

## Files Agents Must Understand Before Refactoring

Read these before making non-trivial changes:

- `package.json`
- `README.md`
- `nodes/TestSsl/TestSsl.node.ts`
- `nodes/TestSsl/processRunner.ts`
- `nodes/TestSsl/cliBuilder.ts`
- `nodes/TestSsl/validators.ts`
- `nodes/TestSsl/parser.ts`
- `nodes/TestSsl/normalizer.ts`
- `nodes/TestSsl/summarizer.ts`
- `scripts/sync-upstream.mjs`
- `scripts/verify-vendor.mjs`
- `vendor/testssl/UPSTREAM.json`

## Runtime Contract

The node currently assumes:

- Linux `x64` runtime only
- `/bin/bash` exists
- `vendor/testssl/testssl.sh` is executable
- `vendor/testssl/bin/openssl.Linux.x86_64` is executable
- `vendor/testssl/etc` is present
- `TESTSSL_INSTALL_DIR` points to `vendor/testssl`

If you change path resolution, preserve compatibility both from source execution and from built `dist/` execution.

## Current Node Behavior

The node supports:

- target source from parameter or field
- curated operations:
  - `quickScan`
  - `fullScan`
  - `protocols`
  - `cipherCategories`
  - `serverDefaults`
  - `serverPreference`
  - `headers`
  - `vulnerabilities`
  - `clientSimulation`
  - `starttls`
  - `customSafe`
- STARTTLS protocol selection
- curated custom safe checks only
- flat JSON parsing into raw + normalized findings
- summary rollup
- optional raw JSON binary attachment
- soft per-item failures when continue-on-error is enabled

If you add parameters, keep the operator-facing surface curated. Avoid leaking low-level `testssl.sh` complexity unless there is a strong operational reason.

## Security Rules

These are easy to regress. Preserve them.

1. Target validation must remain strict
   - Allow only supported host/host:port/https://host/bracketed IPv6 forms.
   - Reject shell metacharacters and suspicious control characters.

2. Keep the target as the final positional CLI argument.

3. User input must become a safe argument array, not a shell string.

4. Do not expose arbitrary file input or output paths through node parameters unless the user explicitly requests a redesign and the security tradeoff is documented.

5. Process errors must be serialized into plain JSON-safe objects.
   - Never attach raw `Error`, `ChildProcess`, request objects, or circular structures to workflow output.

6. Keep `shell: false`.

## Severity and Parsing Semantics

Current normalization rules:

- `CRITICAL` -> `CRITICAL`
- `HIGH` -> `HIGH`
- `MEDIUM` -> `MEDIUM`
- `LOW` -> `LOW`
- `WARN` -> `LOW`
- `INFO` -> `INFO`
- `OK` -> `OK`
- `NOT OK` -> `HIGH`
- anything else -> `UNKNOWN`

Do not silently change these semantics without updating:

- `README.md`
- tests
- any logic that depends on `highestSeverity`

## Vendored Upstream Rules

### What is intentionally vendored

The repository currently vendors only the minimum runtime subset needed for Linux `x86_64` execution:

- `vendor/testssl/testssl.sh`
- `vendor/testssl/etc/**`
- `vendor/testssl/bin/openssl.Linux.x86_64`
- `vendor/testssl/bin/OPENSSL-LICENSE.txt`
- `vendor/testssl/bin/Readme.md`
- `vendor/testssl/LICENSE`
- `vendor/testssl/UPSTREAM.json`

### What not to do

- Do not delete `etc/` files to save space unless you have verified `testssl.sh` still works.
- Do not add unrelated platform binaries without a concrete requirement.
- Do not hand-edit vendored upstream content casually.

### How to refresh upstream

Use maintainer scripts, not manual ad hoc edits:

1. Update pinned ref in `scripts/sync-upstream.mjs`
2. Run `npm run sync:upstream`
3. Run `npm run verify:vendor`
4. Run `npm run fix:vendor-perms` if needed
5. Re-run lint/build/test
6. Review `vendor/testssl/UPSTREAM.json`
7. Review license and notice implications

If upstream changes output shape or runtime requirements, update parser/tests/docs in the same change.

## Testing and Verification

Before pushing non-trivial changes, run:

```bash
npm run verify:vendor
npm run lint
npm run build
npm run test
npm run smoke:pack
```

Notes:

- The main build/dev/lint flow now goes through `n8n-node`.
- The test command is intentionally `node --import tsx --test test/unit/*.test.ts test/smoke/*.test.ts`.
- Do not switch it back to `**` globs unless you also prove CI shell expansion is correct.
- CI already caught this once.
- `smoke:pack` is the main local check that the tarball contains the built node and vendored runtime in an installable shape.
- `scan-community-package` is not a local static checker for the working tree. It analyzes a package by name from npm, so treat it as a post-publish or prerelease verification step.

## CI/CD Expectations

### CI

`CI` workflow should continue to validate:

- dependency install
- vendor verification
- executable bits
- `testssl.sh --version`
- lint
- build
- tests

Do not add mandatory live network scans to default CI.

### Publish

`publish.yml` is tag-based and intended for npm publication with provenance / OIDC support.

When touching release automation:

- preserve tag-triggered release behavior
- preserve `id-token: write`
- preserve npm provenance support
- keep release flow aligned with `npm run release`

## Packaging Rules

Keep `package.json` aligned with n8n package requirements:

- package name must start with `n8n-nodes-`
- include keyword `n8n-community-node-package`
- keep `n8n.nodes` registration correct
- keep `main` and built path alignment correct

If you move files, verify:

- `dist/nodes/TestSsl/TestSsl.node.js` still exists after build
- SVG asset copying still works
- `n8n` metadata still points to the built node path

## Documentation Rules

If you change behavior or supported operations, update:

- `README.md`
- tests
- parameter descriptions
- `AGENTS.md` if the change affects contributor workflow or repository policy

Keep the README honest about:

- self-hosted-only support
- Linux `x86_64` limitation
- bundled upstream assets
- GPL licensing implications

## Git Workflow For Agents

Unless the user asks otherwise:

1. Make focused changes.
2. Do not commit prompt/input artifacts unless explicitly requested.
   - In this repository, files like `n8n_testssl_prompt.txt`, `n8n_testssl_prompt_v2.txt`, and `pre_n8n_testssl_prompt.md` are task inputs, not part of the shipped package.
3. Run verification commands relevant to the change.
4. Commit only the intended files.
5. Push to the active feature branch.

If PR creation fails because a feature branch has no common history with `main`, rebuild the branch on top of `origin/main` before retrying.

## Common Pitfalls

1. Breaking runtime path resolution from `dist/`
2. Reintroducing raw custom CLI text
3. Forgetting `TESTSSL_INSTALL_DIR`
4. Parsing pretty JSON instead of flat JSON
5. Switching license metadata back to MIT
6. Accidentally excluding `vendor/testssl/` from published files
7. Breaking executable bits on vendored binaries
8. Using test globs that do not work in CI shells

## When to Ask the User Before Proceeding

Ask before making these changes unless the user explicitly requested them:

- changing licensing approach
- removing vendored upstream assets
- expanding platform support beyond Linux `x86_64`
- adding risky parameters that expose arbitrary file paths or raw CLI text
- changing release flow or package name
- replacing the current imperative node model with a different architecture

## Preferred Change Style

- Keep modules small and single-purpose.
- Preserve pure helper functions where possible.
- Update tests with behavior changes.
- Prefer explicit code over clever abstractions.
- When in doubt, optimize for safety and operational clarity over feature breadth.
