import { createHash } from 'node:crypto';
import { chmod, cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import https from 'node:https';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const upstreamVersion = 'v3.2.3';
const upstreamCommit = 'd2d9d2a04120033a7d1e01e52d9b409168544cc6';
const tarballUrl = `https://api.github.com/repos/testssl/testssl.sh/tarball/refs/tags/${upstreamVersion}`;
const includedPaths = [
  'testssl.sh',
  'etc',
  'bin/openssl.Linux.x86_64',
  'bin/OPENSSL-LICENSE.txt',
  'bin/Readme.md',
  'LICENSE',
];

function download(url, destination) {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(destination);
    const request = https.get(
      url,
      {
        headers: {
          'User-Agent': 'n8n-nodes-testssl-sync-upstream',
          Accept: 'application/vnd.github+json',
        },
      },
      (response) => {
        if (
          response.statusCode &&
          response.statusCode >= 300 &&
          response.statusCode < 400 &&
          response.headers.location
        ) {
          file.close();
          download(response.headers.location, destination).then(resolve).catch(reject);
          return;
        }

        if (response.statusCode !== 200) {
          reject(new Error(`Unexpected status code ${response.statusCode ?? 'unknown'} for ${url}`));
          return;
        }

        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve(undefined);
        });
      },
    );

    request.on('error', reject);
    file.on('error', reject);
  });
}

function runTar(args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn('tar', args, { cwd, stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve(undefined);
        return;
      }

      reject(new Error(`tar exited with code ${code ?? 'unknown'}`));
    });
  });
}

async function sha256(filePath) {
  const buffer = await readFile(filePath);
  return createHash('sha256').update(buffer).digest('hex');
}

const tempDir = await mkdtemp(path.join(os.tmpdir(), 'n8n-testssl-sync-'));
const archivePath = path.join(tempDir, `${upstreamVersion}.tar.gz`);
const extractedRoot = path.join(tempDir, 'extracted');
const stagingDir = path.join(tempDir, 'staging');

try {
  await download(tarballUrl, archivePath);
  await runTar(['-xzf', archivePath, '-C', tempDir], tempDir);
  const entries = await readdir(tempDir, { withFileTypes: true });
  const extractedDirEntry = entries.find((entry) => entry.isDirectory() && entry.name.startsWith('testssl-testssl.sh-'));

  if (!extractedDirEntry) {
    throw new Error('Could not locate extracted upstream directory');
  }

  const extractedDir = path.join(tempDir, extractedDirEntry.name);
  await cp(extractedDir, extractedRoot, { recursive: true });
  await rm(stagingDir, { recursive: true, force: true });
  await cp(extractedRoot, stagingDir, { recursive: true });

  const targetVendorDir = path.resolve('vendor/testssl');
  await rm(targetVendorDir, { recursive: true, force: true });
  await mkdir(path.join(targetVendorDir, 'bin'), { recursive: true });
  await cp(path.join(stagingDir, 'etc'), path.join(targetVendorDir, 'etc'), { recursive: true });
  await cp(path.join(stagingDir, 'testssl.sh'), path.join(targetVendorDir, 'testssl.sh'));
  await cp(
    path.join(stagingDir, 'bin', 'openssl.Linux.x86_64'),
    path.join(targetVendorDir, 'bin', 'openssl.Linux.x86_64'),
  );
  await cp(
    path.join(stagingDir, 'bin', 'OPENSSL-LICENSE.txt'),
    path.join(targetVendorDir, 'bin', 'OPENSSL-LICENSE.txt'),
  );
  await cp(path.join(stagingDir, 'bin', 'Readme.md'), path.join(targetVendorDir, 'bin', 'Readme.md'));
  await cp(path.join(stagingDir, 'LICENSE'), path.join(targetVendorDir, 'LICENSE'));

  await chmod(path.join(targetVendorDir, 'testssl.sh'), 0o755);
  await chmod(path.join(targetVendorDir, 'bin', 'openssl.Linux.x86_64'), 0o755);

  const upstreamJson = {
    upstreamRepo: 'https://github.com/testssl/testssl.sh',
    upstreamRef: upstreamVersion,
    upstreamCommit,
    upstreamVersion,
    fetchedAt: new Date().toISOString(),
    includedPaths,
    notes: [
      'Curated Linux x86_64 runtime subset for the n8n community node package.',
      'Vendored assets are committed into Git and shipped inside the npm package.',
    ],
    sha256: {
      'testssl.sh': await sha256(path.join(targetVendorDir, 'testssl.sh')),
      'bin/openssl.Linux.x86_64': await sha256(path.join(targetVendorDir, 'bin', 'openssl.Linux.x86_64')),
      'bin/OPENSSL-LICENSE.txt': await sha256(path.join(targetVendorDir, 'bin', 'OPENSSL-LICENSE.txt')),
      LICENSE: await sha256(path.join(targetVendorDir, 'LICENSE')),
    },
  };

  await writeFile(
    path.join(targetVendorDir, 'UPSTREAM.json'),
    `${JSON.stringify(upstreamJson, null, 2)}\n`,
    'utf8',
  );

  console.log(`Vendored upstream ${upstreamVersion} into ${targetVendorDir}`);
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
