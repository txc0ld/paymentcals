/**
 * Error-reporting adapter stub (§22.2 — no Sentry account yet). The adapter
 * shape is final so a real sink can be wired later without touching call
 * sites; redaction is structural: only these fields exist, so raw inputs,
 * outputs and scenario labels can never be attached.
 */
export interface RedactedErrorReport {
  /** §H.6 stable code, e.g. PC-CALC-0002. */
  code: string;
  message: string;
  calculatorId?: string;
  /** Reference ID surfaced to the user for support (§20.12 Engine Failure). */
  referenceId: string;
}

export interface ErrorSink {
  report(report: RedactedErrorReport): void;
}

export function createErrorReporter(sink: ErrorSink) {
  return {
    report(input: { code: string; message: string; calculatorId?: string }): string {
      const referenceId = `PC-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
      sink.report({
        code: input.code,
        // Defensive: strip anything that looks like a currency amount from
        // messages composed upstream.
        message: input.message.replace(/[$€£]\s?\d[\d,.]*/g, "[redacted]"),
        ...(input.calculatorId ? { calculatorId: input.calculatorId } : {}),
        referenceId,
      });
      return referenceId;
    },
  };
}

export function consoleSink(): ErrorSink {
  return {
    report(report) {
      console.error(`[${report.code}] ${report.message} (ref ${report.referenceId})`);
    },
  };
}

export function noopSink(): ErrorSink {
  return { report() {} };
}
