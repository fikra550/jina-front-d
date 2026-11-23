// src/hooks/useResetScrollOnOpen.js
import { useEffect } from "react";

/**
 * Resets scroll to top whenever the page mounts OR any of the given
 * "view is open" booleans becomes true.
 *
 * Handles both kinds of scrolling in this app:
 *  - window scroll (list view, inline forms container)
 *  - per-element scroll (modals with their own overflow-y: auto)
 *
 * Usage:
 *   useResetScrollOnOpen([showForm, showDetails, deleteModalOpen]);
 */
export function useResetScrollOnOpen(conditions = []) {
  // 1) Mount — start at the top of the page
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, []);

  // 2) Whenever any view opens — reset window + every scrollable container
  useEffect(() => {
    if (!conditions.some(Boolean)) return;

    const reset = () => {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      document
        .querySelectorAll(
          [
            ".modal",
            ".inline-form-container",
            ".inline-details-container",
            ".history-modal",
            ".document-preview-modal",
            ".document-preview-body",
          ].join(", ")
        )
        .forEach((el) => {
          el.scrollTop = 0;
          el.scrollLeft = 0;
        });
    };

    reset();
    const raf = requestAnimationFrame(reset);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, conditions);
}