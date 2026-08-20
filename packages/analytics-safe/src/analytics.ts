import { redactEvent, type AllowedValue, type RejectedEvent } from "./redaction";

export interface AnalyticsProvider {
  send(event: string, props: Record<string, AllowedValue>): void;
}

export interface Analytics {
  track(event: string, props?: Record<string, unknown>): void;
}

/**
 * The only sanctioned path to any analytics provider. Rejected events are
 * dropped (never partially sent) and surfaced to an optional observer that
 * receives keys and reasons only — never values.
 */
export function createAnalytics(
  provider: AnalyticsProvider,
  onRejected?: (rejection: RejectedEvent) => void,
): Analytics {
  return {
    track(event, props = {}) {
      const outcome = redactEvent(event, props);
      if (outcome.accepted) {
        provider.send(outcome.event, outcome.props);
      } else {
        onRejected?.(outcome.rejection);
      }
    },
  };
}

/** Plausible script-tag provider (no cookies, no consent banner). */
export function plausibleProvider(): AnalyticsProvider {
  return {
    send(event, props) {
      const w = globalThis as { plausible?: (e: string, o?: { props: unknown }) => void };
      w.plausible?.(event, { props });
    },
  };
}

export function noopProvider(): AnalyticsProvider {
  return { send() {} };
}
