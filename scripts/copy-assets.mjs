import { mkdir, readdir, copyFile } from 'node:fs/promises';
import path from 'node:path';

const sourceDir = path.resolve('nodes');
const distDir = path.resolve('dist', 'nodes');

async function copySvgAssets(currentDir) {
  const entries = await readdir(currentDir, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(currentDir, entry.name);

    if (entry.isDirectory()) {
      await copySvgAssets(sourcePath);
      continue;
    }

    if (!entry.name.endsWith('.svg')) {
      continue;
    }

    const relativePath = path.relative(sourceDir, sourcePath);
    const targetPath = path.join(distDir, relativePath);
    await mkdir(path.dirname(targetPath), { recursive: true });
    await copyFile(sourcePath, targetPath);
  }
}

await copySvgAssets(sourceDir);
