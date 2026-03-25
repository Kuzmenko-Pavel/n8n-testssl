export const supportedStartTlsProtocols = [
  'ftp',
  'smtp',
  'lmtp',
  'pop3',
  'imap',
  'xmpp',
  'xmpp-server',
  'telnet',
  'ldap',
  'nntp',
  'sieve',
  'postgres',
  'mysql',
] as const;

export const approvedCustomSafeChecks = [
  '--heartbleed',
  '--ccs',
  '--ticketbleed',
  '--robot',
  '--starttls-injection',
  '--renegotiation',
  '--compression',
  '--breach',
  '--poodle',
  '--tls-fallback',
  '--sweet32',
  '--beast',
  '--lucky13',
  '--winshock',
  '--freak',
  '--logjam',
  '--drown',
  '--rc4',
  '--forward-secrecy',
  '--grease',
] as const;

export const normalizedSeverities = [
  'OK',
  'INFO',
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL',
  'UNKNOWN',
] as const;

export type TargetSource = 'parameter' | 'field';
export type Operation =
  | 'quickScan'
  | 'fullScan'
  | 'protocols'
  | 'cipherCategories'
  | 'serverDefaults'
  | 'serverPreference'
  | 'headers'
  | 'vulnerabilities'
  | 'clientSimulation'
  | 'starttls'
  | 'customSafe';
export type OutputMode =
  | 'summary'
  | 'normalizedFindings'
  | 'rawFindings'
  | 'summaryAndNormalized'
  | 'all';
export type WarningsMode = 'batch' | 'off';
export type SeverityThreshold = 'none' | 'CRITICAL' | 'HIGH' | 'MEDIUM';
export type SeverityFilter = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type NodnsMode = 'default' | 'min' | 'none';
export type IpMode = 'auto' | 'one' | 'proxy' | 'custom';
export type NormalizedSeverity = (typeof normalizedSeverities)[number];
export type StartTlsProtocol = (typeof supportedStartTlsProtocols)[number];
export type CustomSafeCheck = (typeof approvedCustomSafeChecks)[number];

export interface RequestHeaderEntry {
  header: string;
}

export interface RawTestsslFinding extends Record<string, unknown> {
  id?: string;
  finding?: string;
  severity?: string;
  cve?: string;
  cwe?: string;
  ip?: string;
  port?: string | number;
}

export interface NormalizedFinding {
  id: string;
  severityRaw: string;
  severityNormalized: NormalizedSeverity;
  finding: string;
  cve?: string;
  cwe?: string;
  ip?: string;
  port?: number;
  category: string;
  isIssue: boolean;
  isPassed: boolean;
  raw: RawTestsslFinding;
}

export interface Summary {
  target: string;
  hostname: string;
  port: number;
  operation: Operation;
  success: boolean;
  exitCode: number | null;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  countsBySeverity: Record<NormalizedSeverity, number>;
  totalFindings: number;
  issueCount: number;
  passCount: number;
  highestSeverity: NormalizedSeverity;
  topIssues: NormalizedFinding[];
  recommendations: string[];
  meta: {
    upstreamVersion: string | null;
    platform: string;
    bundledOpenssl: string;
  };
}

export interface RuntimePaths {
  packageRoot: string;
  vendorDir: string;
  testsslScript: string;
  opensslBin: string;
  upstreamMetadataFile: string;
}

export interface ResolvedExecutionOptions {
  target: string;
  operation: Operation;
  outputMode: OutputMode;
  overallTimeoutSeconds: number;
  connectTimeoutSeconds: number;
  opensslTimeoutSeconds: number;
  warningsMode: WarningsMode;
  severityFilter: SeverityFilter;
  quiet: boolean;
  wide: boolean;
  showEach: boolean;
  ipv6: boolean;
  nodnsMode: NodnsMode;
  ipMode: IpMode;
  customIp?: string;
  sneaky: boolean;
  idsFriendly: boolean;
  phoneOut: boolean;
  proxy?: string;
  basicAuth?: string;
  requestHeaders: string[];
  addCaPath?: string;
  mtlsClientPemPath?: string;
  starttlsProtocol?: StartTlsProtocol;
  xmppHost?: string;
  customSafeChecks: CustomSafeCheck[];
  continueOnItemError: boolean;
  failOnSeverity: SeverityThreshold;
  attachRawJsonAsBinary: boolean;
  includeStdout: boolean;
  includeStderr: boolean;
  keepTempFilesForDebug: boolean;
}

export interface SerializedProcessError {
  message: string;
  code?: string;
  errno?: number;
  signal?: string;
  killed?: boolean;
  exitCode?: number | null;
  stdoutTail?: string;
  stderrTail?: string;
  target?: string;
  operation?: Operation;
}

export interface ProcessExecutionResult {
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
  rawJsonPath: string;
  rawJsonText: string | null;
  tempDir: string;
}

export interface BuildArgsInput extends ResolvedExecutionOptions {
  jsonFilePath: string;
  opensslBin: string;
}
