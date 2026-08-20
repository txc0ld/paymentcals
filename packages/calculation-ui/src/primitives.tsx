import type { ReactNode } from "react";

/** Compact technical eyebrow label. */
export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`nexus-badge inline-flex items-center gap-2 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3 before:h-px before:w-5 before:bg-hairline-strong before:content-[''] ${className}`}
    >
      {children}
    </span>
  );
}

/** Hairline-framed surface. Borders, never shadows (§20.6 / DESIGN.md). */
export function Panel({
  children,
  className = "",
  as: Component = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "aside" | "article";
}) {
  return (
    <Component className={`nexus-panel ${className}`}>{children}</Component>
  );
}

/** Primary and quiet actions in the shared STRATA editorial treatment. */
export function EditorialButton({
  children,
  onClick,
  type = "button",
  variant = "primary",
  disabled = false,
  className = "",
  ariaLabel,
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: "primary" | "ghost";
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
}) {
  const base =
    "nexus-primary inline-flex min-h-11 items-center justify-center gap-3 px-6 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-40";
  const look =
    variant === "primary"
      ? "bg-accent text-accent-contrast"
      : "nexus-quiet-button bg-surface text-ink hover:bg-surface-2";
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`${base} ${look} ${className}`}
    >
      {children}
    </button>
  );
}

/** Small status badge with a non-colour cue (label text is the cue). */
export function Badge({
  tone,
  children,
}: {
  tone: "neutral" | "warn" | "error" | "positive" | "draft";
  children: ReactNode;
}) {
  const tones: Record<string, string> = {
    neutral: "border-hairline text-ink-2",
    warn: "border-warn text-warn",
    error: "border-error text-error",
    positive: "border-positive text-positive",
    draft: "border-warn bg-warn-surface text-warn",
  };
  return (
    <span
      className={`nexus-badge inline-flex items-center gap-1.5 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
