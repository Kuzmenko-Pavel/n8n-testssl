import type {
  NormalizedFinding,
  NormalizedSeverity,
  Operation,
  Summary,
} from './types';

const severityOrder: Record<NormalizedSeverity, number> = {
  UNKNOWN: 0,
  OK: 1,
  INFO: 2,
  LOW: 3,
  MEDIUM: 4,
  HIGH: 5,
  CRITICAL: 6,
};

function emptyCounts(): Record<NormalizedSeverity, number> {
  return {
    OK: 0,
    INFO: 0,
    LOW: 0,
    MEDIUM: 0,
    HIGH: 0,
    CRITICAL: 0,
    UNKNOWN: 0,
  };
}

function highestSeverity(findings: NormalizedFinding[]): NormalizedSeverity {
  return findings.reduce<NormalizedSeverity>((highest, finding) => {
    if (severityOrder[finding.severityNormalized] > severityOrder[highest]) {
      return finding.severityNormalized;
    }

    return highest;
  }, 'OK');
}

function buildRecommendations(findings: NormalizedFinding[]): string[] {
  const recommendations = new Set<string>();

  for (const finding of findings) {
    const detail = `${finding.id} ${finding.finding}`.toLowerCase();

    if (detail.includes('tls 1.0') || detail.includes('tls 1.1')) {
      recommendations.add('Disable legacy TLS protocol versions such as TLS 1.0 and TLS 1.1.');
    }

    if (finding.category === 'header' && detail.includes('hsts') && finding.isIssue) {
      recommendations.add('Enable HSTS for HTTPS properties if it fits the application deployment model.');
    }

    if (finding.category === 'cipher' && finding.isIssue) {
      recommendations.add('Review the server cipher suite baseline and remove weak or obsolete cipher support.');
    }

    if (finding.severityNormalized === 'CRITICAL') {
      recommendations.add('Investigate and remediate critical TLS findings immediately.');
    }
  }

  return [...recommendations];
}

export function buildSummary(input: {
  target: string;
  hostname: string;
  port: number;
  operation: Operation;
  success: boolean;
  exitCode: number | null;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  findings: NormalizedFinding[];
  upstreamVersion: string | null;
}): Summary {
  const countsBySeverity = emptyCounts();

  for (const finding of input.findings) {
    countsBySeverity[finding.severityNormalized] += 1;
  }

  const topIssues = [...input.findings]
    .filter((finding) => finding.isIssue)
    .sort(
      (left, right) =>
        severityOrder[right.severityNormalized] - severityOrder[left.severityNormalized],
    )
    .slice(0, 5);

  const issueCount = input.findings.filter((finding) => finding.isIssue).length;
  const passCount = input.findings.filter((finding) => finding.isPassed).length;

  return {
    target: input.target,
    hostname: input.hostname,
    port: input.port,
    operation: input.operation,
    success: input.success,
    exitCode: input.exitCode,
    startedAt: input.startedAt,
    finishedAt: input.finishedAt,
    durationMs: input.durationMs,
    countsBySeverity,
    totalFindings: input.findings.length,
    issueCount,
    passCount,
    highestSeverity: highestSeverity(input.findings),
    topIssues,
    recommendations: buildRecommendations(input.findings),
    meta: {
      upstreamVersion: input.upstreamVersion,
      platform: `${process.platform}-${process.arch}`,
      bundledOpenssl: 'openssl.Linux.x86_64',
    },
  };
}

export function shouldFailForSeverity(
  threshold: 'none' | 'CRITICAL' | 'HIGH' | 'MEDIUM',
  highest: NormalizedSeverity,
): boolean {
  if (threshold === 'none') {
    return false;
  }

  return severityOrder[highest] >= severityOrder[threshold];
}
