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
      className="nexus-control inline-flex max-w-full flex-wrap overflow-hidden"
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
            className={`nexus-segment -mb-px -me-px min-h-11 border-b border-e border-hairline px-4 font-mono text-[11px] uppercase tracking-[0.14em] focus-visible:z-10 focus-visible:outline-3 focus-visible:outline-offset-[-3px] focus-visible:outline-focus ${
              selected
                ? "bg-ink! text-canvas! hover:bg-ink! hover:text-canvas!"
                : "bg-surface text-ink-2 hover:bg-surface-2 hover:text-ink"
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
        className={`nexus-input flex items-stretch overflow-hidden ${
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
    <fieldset className="nexus-panel-soft flex flex-col gap-4 p-5">
      <legend className="px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--pc-accent-text)]">
        {legend}
      </legend>
      {children}
    </fieldset>
  );
}

/** Labelled select in the editorial input style. */
export function SelectField<T extends string>({
  id,
  label,
  value,
  onChange,
  options,
  description,
}: {
  id: string;
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: ReadonlyArray<{ value: T; label: string }>;
  description?: string;
}) {
  const descriptionId = useId();
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-2">
        {label}
      </label>
      {description ? (
        <p id={descriptionId} className="text-[13px] leading-5 text-ink-3">
          {description}
        </p>
      ) : null}
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        aria-describedby={description ? descriptionId : undefined}
        className="nexus-input min-h-11 w-full appearance-none bg-surface px-3 font-mono text-[14px] text-ink outline-none focus:border-focus"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Labelled boolean toggle rendered as an accessible switch. */
export function ToggleField({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const descriptionId = useId();
  return (
    <div className="flex min-w-0 items-start justify-between gap-4">
      <div className="grid gap-0.5">
        <label htmlFor={id} className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-2">
          {label}
        </label>
        {description ? (
          <p id={descriptionId} className="text-[13px] leading-5 text-ink-3">
            {description}
          </p>
        ) : null}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={description ? descriptionId : undefined}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-11 w-14 shrink-0 border transition-colors duration-[var(--pc-duration-fast)] ease-[var(--pc-ease)] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus ${
          checked ? "border-ink bg-ink" : "border-hairline-strong bg-surface-2"
        }`}
      >
        <span
          aria-hidden="true"
          className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 border transition-transform duration-[var(--pc-duration-fast)] ease-[var(--pc-ease)] ${
            checked
              ? "translate-x-7 border-canvas bg-canvas"
              : "translate-x-1.5 border-hairline-strong bg-ink-3"
          }`}
        />
      </button>
    </div>
  );
}
