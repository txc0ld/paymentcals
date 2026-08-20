"use client";

import { useEffect, useState } from "react";

/** Persists user choice locally; system preference is the first-visit default. */
export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    setTheme(current === "dark" ? "dark" : "light");
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    // Suppress transitions for the swap — a themed page must flip atomically,
    // not tear as elements animate at different speeds.
    const freeze = document.createElement("style");
    freeze.textContent = "*,*::before,*::after{transition:none!important}";
    document.head.append(freeze);
    document.documentElement.setAttribute("data-theme", next);
    requestAnimationFrame(() => requestAnimationFrame(() => freeze.remove()));
    try {
      localStorage.setItem("pc-theme", next);
    } catch {
      /* private browsing — preference simply not persisted */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      className="flex h-9 w-9 items-center justify-center border border-hairline text-ink-2 transition-colors duration-[var(--pc-duration-fast)] ease-[var(--pc-ease)] hover:border-hairline-strong hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
    >
      {theme === null ? (
        <span className="h-3 w-3 border border-current" aria-hidden="true" />
      ) : theme === "dark" ? (
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" aria-hidden="true">
          <circle cx="8" cy="8" r="3.25" strokeWidth="1.2" />
          <path strokeWidth="1.2" strokeLinecap="round" d="M8 1v1.8M8 13.2V15M15 8h-1.8M2.8 8H1M12.95 3.05l-1.27 1.27M4.32 11.68l-1.27 1.27M12.95 12.95l-1.27-1.27M4.32 4.32 3.05 3.05" />
        </svg>
      ) : (
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" aria-hidden="true">
          <path strokeWidth="1.2" strokeLinejoin="round" d="M13.5 9.5A5.5 5.5 0 0 1 6.5 2.5a5.5 5.5 0 1 0 7 7Z" />
        </svg>
      )}
    </button>
  );
}
