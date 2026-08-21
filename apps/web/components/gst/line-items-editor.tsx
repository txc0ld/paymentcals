"use client";

import { SegmentedControl } from "@paymentcalcs/calculation-ui";

export interface DraftLineItem {
  id: string;
  label: string;
  amountRaw: string;
  amountIs: "exclusive" | "inclusive";
  treatment: "taxable" | "gst_free" | "input_taxed";
  quantityRaw: string;
}

export function emptyLine(id: string): DraftLineItem {
  return { id, label: "", amountRaw: "", amountIs: "exclusive", treatment: "taxable", quantityRaw: "1" };
}

const TREATMENT_OPTIONS = [
  { value: "taxable" as const, label: "Taxable" },
  { value: "gst_free" as const, label: "GST-free" },
  { value: "input_taxed" as const, label: "Input taxed" },
];

export function LineItemsEditor({
  items,
  onChange,
  errors,
}: {
  items: DraftLineItem[];
  onChange: (items: DraftLineItem[]) => void;
  errors: Record<string, string>;
}) {
  function update(id: string, patch: Partial<DraftLineItem>) {
    onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  return (
    <div className="grid gap-4">
      <p className="text-[13px] leading-5 text-ink-3">
        GST treatment is your selection per line. It is never inferred from item names.
      </p>
      <ul className="grid gap-4">
        {items.map((item, index) => {
          const error = errors[item.id];
          return (
            <li key={item.id} className="nexus-line-item grid min-w-0 gap-4 bg-surface-2 p-4 md:p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3">
                  Line {String(index + 1).padStart(2, "0")}
                </span>
                {items.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => onChange(items.filter((other) => other.id !== item.id))}
                    className="nexus-quiet-button inline-flex min-h-11 items-center px-3 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 underline decoration-hairline-strong underline-offset-2 hover:text-error focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
              <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
                <label className="grid gap-1.5">
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-2">
                    Description (optional)
                  </span>
                  <input
                    value={item.label}
                    onChange={(event) => update(item.id, { label: event.target.value })}
                    placeholder="e.g. Consulting"
                    className="nexus-input min-h-11 min-w-0 bg-surface px-3 text-sm text-ink outline-none placeholder:text-ink-3 focus:border-focus"
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-2">Qty</span>
                  <input
                    inputMode="numeric"
                    value={item.quantityRaw}
                    onChange={(event) => update(item.id, { quantityRaw: event.target.value })}
                    className="nexus-input min-h-11 w-20 bg-surface px-3 text-center font-mono text-sm tabular-nums text-ink outline-none focus:border-focus"
                    aria-label={`Quantity for line ${index + 1}`}
                  />
                </label>
              </div>
              {/* Always stacked: this editor lives in the narrow inputs column,
                * so viewport breakpoints would lay three controls across ~440px. */}
              <div className="grid gap-4">
                <label className="grid gap-1.5">
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-2">
                    Unit amount
                  </span>
                  <div className={`nexus-input flex items-stretch overflow-hidden bg-surface ${error ? "border-error" : "border-hairline-strong focus-within:border-ink"}`}>
                    <span aria-hidden="true" className="flex items-center border-r border-hairline bg-surface-2 px-2.5 font-mono text-sm text-ink-3">$</span>
                    <input
                      inputMode="decimal"
                      value={item.amountRaw}
                      onChange={(event) => update(item.id, { amountRaw: event.target.value })}
                      placeholder="0.00"
                      aria-label={`Unit amount for line ${index + 1}`}
                      aria-invalid={error ? true : undefined}
                      className="min-h-11 min-w-0 w-full bg-transparent px-3 font-mono text-sm tabular-nums text-ink outline-none placeholder:text-ink-3"
                    />
                  </div>
                  {error ? (
                    <span role="alert" className="text-[12px] text-error">{error}</span>
                  ) : null}
                </label>
                <div className="grid content-end gap-1.5">
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-2">Amount is</span>
                  <SegmentedControl
                    size="sm"
                    label={`Amount basis for line ${index + 1}`}
                    value={item.amountIs}
                    onChange={(amountIs) => update(item.id, { amountIs })}
                    options={[
                      { value: "exclusive", label: "Ex GST" },
                      { value: "inclusive", label: "Inc GST" },
                    ]}
                  />
                </div>
                <div className="grid content-end gap-1.5">
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-2">Treatment</span>
                  <SegmentedControl
                    size="sm"
                    label={`GST treatment for line ${index + 1}`}
                    value={item.treatment}
                    onChange={(treatment) => update(item.id, { treatment })}
                    options={TREATMENT_OPTIONS}
                  />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        onClick={() => onChange([...items, emptyLine(crypto.randomUUID())])}
        className="nexus-quiet-button min-h-11 justify-self-start border-dashed border-hairline-strong px-4 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-2 hover:border-ink hover:text-ink focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-focus"
      >
        + Add line
      </button>
    </div>
  );
}
