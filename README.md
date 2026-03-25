# n8n-nodes-testssl

`n8n-nodes-testssl` is a self-hosted n8n community node package that runs vendored `testssl.sh` locally to assess the TLS/SSL posture of websites and TLS-enabled services.

## Why This Is Self-Hosted Only

This package is not intended for n8n Cloud verification:

- it executes a local scanner script and a bundled platform-specific OpenSSL binary
- it requires `/bin/bash` and permission to spawn local processes
- it bundles GPL-licensed upstream assets from `testssl.sh`

Use it only in environments where you control the host or container runtime.

## Supported Platforms

- Linux `x86_64` only
- Node.js 20+
- `/bin/bash` must be available

The node fails fast on unsupported OS or architecture.

## Installation

1. Install the package into your self-hosted n8n environment.
2. Ensure the package files, including `vendor/testssl/`, are present in the runtime image.
3. Restart n8n so it loads the community node.

Example:

```bash
npm install n8n-nodes-testssl
```

## Runtime Requirements

- process spawning must be allowed
- the filesystem must allow executing `vendor/testssl/testssl.sh`
- the filesystem must allow executing `vendor/testssl/bin/openssl.Linux.x86_64`
- outbound network access is required only for the target scans, not for installation

## Bundled Upstream Assets

This package vendors the minimal required runtime subset from upstream `testssl.sh`:

- `testssl.sh`
- `etc/**`
- `bin/openssl.Linux.x86_64`
- upstream license and OpenSSL notice files

Metadata for the vendored snapshot is stored in `vendor/testssl/UPSTREAM.json`.

## Security Model

The node intentionally exposes a curated interface instead of raw arbitrary CLI input.

- targets are validated and normalized before execution
- the node always spawns `/bin/bash` with an argument array and `shell: false`
- user-supplied options that can read or write arbitrary files are not exposed
- flat JSON from `--jsonfile` is the canonical parser input
- child-process errors are serialized into plain objects to avoid circular JSON issues

## Supported Operations

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

`customSafe` supports only curated single-check flags such as Heartbleed, CCS, ROBOT, RC4, LOGJAM, and similar checks.

## Parameters

Primary parameters:

- `targetSource`: `parameter` or `field`
- `target` or `targetField`
- `operation`
- `outputMode`

Runtime parameters:

- `overallTimeoutSeconds`
- `connectTimeoutSeconds`
- `opensslTimeoutSeconds`
- `warningsMode`
- `severityFilter`
- `quiet`
- `wide`
- `showEach`
- `ipv6`
- `nodnsMode`
- `ipMode`
- `customIp`
- `sneaky`
- `idsFriendly`
- `phoneOut`
- `proxy`
- `basicAuth`
- `requestHeaders`
- `addCaPath`
- `mtlsClientPemPath`

Behavior parameters:

- `continueOnItemError`
- `failOnSeverity`
- `attachRawJsonAsBinary`
- `includeStdout`
- `includeStderr`
- `keepTempFilesForDebug`

## STARTTLS Support

Supported STARTTLS protocols:

- `ftp`
- `smtp`
- `lmtp`
- `pop3`
- `imap`
- `xmpp`
- `xmpp-server`
- `telnet`
- `ldap`
- `nntp`
- `sieve`
- `postgres`
- `mysql`

For `xmpp` and `xmpp-server`, expose `xmppHost`.

## Output Structure

Each input item produces one output item. Depending on `outputMode`, the result includes `summary`, `normalizedFindings`, `rawFindings`, or all of them.

Example shape:

```json
{
  "success": true,
  "target": "example.com:443",
  "operation": "quickScan",
  "summary": {
    "highestSeverity": "LOW",
    "totalFindings": 14
  },
  "normalizedFindings": [],
  "rawFindings": [],
  "meta": {
    "platform": "linux-x64",
    "parserMode": "flat-json"
  }
}
```

If `attachRawJsonAsBinary` is enabled, the flat JSON file is attached as binary data.

## Severity Normalization

Upstream severities are normalized as follows:

- `CRITICAL` -> `CRITICAL`
- `HIGH` -> `HIGH`
- `MEDIUM` -> `MEDIUM`
- `LOW` -> `LOW`
- `WARN` -> `LOW`
- `INFO` -> `INFO`
- `OK` -> `OK`
- `NOT OK` -> `HIGH`
- missing or unsupported values -> `UNKNOWN`

The raw upstream severity is preserved in each normalized finding.

## Example Workflows

- Quick HTTPS hygiene check for a fixed host
- STARTTLS posture check for `smtp` services with `field`-driven targets
- Security-header monitoring with `headers` operation and `failOnSeverity=MEDIUM`

## Limitations

- Linux `x86_64` only
- no mass-target file input
- no arbitrary raw CLI string input
- no verified n8n Cloud support
- no mandatory live-internet smoke tests in CI

## Development

```bash
npm ci
npm run lint
npm run verify:vendor
npm run build
npm run test
```

Useful maintainer commands:

```bash
npm run dev
npm run sync:upstream
npm run fix:vendor-perms
npm run lint:fix
```

## Starter-Compatible Local DX

This repository now uses the official `n8n-node` development tooling for the main build and development loop.

### Start n8n with the node loaded

```bash
npm install
npm run dev
```

`npm run dev` runs `n8n-node dev`, which:

- builds the node
- starts a local n8n instance with this package loaded
- rebuilds when source files change
- uses an isolated development user folder in `/tmp/n8n-node-cli-testssl`

Open the URL printed by the command, usually `http://localhost:5678`.

Search for the node by node name:

- `TestSSL`

Do not search by package name.

### What to check during local development

- the node appears in the picker
- parameters render correctly
- scans run on a Linux `x86_64` host with `/bin/bash` available
- summary, normalized findings, and raw JSON attachment still work
- vendored runtime files are present and executable

### Local package-style testing without publishing to npm

For a packaging check closer to a real installation:

```bash
npm run build
npm pack
```

Then install the generated tarball into a local n8n custom extensions directory and start n8n there.

### Community package scanner

The official package scanner can be run with:

```bash
npm run scan:package
```

Important:

- `@n8n/scan-community-package` checks a package by name in the npm registry
- it is not a purely local scanner for an unpublished working tree
- use it after publishing, or against a published prerelease package

## Node And Tooling Baseline

- Self-hosted runtime target: Node.js 20+
- n8n docs currently describe a newer Node baseline for the official node development environment
- this repository uses `n8n-node` for developer experience, but the package remains a self-hosted local-process node rather than a verified-cloud-compatible node

## Release Process

1. Run `npm ci`
2. Run `npm run verify:vendor`
3. Run `npm run build && npm run test`
4. Run `npm run release`
5. Push the release commit and tag
6. GitHub Actions publishes the package on `v*` tags

The publish workflow is prepared for npm provenance / OIDC trusted publishing and also works with `NPM_TOKEN` if configured.

## Maintainer Workflow For Upstream Refresh

1. Update the pinned version in `scripts/sync-upstream.mjs`
2. Run `npm run sync:upstream`
3. Run `npm run verify:vendor`
4. Rebuild and retest
5. Review `vendor/testssl/UPSTREAM.json`

## Licensing

This repository is licensed under `GPL-2.0-only` because it distributes GPL-licensed upstream `testssl.sh` components. See [NOTICE.md](/home/kuzmenko-pavel/Project/Kuzmenko-Pavel/n8n-testssl/NOTICE.md) and [vendor/testssl/LICENSE](/home/kuzmenko-pavel/Project/Kuzmenko-Pavel/n8n-testssl/vendor/testssl/LICENSE).
