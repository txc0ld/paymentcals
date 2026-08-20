"use client";

import { useId, type ReactNode } from "react";

/**
 * Accessible segmented control (radiogroup). Used for Simple/Advanced modes
 * and calculation-mode switches. Keyboard: arrow keys move selection.
 */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  size = "md",
}: {
  label: string;
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  size?: "sm" | "md";
}) {
  const groupId = useId();
  const index = options.findIndex((o) => o.value === value);

  function onKeyDown(event: React.KeyboardEvent) {
    const delta =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;
    if (delta === 0) return;
    event.preventDefault();
    const next = options[(index + delta + options.length) % options.length];
    if (next) onChange(next.value);
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className="clay-control inline-flex max-w-full flex-wrap gap-1 p-1"
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            id={`${groupId}-${option.value}`}
            onClick={() => onChange(option.value)}
            className={`clay-segment min-h-11 rounded-2xl px-4 font-mono text-[11px] uppercase tracking-[0.14em] focus-visible:outline-3 focus-visible:outline-offset-1 focus-visible:outline-focus ${
              selected
                ? "bg-accent text-accent-contrast shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_3px_0_color-mix(in_srgb,var(--pc-accent)_72%,#0b0d0f)]"
                : "text-ink-2 hover:bg-surface-2 hover:text-ink"
            } ${size === "sm" ? "px-3 text-[10px]" : ""}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Money entry (§9.3): preserves partial input while typing, never coerces
 * blank to zero, unit adjacent, inline remediation, mono digits.
 */
export function MoneyField({
  id,
  label,
  description,
  value,
  onChange,
  error,
  unit = "AUD",
  placeholder = "0.00",
  autoFocus = false,
}: {
  id: string;
  label: string;
  description?: string;
  /** Raw user text — parsing to Money happens at the calculation boundary. */
  value: string;
  onChange: (raw: string) => void;
  error?: string | undefined;
  unit?: string;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const descriptionId = useId();
  const errorId = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-2">
        {label}
      </label>
      {description ? (
        <p id={descriptionId} className="text-[13px] leading-5 text-ink-3">
          {description}
        </p>
      ) : null}
      <div
        className={`clay-input flex items-stretch overflow-hidden ${
          error ? "border-error" : "border-hairline-strong focus-within:border-ink"
        }`}
      >
        <span
          aria-hidden="true"
          className="flex items-center border-r border-hairline bg-surface-2 px-3 font-mono text-sm text-ink-3"
        >
          $
        </span>
        <input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          autoFocus={autoFocus}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={
            [description ? descriptionId : null, error ? errorId : null]
              .filter(Boolean)
              .join(" ") || undefined
          }
          className="min-h-12 min-w-0 w-full bg-transparent px-3 font-mono text-lg tabular-nums text-ink outline-none placeholder:text-ink-3"
        />
        <span className="flex items-center bg-surface-2 px-3 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
          {unit}
        </span>
      </div>
      {error ? (
        <p id={errorId} role="alert" className="text-[13px] leading-5 text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function FieldGroup({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    <fieldset className="clay-panel-soft flex flex-col gap-4 p-5">
      <legend className="px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3">
        {legend}
      </legend>
      {children}
    </fieldset>
  );
}
