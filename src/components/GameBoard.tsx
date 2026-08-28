"use client";

import { useEffect, useRef, useState } from "react";
import { CATEGORIES, type CategoryId } from "@/domain/yatzy";
import { useGameKeyboard } from "@/hooks/useGameKeyboard";
import { useYazzyGame } from "@/hooks/useYazzyGame";
import {
  chooseBotReaction,
  INITIAL_BOT_REACTION_HISTORY,
  recordBotReaction,
} from "@/domain/bots/reactionPolicy";
import type { BotReactionEmoji } from "@/domain/reactions";
import { FinishedGame } from "./FinishedGame";
import { BotTurnPanel, GameTable } from "./GameTable";
import { GameHeader } from "./GameHeader";
import { ReactionToast } from "./ReactionToast";
import { ScoreCard } from "./ScoreCard";
import { readBotDemonTheme } from "@/lib/botThemeStorage";

const HUMAN_ROLL_ANIMATION_MS = 360;
const BOT_REACTION_DURATION_MS = 2_400;

type VisibleBotReaction = {
  id: string;
  emoji: BotReactionEmoji;
};

export function GameBoard() {
  const { game, roll, toggleHeld, score, skipBotAnimation, isFinished, hasLoaded } = useYazzyGame();
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | null>(null);
  const [highlightedPlayerCategory, setHighlightedPlayerCategory] = useState<CategoryId | null>(null);
  const [highlightedOpponentCategory, setHighlightedOpponentCategory] = useState<CategoryId | null>(null);
  const [visibleBotReaction, setVisibleBotReaction] = useState<VisibleBotReaction | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [isDemonThemeEnabled, setIsDemonThemeEnabled] = useState<boolean | null>(null);
  const rollTimerRef = useRef<number | null>(null);
  const reactionTimerRef = useRef<number | null>(null);
  const reactionSequenceRef = useRef(0);
  const reactionHistoryRef = useRef(INITIAL_BOT_REACTION_HISTORY);
  const reactionTrackingReadyRef = useRef(false);
  const previousHumanScoresRef = useRef(game.human.scores);
  const previousBotScoresRef = useRef(game.bot.scores);

  useEffect(() => () => {
    if (rollTimerRef.current !== null) window.clearTimeout(rollTimerRef.current);
    if (reactionTimerRef.current !== null) window.clearTimeout(reactionTimerRef.current);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => setIsDemonThemeEnabled(readBotDemonTheme()), 0);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!isFinished) return;
    const frame = window.requestAnimationFrame(() => document.getElementById("finished-title")?.focus({ preventScroll: true }));
    return () => window.cancelAnimationFrame(frame);
  }, [isFinished]);

  useEffect(() => {
    if (!hasLoaded) return;
    if (!reactionTrackingReadyRef.current) {
      previousHumanScoresRef.current = game.human.scores;
      previousBotScoresRef.current = game.bot.scores;
      reactionTrackingReadyRef.current = true;
      return;
    }

    const previousHumanScores = previousHumanScoresRef.current;
    const previousScores = previousBotScoresRef.current;
    const newlyFilledHumanCategory = CATEGORIES.find(
      ({ id }) => previousHumanScores[id] === undefined && game.human.scores[id] !== undefined,
    )?.id;
    const newlyFilledBotCategory = CATEGORIES.find(
      ({ id }) => previousScores[id] === undefined && game.bot.scores[id] !== undefined,
    )?.id;
    previousHumanScoresRef.current = game.human.scores;
    previousBotScoresRef.current = game.bot.scores;
    if (newlyFilledBotCategory) setHighlightedOpponentCategory(newlyFilledBotCategory);

    const category = newlyFilledHumanCategory ?? newlyFilledBotCategory;
    if (!category) return;
    const actor = newlyFilledHumanCategory ? "human" : "bot";
    const scores = actor === "human" ? game.human.scores : game.bot.scores;
    const points = scores[category] ?? 0;
    const scoredCount = Object.keys(game.human.scores).length + Object.keys(game.bot.scores).length;
    const emoji = chooseBotReaction(
      { actor, category, points, scoredCount },
      reactionHistoryRef.current,
    );
    if (!emoji) return;

    reactionHistoryRef.current = recordBotReaction(reactionHistoryRef.current, scoredCount, emoji);
    reactionSequenceRef.current += 1;
    setVisibleBotReaction({ id: `bot-reaction-${reactionSequenceRef.current}`, emoji });
    if (reactionTimerRef.current !== null) window.clearTimeout(reactionTimerRef.current);
    reactionTimerRef.current = window.setTimeout(() => {
      reactionTimerRef.current = null;
      setVisibleBotReaction(null);
    }, BOT_REACTION_DURATION_MS);
  }, [game.bot.scores, game.human.scores, hasLoaded]);

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

  if (!hasLoaded || isDemonThemeEnabled === null) {
    return <main id="main-content" className="app-loading" aria-busy="true"><p role="status">Chargement de la partie…</p></main>;
  }

  return (
    <main
      id="main-content"
      className="game-shell"
      data-game-mode="bot"
      data-demon-theme={isDemonThemeEnabled ? "on" : "off"}
    >
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
      {visibleBotReaction ? (
        <ReactionToast key={visibleBotReaction.id} author="Bot" emoji={visibleBotReaction.emoji} />
      ) : null}
    </main>
  );
}
