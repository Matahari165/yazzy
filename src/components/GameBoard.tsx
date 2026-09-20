"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CATEGORIES, scoreDice, type CategoryId } from "@/domain/yatzy";
import { useGameKeyboard } from "@/hooks/useGameKeyboard";
import { useYazzyGame } from "@/hooks/useYazzyGame";
import {
  chooseBotReaction,
  INITIAL_BOT_REACTION_HISTORY,
  recordBotReaction,
} from "@/domain/bots/reactionPolicy";
import type { BotReactionEmoji } from "@/domain/reactions";
import { FinishedGame } from "./FinishedGame";
import { applySavedTheme } from "./ThemeSwitcher";
import { YatzyBurst } from "./YatzyBurst";
import { BotTurnPanel, GameTable } from "./GameTable";
import { GameHeader } from "./GameHeader";
import { ReactionToast } from "./ReactionToast";
import { ScoreCard } from "./ScoreCard";
import { readBotDemonTheme } from "@/lib/botThemeStorage";
import { botAudio } from "@/lib/botAudio";
import { totalScore } from "@/domain/yatzy";

const HUMAN_ROLL_ANIMATION_MS = 360;
const BOT_REACTION_DURATION_MS = 2_400;
const HUMAN_REACTION_LEAD_MS = 700;
const YATZY_BURST_DURATION_MS = 2_300;

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
  const [yatzyBurst, setYatzyBurst] = useState<{ id: string; author: string } | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [isDemonThemeEnabled, setIsDemonThemeEnabled] = useState<boolean | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const rollTimerRef = useRef<number | null>(null);
  const reactionTimerRef = useRef<number | null>(null);
  const burstTimerRef = useRef<number | null>(null);
  const burstSequenceRef = useRef(0);
  const reactionSequenceRef = useRef(0);
  const reactionHistoryRef = useRef(INITIAL_BOT_REACTION_HISTORY);
  const reactionTrackingReadyRef = useRef(false);
  const previousBotScoresRef = useRef(game.bot.scores);
  const previousBotRollNumberRef = useRef(game.bot.rollNumber);
  const previousBotHeldRef = useRef(game.bot.held.join(""));
  const botAudioTrackingReadyRef = useRef(false);
  const resultSoundPlayedRef = useRef(false);

  const showYatzyBurst = useCallback((author: string) => {
    burstSequenceRef.current += 1;
    setYatzyBurst({ id: `yatzy-burst-${burstSequenceRef.current}`, author });
    if (burstTimerRef.current !== null) window.clearTimeout(burstTimerRef.current);
    burstTimerRef.current = window.setTimeout(() => {
      burstTimerRef.current = null;
      setYatzyBurst(null);
    }, YATZY_BURST_DURATION_MS);
  }, []);

  const showBotReaction = useCallback((emoji: BotReactionEmoji, scoredCount: number) => {
    reactionHistoryRef.current = recordBotReaction(reactionHistoryRef.current, scoredCount, emoji);
    reactionSequenceRef.current += 1;
    setVisibleBotReaction({ id: `bot-reaction-${reactionSequenceRef.current}`, emoji });
    if (reactionTimerRef.current !== null) window.clearTimeout(reactionTimerRef.current);
    reactionTimerRef.current = window.setTimeout(() => {
      reactionTimerRef.current = null;
      setVisibleBotReaction(null);
    }, BOT_REACTION_DURATION_MS);
  }, []);

  useEffect(() => () => {
    if (rollTimerRef.current !== null) window.clearTimeout(rollTimerRef.current);
    if (reactionTimerRef.current !== null) window.clearTimeout(reactionTimerRef.current);
    if (burstTimerRef.current !== null) window.clearTimeout(burstTimerRef.current);
  }, []);

  useEffect(() => {
    applySavedTheme();
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const demonThemeEnabled = readBotDemonTheme();
      setIsDemonThemeEnabled(demonThemeEnabled);
      const enabled = botAudio.syncPreference();
      setSoundEnabled(enabled);
      if (enabled) botAudio.startMusic(demonThemeEnabled);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => () => botAudio.stopMusic(), []);

  useEffect(() => {
    if (!isFinished) return;
    const frame = window.requestAnimationFrame(() => document.getElementById("finished-title")?.focus({ preventScroll: true }));
    return () => window.cancelAnimationFrame(frame);
  }, [isFinished]);

  useEffect(() => {
    if (!hasLoaded) return;
    if (!reactionTrackingReadyRef.current) {
      previousBotScoresRef.current = game.bot.scores;
      reactionTrackingReadyRef.current = true;
      return;
    }

    const previousScores = previousBotScoresRef.current;
    const newlyFilledBotCategory = CATEGORIES.find(
      ({ id }) => previousScores[id] === undefined && game.bot.scores[id] !== undefined,
    )?.id;
    previousBotScoresRef.current = game.bot.scores;
    if (newlyFilledBotCategory) {
      setHighlightedOpponentCategory(newlyFilledBotCategory);
      if (!isFinished) botAudio.playEffect("bot");
    }

    const category = newlyFilledBotCategory;
    if (!category) return;
    const points = game.bot.scores[category] ?? 0;
    if (category === "yatzy" && points === 50) showYatzyBurst("Bot");
    const scoredCount = Object.keys(game.human.scores).length + Object.keys(game.bot.scores).length;
    const emoji = chooseBotReaction(
      { actor: "bot", category, points, scoredCount, isEndgame: scoredCount >= 24 },
      reactionHistoryRef.current,
    );
    if (!emoji) return;
    showBotReaction(emoji, scoredCount);
  }, [game.bot.scores, game.human.scores, hasLoaded, isFinished, showBotReaction, showYatzyBurst]);

  useEffect(() => {
    if (!hasLoaded) return;
    const heldSignature = game.bot.held.join("");
    if (!botAudioTrackingReadyRef.current) {
      previousBotRollNumberRef.current = game.bot.rollNumber;
      previousBotHeldRef.current = heldSignature;
      botAudioTrackingReadyRef.current = true;
      return;
    }
    if (game.activePlayer === "bot") {
      const rollDelta = game.bot.rollNumber - previousBotRollNumberRef.current;
      if (rollDelta > 0) botAudio.playBotRollSequence(rollDelta);
      if (heldSignature !== previousBotHeldRef.current && game.bot.held.some(Boolean)) {
        botAudio.playEffect("botHold");
      }
    }
    previousBotRollNumberRef.current = game.bot.rollNumber;
    previousBotHeldRef.current = heldSignature;
  }, [game.activePlayer, game.bot.held, game.bot.rollNumber, hasLoaded]);

  useEffect(() => {
    if (!isFinished || isDemonThemeEnabled === null || resultSoundPlayedRef.current) return;
    resultSoundPlayedRef.current = true;
    const humanScore = totalScore(game.human.scores);
    const botScore = totalScore(game.bot.scores);
    const outcome = humanScore === botScore ? "tie" : humanScore > botScore ? "win" : "loss";
    if (isDemonThemeEnabled && outcome !== "tie") botAudio.playDemonResult(outcome);
    else {
      if (isDemonThemeEnabled) botAudio.stopMusic(0.18);
      botAudio.playEffect(outcome);
    }
  }, [game.bot.scores, game.human.scores, isDemonThemeEnabled, isFinished]);

  const handleRoll = () => {
    if (game.activePlayer !== "human" || isRolling || game.human.rollNumber >= 3) return;
    if (game.human.rollNumber > 0 && game.human.held.every(Boolean)) return;
    botAudio.playEffect("dice");
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
    const scoredCount = Object.keys(game.human.scores).length + Object.keys(game.bot.scores).length + 1;
    if (scoredCount < CATEGORIES.length * 2) botAudio.playEffect("score");
    const emoji = chooseBotReaction(
      {
        actor: "human",
        category,
        points: scoreDice(category, game.human.dice),
        scoredCount,
        isEndgame: scoredCount >= 24,
      },
      reactionHistoryRef.current,
    );
    if (emoji) showBotReaction(emoji, scoredCount);
    if (category === "yatzy" && scoreDice("yatzy", game.human.dice) === 50) showYatzyBurst("Toi");
    score(category, emoji ? HUMAN_REACTION_LEAD_MS : 0);
    setSelectedCategory(null);
  };

  useGameKeyboard({
    disabled: !hasLoaded || game.activePlayer !== "human" || isRolling,
    canRoll: game.human.rollNumber < 3 && !game.human.held.every(Boolean),
    canScore: selectedCategory !== null && !isRolling,
    onRoll: handleRoll,
    onScore: handleScore,
    onToggleDie: (index) => {
      botAudio.playEffect(game.human.held[index] ? "release" : "hold");
      toggleHeld(index);
    },
  });

  const handleToggleDie = (index: number) => {
    botAudio.playEffect(game.human.held[index] ? "release" : "hold");
    toggleHeld(index);
  };

  const handleToggleSound = () => {
    const enabled = !soundEnabled;
    setSoundEnabled(enabled);
    botAudio.setEnabled(enabled);
    if (enabled) {
      if (isFinished && isDemonThemeEnabled) {
        const humanScore = totalScore(game.human.scores);
        const botScore = totalScore(game.bot.scores);
        if (humanScore !== botScore) botAudio.playDemonResult(humanScore > botScore ? "win" : "loss");
        else botAudio.playEffect("tie");
      } else botAudio.startMusic(Boolean(isDemonThemeEnabled));
      botAudio.playEffect("button");
    }
  };

  const handleStopAudio = () => botAudio.stopMusic(0.18);

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
      <GameHeader soundEnabled={soundEnabled} onToggleSound={handleToggleSound} onQuit={handleStopAudio} />
      {isFinished ? (
        <FinishedGame game={game} onLeave={handleStopAudio} />
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
            onSelect={(category) => {
              botAudio.playEffect("button");
              setSelectedCategory(category);
            }}
            onScore={handleScore}
          />

          {game.activePlayer === "human" ? (
            <GameTable
              dice={game.human.dice}
              held={game.human.held}
              rollNumber={game.human.rollNumber}
              selectedCategory={selectedCategory}
              isRolling={isRolling}
              onToggleDie={handleToggleDie}
              onRoll={handleRoll}
            />
          ) : (
            <BotTurnPanel
              game={game}
              onSkip={() => {
                botAudio.playEffect("button");
                skipBotAnimation();
              }}
            />
          )}
        </div>
      )}
      {visibleBotReaction ? (
        <ReactionToast key={visibleBotReaction.id} author="Bot" emoji={visibleBotReaction.emoji} />
      ) : null}
      {yatzyBurst ? (
        <YatzyBurst key={yatzyBurst.id} author={yatzyBurst.author} />
      ) : null}
    </main>
  );
}
