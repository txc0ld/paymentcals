"use client";

import { useEffect } from "react";

/** Adds .is-revealed to .reveal-up elements as they enter the viewport. */
export function RevealObserver() {
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      for (const el of document.querySelectorAll(".reveal-up")) el.classList.add("is-revealed");
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.1 },
    );
    for (const el of document.querySelectorAll(".reveal-up")) observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return null;
}
