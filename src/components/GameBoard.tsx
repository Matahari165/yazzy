"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CATEGORY_BY_ID, CATEGORY_IDS, scoreDice, type CategoryId } from "@/domain/yatzy";
import { useGameKeyboard } from "@/hooks/useGameKeyboard";
import { useProbabilityEngine } from "@/hooks/useProbabilityEngine";
import { useYazzyGame } from "@/hooks/useYazzyGame";
import { FinishedGame } from "./FinishedGame";
import { BotTurnPanel, GameTable } from "./GameTable";
import { GameHeader } from "./GameHeader";
import { ScoreCard } from "./ScoreCard";

export function GameBoard() {
  const { game, roll, toggleHeld, score, skipBotAnimation, isFinished, hasLoaded } = useYazzyGame();
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const rollTimerRef = useRef<number | null>(null);

  const openCategories = useMemo(
    () => CATEGORY_IDS.filter((category) => game.human.scores[category] === undefined),
    [game.human.scores],
  );
  const engineDice = game.activePlayer === "human" ? game.human.dice : [];
  const { evaluations, isCalculating, calculationError } = useProbabilityEngine(
    openCategories,
    engineDice,
    Math.max(0, 3 - game.human.rollNumber),
  );
  const bestEvaluation = evaluations.reduce(
    (best, evaluation) => (!best || evaluation.expectedScore > best.expectedScore ? evaluation : best),
    evaluations[0],
  );
  const selectedEvaluation = selectedCategory
    ? evaluations.find((evaluation) => evaluation.category === selectedCategory)
    : undefined;
  const selectedPoints = selectedCategory && game.human.dice.length === 5
    ? scoreDice(selectedCategory, game.human.dice)
    : 0;
  const botFeedback = game.activePlayer === "human" && game.botTurn.status === "idle" ? game.botTurn.message : null;
  const visibleFeedback = botFeedback ?? feedback;

  useEffect(() => () => {
    if (rollTimerRef.current !== null) window.clearTimeout(rollTimerRef.current);
  }, []);

  useEffect(() => {
    if (!isFinished) return;
    const frame = window.requestAnimationFrame(() => document.getElementById("finished-title")?.focus({ preventScroll: true }));
    return () => window.cancelAnimationFrame(frame);
  }, [isFinished]);

  const handleRoll = () => {
    if (game.activePlayer !== "human" || isRolling || isCalculating || game.human.rollNumber >= 3) return;
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
    if (!selectedCategory || game.activePlayer !== "human" || isRolling || isCalculating) return;
    const points = scoreDice(selectedCategory, game.human.dice);
    setFeedback(`${CATEGORY_BY_ID[selectedCategory].label} : ${points} point${points > 1 ? "s" : ""} inscrit${points > 1 ? "s" : ""}. Le bot joue maintenant.`);
    score(selectedCategory);
    setSelectedCategory(null);
  };

  useGameKeyboard({
    disabled: !hasLoaded || game.activePlayer !== "human" || isRolling || isCalculating,
    canRoll: game.human.rollNumber < 3 && !game.human.held.every(Boolean),
    canScore: selectedCategory !== null && !isRolling && !isCalculating,
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
      {visibleFeedback ? <p className="game-feedback" role="status">{visibleFeedback}</p> : null}
      {isFinished ? (
        <FinishedGame game={game} />
      ) : (
        <div className="game-content">
          <ScoreCard
            title={game.activePlayer === "human" ? "Ta feuille" : "La feuille du bot"}
            eyebrow={game.activePlayer === "human" ? "TON SCORE" : "SCORE DU BOT"}
            scores={game.activePlayer === "human" ? game.human.scores : game.bot.scores}
            dice={game.activePlayer === "human" ? game.human.dice : game.bot.dice}
            evaluations={game.activePlayer === "human" ? evaluations : []}
            selected={game.activePlayer === "human" ? selectedCategory : null}
            recommended={game.activePlayer === "human" ? bestEvaluation?.category : undefined}
            canSelect={game.activePlayer === "human" && game.human.rollNumber > 0 && !isRolling && !isCalculating}
            isReadOnly={game.activePlayer === "bot"}
            isCalculating={game.activePlayer === "human" && isCalculating}
            onSelect={setSelectedCategory}
          />

          {game.activePlayer === "human" ? (
            <GameTable
              dice={game.human.dice}
              held={game.human.held}
              rollNumber={game.human.rollNumber}
              selectedCategory={selectedCategory}
              selectedPoints={selectedPoints}
              targetEvaluation={selectedEvaluation}
              isRolling={isRolling}
              isCalculating={isCalculating}
              calculationError={calculationError}
              onToggleDie={toggleHeld}
              onRoll={handleRoll}
              onScore={handleScore}
            />
          ) : (
            <BotTurnPanel game={game} onSkip={skipBotAnimation} />
          )}
        </div>
      )}
    </main>
  );
}
