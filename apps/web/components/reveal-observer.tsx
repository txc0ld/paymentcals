"use client";

import { useEffect } from "react";

/** Adds .is-revealed to .reveal-up elements as they enter the viewport. */
export function RevealObserver() {
  useEffect(() => {
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const revealNow = (root: ParentNode) => {
      for (const element of root.querySelectorAll(".reveal-up")) {
        element.classList.add("is-revealed");
      }
    };

    if (reducedMotion) {
      revealNow(document);
      const mutationObserver = new MutationObserver(() => revealNow(document));
      mutationObserver.observe(document.body, { childList: true, subtree: true });
      return () => mutationObserver.disconnect();
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

    const observe = (root: ParentNode) => {
      for (const element of root.querySelectorAll(".reveal-up:not(.is-revealed)")) {
        observer.observe(element);
      }
    };

    observe(document);
    const mutationObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof Element) {
            if (node.matches(".reveal-up:not(.is-revealed)")) observer.observe(node);
            observe(node);
          }
        }
      }
    });
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      mutationObserver.disconnect();
      observer.disconnect();
    };
  }, []);
  return null;
}