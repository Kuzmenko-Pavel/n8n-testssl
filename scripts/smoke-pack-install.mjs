import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: 'pipe',
  });

  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(' ')} failed with exit code ${result.status ?? 'unknown'}\n${result.stdout}\n${result.stderr}`,
    );
  }

  return result.stdout.trim();
}

const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'n8n-testssl-pack-'));
const packageCache = path.join(tempRoot, 'npm-cache');
const installRoot = path.join(tempRoot, 'install-root');

try {
  run('npm', ['pack', '--pack-destination', tempRoot, '--cache', packageCache], process.cwd());
  const tempEntries = await readdir(tempRoot);
  const tarballName = tempEntries.find((entry) => entry.endsWith('.tgz'));

  if (!tarballName) {
    throw new Error('Could not determine tarball name from npm pack output');
  }

  fs.mkdirSync(installRoot, { recursive: true });
  run('npm', ['init', '-y'], installRoot);
  run(
    'npm',
    [
      'install',
      path.join(tempRoot, tarballName),
      '--cache',
      packageCache,
      '--ignore-scripts',
      '--legacy-peer-deps',
    ],
    installRoot,
  );

  const installedPackageRoot = path.join(
    installRoot,
    'node_modules',
    'n8n-nodes-testssl',
  );

  const requiredPaths = [
    'package.json',
    'dist/nodes/TestSsl/TestSsl.node.js',
    'dist/nodes/TestSsl/testssl.svg',
    'vendor/testssl/testssl.sh',
    'vendor/testssl/bin/openssl.Linux.x86_64',
    'vendor/testssl/etc/openssl.cnf',
  ];

  for (const relativePath of requiredPaths) {
    const fullPath = path.join(installedPackageRoot, relativePath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Missing packaged file: ${relativePath}`);
    }
  }

  const packageJson = JSON.parse(
    await readFile(path.join(installedPackageRoot, 'package.json'), 'utf8'),
  );

  if (
    !packageJson.n8n ||
    !Array.isArray(packageJson.n8n.nodes) ||
    !packageJson.n8n.nodes.includes('dist/nodes/TestSsl/TestSsl.node.js')
  ) {
    throw new Error('Installed package.json is missing expected n8n.nodes registration');
  }

  console.log(`Pack/install smoke test succeeded using ${tarballName}`);
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}
