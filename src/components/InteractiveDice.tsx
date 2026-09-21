"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import type { DieValue } from "@/domain/yatzy";
import { DieGlyph } from "./Dice";
import { botAudio } from "@/lib/botAudio";

export interface InteractiveDiceProps {
  className?: string;
  dieClassName?: string;
  faceClassName?: string;
}

export function InteractiveDice({
  className = "hero-dice",
  dieClassName = "hero-die",
  faceClassName = "hero-die-face",
}: InteractiveDiceProps) {
  const [round, setRound] = useState(0);
  const [values, setValues] = useState<DieValue[]>([6, 1, 4, 3, 5]);
  const [bumps, setBumps] = useState<number[]>([0, 0, 0, 0, 0]);

  useEffect(() => {
    if (typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      setValues(Array.from({ length: 5 }, () => (1 + Math.floor(Math.random() * 6)) as DieValue));
      setRound((n) => n + 1);
    }, 8000);
    return () => window.clearInterval(id);
  }, []);

  const rerollOne = (index: number) => {
    botAudio.playDiceClack();
    setValues((prev) => {
      let next: DieValue = (1 + Math.floor(Math.random() * 6)) as DieValue;
      if (prev.length > 1) {
        while (next === prev[index]) {
          next = (1 + Math.floor(Math.random() * 6)) as DieValue;
        }
      }
      const copy = [...prev];
      copy[index] = next;
      return copy;
    });
    setBumps((prev) => {
      const copy = [...prev];
      copy[index] += 1;
      return copy;
    });
  };

  return (
    <div className={className} role="group" aria-label="Cinq dés interactifs">
      {values.map((value, index) => (
        <button
          key={`${round}-${bumps[index]}-${index}`}
          className={dieClassName}
          style={{ "--i": index } as CSSProperties}
          type="button"
          onClick={() => rerollOne(index)}
          aria-label={`Dé ${index + 1}, valeur ${value}`}
        >
          <DieGlyph value={value} className={faceClassName} />
        </button>
      ))}
    </div>
  );
}
