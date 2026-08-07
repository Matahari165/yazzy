"use client";

import { useCallback, useEffect, useState } from "react";
import { CATEGORY_IDS, scoreDice, type CategoryId, type DieValue } from "@/domain/yatzy";
import { rollFairDie } from "@/lib/random";

const STORAGE_KEY = "yazzy.game.v1";

export type GameState = {
  dice: DieValue[];
  held: boolean[];
  rollNumber: number;
  turn: number;
  scores: Partial<Record<CategoryId, number>>;
};

const freshGame = (): GameState => ({
  dice: [],
  held: [false, false, false, false, false],
  rollNumber: 0,
  turn: 1,
  scores: {},
});

function isStoredGame(value: unknown): value is GameState {
  if (!value || typeof value !== "object") return false;
  const game = value as Partial<GameState>;
  return (
    Array.isArray(game.dice) &&
    Array.isArray(game.held) &&
    typeof game.rollNumber === "number" &&
    typeof game.turn === "number" &&
    !!game.scores &&
    typeof game.scores === "object"
  );
}

export function useYazzyGame() {
  const [game, setGame] = useState<GameState>(freshGame);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed: unknown = JSON.parse(stored);
          if (isStoredGame(parsed)) setGame(parsed);
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      } finally {
        setHasLoaded(true);
      }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (hasLoaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(game));
  }, [game, hasLoaded]);

  const roll = useCallback(() => {
    setGame((current) => {
      if (current.rollNumber >= 3) return current;
      const dice = Array.from({ length: 5 }, (_, index) =>
        current.rollNumber > 0 && current.held[index] ? current.dice[index] : rollFairDie(),
      );
      return {
        ...current,
        dice,
        held: [false, false, false, false, false],
        rollNumber: current.rollNumber + 1,
      };
    });
  }, []);

  const toggleHeld = useCallback((index: number) => {
    setGame((current) => {
      if (current.rollNumber === 0 || current.rollNumber >= 3) return current;
      return {
        ...current,
        held: current.held.map((held, dieIndex) => (dieIndex === index ? !held : held)),
      };
    });
  }, []);

  const score = useCallback((category: CategoryId) => {
    let scoredPoints = 0;
    setGame((current) => {
      if (current.rollNumber === 0 || category in current.scores) return current;
      scoredPoints = scoreDice(category, current.dice);
      return {
        dice: [],
        held: [false, false, false, false, false],
        rollNumber: 0,
        turn: Math.min(16, current.turn + 1),
        scores: { ...current.scores, [category]: scoredPoints },
      };
    });
    return scoredPoints;
  }, []);

  const reset = useCallback(() => setGame(freshGame()), []);
  const isFinished = CATEGORY_IDS.every((category) => category in game.scores);

  return { game, roll, toggleHeld, score, reset, isFinished, hasLoaded };
}
