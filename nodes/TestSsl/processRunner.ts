import { spawn } from 'node:child_process';
import { constants } from 'node:fs';
import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { buildArgs } from './cliBuilder';
import type {
  ProcessExecutionResult,
  ResolvedExecutionOptions,
  RuntimePaths,
  SerializedProcessError,
} from './types';
import { ensurePathIsUnderRoot } from './validators';

export function resolveRuntimePaths(fromDir: string): RuntimePaths {
  const packageRoot = findPackageRoot(fromDir);
  const vendorDir = path.resolve(packageRoot, 'vendor', 'testssl');
  const testsslScript = path.resolve(vendorDir, 'testssl.sh');
  const opensslBin = path.resolve(vendorDir, 'bin', 'openssl.Linux.x86_64');
  const upstreamMetadataFile = path.resolve(vendorDir, 'UPSTREAM.json');

  ensurePathIsUnderRoot(packageRoot, vendorDir);
  ensurePathIsUnderRoot(packageRoot, testsslScript);
  ensurePathIsUnderRoot(packageRoot, opensslBin);
  ensurePathIsUnderRoot(packageRoot, upstreamMetadataFile);

  return {
    packageRoot,
    vendorDir,
    testsslScript,
    opensslBin,
    upstreamMetadataFile,
  };
}

function findPackageRoot(startDir: string): string {
  let currentDir = path.resolve(startDir);

  while (true) {
    const candidate = path.join(currentDir, 'vendor', 'testssl', 'testssl.sh');
    if (fsSync.existsSync(candidate)) {
      return currentDir;
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      throw new Error(`Could not locate package root from ${startDir}`);
    }

    currentDir = parentDir;
  }
}

export async function ensureVendorAssets(paths: RuntimePaths): Promise<void> {
  await fs.access(paths.testsslScript, constants.X_OK);
  await fs.access(paths.opensslBin, constants.X_OK);
  await fs.access(path.join(paths.vendorDir, 'etc'), constants.R_OK);
}

export async function readUpstreamVersion(paths: RuntimePaths): Promise<string | null> {
  try {
    const raw = await fs.readFile(paths.upstreamMetadataFile, 'utf8');
    const parsed = JSON.parse(raw) as { upstreamVersion?: unknown };
    return typeof parsed.upstreamVersion === 'string' ? parsed.upstreamVersion : null;
  } catch {
    return null;
  }
}

export function serializeProcessError(
  error: unknown,
  context: {
    exitCode?: number | null;
    signal?: string | null;
    stdout?: string;
    stderr?: string;
    target?: string;
    operation?: ResolvedExecutionOptions['operation'];
  } = {},
): SerializedProcessError {
  const plainError = error as NodeJS.ErrnoException | undefined;
  return {
    message: plainError?.message ?? 'Unknown process error',
    code: plainError?.code,
    errno: plainError?.errno,
    signal: context.signal ?? undefined,
    killed: plainError ? 'killed' in plainError && Boolean(plainError.killed) : undefined,
    exitCode: context.exitCode ?? undefined,
    stdoutTail: context.stdout?.slice(-2000),
    stderrTail: context.stderr?.slice(-2000),
    target: context.target,
    operation: context.operation,
  };
}

export async function executeTestssl(
  options: ResolvedExecutionOptions,
  runtimePaths: RuntimePaths,
): Promise<ProcessExecutionResult> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'n8n-testssl-'));
  const rawJsonPath = path.join(tempDir, 'result.json');
  const args = buildArgs({
    ...options,
    jsonFilePath: rawJsonPath,
    opensslBin: runtimePaths.opensslBin,
  });
  const startedAtDate = new Date();
  const startedAt = startedAtDate.toISOString();
  let timeoutId: NodeJS.Timeout | undefined;
  let stdout = '';
  let stderr = '';
  let exitCode: number | null = null;
  let signal: NodeJS.Signals | null = null;
  let timedOut = false;

  try {
    const result = await new Promise<{ exitCode: number | null; signal: NodeJS.Signals | null }>(
      (resolve, reject) => {
        const child = spawn('/bin/bash', [runtimePaths.testsslScript, ...args], {
          shell: false,
          env: {
            ...process.env,
            TESTSSL_INSTALL_DIR: runtimePaths.vendorDir,
            TERM: 'dumb',
          },
          stdio: ['ignore', 'pipe', 'pipe'],
        });

        timeoutId = setTimeout(() => {
          timedOut = true;
          child.kill('SIGTERM');
          setTimeout(() => child.kill('SIGKILL'), 1_500).unref();
        }, options.overallTimeoutSeconds * 1_000);

        child.stdout.on('data', (chunk: Buffer | string) => {
          stdout += chunk.toString();
        });

        child.stderr.on('data', (chunk: Buffer | string) => {
          stderr += chunk.toString();
        });

        child.on('error', reject);
        child.on('close', (code, receivedSignal) => {
          resolve({
            exitCode: code,
            signal: receivedSignal,
          });
        });
      },
    );

    exitCode = result.exitCode;
    signal = result.signal;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }

  const finishedAtDate = new Date();
  const finishedAt = finishedAtDate.toISOString();
  const durationMs = finishedAtDate.getTime() - startedAtDate.getTime();

  const rawJsonText = await fs.readFile(rawJsonPath, 'utf8').catch(() => null);

  if (!options.keepTempFilesForDebug) {
    await fs.rm(tempDir, { recursive: true, force: true });
  }

  if (timedOut) {
    stderr = `${stderr}\nProcess timed out after ${options.overallTimeoutSeconds} seconds.`.trim();
  }

  return {
    startedAt,
    finishedAt,
    durationMs,
    exitCode,
    signal,
    stdout,
    stderr,
    rawJsonPath,
    rawJsonText,
    tempDir,
  };
}
