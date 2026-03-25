import test from 'node:test';
import assert from 'node:assert/strict';

import { serializeProcessError } from '../../nodes/TestSsl/processRunner';

test('serializeProcessError produces a plain JSON-safe object', () => {
  const error = Object.assign(new Error('boom'), {
    code: 'EFAIL',
    errno: 7,
    killed: true,
  });

  const serialized = serializeProcessError(error, {
    exitCode: 1,
    signal: 'SIGTERM',
    stdout: 'stdout data',
    stderr: 'stderr data',
    target: 'example.com',
    operation: 'quickScan',
  });

  assert.equal(serialized.message, 'boom');
  assert.equal(serialized.code, 'EFAIL');
  assert.equal(serialized.exitCode, 1);
  assert.equal(serialized.target, 'example.com');
});
