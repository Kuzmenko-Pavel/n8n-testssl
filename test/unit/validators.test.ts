import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeTarget, parseTargetParts, validateTarget } from '../../nodes/TestSsl/validators';

test('normalizeTarget trims trailing slash', () => {
  assert.equal(normalizeTarget('https://example.com/'), 'https://example.com');
});

test('validateTarget accepts supported target shapes', () => {
  assert.equal(validateTarget('example.com:8443'), 'example.com:8443');
  assert.equal(validateTarget('https://example.com'), 'https://example.com');
  assert.equal(validateTarget('[2001:db8::1]:443'), '[2001:db8::1]:443');
});

test('validateTarget rejects shell metacharacters', () => {
  assert.throws(() => validateTarget('example.com;rm -rf /'));
});

test('parseTargetParts extracts hostname and port', () => {
  assert.deepEqual(parseTargetParts('https://example.com:8443'), {
    hostname: 'example.com',
    port: 8443,
  });
});
