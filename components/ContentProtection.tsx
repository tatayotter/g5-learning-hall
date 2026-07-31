"use client";

import { useEffect } from "react";

// Deterrent only — a determined adult can still open DevTools via the menu,
// use browser dev tools protocol, or just screenshot the page. This just
// raises friction against casual copy/paste and right-click save.
export default function ContentProtection() {
  useEffect(() => {
    const blockContextMenu = (e: MouseEvent) => e.preventDefault();

    const blockKeys = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const ctrlOrCmd = e.ctrlKey || e.metaKey;

      const isDevTools =
        key === "f12" ||
        (ctrlOrCmd && e.shiftKey && ["i", "j", "c"].includes(key));
      const isViewSourceOrSave =
        ctrlOrCmd && ["u", "s"].includes(key);
      const isCopyOnNonInput =
        ctrlOrCmd &&
        ["c", "x"].includes(key) &&
        !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName);

      if (isDevTools || isViewSourceOrSave || isCopyOnNonInput) {
        e.preventDefault();
      }
    };

    document.addEventListener("contextmenu", blockContextMenu);
    document.addEventListener("keydown", blockKeys);
    return () => {
      document.removeEventListener("contextmenu", blockContextMenu);
      document.removeEventListener("keydown", blockKeys);
    };
  }, []);

  return null;
}
