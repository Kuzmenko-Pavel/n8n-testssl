import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

import { normalizeFindings, normalizeSeverity } from '../../nodes/TestSsl/normalizer';
import { parseFlatJson, TestsslParseError } from '../../nodes/TestSsl/parser';

const fixturesDir = path.resolve('test/fixtures');

test('parseFlatJson supports arrays and object-with-findings payloads', async () => {
  const arrayFixture = await fs.readFile(path.join(fixturesDir, 'clean-host.json'), 'utf8');
  const objectFixture = await fs.readFile(
    path.join(fixturesDir, 'object-with-findings.json'),
    'utf8',
  );

  assert.equal(parseFlatJson(arrayFixture).length, 2);
  assert.equal(parseFlatJson(objectFixture).length, 1);
});

test('parseFlatJson throws a controlled parser error on malformed JSON', async () => {
  const malformedFixture = await fs.readFile(path.join(fixturesDir, 'malformed.json'), 'utf8');
  assert.throws(() => parseFlatJson(malformedFixture), TestsslParseError);
});

test('normalizeSeverity maps upstream values conservatively', () => {
  assert.equal(normalizeSeverity('WARN'), 'LOW');
  assert.equal(normalizeSeverity('NOT OK'), 'HIGH');
  assert.equal(normalizeSeverity('OK'), 'OK');
});

test('normalizeFindings preserves raw data and infers categories', async () => {
  const fixture = await fs.readFile(path.join(fixturesDir, 'with-vulns.json'), 'utf8');
  const findings = normalizeFindings(parseFlatJson(fixture));

  assert.equal(findings[1].category, 'vulnerability');
  assert.equal(findings[1].cve, 'CVE-2014-0160');
});
