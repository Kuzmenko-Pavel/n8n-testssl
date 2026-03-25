import type {
  NormalizedFinding,
  NormalizedSeverity,
  RawTestsslFinding,
} from './types';
import { readStringField } from './validators';

const issueSeverities: NormalizedSeverity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export function normalizeSeverity(rawSeverity?: string): NormalizedSeverity {
  const value = (rawSeverity ?? '').trim().toUpperCase();

  switch (value) {
    case 'CRITICAL':
      return 'CRITICAL';
    case 'HIGH':
      return 'HIGH';
    case 'MEDIUM':
      return 'MEDIUM';
    case 'LOW':
      return 'LOW';
    case 'WARN':
      return 'LOW';
    case 'INFO':
      return 'INFO';
    case 'OK':
      return 'OK';
    case 'NOT OK':
      return 'HIGH';
    default:
      return 'UNKNOWN';
  }
}

export function inferCategory(id: string, finding: string): string {
  const haystack = `${id} ${finding}`.toLowerCase();

  if (haystack.includes('tls') || haystack.includes('ssl') || haystack.includes('protocol')) {
    return 'protocol';
  }

  if (haystack.includes('cipher') || haystack.includes('rc4') || haystack.includes('sweet32')) {
    return 'cipher';
  }

  if (haystack.includes('cert') || haystack.includes('ocsp')) {
    return 'certificate';
  }

  if (haystack.includes('hsts') || haystack.includes('header') || haystack.includes('cookie')) {
    return 'header';
  }

  if (
    haystack.includes('heartbleed') ||
    haystack.includes('robot') ||
    haystack.includes('drown') ||
    haystack.includes('freak') ||
    haystack.includes('logjam') ||
    haystack.includes('poodle')
  ) {
    return 'vulnerability';
  }

  if (haystack.includes('starttls') || haystack.includes('xmpp')) {
    return 'starttls';
  }

  if (haystack.includes('client') || haystack.includes('simulation')) {
    return 'client-simulation';
  }

  if (haystack.includes('default') || haystack.includes('preference')) {
    return 'server-defaults';
  }

  return 'misc';
}

export function normalizeFindings(rawFindings: RawTestsslFinding[]): NormalizedFinding[] {
  return rawFindings.map((rawFinding, index) => {
    const id = readStringField(rawFinding, 'id') ?? `finding-${index + 1}`;
    const finding = readStringField(rawFinding, 'finding') ?? '';
    const severityRaw = readStringField(rawFinding, 'severity') ?? 'UNKNOWN';
    const severityNormalized = normalizeSeverity(severityRaw);
    const portValue = rawFinding.port;

    return {
      id,
      severityRaw,
      severityNormalized,
      finding,
      cve: readStringField(rawFinding, 'cve'),
      cwe: readStringField(rawFinding, 'cwe'),
      ip: readStringField(rawFinding, 'ip'),
      port:
        typeof portValue === 'number'
          ? portValue
          : typeof portValue === 'string' && /^\d+$/.test(portValue)
            ? Number(portValue)
            : undefined,
      category: inferCategory(id, finding),
      isIssue: issueSeverities.includes(severityNormalized),
      isPassed: severityNormalized === 'OK',
      raw: rawFinding,
    };
  });
}
