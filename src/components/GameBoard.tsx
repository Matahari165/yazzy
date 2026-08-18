"use client";

import { useEffect, useRef, useState } from "react";
import type { CategoryId } from "@/domain/yatzy";
import { useGameKeyboard } from "@/hooks/useGameKeyboard";
import { useYazzyGame } from "@/hooks/useYazzyGame";
import { FinishedGame } from "./FinishedGame";
import { BotTurnPanel, GameTable } from "./GameTable";
import { GameHeader } from "./GameHeader";
import { ScoreCard } from "./ScoreCard";

export function GameBoard() {
  const { game, roll, toggleHeld, score, skipBotAnimation, isFinished, hasLoaded } = useYazzyGame();
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const rollTimerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (rollTimerRef.current !== null) window.clearTimeout(rollTimerRef.current);
  }, []);

  useEffect(() => {
    if (!isFinished) return;
    const frame = window.requestAnimationFrame(() => document.getElementById("finished-title")?.focus({ preventScroll: true }));
    return () => window.cancelAnimationFrame(frame);
  }, [isFinished]);

  const handleRoll = () => {
    if (game.activePlayer !== "human" || isRolling || game.human.rollNumber >= 3) return;
    if (game.human.rollNumber > 0 && game.human.held.every(Boolean)) return;
    roll();
    setIsRolling(true);
    if (rollTimerRef.current !== null) window.clearTimeout(rollTimerRef.current);
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 80 : 260;
    rollTimerRef.current = window.setTimeout(() => {
      rollTimerRef.current = null;
      setIsRolling(false);
    }, duration);
  };

  const handleScore = () => {
    if (!selectedCategory || game.activePlayer !== "human" || isRolling) return;
    score(selectedCategory);
    setSelectedCategory(null);
  };

  useGameKeyboard({
    disabled: !hasLoaded || game.activePlayer !== "human" || isRolling,
    canRoll: game.human.rollNumber < 3 && !game.human.held.every(Boolean),
    canScore: selectedCategory !== null && !isRolling,
    onRoll: handleRoll,
    onScore: handleScore,
    onToggleDie: toggleHeld,
  });

  if (!hasLoaded) {
    return <main id="main-content" className="app-loading" aria-busy="true"><p role="status">Chargement de la partie…</p></main>;
  }

  return (
    <main id="main-content" className="game-shell">
      <GameHeader game={game} />
      {isFinished ? (
        <FinishedGame game={game} />
      ) : (
        <div className="game-content">
          <ScoreCard
            label="Feuille de score : toi et bot"
            humanScores={game.human.scores}
            botScores={game.bot.scores}
            dice={game.human.dice}
            selected={game.activePlayer === "human" ? selectedCategory : null}
            canSelect={game.activePlayer === "human" && game.human.rollNumber > 0 && !isRolling}
            isReadOnly={game.activePlayer === "bot"}
            activeColumn={game.activePlayer === "human" ? "player" : "opponent"}
            onSelect={setSelectedCategory}
            onScore={handleScore}
          />

          {game.activePlayer === "human" ? (
            <GameTable
              dice={game.human.dice}
              held={game.human.held}
              rollNumber={game.human.rollNumber}
              selectedCategory={selectedCategory}
              isRolling={isRolling}
              onToggleDie={toggleHeld}
              onRoll={handleRoll}
            />
          ) : (
            <BotTurnPanel game={game} onSkip={skipBotAnimation} />
          )}
        </div>
      )}
    </main>
  );
}
