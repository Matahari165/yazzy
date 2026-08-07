"use client";

import { useCallback, useEffect, useState } from "react";
import { CATEGORY_IDS, scoreDice, type CategoryId, type DieValue } from "../domain/yatzy";
import { rollFairDie } from "../lib/random";

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

const isDieValue = (value: unknown): value is DieValue =>
  Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 6;

export function isStoredGame(value: unknown): value is GameState {
  if (!value || typeof value !== "object") return false;
  const game = value as Partial<GameState>;
  const scoreEntries = game.scores && typeof game.scores === "object" && !Array.isArray(game.scores)
    ? Object.entries(game.scores)
    : [];
  return (
    Array.isArray(game.dice) &&
    (game.dice.length === 0 || game.dice.length === 5) &&
    game.dice.every(isDieValue) &&
    Array.isArray(game.held) &&
    game.held.length === 5 &&
    game.held.every((held) => typeof held === "boolean") &&
    Number.isInteger(game.rollNumber) &&
    Number(game.rollNumber) >= 0 &&
    Number(game.rollNumber) <= 3 &&
    Number.isInteger(game.turn) &&
    Number(game.turn) >= 1 &&
    Number(game.turn) <= 16 &&
    !!game.scores &&
    typeof game.scores === "object" &&
    !Array.isArray(game.scores) &&
    scoreEntries.every(([category, score]) =>
      CATEGORY_IDS.includes(category as CategoryId) &&
      Number.isInteger(score) && Number(score) >= 0 && Number(score) <= 50,
    ) &&
    Number(game.turn) === Math.min(16, scoreEntries.length + 1) &&
    (Number(game.rollNumber) === 0 ? game.dice.length === 0 : game.dice.length === 5)
  );
}

export function rollGame(
  current: GameState,
  rollDie: () => DieValue = rollFairDie,
): GameState {
  if (current.rollNumber >= 3 || (current.rollNumber > 0 && current.held.every(Boolean))) {
    return current;
  }

  const dice = Array.from({ length: 5 }, (_, index) =>
    current.rollNumber > 0 && current.held[index] ? current.dice[index] : rollDie(),
  );
  return {
    ...current,
    dice,
    held: current.rollNumber === 0
      ? [false, false, false, false, false]
      : current.held,
    rollNumber: current.rollNumber + 1,
  };
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
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {
          // Certains modes privés refusent aussi la suppression.
        }
      } finally {
        setHasLoaded(true);
      }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!hasLoaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(game));
    } catch {
      // La partie reste jouable si le stockage du navigateur est indisponible.
    }
  }, [game, hasLoaded]);

  const roll = useCallback(() => {
    setGame((current) => rollGame(current));
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
