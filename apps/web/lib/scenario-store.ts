import type { ScenarioDocumentV1 } from "@paymentcalcs/scenario-schema";
import { zScenarioDocumentV1 } from "@paymentcalcs/scenario-schema";

/**
 * Anonymous save (§9.6): IndexedDB, no accounts, no server. Values never leave
 * the device. Clearing site data deletes scenarios — communicated in UI copy.
 */
const DB_NAME = "paymentcalcs";
const STORE = "scenarios";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "scenarioId" });
        store.createIndex("calculatorId", "calculatorId");
        store.createIndex("updatedAt", "updatedAt");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB unavailable"));
  });
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE, mode);
        const request = run(transaction.objectStore(STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
        transaction.oncomplete = () => db.close();
      }),
  );
}

export async function saveScenario(document: ScenarioDocumentV1): Promise<void> {
  zScenarioDocumentV1.parse(document);
  await tx("readwrite", (store) => store.put(document));
}

export async function listScenarios(calculatorId: string): Promise<ScenarioDocumentV1[]> {
  const all = await tx<unknown[]>("readonly", (store) =>
    store.index("calculatorId").getAll(calculatorId),
  );
  return all
    .map((raw) => zScenarioDocumentV1.safeParse(raw))
    .filter((parsed): parsed is { success: true; data: ScenarioDocumentV1 } => parsed.success)
    .map((parsed) => parsed.data)
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

export async function deleteScenario(scenarioId: string): Promise<void> {
  await tx("readwrite", (store) => store.delete(scenarioId));
}
