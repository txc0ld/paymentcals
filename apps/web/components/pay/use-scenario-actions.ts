"use client";

import { useEffect, useRef, useState } from "react";
import { decodeUrlState, encodeUrlState } from "@paymentcalcs/scenario-schema";
import { analytics } from "../../lib/analytics";
import { saveScenario } from "../../lib/scenario-store";

type ScenarioPrimitive = string | number | boolean;

/**
 * Save/Share plumbing for the pay routes, lifted verbatim from the pay
 * calculator: hydrate local state once from `?s=`, mirror it back on change,
 * and persist to IndexedDB. The versioned `{ calculatorId, input }` envelope
 * is unchanged — only which calculators use it is new.
 */
export function useScenarioActions<T extends Record<string, ScenarioPrimitive>>(options: {
  calculatorId: string;
  /** The serialisable slice of local state. */
  state: T;
  /** Applies a decoded `?s=` payload; takes only keys it recognises. */
  onHydrate: (saved: Partial<T>) => void;
  /** Rule packs backing the current result, for the saved document. */
  rulePackIds?: readonly string[];
}): { onSave: () => Promise<string>; onShare: () => Promise<string> } {
  const { calculatorId, state, onHydrate, rulePackIds } = options;
  const [hydrated, setHydrated] = useState(false);
  const startedHydration = useRef(false);

  // Refs keep the effects free of per-render identities without stale reads.
  const hydrateRef = useRef(onHydrate);
  hydrateRef.current = onHydrate;
  const stateRef = useRef(state);
  stateRef.current = state;
  const packsRef = useRef(rulePackIds);
  packsRef.current = rulePackIds;

  useEffect(() => {
    if (startedHydration.current) return;
    startedHydration.current = true;
    const param = new URLSearchParams(window.location.search).get("s");
    if (param) {
      const decoded = decodeUrlState(param);
      if (
        decoded.ok &&
        decoded.state.calculatorId === calculatorId &&
        typeof decoded.state.input === "object" &&
        decoded.state.input !== null
      ) {
        hydrateRef.current(decoded.state.input as Partial<T>);
      }
    }
    setHydrated(true);
  }, [calculatorId]);

  // Encoding here (not in the effect) gives a stable string dependency, so a
  // fresh state object with identical values does not rewrite the URL.
  const encoded = encodeUrlState({ calculatorId, input: state });
  useEffect(() => {
    if (!hydrated) return;
    const url = new URL(window.location.href);
    url.searchParams.set("s", encoded);
    window.history.replaceState(null, "", url);
  }, [hydrated, encoded]);

  return {
    async onSave() {
      const now = new Date().toISOString();
      await saveScenario({
        scenarioId: `sc_${crypto.randomUUID().slice(0, 8)}`,
        schemaVersion: "1",
        calculatorId,
        createdAt: now,
        updatedAt: now,
        jurisdiction: { country: "AU" },
        locale: "en-AU",
        currency: "AUD",
        input: stateRef.current,
        selectedRulePacks: [...(packsRef.current ?? [])],
        consent: { storage: "local" },
      });
      analytics.track("scenario_action", { calculator_id: calculatorId, action: "save" });
      return "Saved on this device";
    },
    async onShare() {
      await navigator.clipboard.writeText(window.location.href);
      analytics.track("scenario_action", { calculator_id: calculatorId, action: "share" });
      return "Link copied";
    },
  };
}
