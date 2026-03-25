import path from 'node:path';

import type {
  CustomSafeCheck,
  IpMode,
  NodnsMode,
  RawTestsslFinding,
  RequestHeaderEntry,
  StartTlsProtocol,
  TargetSource,
} from './types';
import {
  approvedCustomSafeChecks,
  supportedStartTlsProtocols,
} from './types';

const disallowedCharacters = /[;&|`$<>\n\r]/;
const hostLikePattern =
  /^(https:\/\/)?(([a-zA-Z0-9-]+\.)*[a-zA-Z0-9-]+|\d{1,3}(?:\.\d{1,3}){3}|\[[a-fA-F0-9:]+\])(?::\d{1,5})?\/?$/;

export function ensureLinuxX64Support(): void {
  if (process.platform !== 'linux' || process.arch !== 'x64') {
    throw new Error(
      `Unsupported runtime platform ${process.platform}-${process.arch}. This package supports linux-x64 only.`,
    );
  }
}

export function getTargetFromSource(
  targetSource: TargetSource,
  target: string,
  targetField: string,
  itemJson: Record<string, unknown>,
): string {
  if (targetSource === 'parameter') {
    return target;
  }

  const value = getValueByPath(itemJson, targetField);
  if (typeof value !== 'string') {
    throw new Error(`Target field "${targetField}" must resolve to a string value.`);
  }

  return value;
}

export function getValueByPath(
  input: Record<string, unknown>,
  pathExpression: string,
): unknown {
  return pathExpression
    .split('.')
    .filter(Boolean)
    .reduce<unknown>((current, segment) => {
      if (!current || typeof current !== 'object') {
        return undefined;
      }

      return (current as Record<string, unknown>)[segment];
    }, input);
}

export function normalizeTarget(rawTarget: string): string {
  const trimmed = rawTarget.trim();
  if (trimmed.endsWith('/')) {
    return trimmed.slice(0, -1);
  }

  return trimmed;
}

export function validateTarget(rawTarget: string): string {
  if (!rawTarget.trim()) {
    throw new Error('Target must not be empty.');
  }

  const normalized = normalizeTarget(rawTarget);

  if (normalized.length > 255) {
    throw new Error('Target length must not exceed 255 characters.');
  }

  if (disallowedCharacters.test(normalized)) {
    throw new Error('Target contains forbidden shell metacharacters.');
  }

  if (!hostLikePattern.test(normalized)) {
    throw new Error(
      'Target must be host, host:port, https://host, https://host:port, IPv4, or bracketed IPv6.',
    );
  }

  return normalized;
}

export function validateHeaders(headers: RequestHeaderEntry[]): string[] {
  return headers
    .map((entry) => entry.header.trim())
    .filter(Boolean)
    .map((header) => {
      if (!/^[^:\n\r]+:\s*.+$/.test(header)) {
        throw new Error(`Invalid request header "${header}". Expected "Name: value".`);
      }

      return header;
    });
}

export function validateOptionalSocketPath(
  value: string | undefined,
  label: string,
): string | undefined {
  if (!value) {
    return undefined;
  }

  if (/[\0\n\r]/.test(value)) {
    throw new Error(`${label} contains invalid control characters.`);
  }

  return value.trim();
}

export function validateProxy(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  if (disallowedCharacters.test(value)) {
    throw new Error('Proxy contains forbidden shell metacharacters.');
  }

  if (!/^([a-zA-Z0-9.-]+:\d+|auto)$/.test(value)) {
    throw new Error('Proxy must be "auto" or "host:port".');
  }

  return value;
}

export function resolveIpMode(
  ipMode: IpMode,
  customIp: string | undefined,
): string | undefined {
  if (ipMode === 'auto') {
    return undefined;
  }

  if (ipMode === 'one' || ipMode === 'proxy') {
    return ipMode;
  }

  if (!customIp) {
    throw new Error('Custom IP mode requires customIp.');
  }

  if (!/^[a-fA-F0-9:.]+$/.test(customIp)) {
    throw new Error('customIp must be an IPv4 or IPv6 literal.');
  }

  return customIp;
}

export function resolveNodnsMode(nodnsMode: NodnsMode): NodnsMode | undefined {
  if (nodnsMode === 'default') {
    return undefined;
  }

  return nodnsMode;
}

export function validateStartTlsProtocol(
  value: string | undefined,
): StartTlsProtocol | undefined {
  if (!value) {
    return undefined;
  }

  if (!supportedStartTlsProtocols.includes(value as StartTlsProtocol)) {
    throw new Error(`Unsupported STARTTLS protocol "${value}".`);
  }

  return value as StartTlsProtocol;
}

export function validateCustomSafeChecks(values: string[]): CustomSafeCheck[] {
  return values.map((value) => {
    if (!approvedCustomSafeChecks.includes(value as CustomSafeCheck)) {
      throw new Error(`Unsupported customSafe check "${value}".`);
    }

    return value as CustomSafeCheck;
  });
}

export function parseTargetParts(target: string): { hostname: string; port: number } {
  const sanitized = target.startsWith('https://') ? target.slice(8) : target;

  if (sanitized.startsWith('[')) {
    const closingBracketIndex = sanitized.indexOf(']');
    const hostname = sanitized.slice(0, closingBracketIndex + 1);
    const portSegment = sanitized.slice(closingBracketIndex + 1);

    return {
      hostname,
      port: portSegment.startsWith(':') ? Number(portSegment.slice(1)) : 443,
    };
  }

  const lastColon = sanitized.lastIndexOf(':');
  if (lastColon > -1 && sanitized.indexOf(':') === lastColon) {
    const portCandidate = sanitized.slice(lastColon + 1);
    if (/^\d+$/.test(portCandidate)) {
      return {
        hostname: sanitized.slice(0, lastColon),
        port: Number(portCandidate),
      };
    }
  }

  return {
    hostname: sanitized,
    port: 443,
  };
}

export function ensurePathIsUnderRoot(rootPath: string, candidatePath: string): void {
  const relativePath = path.relative(rootPath, candidatePath);
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    throw new Error(`Resolved path escapes package root: ${candidatePath}`);
  }
}

export function readStringField(
  finding: RawTestsslFinding,
  fieldName: string,
): string | undefined {
  const value = finding[fieldName];
  return typeof value === 'string' ? value : undefined;
}
