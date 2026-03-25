import test from 'node:test';
import assert from 'node:assert/strict';

import { buildArgs } from '../../nodes/TestSsl/cliBuilder';
import type { BuildArgsInput } from '../../nodes/TestSsl/types';

const baseInput: BuildArgsInput = {
  target: 'example.com',
  operation: 'quickScan',
  outputMode: 'all',
  overallTimeoutSeconds: 180,
  connectTimeoutSeconds: 10,
  opensslTimeoutSeconds: 10,
  warningsMode: 'batch',
  severityFilter: 'LOW',
  quiet: true,
  wide: false,
  showEach: false,
  ipv6: false,
  nodnsMode: 'default',
  ipMode: 'auto',
  sneaky: false,
  idsFriendly: false,
  phoneOut: false,
  requestHeaders: [],
  customSafeChecks: [],
  continueOnItemError: false,
  failOnSeverity: 'none',
  attachRawJsonAsBinary: false,
  includeStdout: false,
  includeStderr: false,
  keepTempFilesForDebug: false,
  jsonFilePath: '/tmp/result.json',
  opensslBin: '/vendor/openssl',
};

test('buildArgs keeps target as final positional argument', () => {
  const args = buildArgs(baseInput);
  assert.equal(args.at(-1), 'example.com');
});

test('buildArgs maps quickScan and custom flags correctly', () => {
  const args = buildArgs({
    ...baseInput,
    operation: 'customSafe',
    customSafeChecks: ['--heartbleed', '--grease'],
    proxy: 'proxy.internal:8443',
  });

  assert.ok(args.includes('--heartbleed'));
  assert.ok(args.includes('--grease'));
  assert.ok(args.includes('--proxy'));
});

test('buildArgs throws when custom ip mode is missing a custom IP', () => {
  assert.throws(() =>
    buildArgs({
      ...baseInput,
      ipMode: 'custom',
      customIp: undefined,
    }),
  );
});
