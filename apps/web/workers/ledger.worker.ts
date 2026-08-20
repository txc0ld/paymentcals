import {
  compareRefinance,
  compareToBaseline,
  runLedger,
  type LedgerInput,
  type RefinanceCosts,
} from "@paymentcalcs/engine-mortgage-ledger";
import { serializeLedger, serializeRefinance } from "../lib/ledger-serialize";

/** Versioned worker protocol (§22.4). */
export interface LedgerWorkerRequest {
  protocol: "pc-ledger-v1";
  id: number;
  job:
    | { kind: "run"; input: LedgerInput }
    | { kind: "compare"; input: LedgerInput }
    | { kind: "refinance"; oldInput: LedgerInput; newInput: LedgerInput; costs: RefinanceCosts };
}

export interface LedgerWorkerResponse {
  protocol: "pc-ledger-v1";
  id: number;
  ok: boolean;
  result?: unknown;
  error?: string;
}

self.onmessage = (event: MessageEvent<LedgerWorkerRequest>) => {
  const { id, job, protocol } = event.data;
  if (protocol !== "pc-ledger-v1") return;
  try {
    let result: unknown;
    if (job.kind === "run") {
      result = serializeLedger(runLedger(job.input));
    } else if (job.kind === "compare") {
      const compared = compareToBaseline(job.input);
      result = {
        scenario: serializeLedger(compared.scenario),
        baseline: serializeLedger(compared.baseline),
        interestSaved: compared.interestSaved.toFixed(2),
        periodsSaved: compared.periodsSaved,
      };
    } else {
      result = serializeRefinance(compareRefinance(job.oldInput, job.newInput, job.costs));
    }
    const response: LedgerWorkerResponse = { protocol: "pc-ledger-v1", id, ok: true, result };
    self.postMessage(response);
  } catch (error) {
    const response: LedgerWorkerResponse = {
      protocol: "pc-ledger-v1",
      id,
      ok: false,
      error: error instanceof Error ? error.message : "ledger worker failure",
    };
    self.postMessage(response);
  }
};
