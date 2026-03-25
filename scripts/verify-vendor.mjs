import { access, readFile, stat } from 'node:fs/promises';
import fs from 'node:fs';
import path from 'node:path';
import { constants } from 'node:fs';

const vendorDir = path.resolve('vendor/testssl');
const requiredPaths = [
  'testssl.sh',
  'etc',
  'bin/openssl.Linux.x86_64',
  'bin/OPENSSL-LICENSE.txt',
  'LICENSE',
  'UPSTREAM.json',
];

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

for (const relativePath of requiredPaths) {
  const fullPath = path.join(vendorDir, relativePath);
  if (!fs.existsSync(fullPath)) {
    fail(`Missing required vendor path: ${relativePath}`);
  }
}

await access(path.join(vendorDir, 'testssl.sh'), constants.X_OK);
await access(path.join(vendorDir, 'bin/openssl.Linux.x86_64'), constants.X_OK);

const etcStat = await stat(path.join(vendorDir, 'etc'));
if (!etcStat.isDirectory()) {
  fail('vendor/testssl/etc must be a directory');
}

const etcEntries = fs.readdirSync(path.join(vendorDir, 'etc'));
if (etcEntries.length === 0) {
  fail('vendor/testssl/etc must not be empty');
}

const upstream = JSON.parse(
  await readFile(path.join(vendorDir, 'UPSTREAM.json'), 'utf8'),
);

if (typeof upstream.upstreamVersion !== 'string') {
  fail('UPSTREAM.json must include upstreamVersion');
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log('Vendor verification succeeded.');
