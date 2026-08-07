"use client";

import { useEffect } from "react";

type GameKeyboardOptions = {
  disabled: boolean;
  canRoll: boolean;
  onRoll: () => void;
  onToggleDie: (index: number) => void;
};

export function useGameKeyboard({ disabled, canRoll, onRoll, onToggleDie }: GameKeyboardOptions) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || disabled) return;
      if (event.key >= "1" && event.key <= "5") onToggleDie(Number(event.key) - 1);
      if (event.key.toLowerCase() === "r" && canRoll) onRoll();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });
}
