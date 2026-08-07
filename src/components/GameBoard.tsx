"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { bestCombinationLabel, CATEGORY_IDS, scoreDice, totalScore, upperSubtotal, type CategoryId } from "@/domain/yatzy";
import { useGameKeyboard } from "@/hooks/useGameKeyboard";
import { useProbabilityEngine } from "@/hooks/useProbabilityEngine";
import { useYazzyGame } from "@/hooks/useYazzyGame";
import { CoachPanel } from "./CoachPanel";
import { AppHeader, FinishedCard, GameStatus } from "./GameChrome";
import { GameTable } from "./GameTable";
import { ResetGameDialog } from "./ResetGameDialog";
import { ScoreCard } from "./ScoreCard";
import { gameTitle, holdFeedback, scoreFeedback } from "./gamePresentation";

export function GameBoard() {
  const { game, roll, toggleHeld, score, reset, isFinished, hasLoaded } = useYazzyGame();
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [coachTone, setCoachTone] = useState<"neutral" | "success" | "tip">("neutral");
  const [isRolling, setIsRolling] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const rollTimeoutRef = useRef<number | null>(null);
  const openCategories = useMemo(
    () => CATEGORY_IDS.filter((category) => !(category in game.scores)),
    [game.scores],
  );
  const remainingRolls = Math.max(0, 3 - game.rollNumber);
  const { evaluations, isCalculating, analyzeHold } = useProbabilityEngine(
    openCategories,
    game.dice,
    remainingRolls,
  );

  const bestEvaluation = useMemo(
    () => evaluations.reduce((best, item) => (!best || item.expectedScore > best.expectedScore ? item : best), evaluations[0]),
    [evaluations],
  );
  const targetEvaluation = evaluations.find((item) => item.category === selectedCategory) ?? bestEvaluation;
  const heldCount = game.held.filter(Boolean).length;
  const rollHighlight = bestCombinationLabel(game.dice);

  const handleRoll = () => {
    if (isRolling || rollTimeoutRef.current !== null) return;
    if (game.rollNumber > 0 && targetEvaluation) {
      const heldIndexes = game.held.flatMap((held, index) => (held ? [index] : []));
      const target = targetEvaluation.category;
      void analyzeHold(target, heldIndexes).then((analysis) => {
        if (!analysis) return;
        const gap = analysis.bestExpectedScore - analysis.chosenExpectedScore;
        const nextFeedback = holdFeedback(target, gap, analysis.bestHoldLabel);
        setFeedback(nextFeedback.message);
        setCoachTone(nextFeedback.tone);
      });
    } else {
      setFeedback(null);
      setCoachTone("neutral");
    }
    setIsRolling(true);
    navigator.vibrate?.(10);
    rollTimeoutRef.current = window.setTimeout(() => {
      roll();
      setIsRolling(false);
      rollTimeoutRef.current = null;
    }, 320);
  };

  const handleScore = () => {
    if (!selectedCategory || isRolling) return;
    const points = scoreDice(selectedCategory, game.dice);
    const best = evaluations.reduce(
      (current, item) => (item.expectedScore > current.expectedScore ? item : current),
      evaluations[0],
    );
    if (best) {
      const gap = best.expectedScore - points;
      const nextFeedback = scoreFeedback(selectedCategory, points, best.category, gap);
      setFeedback(nextFeedback.message);
      setCoachTone(nextFeedback.tone);
    }
    navigator.vibrate?.(18);
    score(selectedCategory);
    setSelectedCategory(null);
  };

  const performReset = () => {
    if (rollTimeoutRef.current !== null) {
      window.clearTimeout(rollTimeoutRef.current);
      rollTimeoutRef.current = null;
    }
    setIsRolling(false);
    reset();
    setSelectedCategory(null);
    setFeedback(null);
    setCoachTone("neutral");
    setIsResetDialogOpen(false);
  };

  const handleReset = () => {
    if (game.turn > 1 || game.rollNumber > 0) {
      setIsResetDialogOpen(true);
      return;
    }
    performReset();
  };

  const handleCategorySelect = (category: CategoryId) => {
    setSelectedCategory(category);
  };

  useEffect(() => () => {
    if (rollTimeoutRef.current) window.clearTimeout(rollTimeoutRef.current);
  }, []);

  useGameKeyboard({
    disabled: isRolling || isResetDialogOpen,
    canRoll: game.rollNumber < 3 && !isFinished,
    onRoll: handleRoll,
    onToggleDie: toggleHeld,
  });

  if (!hasLoaded) {
    return <main id="main-content" className="app-loading" aria-label="Chargement de la partie" />;
  }

  const selectedPoints = selectedCategory
    ? scoreDice(selectedCategory, game.dice)
    : 0;
  const total = totalScore(game.scores);
  const upper = upperSubtotal(game.scores);
  const completedCategories = Object.keys(game.scores).length;
  const title = gameTitle(game.rollNumber, selectedCategory);

  return (
    <main id="main-content" className="app-shell">
      <div className="game-layout">
        <section className="game-cabinet" aria-labelledby="game-title">
          <AppHeader onNewGame={handleReset} />
          <GameStatus title={title} turn={game.turn} total={total} completedCategories={completedCategories} />

          {isFinished ? (
            <FinishedCard total={total} onReplay={performReset} />
          ) : (
            <>
              <ScoreCard
                scores={game.scores}
                evaluations={evaluations}
                selected={selectedCategory}
                canSelect={game.rollNumber > 0 && !isRolling}
                isCalculating={isCalculating}
                recommended={bestEvaluation?.category}
                titleId="arcade-score-title"
                onSelect={handleCategorySelect}
              />
              <GameTable
                dice={game.dice}
                held={game.held}
                heldCount={heldCount}
                rollNumber={game.rollNumber}
                selectedCategory={selectedCategory}
                selectedPoints={selectedPoints}
                isRolling={isRolling}
                rollHighlight={rollHighlight}
                coachMessage={feedback}
                coachTone={coachTone}
                onToggleDie={toggleHeld}
                onRoll={handleRoll}
                onScore={handleScore}
              />
            </>
          )}
        </section>

        <CoachPanel
          isCalculating={isCalculating}
          tone={coachTone}
          targetEvaluation={targetEvaluation}
          feedback={feedback}
          upper={upper}
        />
      </div>
      <ResetGameDialog
        open={isResetDialogOpen}
        onCancel={() => setIsResetDialogOpen(false)}
        onConfirm={performReset}
      />
    </main>
  );
}
