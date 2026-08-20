"use client";

import { useEffect, useRef, useState } from "react";
import {
  compareRefinance,
  compareToBaseline,
  runLedger,
} from "@paymentcalcs/engine-mortgage-ledger";
import { serializeLedger, serializeRefinance } from "./ledger-serialize";
import type { LedgerWorkerRequest, LedgerWorkerResponse } from "../workers/ledger.worker";

type Job = LedgerWorkerRequest["job"];

/**
 * Runs ledger jobs in a Web Worker (§22.4) with a synchronous main-thread
 * fallback when workers are unavailable. Results are the serialized forms.
 */
export function useLedgerJob<TResult>(job: Job | null): {
  result: TResult | null;
  running: boolean;
  error: string | null;
} {
  const workerRef = useRef<Worker | null>(null);
  const idRef = useRef(0);
  const [state, setState] = useState<{ result: TResult | null; running: boolean; error: string | null }>({
    result: null,
    running: false,
    error: null,
  });

  useEffect(() => {
    if (typeof Worker !== "undefined" && workerRef.current === null) {
      try {
        workerRef.current = new Worker(new URL("../workers/ledger.worker.ts", import.meta.url));
      } catch {
        workerRef.current = null;
      }
    }
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!job) {
      setState({ result: null, running: false, error: null });
      return;
    }
    const id = ++idRef.current;
    setState((s) => ({ ...s, running: true, error: null }));

    const worker = workerRef.current;
    if (worker) {
      const onMessage = (event: MessageEvent<LedgerWorkerResponse>) => {
        if (event.data.protocol !== "pc-ledger-v1" || event.data.id !== id) return;
        if (id !== idRef.current) return; // stale
        worker.removeEventListener("message", onMessage);
        if (event.data.ok) {
          setState({ result: event.data.result as TResult, running: false, error: null });
        } else {
          setState({ result: null, running: false, error: event.data.error ?? "calculation failed" });
        }
      };
      worker.addEventListener("message", onMessage);
      const request: LedgerWorkerRequest = { protocol: "pc-ledger-v1", id, job };
      worker.postMessage(request);
      return () => worker.removeEventListener("message", onMessage);
    }

    // Main-thread fallback.
    try {
      let result: unknown;
      if (job.kind === "run") result = serializeLedger(runLedger(job.input));
      else if (job.kind === "compare") {
        const compared = compareToBaseline(job.input);
        result = {
          scenario: serializeLedger(compared.scenario),
          baseline: serializeLedger(compared.baseline),
          interestSaved: compared.interestSaved.toFixed(2),
          periodsSaved: compared.periodsSaved,
        };
      } else result = serializeRefinance(compareRefinance(job.oldInput, job.newInput, job.costs));
      setState({ result: result as TResult, running: false, error: null });
    } catch (error) {
      setState({
        result: null,
        running: false,
        error: error instanceof Error ? error.message : "calculation failed",
      });
    }
  }, [job]);

  return state;
}
