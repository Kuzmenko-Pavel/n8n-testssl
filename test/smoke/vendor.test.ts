import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';

import { parseFlatJson } from '../../nodes/TestSsl/parser';

test('vendored runtime files exist and are executable', async () => {
  await access(path.resolve('vendor/testssl/testssl.sh'), constants.X_OK);
  await access(path.resolve('vendor/testssl/bin/openssl.Linux.x86_64'), constants.X_OK);
});

test('fixtures remain parseable for smoke coverage', async () => {
  const content = await readFile(path.resolve('test/fixtures/clean-host.json'), 'utf8');
  const findings = parseFlatJson(content);
  assert.equal(findings.length, 2);
});
