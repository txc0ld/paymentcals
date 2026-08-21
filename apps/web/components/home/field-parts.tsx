"use client";

/**
 * Shared input parts for the mortgage cluster that calculation-ui does not
 * carry. Dated ledger events need a bounded date control; every route that
 * exposes one uses this so the label, bounds and 44px target stay identical.
 */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

/** "2027-01-01" → "1 Jan 2027". Deterministic — no locale or ICU dependence. */
export function formatIsoDateLabel(iso: string): string {
  const [year, month, day] = iso.split("-");
  const name = MONTHS[Number.parseInt(month ?? "", 10) - 1];
  if (!year || !name || !day) return iso;
  return `${Number.parseInt(day, 10)} ${name} ${year}`;
}

/** True when `iso` is a well-formed ISO date inside [min, max]. */
export function isDateWithin(iso: string, min: string, max: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) && iso >= min && iso <= max;
}

export function DateField({
  id,
  label,
  description,
  value,
  min,
  max,
  onChange,
  error,
}: {
  id: string;
  label: string;
  description?: string;
  value: string;
  min?: string;
  max?: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  const descriptionId = description ? `${id}-desc` : undefined;
  return (
    <div className="grid min-w-0 content-start gap-1.5">
      <label htmlFor={id} className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-2">
        {label}
      </label>
      {description ? (
        <span id={descriptionId} className="text-[12px] leading-4 text-ink-3">
          {description}
        </span>
      ) : null}
      <input
        id={id}
        type="date"
        value={value}
        min={min}
        max={max}
        aria-describedby={descriptionId}
        aria-invalid={error ? true : undefined}
        onChange={(event) => onChange(event.target.value)}
        className="nexus-input min-h-11 bg-surface px-3 font-mono text-[14px] text-ink outline-none focus:border-focus"
      />
      {error ? (
        <span role="alert" className="text-[12px] text-error">
          {error}
        </span>
      ) : null}
    </div>
  );
}

/**
 * A panel that mounts its children — and therefore their ledger jobs — only
 * once opened. Nine extra worker jobs on one route is not something to pay for
 * before the reader asks for the comparison.
 */
export function DisclosurePanel({
  id,
  open,
  onToggle,
  heading,
  summary,
  children,
}: {
  id: string;
  open: boolean;
  onToggle: (open: boolean) => void;
  heading: string;
  summary: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-w-0 gap-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid min-w-0 gap-1">
          <h3 className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--pc-accent-text)]">
            {heading}
          </h3>
          <p className="max-w-[60ch] text-[12px] leading-5 text-ink-3">{summary}</p>
        </div>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => onToggle(!open)}
          className="nexus-quiet-button min-h-11 shrink-0 px-3 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-2 hover:text-ink focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          {open ? "Hide" : "Show"}
        </button>
      </div>
      <div id={id} hidden={!open}>
        {open ? children : null}
      </div>
    </div>
  );
}
