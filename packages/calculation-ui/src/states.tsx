import type { ReactNode } from "react";

/** §20.12 Rule Unavailable — disable calculation, explain, never substitute. */
export function RuleUnavailableState({
  jurisdictionLabel,
  detail,
}: {
  jurisdictionLabel: string;
  detail?: string;
}) {
  return (
    <div role="status" className="grid gap-3 border border-hairline bg-surface p-8 text-center">
      <span className="mx-auto border border-hairline px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-2">
        Temporarily unavailable
      </span>
      <h2 className="text-lg font-medium text-ink">Rules unavailable for {jurisdictionLabel}</h2>
      <p className="mx-auto max-w-md text-[14px] leading-6 text-ink-2">
        The verified rule set this calculator depends on could not be loaded, so no result is shown.
        This calculator never substitutes a different year or jurisdiction.
      </p>
      {detail ? <p className="font-mono text-[11px] text-ink-3">{detail}</p> : null}
    </div>
  );
}

/** §20.12 Engine Failure — no stale output, reference ID, inputs preserved. */
export function EngineFailureState({
  referenceId,
  onExportInputs,
}: {
  referenceId: string;
  onExportInputs?: () => void;
}) {
  return (
    <div role="alert" className="grid gap-3 border border-error bg-error-surface p-8 text-center">
      <h2 className="text-lg font-medium text-ink">This calculation could not be completed</h2>
      <p className="mx-auto max-w-md text-[14px] leading-6 text-ink-2">
        Your inputs are preserved on this device. No partial or stale result is shown.
      </p>
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">
        Reference {referenceId}
      </p>
      {onExportInputs ? (
        <button
          type="button"
          onClick={onExportInputs}
          className="mx-auto border border-hairline-strong px-4 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink hover:bg-surface-2"
        >
          Export my inputs as JSON
        </button>
      ) : null}
    </div>
  );
}

/** §20.12 Empty — explain the minimum action; no misleading zeros. */
export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="grid place-items-center gap-2 border border-dashed border-hairline-strong p-10 text-center">
      <p className="max-w-sm text-[14px] leading-6 text-ink-2">{children}</p>
    </div>
  );
}
