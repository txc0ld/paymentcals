"use client";

import { useEffect, useState } from "react";

/** Persists the user choice locally; first visits use the native dark theme. */
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
      className="nexus-quiet-button flex h-11 w-11 items-center justify-center text-ink-2 hover:text-ink focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus"
    >
      {theme === null ? (
        <span className="h-3.5 w-3.5 border-2 border-current" aria-hidden="true" />
      ) : theme === "dark" ? (
        <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" aria-hidden="true">
          <circle cx="8" cy="8" r="3.25" strokeWidth="1.2" />
          <path strokeWidth="1.2" strokeLinecap="round" d="M8 1v1.8M8 13.2V15M15 8h-1.8M2.8 8H1M12.95 3.05l-1.27 1.27M4.32 11.68l-1.27 1.27M12.95 12.95l-1.27-1.27M4.32 4.32 3.05 3.05" />
        </svg>
      ) : (
        <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" aria-hidden="true">
          <path strokeWidth="1.2" strokeLinejoin="round" d="M13.5 9.5A5.5 5.5 0 0 1 6.5 2.5a5.5 5.5 0 1 0 7 7Z" />
        </svg>
      )}
    </button>
  );
}
