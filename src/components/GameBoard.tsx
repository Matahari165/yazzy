"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { bestCombinationLabel, CATEGORY_BY_ID, CATEGORY_IDS, scoreDice, totalScore, upperSubtotal, type CategoryId } from "@/domain/yatzy";
import { useFinishedFocus } from "@/hooks/useFinishedFocus";
import { useGameKeyboard } from "@/hooks/useGameKeyboard";
import { useProbabilityEngine } from "@/hooks/useProbabilityEngine";
import { useYazzyGame } from "@/hooks/useYazzyGame";
import { CoachPanel } from "./CoachPanel";
import { AppHeader, FinishedCard, GameStatus } from "./GameChrome";
import { GameTable } from "./GameTable";
import { ResetGameDialog } from "./ResetGameDialog";
import { ScoreCard } from "./ScoreCard";
import { bestRecordedScore, gameTitle, holdFeedback, recommendationMessage, scoreFeedback } from "./gamePresentation";

export function GameBoard() {
  const { game, roll, toggleHeld, score, reset, isFinished, hasLoaded } = useYazzyGame();
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [coachTone, setCoachTone] = useState<"neutral" | "success" | "tip">("neutral");
  const [isRolling, setIsRolling] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const rollTimeoutRef = useRef<number | null>(null);
  const feedbackRequestRef = useRef(0);
  const openCategories = useMemo(
    () => CATEGORY_IDS.filter((category) => !(category in game.scores)),
    [game.scores],
  );
  const remainingRolls = Math.max(0, 3 - game.rollNumber);
  const { evaluations, isCalculating, calculationError, analyzeHold } = useProbabilityEngine(
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
  useFinishedFocus(isFinished);

  const handleRoll = () => {
    if (
      isRolling ||
      isCalculating ||
      rollTimeoutRef.current !== null ||
      game.rollNumber >= 3 ||
      (game.rollNumber > 0 && heldCount === 5)
    ) return;
    if (game.rollNumber > 0 && targetEvaluation) {
      const feedbackRequest = ++feedbackRequestRef.current;
      const heldIndexes = game.held.flatMap((held, index) => (held ? [index] : []));
      const target = targetEvaluation.category;
      void analyzeHold(target, heldIndexes).then((analysis) => {
        if (!analysis || feedbackRequest !== feedbackRequestRef.current) return;
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
    const rollDelay = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 320;
    rollTimeoutRef.current = window.setTimeout(() => {
      roll();
      setIsRolling(false);
      rollTimeoutRef.current = null;
    }, rollDelay);
  };

  const handleScore = () => {
    if (!selectedCategory || isRolling || isCalculating) return;
    const points = scoreDice(selectedCategory, game.dice);
    const best = evaluations.reduce(
      (current, item) => (item.expectedScore > current.expectedScore ? item : current),
      evaluations[0],
    );
    if (best) {
      const gap = best.expectedScore - points;
      const nextFeedback = scoreFeedback(selectedCategory, points, best.category, gap, remainingRolls);
      setFeedback(nextFeedback.message);
      setCoachTone(nextFeedback.tone);
    } else {
      setFeedback(`${points} point${points > 1 ? "s" : ""} inscrit${points > 1 ? "s" : ""} dans la case ${CATEGORY_BY_ID[selectedCategory].label}. Le coach n’a pas pu comparer ce choix.`);
      setCoachTone("neutral");
    }
    navigator.vibrate?.(18);
    score(selectedCategory);
    setSelectedCategory(null);
  };

  const performReset = () => {
    feedbackRequestRef.current += 1;
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
    window.requestAnimationFrame(() => {
      const title = document.getElementById("game-title");
      title?.scrollIntoView({ block: "start" });
      title?.focus({ preventScroll: true });
    });
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
    canRoll: game.rollNumber < 3 && heldCount < 5 && !isCalculating && !isFinished,
    canScore: selectedCategory !== null && !isRolling && !isCalculating && !isFinished,
    onRoll: handleRoll,
    onScore: handleScore,
    onToggleDie: toggleHeld,
  });

  if (!hasLoaded) {
    return (
      <main id="main-content" className="app-loading" aria-busy="true">
        <p className="sr-only" role="status">Chargement de la partie…</p>
      </main>
    );
  }

  const selectedPoints = selectedCategory
    ? scoreDice(selectedCategory, game.dice)
    : 0;
  const total = totalScore(game.scores);
  const upper = upperSubtotal(game.scores);
  const completedCategories = Object.keys(game.scores).length;
  const title = isFinished ? "Partie terminée." : gameTitle(game.rollNumber, selectedCategory);
  const currentRecommendation = recommendationMessage(targetEvaluation, remainingRolls);
  const bestRecorded = bestRecordedScore(game.scores);

  return (
    <main id="main-content" className="app-shell">
      <div className="game-layout">
        <section className="game-cabinet" aria-labelledby="game-title">
          <AppHeader onNewGame={handleReset} />
          <GameStatus title={title} turn={game.turn} total={total} completedCategories={completedCategories} />

          {isFinished ? (
            <FinishedCard
              total={total}
              bestCategory={bestRecorded}
              bonusAchieved={upper >= 63}
              onReplay={performReset}
            />
          ) : (
            <>
              <ScoreCard
                dice={game.dice}
                scores={game.scores}
                evaluations={evaluations}
                selected={selectedCategory}
                canSelect={game.rollNumber > 0 && !isRolling && !isCalculating}
                isCalculating={isCalculating}
                calculationError={calculationError}
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
                recommendationMessage={currentRecommendation}
                recommendedCategory={bestEvaluation?.category ?? null}
                isCalculating={isCalculating}
                calculationError={calculationError}
                onToggleDie={toggleHeld}
                onRoll={handleRoll}
                onScore={handleScore}
              />
            </>
          )}
        </section>

        <CoachPanel
          isCalculating={isCalculating}
          calculationError={calculationError}
          tone={coachTone}
          targetEvaluation={targetEvaluation}
          feedback={feedback}
          upper={upper}
          remainingRolls={remainingRolls}
          isTargetSelected={selectedCategory !== null}
          isFinished={isFinished}
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
