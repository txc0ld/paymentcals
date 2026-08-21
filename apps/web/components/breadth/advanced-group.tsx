"use client";

import { useId, type ReactNode } from "react";

/**
 * Progressive disclosure for engine inputs that already carry a neutral
 * default. Closed on load, so opening it is the only way to change the
 * calculator's behaviour — the defaults reproduce the simple result exactly.
 * A native <details> keeps it keyboard-operable without any script.
 */
export function AdvancedGroup({
  legend,
  hint,
  children,
}: {
  legend: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <details className="nexus-panel-soft group min-w-0">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 px-5 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--pc-accent-text)] focus-visible:outline-3 focus-visible:outline-offset-[-3px] focus-visible:outline-focus">
        <span className="min-w-0">{legend}</span>
        <span aria-hidden="true" className="shrink-0 font-mono text-[14px] leading-none text-ink-3">
          <span className="group-open:hidden">+</span>
          <span className="hidden group-open:inline">−</span>
        </span>
      </summary>
      <div className="grid min-w-0 gap-5 px-5 pb-5">
        {hint ? <p className="text-[12px] leading-5 text-ink-3">{hint}</p> : null}
        {children}
      </div>
    </details>
  );
}

/**
 * Labelled plain-number entry in the shared editorial input style, with an
 * optional adjacent unit. Money still goes through MoneyField; this is for
 * percentages, day counts and hours.
 */
export function NumberField({
  id,
  label,
  value,
  onChange,
  unit,
  description,
  error,
  inputMode = "decimal",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (raw: string) => void;
  unit?: string;
  description?: string;
  error?: string | undefined;
  inputMode?: "decimal" | "numeric";
}) {
  const descriptionId = useId();
  const errorId = useId();
  return (
    <div className="grid min-w-0 content-start gap-1.5">
      <label htmlFor={id} className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-2">
        {label}
      </label>
      {description ? (
        <p id={descriptionId} className="text-[12px] leading-5 text-ink-3">
          {description}
        </p>
      ) : null}
      <div
        className={`nexus-input flex items-stretch overflow-hidden ${
          error ? "border-error" : "border-hairline-strong focus-within:border-focus"
        }`}
      >
        <input
          id={id}
          inputMode={inputMode}
          autoComplete="off"
          spellCheck={false}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={
            [description ? descriptionId : null, error ? errorId : null].filter(Boolean).join(" ") ||
            undefined
          }
          className="min-h-11 w-full min-w-0 bg-transparent px-3 font-mono text-[15px] tabular-nums text-ink outline-none"
        />
        {unit ? (
          <span className="flex items-center bg-surface-2 px-3 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
            {unit}
          </span>
        ) : null}
      </div>
      {error ? (
        <p id={errorId} role="alert" className="text-[12px] leading-5 text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Labelled ISO date entry, used for promotional-rate expiry. */
export function DateField({
  id,
  label,
  value,
  onChange,
  min,
  description,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (raw: string) => void;
  min?: string;
  description?: string;
}) {
  const descriptionId = useId();
  return (
    <div className="grid min-w-0 content-start gap-1.5">
      <label htmlFor={id} className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-2">
        {label}
      </label>
      {description ? (
        <p id={descriptionId} className="text-[12px] leading-5 text-ink-3">
          {description}
        </p>
      ) : null}
      <input
        id={id}
        type="date"
        value={value}
        min={min}
        onChange={(event) => onChange(event.target.value)}
        aria-describedby={description ? descriptionId : undefined}
        className="nexus-input min-h-11 w-full min-w-0 bg-surface px-3 font-mono text-[14px] tabular-nums text-ink outline-none focus:border-focus"
      />
    </div>
  );
}

/** Download control for a generated CSV; excluded from print output. */
export function CsvDownloadButton({
  label,
  onDownload,
}: {
  label: string;
  onDownload: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onDownload}
      className="nexus-quiet-button no-print inline-flex min-h-11 w-fit items-center px-4 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-2 hover:text-ink focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus"
    >
      {label}
    </button>
  );
}
