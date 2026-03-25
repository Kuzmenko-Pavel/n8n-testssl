import type { RawTestsslFinding } from './types';

export class TestsslParseError extends Error {
  constructor(message: string, public readonly context?: Record<string, unknown>) {
    super(message);
  }
}

export function parseFlatJson(text: string): RawTestsslFinding[] {
  const trimmed = text.replace(/^\uFEFF/, '').trim();

  if (!trimmed) {
    return [];
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;

    if (Array.isArray(parsed)) {
      return parsed as RawTestsslFinding[];
    }

    if (parsed && typeof parsed === 'object') {
      const objectWithFindings = parsed as { findings?: unknown; results?: unknown };
      if (Array.isArray(objectWithFindings.findings)) {
        return objectWithFindings.findings as RawTestsslFinding[];
      }

      if (Array.isArray(objectWithFindings.results)) {
        return objectWithFindings.results as RawTestsslFinding[];
      }
    }
  } catch (error) {
    throw new TestsslParseError('Failed to parse flat JSON from testssl output.', {
      snippet: trimmed.slice(0, 300),
      cause: error instanceof Error ? error.message : String(error),
    });
  }

  throw new TestsslParseError('Unsupported JSON structure from testssl output.', {
    snippet: trimmed.slice(0, 300),
  });
}
