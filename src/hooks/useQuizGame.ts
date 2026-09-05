"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createQuizGame,
  nextQuizQuestion,
  QUIZ_QUESTIONS_PER_GAME,
  QUIZ_RECENT_IDS_MAX,
  scoreQuizGame,
  selectQuizAnswer,
  type QuizMode,
  type QuizState,
} from "../domain/quiz";
import { QUIZ_QUESTIONS_FR } from "../data/quizQuestions.fr";
import { readStoredQuiz, writeStoredQuiz } from "../lib/quizStorage";

export function useQuizGame() {
  const [game, setGame] = useState<QuizState | null>(null);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [startFailed, setStartFailed] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      // Toujours repartir de la page des thèmes : on ne restaure que l'historique anti-répétition.
      const stored = readStoredQuiz();
      setRecentIds(stored.recentIds);
      setHasLoaded(true);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!hasLoaded) return;
    writeStoredQuiz({ game, recentIds });
  }, [game, recentIds, hasLoaded]);

  const start = useCallback(
    (mode: QuizMode) => {
      const next = createQuizGame(
        QUIZ_QUESTIONS_FR,
        mode,
        Math.random,
        recentIds,
        QUIZ_QUESTIONS_PER_GAME,
      );
      if (next) {
        setStartFailed(false);
        setGame(next);
        return true;
      }
      setStartFailed(true);
      return false;
    },
    [recentIds],
  );

  const answer = useCallback((choiceIndex: number) => {
    setGame((current) => (current ? selectQuizAnswer(current, choiceIndex) : current));
  }, []);

  const next = useCallback(() => {
    if (!game) return;
    const advanced = nextQuizQuestion(game);
    if (advanced.isFinished) {
      const seen = [...recentIds, ...game.questions.map((q) => q.question.id)];
      setRecentIds([...new Set(seen)].slice(-QUIZ_RECENT_IDS_MAX));
    }
    setGame(advanced);
  }, [game, recentIds]);

  const quitToThemes = useCallback(() => {
    setGame(null);
  }, []);

  return {
    game,
    hasLoaded,
    start,
    answer,
    next,
    quitToThemes,
    startFailed,
    score: game ? scoreQuizGame(game) : 0,
    total: game?.questions.length ?? QUIZ_QUESTIONS_PER_GAME,
  };
}
