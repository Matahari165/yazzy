"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createGame,
  isFinished as isGameFinished,
  isStoredGame,
  rollPlayerTurn,
  scoreHumanTurn,
  togglePlayerHeld,
  type GameState,
} from "../domain/game";
import { completeBotTurn, prepareBotStep } from "../domain/bots/turn";
import type { BotLevel } from "../domain/bots";
import type { CategoryId } from "../domain/yatzy";
import { readStoredGame, writeStoredGame } from "../lib/gameStorage";

const BOT_ANIMATION_MS = 260;

export function useYazzyGame() {
  const [game, setGame] = useState<GameState>(() => createGame("calculator"));
  const [hasLoaded, setHasLoaded] = useState(false);
  const botTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const stored = readStoredGame();
      if (stored && isStoredGame(stored)) setGame(stored);
      setHasLoaded(true);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!hasLoaded) return;
    writeStoredGame(game);
  }, [game, hasLoaded]);

  const clearBotTimer = useCallback(() => {
    if (botTimerRef.current !== null) {
      window.clearTimeout(botTimerRef.current);
      botTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!hasLoaded || game.activePlayer !== "bot") return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = reducedMotion ? 60 : BOT_ANIMATION_MS;
    const schedule = (callback: () => void) => {
      clearBotTimer();
      botTimerRef.current = window.setTimeout(() => {
        botTimerRef.current = null;
        callback();
      }, duration);
    };

    if (game.botTurn.status === "rolling") {
      if (game.bot.rollNumber >= 3) {
        schedule(() => setGame((current) => current.activePlayer === "bot"
          ? { ...current, botTurn: { ...current.botTurn, status: "choosing" } }
          : current));
        return () => clearBotTimer();
      }

      window.queueMicrotask(() => {
        setGame((current) => {
          if (current.activePlayer !== "bot" || current.botTurn.status !== "rolling") return current;
          return {
            ...current,
            bot: rollPlayerTurn(current.bot),
            botTurn: { ...current.botTurn, status: "waiting", message: "Le bot joue…" },
          };
        });
      });
      schedule(() => setGame((current) => prepareBotStep(current)));
    } else if (game.botTurn.status === "waiting") {
      schedule(() => setGame((current) => prepareBotStep(current)));
    } else if (game.botTurn.status === "choosing") {
      schedule(() => setGame((current) => completeBotTurn(current)));
    }

    return () => clearBotTimer();
  }, [clearBotTimer, game.activePlayer, game.bot.rollNumber, game.botTurn.status, hasLoaded]);

  const roll = useCallback(() => {
    setGame((current) => {
      if (current.activePlayer !== "human") return current;
      return {
        ...current,
        human: rollPlayerTurn(current.human),
        botTurn: { ...current.botTurn, targetCategory: null, message: null },
      };
    });
  }, []);

  const toggleHeld = useCallback((index: number) => {
    setGame((current) => current.activePlayer === "human"
      ? { ...current, human: togglePlayerHeld(current.human, index) }
      : current);
  }, []);

  const score = useCallback((category: CategoryId) => {
    setGame((current) => scoreHumanTurn(current, category));
  }, []);

  const skipBotAnimation = useCallback(() => {
    clearBotTimer();
    setGame((current) => completeBotTurn(current));
  }, [clearBotTimer]);

  const reset = useCallback((botLevel: BotLevel = game.botLevel) => {
    clearBotTimer();
    setGame(createGame(botLevel));
  }, [clearBotTimer, game.botLevel]);

  useEffect(() => () => clearBotTimer(), [clearBotTimer]);

  return {
    game,
    roll,
    toggleHeld,
    score,
    reset,
    skipBotAnimation,
    isFinished: isGameFinished(game),
    isBotAnimating: game.activePlayer === "bot" && game.botTurn.status !== "idle",
    hasLoaded,
  };
}

export type { GameState };
