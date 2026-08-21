"use client";

import { useState } from "react";

/**
 * C1 — the Save · Share · Print · Reset action bar (extracted from the pay
 * calculator's pattern) so every route can offer scenario actions. The host
 * passes callbacks; URL/state mechanics stay in the calculator that owns them.
 */
export function ScenarioActions({
  onSave,
  onShare,
  onReset,
}: {
  /** Persist the scenario (IndexedDB); resolve to a short flash message. */
  onSave?: () => Promise<string>;
  /** Copy the share URL; resolve to a short flash message. */
  onShare?: () => Promise<string>;
  onReset?: () => void;
}) {
  const [flash, setFlash] = useState<string | null>(null);

  const run = (action: () => Promise<string>) => async () => {
    try {
      setFlash(await action());
    } catch {
      setFlash("That did not work in this browser");
    }
    setTimeout(() => setFlash(null), 2500);
  };

  const buttons: Array<[string, () => void]> = [];
  if (onSave) buttons.push(["Save", run(onSave)]);
  if (onShare) buttons.push(["Share", run(onShare)]);
  buttons.push(["Print", () => window.print()]);
  if (onReset) buttons.push(["Reset", onReset]);

  return (
    <span className="no-print flex items-center gap-2">
      {flash ? (
        <span role="status" className="font-mono text-[10px] uppercase tracking-[0.14em] text-positive">
          {flash}
        </span>
      ) : null}
      {buttons.map(([label, handler]) => (
        <button
          key={label}
          type="button"
          onClick={handler}
          className="nexus-quiet-button min-h-11 px-4 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-2 hover:text-ink focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          {label}
        </button>
      ))}
    </span>
  );
}
