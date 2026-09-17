"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createQuizGame,
  nextQuizQuestion,
  QUIZ_QUESTIONS_PER_GAME,
  QUIZ_RECENT_IDS_MAX,
  QUIZ_TIME_PER_QUESTION_S,
  scoreQuizGame,
  selectQuizAnswer,
  timeoutQuizAnswer,
  type QuizDifficultyFilter,
  type QuizFormat,
  type QuizMode,
  type QuizState,
} from "../domain/quiz";
import { QUIZ_QUESTION_POOL } from "../data/quizBank";
import { readStoredQuiz, writeStoredQuiz } from "../lib/quizStorage";

export function useQuizGame() {
  const [game, setGame] = useState<QuizState | null>(null);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [startFailed, setStartFailed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(QUIZ_TIME_PER_QUESTION_S);
  const deadlineRef = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      // Toujours repartir de la page des thèmes : on ne restaure que l'historique anti-répétition.
      const stored = readStoredQuiz();
      setRecentIds(stored.recentIds);
      setHasLoaded(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hasLoaded) return;
    writeStoredQuiz({ game, recentIds });
  }, [game, recentIds, hasLoaded]);

  const timeout = useCallback(() => {
    setGame((current) => (current ? timeoutQuizAnswer(current) : current));
  }, []);

  // Chrono de 15 s par question : basé sur un timestamp pour rester juste
  // même si l'onglet est en arrière-plan. Gelé dès qu'on a répondu.
  // Le reset se fait dans start/next (gestionnaires, pas dans l'effet).
  // Le timeout est déclenché depuis l'intervalle (abonnement), pas dans le corps de l'effet.
  useEffect(() => {
    if (!game || game.isFinished || game.selected !== null) return;
    deadlineRef.current = Date.now() + QUIZ_TIME_PER_QUESTION_S * 1000;
    const id = window.setInterval(() => {
      const remaining = Math.max(0, (deadlineRef.current - Date.now()) / 1000);
      setTimeLeft(remaining);
      if (remaining <= 0) {
        window.clearInterval(id);
        timeout();
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [game, timeout]);

  const start = useCallback(
    (mode: QuizMode, format: QuizFormat = "classique", difficulty: QuizDifficultyFilter = "melange") => {
      const next = createQuizGame(
        QUIZ_QUESTION_POOL,
        mode,
        Math.random,
        recentIds,
        QUIZ_QUESTIONS_PER_GAME,
        format,
        difficulty,
      );
      if (next) {
        setStartFailed(false);
        setTimeLeft(QUIZ_TIME_PER_QUESTION_S);
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
    setTimeLeft(QUIZ_TIME_PER_QUESTION_S);
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
    timeout,
    next,
    quitToThemes,
    startFailed,
    timeLeft,
    timePerQuestion: QUIZ_TIME_PER_QUESTION_S,
    score: game ? scoreQuizGame(game) : 0,
    total: game?.questions.length ?? QUIZ_QUESTIONS_PER_GAME,
  };
}
