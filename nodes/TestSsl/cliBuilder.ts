import type { BuildArgsInput } from './types';
import { resolveIpMode } from './validators';

const operationArgs: Record<BuildArgsInput['operation'], string[]> = {
  quickScan: ['-p', '-S', '-h', '-U'],
  fullScan: ['--full'],
  protocols: ['-p'],
  cipherCategories: ['-s'],
  serverDefaults: ['-S'],
  serverPreference: ['-P'],
  headers: ['-h'],
  vulnerabilities: ['-U'],
  clientSimulation: ['-c'],
  starttls: [],
  customSafe: [],
};

export function buildArgs(input: BuildArgsInput): string[] {
  const args: string[] = [
    '--color',
    '0',
    '--warnings',
    input.warningsMode,
    '--connect-timeout',
    String(input.connectTimeoutSeconds),
    '--openssl-timeout',
    String(input.opensslTimeoutSeconds),
    '--severity',
    input.severityFilter,
    '--jsonfile',
    input.jsonFilePath,
    '--openssl',
    input.opensslBin,
  ];

  if (input.quiet) {
    args.push('--quiet');
  }

  if (input.wide) {
    args.push('--wide');
  }

  if (input.showEach) {
    args.push('--show-each');
  }

  if (input.ipv6) {
    args.push('-6');
  }

  if (input.nodnsMode !== 'default') {
    args.push('--nodns', input.nodnsMode);
  }

  const resolvedIpMode = resolveIpMode(input.ipMode, input.customIp);
  if (resolvedIpMode) {
    args.push('--ip', resolvedIpMode);
  }

  if (input.sneaky) {
    args.push('--sneaky');
  }

  if (input.idsFriendly) {
    args.push('--ids-friendly');
  }

  if (input.phoneOut) {
    args.push('--phone-out');
  }

  if (input.proxy) {
    args.push('--proxy', input.proxy);
  }

  if (input.basicAuth) {
    args.push('--basicauth', input.basicAuth);
  }

  for (const header of input.requestHeaders) {
    args.push('--reqheader', header);
  }

  if (input.addCaPath) {
    args.push('--add-ca', input.addCaPath);
  }

  if (input.mtlsClientPemPath) {
    args.push('--mtls', input.mtlsClientPemPath);
  }

  if (input.operation === 'starttls') {
    args.push('--starttls', input.starttlsProtocol ?? 'smtp');
    if (input.xmppHost) {
      args.push('--xmpphost', input.xmppHost);
    }
  }

  if (input.operation === 'customSafe') {
    args.push(...input.customSafeChecks);
  } else {
    args.push(...operationArgs[input.operation]);
  }

  args.push(input.target);
  return args;
}
