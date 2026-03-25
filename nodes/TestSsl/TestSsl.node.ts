import type {
  IDataObject,
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from 'n8n-workflow';
import {
  NodeOperationError,
} from 'n8n-workflow';

import { normalizeFindings } from './normalizer';
import { parseFlatJson, TestsslParseError } from './parser';
import {
  ensureVendorAssets,
  executeTestssl,
  readUpstreamVersion,
  resolveRuntimePaths,
  serializeProcessError,
} from './processRunner';
import { testSslNodeProperties } from './description';
import { buildSummary, shouldFailForSeverity } from './summarizer';
import type {
  Operation,
  OutputMode,
  RawTestsslFinding,
  RequestHeaderEntry,
  ResolvedExecutionOptions,
  SeverityFilter,
  SeverityThreshold,
  TargetSource,
  WarningsMode,
} from './types';
import {
  ensureLinuxX64Support,
  getTargetFromSource,
  parseTargetParts,
  resolveIpMode,
  validateCustomSafeChecks,
  validateHeaders,
  validateOptionalSocketPath,
  validateProxy,
  validateStartTlsProtocol,
  validateTarget,
} from './validators';

export class TestSsl implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'TestSSL',
    name: 'testSsl',
    icon: 'file:testssl.svg',
    group: ['transform'],
    version: 1,
    description: 'Test SSL/TLS configuration of a server using vendored testssl.sh',
    defaults: {
      name: 'TestSSL',
    },
    inputs: ['main'],
    outputs: ['main'],
    properties: testSslNodeProperties,
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    ensureLinuxX64Support();

    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];
    const runtimePaths = resolveRuntimePaths(__dirname);
    await ensureVendorAssets(runtimePaths);
    const upstreamVersion = await readUpstreamVersion(runtimePaths);

    for (let itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
      const continueOnError =
        this.continueOnFail() ||
        (this.getNodeParameter('continueOnItemError', itemIndex) as boolean);

      try {
        const targetSource = this.getNodeParameter('targetSource', itemIndex) as TargetSource;
        const targetParameter = this.getNodeParameter('target', itemIndex, '') as string;
        const targetField = this.getNodeParameter('targetField', itemIndex, 'target') as string;
        const sourceTarget = getTargetFromSource(
          targetSource,
          targetParameter,
          targetField,
          items[itemIndex].json as Record<string, unknown>,
        );
        const validatedTarget = validateTarget(sourceTarget);
        const requestHeadersRaw =
          (this.getNodeParameter('requestHeaders', itemIndex, {}) as {
            values?: RequestHeaderEntry[];
          }).values ?? [];
        const ipMode = this.getNodeParameter(
          'ipMode',
          itemIndex,
        ) as ResolvedExecutionOptions['ipMode'];
        const customIp = validateOptionalSocketPath(
          this.getNodeParameter('customIp', itemIndex, '') as string,
          'Custom IP',
        );
        if (ipMode === 'custom') {
          resolveIpMode(ipMode, customIp);
        }

        const options: ResolvedExecutionOptions = {
          target: validatedTarget,
          operation: this.getNodeParameter('operation', itemIndex) as Operation,
          outputMode: this.getNodeParameter('outputMode', itemIndex) as OutputMode,
          overallTimeoutSeconds: this.getNodeParameter('overallTimeoutSeconds', itemIndex) as number,
          connectTimeoutSeconds: this.getNodeParameter('connectTimeoutSeconds', itemIndex) as number,
          opensslTimeoutSeconds: this.getNodeParameter('opensslTimeoutSeconds', itemIndex) as number,
          warningsMode: this.getNodeParameter('warningsMode', itemIndex) as WarningsMode,
          severityFilter: this.getNodeParameter('severityFilter', itemIndex) as SeverityFilter,
          quiet: this.getNodeParameter('quiet', itemIndex) as boolean,
          wide: this.getNodeParameter('wide', itemIndex) as boolean,
          showEach: this.getNodeParameter('showEach', itemIndex) as boolean,
          ipv6: this.getNodeParameter('ipv6', itemIndex) as boolean,
          nodnsMode: this.getNodeParameter('nodnsMode', itemIndex) as ResolvedExecutionOptions['nodnsMode'],
          ipMode,
          customIp,
          sneaky: this.getNodeParameter('sneaky', itemIndex) as boolean,
          idsFriendly: this.getNodeParameter('idsFriendly', itemIndex) as boolean,
          phoneOut: this.getNodeParameter('phoneOut', itemIndex) as boolean,
          proxy: validateProxy(this.getNodeParameter('proxy', itemIndex, '') as string),
          basicAuth: validateOptionalSocketPath(
            this.getNodeParameter('basicAuth', itemIndex, '') as string,
            'Basic Auth',
          ),
          requestHeaders: validateHeaders(requestHeadersRaw),
          addCaPath: validateOptionalSocketPath(
            this.getNodeParameter('addCaPath', itemIndex, '') as string,
            'Additional CA Path',
          ),
          mtlsClientPemPath: validateOptionalSocketPath(
            this.getNodeParameter('mtlsClientPemPath', itemIndex, '') as string,
            'mTLS Client PEM Path',
          ),
          starttlsProtocol: validateStartTlsProtocol(
            this.getNodeParameter('starttlsProtocol', itemIndex, '') as string,
          ),
          xmppHost: validateOptionalSocketPath(
            this.getNodeParameter('xmppHost', itemIndex, '') as string,
            'XMPP Host',
          ),
          customSafeChecks: validateCustomSafeChecks(
            this.getNodeParameter('customSafeChecks', itemIndex, []) as string[],
          ),
          continueOnItemError: continueOnError,
          failOnSeverity: this.getNodeParameter('failOnSeverity', itemIndex) as SeverityThreshold,
          attachRawJsonAsBinary: this.getNodeParameter('attachRawJsonAsBinary', itemIndex) as boolean,
          includeStdout: this.getNodeParameter('includeStdout', itemIndex) as boolean,
          includeStderr: this.getNodeParameter('includeStderr', itemIndex) as boolean,
          keepTempFilesForDebug: this.getNodeParameter('keepTempFilesForDebug', itemIndex) as boolean,
        };

        const processResult = await executeTestssl(options, runtimePaths);
        const rawFindings: RawTestsslFinding[] = processResult.rawJsonText
          ? parseFlatJson(processResult.rawJsonText)
          : [];
        const normalizedFindings = normalizeFindings(rawFindings);
        const { hostname, port } = parseTargetParts(options.target);
        const summary = buildSummary({
          target: options.target,
          hostname,
          port,
          operation: options.operation,
          success: processResult.exitCode === 0,
          exitCode: processResult.exitCode,
          startedAt: processResult.startedAt,
          finishedAt: processResult.finishedAt,
          durationMs: processResult.durationMs,
          findings: normalizedFindings,
          upstreamVersion,
        });

        if (shouldFailForSeverity(options.failOnSeverity, summary.highestSeverity)) {
          throw new NodeOperationError(
            this.getNode(),
            `Highest severity ${summary.highestSeverity} meets failOnSeverity=${options.failOnSeverity}.`,
            { itemIndex },
          );
        }

        const json: IDataObject = {
          success: processResult.exitCode === 0,
          target: options.target,
          operation: options.operation,
          startedAt: processResult.startedAt,
          finishedAt: processResult.finishedAt,
          durationMs: processResult.durationMs,
          exitCode: processResult.exitCode,
          summary: undefined,
          normalizedFindings: undefined,
          rawFindings: undefined,
          process: {
            signal: processResult.signal,
            stdout: options.includeStdout ? processResult.stdout : undefined,
            stderr: options.includeStderr ? processResult.stderr : undefined,
          },
          meta: {
            platform: `${process.platform}-${process.arch}`,
            testsslInstallDir: runtimePaths.vendorDir,
            bundledOpenssl: 'openssl.Linux.x86_64',
            parserMode: 'flat-json',
            upstreamVersion,
          },
        };

        if (options.outputMode === 'summary' || options.outputMode === 'summaryAndNormalized' || options.outputMode === 'all') {
          json.summary = summary;
        }

        if (
          options.outputMode === 'normalizedFindings' ||
          options.outputMode === 'summaryAndNormalized' ||
          options.outputMode === 'all'
        ) {
          json.normalizedFindings = normalizedFindings;
        }

        if (options.outputMode === 'rawFindings' || options.outputMode === 'all') {
          json.rawFindings = rawFindings;
        }

        const outputItem: INodeExecutionData = { json };

        if (options.attachRawJsonAsBinary && processResult.rawJsonText) {
          const binaryData = await this.helpers.prepareBinaryData(
            Buffer.from(processResult.rawJsonText, 'utf8'),
            `testssl-${itemIndex + 1}.json`,
            'application/json',
          );

          outputItem.binary = {
            rawJson: binaryData,
          };
        }

        returnData.push(outputItem);
      } catch (error) {
        if (
          error instanceof TestsslParseError ||
          error instanceof Error
        ) {
          if (continueOnError) {
            returnData.push({
              json: {
                success: false,
                error: serializeProcessError(error, {
                  target: (items[itemIndex].json.target as string | undefined) ?? undefined,
                }),
              },
            });
            continue;
          }
        }

        if (error instanceof NodeOperationError) {
          throw error;
        }

        throw new NodeOperationError(this.getNode(), (error as Error).message, {
          itemIndex,
        });
      }
    }

    return [returnData];
  }
}
