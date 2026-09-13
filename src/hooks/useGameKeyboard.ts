"use client";

import { useEffect } from "react";

type GameKeyboardOptions = {
  disabled: boolean;
  canRoll: boolean;
  canScore: boolean;
  onRoll: () => void;
  onScore: () => void;
  onToggleDie: (index: number) => void;
};

export function useGameKeyboard({
  disabled,
  canRoll,
  canScore,
  onRoll,
  onScore,
  onToggleDie,
}: GameKeyboardOptions) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || !event.altKey || event.repeat || disabled) return;
      if (event.code >= "Digit1" && event.code <= "Digit5") {
        event.preventDefault();
        onToggleDie(Number(event.code.at(-1)) - 1);
      }
      if (event.code === "KeyR" && canRoll) {
        event.preventDefault();
        onRoll();
      }
      if (event.code === "KeyS" && canScore) {
        event.preventDefault();
        onScore();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [disabled, canRoll, canScore, onRoll, onScore, onToggleDie]);
}
