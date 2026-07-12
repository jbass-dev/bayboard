"use client";

import { useEffect } from "react";

/**
 * Call `onEscape` when the Escape key is pressed anywhere in the document.
 * Used by the modal dialogs so they can be dismissed from the keyboard, not
 * just by clicking the backdrop — part of the Week 5 accessibility pass.
 */
export function useEscapeKey(onEscape: () => void): void {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") onEscape();
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onEscape]);
}
