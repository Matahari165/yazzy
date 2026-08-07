"use client";

import { useEffect } from "react";

export function useFinishedFocus(isFinished: boolean) {
  useEffect(() => {
    if (!isFinished) return;
    const frame = window.requestAnimationFrame(() => {
      const summary = document.getElementById("finished-card");
      summary?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "center",
      });
      summary?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isFinished]);
}
