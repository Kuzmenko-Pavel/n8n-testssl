import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

import { normalizeFindings } from '../../nodes/TestSsl/normalizer';
import { parseFlatJson } from '../../nodes/TestSsl/parser';
import { buildSummary, shouldFailForSeverity } from '../../nodes/TestSsl/summarizer';

test('buildSummary aggregates counts, highest severity and recommendations', async () => {
  const fixture = await fs.readFile(path.resolve('test/fixtures/with-vulns.json'), 'utf8');
  const findings = normalizeFindings(parseFlatJson(fixture));
  const summary = buildSummary({
    target: 'example.com',
    hostname: 'example.com',
    port: 443,
    operation: 'quickScan',
    success: true,
    exitCode: 0,
    startedAt: '2026-03-25T00:00:00.000Z',
    finishedAt: '2026-03-25T00:00:02.000Z',
    durationMs: 2000,
    findings,
    upstreamVersion: 'v3.2.3',
  });

  assert.equal(summary.countsBySeverity.CRITICAL, 1);
  assert.equal(summary.highestSeverity, 'CRITICAL');
  assert.ok(summary.recommendations.length > 0);
});

test('shouldFailForSeverity respects threshold ordering', () => {
  assert.equal(shouldFailForSeverity('HIGH', 'CRITICAL'), true);
  assert.equal(shouldFailForSeverity('CRITICAL', 'HIGH'), false);
  assert.equal(shouldFailForSeverity('none', 'CRITICAL'), false);
});
