"use client";

import { useEffect, useRef, useState } from "react";
import { CATEGORIES, type CategoryId } from "@/domain/yatzy";
import { useGameKeyboard } from "@/hooks/useGameKeyboard";
import { useYazzyGame } from "@/hooks/useYazzyGame";
import { FinishedGame } from "./FinishedGame";
import { BotTurnPanel, GameTable } from "./GameTable";
import { GameHeader } from "./GameHeader";
import { ScoreCard } from "./ScoreCard";

const HUMAN_ROLL_ANIMATION_MS = 360;

export function GameBoard() {
  const { game, roll, toggleHeld, score, skipBotAnimation, isFinished, hasLoaded } = useYazzyGame();
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | null>(null);
  const [highlightedPlayerCategory, setHighlightedPlayerCategory] = useState<CategoryId | null>(null);
  const [highlightedOpponentCategory, setHighlightedOpponentCategory] = useState<CategoryId | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const rollTimerRef = useRef<number | null>(null);
  const previousBotScoresRef = useRef(game.bot.scores);

  useEffect(() => () => {
    if (rollTimerRef.current !== null) window.clearTimeout(rollTimerRef.current);
  }, []);

  useEffect(() => {
    if (!isFinished) return;
    const frame = window.requestAnimationFrame(() => document.getElementById("finished-title")?.focus({ preventScroll: true }));
    return () => window.cancelAnimationFrame(frame);
  }, [isFinished]);

  useEffect(() => {
    const previousScores = previousBotScoresRef.current;
    const newlyFilledCategory = CATEGORIES.find(({ id }) => previousScores[id] === undefined && game.bot.scores[id] !== undefined)?.id;
    previousBotScoresRef.current = game.bot.scores;
    if (newlyFilledCategory) setHighlightedOpponentCategory(newlyFilledCategory);
  }, [game.bot.scores]);

  const handleRoll = () => {
    if (game.activePlayer !== "human" || isRolling || game.human.rollNumber >= 3) return;
    if (game.human.rollNumber > 0 && game.human.held.every(Boolean)) return;
    roll();
    setIsRolling(true);
    if (rollTimerRef.current !== null) window.clearTimeout(rollTimerRef.current);
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 80 : HUMAN_ROLL_ANIMATION_MS;
    rollTimerRef.current = window.setTimeout(() => {
      rollTimerRef.current = null;
      setIsRolling(false);
    }, duration);
  };

  const handleScore = (category = selectedCategory) => {
    if (!category || game.activePlayer !== "human" || isRolling) return;
    setHighlightedPlayerCategory(category);
    score(category);
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
      <GameHeader />
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
            highlightedPlayerCategory={highlightedPlayerCategory}
            highlightedOpponentCategory={highlightedOpponentCategory}
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
