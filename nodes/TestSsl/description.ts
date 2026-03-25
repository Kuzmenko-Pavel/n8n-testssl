import type { INodeProperties } from 'n8n-workflow';

import { approvedCustomSafeChecks, supportedStartTlsProtocols } from './types';

const startTlsOptions = supportedStartTlsProtocols.map((value) => ({
  name: value,
  value,
}));

const customSafeOptions = approvedCustomSafeChecks.map((value) => ({
  name: value,
  value,
}));

export const testSslNodeProperties: INodeProperties[] = [
  {
    displayName: 'Target Source',
    name: 'targetSource',
    type: 'options',
    default: 'parameter',
    options: [
      { name: 'Parameter', value: 'parameter' },
      { name: 'Field', value: 'field' },
    ],
    description: 'Choose whether the scan target comes from a node parameter or an input field.',
  },
  {
    displayName: 'Target',
    name: 'target',
    type: 'string',
    default: '',
    required: true,
    displayOptions: {
      show: {
        targetSource: ['parameter'],
      },
    },
    description: 'Host, host:port, https://host, or bracketed IPv6 target.',
  },
  {
    displayName: 'Target Field',
    name: 'targetField',
    type: 'string',
    default: 'target',
    displayOptions: {
      show: {
        targetSource: ['field'],
      },
    },
    description: 'Dot path in the input JSON that resolves to the target string.',
  },
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    default: 'quickScan',
    options: [
      { name: 'Quick Scan', value: 'quickScan' },
      { name: 'Full Scan', value: 'fullScan' },
      { name: 'Protocols', value: 'protocols' },
      { name: 'Cipher Categories', value: 'cipherCategories' },
      { name: 'Server Defaults', value: 'serverDefaults' },
      { name: 'Server Preference', value: 'serverPreference' },
      { name: 'Headers', value: 'headers' },
      { name: 'Vulnerabilities', value: 'vulnerabilities' },
      { name: 'Client Simulation', value: 'clientSimulation' },
      { name: 'STARTTLS', value: 'starttls' },
      { name: 'Custom Safe Checks', value: 'customSafe' },
    ],
  },
  {
    displayName: 'Output Mode',
    name: 'outputMode',
    type: 'options',
    default: 'summaryAndNormalized',
    options: [
      { name: 'Summary', value: 'summary' },
      { name: 'Normalized Findings', value: 'normalizedFindings' },
      { name: 'Raw Findings', value: 'rawFindings' },
      { name: 'Summary And Normalized', value: 'summaryAndNormalized' },
      { name: 'All', value: 'all' },
    ],
  },
  {
    displayName: 'Overall Timeout Seconds',
    name: 'overallTimeoutSeconds',
    type: 'number',
    default: 180,
    typeOptions: {
      minValue: 30,
      maxValue: 900,
    },
  },
  {
    displayName: 'Connect Timeout Seconds',
    name: 'connectTimeoutSeconds',
    type: 'number',
    default: 10,
    typeOptions: {
      minValue: 1,
      maxValue: 60,
    },
  },
  {
    displayName: 'OpenSSL Timeout Seconds',
    name: 'opensslTimeoutSeconds',
    type: 'number',
    default: 10,
    typeOptions: {
      minValue: 1,
      maxValue: 60,
    },
  },
  {
    displayName: 'Warnings Mode',
    name: 'warningsMode',
    type: 'options',
    default: 'batch',
    options: [
      { name: 'Batch', value: 'batch' },
      { name: 'Off', value: 'off' },
    ],
  },
  {
    displayName: 'Severity Filter',
    name: 'severityFilter',
    type: 'options',
    default: 'LOW',
    options: [
      { name: 'LOW', value: 'LOW' },
      { name: 'MEDIUM', value: 'MEDIUM' },
      { name: 'HIGH', value: 'HIGH' },
      { name: 'CRITICAL', value: 'CRITICAL' },
    ],
  },
  {
    displayName: 'Quiet',
    name: 'quiet',
    type: 'boolean',
    default: true,
  },
  {
    displayName: 'Wide Output',
    name: 'wide',
    type: 'boolean',
    default: false,
  },
  {
    displayName: 'Show Each Cipher',
    name: 'showEach',
    type: 'boolean',
    default: false,
  },
  {
    displayName: 'IPv6',
    name: 'ipv6',
    type: 'boolean',
    default: false,
  },
  {
    displayName: 'No DNS Mode',
    name: 'nodnsMode',
    type: 'options',
    default: 'default',
    options: [
      { name: 'Default', value: 'default' },
      { name: 'Min', value: 'min' },
      { name: 'None', value: 'none' },
    ],
  },
  {
    displayName: 'IP Mode',
    name: 'ipMode',
    type: 'options',
    default: 'auto',
    options: [
      { name: 'Auto', value: 'auto' },
      { name: 'One', value: 'one' },
      { name: 'Proxy', value: 'proxy' },
      { name: 'Custom', value: 'custom' },
    ],
  },
  {
    displayName: 'Custom IP',
    name: 'customIp',
    type: 'string',
    default: '',
    displayOptions: {
      show: {
        ipMode: ['custom'],
      },
    },
  },
  {
    displayName: 'Sneaky',
    name: 'sneaky',
    type: 'boolean',
    default: false,
  },
  {
    displayName: 'IDS Friendly',
    name: 'idsFriendly',
    type: 'boolean',
    default: false,
  },
  {
    displayName: 'Phone Out',
    name: 'phoneOut',
    type: 'boolean',
    default: false,
  },
  {
    displayName: 'Proxy',
    name: 'proxy',
    type: 'string',
    default: '',
  },
  {
    displayName: 'Basic Auth',
    name: 'basicAuth',
    type: 'string',
    default: '',
    typeOptions: {
      password: true,
    },
  },
  {
    displayName: 'Request Headers',
    name: 'requestHeaders',
    placeholder: 'Add Header',
    type: 'fixedCollection',
    default: {},
    typeOptions: {
      multipleValues: true,
    },
    options: [
      {
        name: 'values',
        displayName: 'Values',
        values: [
          {
            displayName: 'Header',
            name: 'header',
            type: 'string',
            default: '',
          },
        ],
      },
    ],
  },
  {
    displayName: 'Additional CA Path',
    name: 'addCaPath',
    type: 'string',
    default: '',
    description: 'Optional self-hosted-only CA path passed to --add-ca.',
  },
  {
    displayName: 'mTLS Client PEM Path',
    name: 'mtlsClientPemPath',
    type: 'string',
    default: '',
    description: 'Optional self-hosted-only path to an unencrypted client PEM file.',
  },
  {
    displayName: 'STARTTLS Protocol',
    name: 'starttlsProtocol',
    type: 'options',
    default: 'smtp',
    options: startTlsOptions,
    displayOptions: {
      show: {
        operation: ['starttls'],
      },
    },
  },
  {
    displayName: 'XMPP Host',
    name: 'xmppHost',
    type: 'string',
    default: '',
    displayOptions: {
      show: {
        operation: ['starttls'],
        starttlsProtocol: ['xmpp', 'xmpp-server'],
      },
    },
  },
  {
    displayName: 'Custom Safe Checks',
    name: 'customSafeChecks',
    type: 'multiOptions',
    default: [],
    options: customSafeOptions,
    displayOptions: {
      show: {
        operation: ['customSafe'],
      },
    },
  },
  {
    displayName: 'Continue On Item Error',
    name: 'continueOnItemError',
    type: 'boolean',
    default: false,
  },
  {
    displayName: 'Fail On Severity',
    name: 'failOnSeverity',
    type: 'options',
    default: 'none',
    options: [
      { name: 'None', value: 'none' },
      { name: 'CRITICAL', value: 'CRITICAL' },
      { name: 'HIGH', value: 'HIGH' },
      { name: 'MEDIUM', value: 'MEDIUM' },
    ],
  },
  {
    displayName: 'Attach Raw JSON As Binary',
    name: 'attachRawJsonAsBinary',
    type: 'boolean',
    default: false,
  },
  {
    displayName: 'Include Stdout',
    name: 'includeStdout',
    type: 'boolean',
    default: false,
  },
  {
    displayName: 'Include Stderr',
    name: 'includeStderr',
    type: 'boolean',
    default: true,
  },
  {
    displayName: 'Keep Temp Files For Debug',
    name: 'keepTempFilesForDebug',
    type: 'boolean',
    default: false,
  },
];
