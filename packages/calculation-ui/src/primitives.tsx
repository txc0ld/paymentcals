import type { ReactNode } from "react";

/** Microscopic uppercase editorial label — the Swiss "eyebrow". */
export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3 before:h-px before:w-6 before:bg-hairline-strong before:content-[''] ${className}`}
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
    <Component className={`border border-hairline bg-surface ${className}`}>{children}</Component>
  );
}

/** Editorial button with the DESIGN.md asymmetric clipped corner. */
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
    "btn-editorial inline-flex min-h-11 items-center justify-center gap-3 px-6 py-3 font-mono text-xs uppercase tracking-[0.14em] transition-[background-color,color,transform] duration-[var(--pc-duration-fast)] ease-[var(--pc-ease)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40";
  const look =
    variant === "primary"
      ? "bg-accent text-accent-contrast hover:bg-ink-2 hover:text-canvas"
      : "border border-hairline-strong bg-transparent text-ink hover:bg-surface-2";
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
      className={`inline-flex items-center gap-1.5 border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
