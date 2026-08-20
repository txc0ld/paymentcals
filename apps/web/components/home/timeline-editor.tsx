"use client";

import { SelectField } from "@paymentcalcs/calculation-ui";
import { formatMajor } from "../../lib/format-major";

/** Editable, keyboard-operable timeline of dated events (§21.3 subset). */
export interface DraftEvent {
  id: string;
  kind:
    | "rate_change"
    | "extra_recurring"
    | "extra_oneoff"
    | "offset_deposit"
    | "offset_withdrawal"
    | "fee_annual";
  date: string;
  amountRaw: string;
}

export const EVENT_LABEL: Record<DraftEvent["kind"], string> = {
  rate_change: "Rate change (new % p.a.)",
  extra_recurring: "Recurring extra repayment",
  extra_oneoff: "One-off extra repayment",
  offset_deposit: "Offset deposit",
  offset_withdrawal: "Offset withdrawal",
  fee_annual: "Annual fee",
};

export function TimelineEditor({
  events,
  onChange,
}: {
  events: DraftEvent[];
  onChange: (events: DraftEvent[]) => void;
}) {
  const sorted = [...events].sort((a, b) => (a.date < b.date ? -1 : 1));

  function update(id: string, patch: Partial<DraftEvent>) {
    onChange(events.map((event) => (event.id === id ? { ...event, ...patch } : event)));
  }

  return (
    <div className="grid gap-4">
      <p className="text-[13px] leading-5 text-ink-3">
        Scheduled model: each event takes effect from the first repayment date on or after its date,
        in order — rate changes first, then offset movements, repayments and fees. Mid-period timing
        is not modelled.
      </p>
      <ol className="grid gap-3">
        {sorted.map((event) => (
          <li key={event.id} className="nexus-line-item grid min-w-0 gap-3 bg-surface-2 p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3">
                {EVENT_LABEL[event.kind]}
              </span>
              <button
                type="button"
                onClick={() => onChange(events.filter((other) => other.id !== event.id))}
                className="nexus-quiet-button inline-flex min-h-11 items-center px-3 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 hover:text-error focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                Remove
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1">
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-2">
                  {event.kind === "extra_recurring" || event.kind === "fee_annual" ? "Starts" : "Date"}
                </span>
                <input
                  type="date"
                  value={event.date}
                  onChange={(e) => update(event.id, { date: e.target.value })}
                  className="nexus-input min-h-11 bg-surface px-3 font-mono text-[14px] text-ink outline-none focus:border-focus"
                />
              </label>
              <label className="grid gap-1">
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-2">
                  {event.kind === "rate_change" ? "New rate % p.a." : "Amount"}
                </span>
                <input
                  inputMode="decimal"
                  value={event.amountRaw}
                  onChange={(e) => update(event.id, { amountRaw: e.target.value })}
                  placeholder={event.kind === "rate_change" ? "6.25" : "0.00"}
                  className="nexus-input min-h-11 bg-surface px-3 font-mono text-[15px] tabular-nums text-ink outline-none focus:border-focus"
                />
              </label>
            </div>
          </li>
        ))}
      </ol>
      <AddEventControl onAdd={(kind) => onChange([...events, { id: crypto.randomUUID(), kind, date: "2027-01-01", amountRaw: "" }])} />
      {sorted.length > 0 ? (
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
          {sorted.length} event{sorted.length === 1 ? "" : "s"} · earliest {sorted[0]!.date}
          {sorted[0]!.amountRaw && sorted[0]!.kind !== "rate_change"
            ? ` · ${formatMajor(sorted[0]!.amountRaw.replace(/,/g, "") || "0")}`
            : ""}
        </p>
      ) : null}
    </div>
  );
}

function AddEventControl({ onAdd }: { onAdd: (kind: DraftEvent["kind"]) => void }) {
  return (
    <div className="grid gap-1.5">
      <SelectField
        id="add-event"
        label="Add a timeline event"
        value={"" as never}
        onChange={(kind) => {
          if (kind) onAdd(kind as DraftEvent["kind"]);
        }}
        options={[
          { value: "" as never, label: "Choose an event type…" },
          ...Object.entries(EVENT_LABEL).map(([value, label]) => ({ value: value as never, label })),
        ]}
      />
    </div>
  );
}
