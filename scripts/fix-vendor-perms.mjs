import { chmod } from 'node:fs/promises';
import path from 'node:path';

const files = [
  path.resolve('vendor/testssl/testssl.sh'),
  path.resolve('vendor/testssl/bin/openssl.Linux.x86_64'),
];

for (const filePath of files) {
  await chmod(filePath, 0o755);
  console.log(`chmod 755 ${filePath}`);
}
