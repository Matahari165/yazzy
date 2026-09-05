"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useQuizGame } from "@/hooks/useQuizGame";
import {
  QUIZ_CATEGORY_LABELS,
  QUIZ_CATEGORIES,
  QUIZ_FORMAT_LABELS,
  QUIZ_SURVIVAL_LIVES,
  QUIZ_TIMEOUT_CHOICE,
  scoreQuizGame,
  type QuizFormat,
  type QuizMode,
} from "@/domain/quiz";

const THEME_EMOJI: Record<QuizMode, string> = {
  aleatoire: "🎲",
  science: "🔬",
  histoire: "📜",
  art: "🎨",
  pays: "🌍",
};

const FORMAT_EMOJI: Record<QuizFormat, string> = {
  classique: "🎯",
  survie: "❤️‍🔥",
};

const FORMAT_HINT: Record<QuizFormat, string> = {
  classique: "10 questions",
  survie: "3 vies, sans fin",
};

function resultMessage(score: number, total: number): string {
  const ratio = total === 0 ? 0 : score / total;
  if (ratio === 1) return "Sans faute.";
  if (ratio >= 0.8) return "Très bien.";
  if (ratio >= 0.5) return "Pas mal.";
  return "À revoir.";
}

export function QuizBoard() {
  const {
    game,
    hasLoaded,
    start,
    answer,
    next,
    quitToThemes,
    startFailed,
    timeLeft,
    timePerQuestion,
    total,
  } = useQuizGame();
  const [format, setFormat] = useState<QuizFormat>("classique");
  const resultTitleRef = useRef<HTMLHeadingElement>(null);
  const questionTitleRef = useRef<HTMLHeadingElement>(null);

  const isFinished = game?.isFinished ?? false;
  const current = game && !isFinished ? game.questions[game.currentIndex] : null;
  const score = game ? scoreQuizGame(game) : 0;
  const timerRatio = Math.max(0, Math.min(1, timeLeft / timePerQuestion));

  useEffect(() => {
    if (!game || !isFinished) return;
    resultTitleRef.current?.focus({ preventScroll: true });
  }, [game, isFinished]);

  useEffect(() => {
    if (!current) return;
    questionTitleRef.current?.focus({ preventScroll: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.currentIndex]);

  useEffect(() => {
    if (!game || isFinished || game.selected !== null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key >= "1" && event.key <= "4") {
        event.preventDefault();
        answer(Number(event.key) - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [game, isFinished, answer]);

  useEffect(() => {
    if (!game || isFinished || game.selected === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") {
        const target = event.target as HTMLElement | null;
        if (target && (target.tagName === "BUTTON" || target.tagName === "A")) return;
        event.preventDefault();
        next();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [game, isFinished, next]);

  if (!hasLoaded) {
    return (
      <main id="main-content" className="app-loading" aria-busy="true">
        <p role="status">Chargement du quiz…</p>
      </main>
    );
  }

  return (
    <main id="main-content" className="quiz-shell">
      <header className="game-header quiz-header">
        <Link className="game-logo" href="/" aria-label="Yazzy, revenir à l’accueil">
          YAZZY
        </Link>
        <span className="mode-label">Quiz</span>
        <Link
          className="quit-link multiplayer-quit-link"
          href="/"
          aria-label="Quitter le quiz"
          onClick={(event) => {
            if (game && !window.confirm("Quitter le quiz en cours ?")) event.preventDefault();
          }}
        >
          <span aria-hidden="true">×</span>
        </Link>
      </header>

      {!game ? (
        <section className="quiz-card" aria-labelledby="quiz-theme-title">
          <p className="eyebrow">Culture générale</p>
          <h1 id="quiz-theme-title">Quiz</h1>
          <p className="quiz-intro">15 secondes par question.</p>
          <div className="quiz-format-grid" role="group" aria-label="Format de partie">
            {(["classique", "survie"] as QuizFormat[]).map((option) => (
              <button
                key={option}
                type="button"
                className="quiz-format-action"
                data-active={format === option}
                aria-pressed={format === option}
                onClick={() => setFormat(option)}
              >
                <span aria-hidden="true">{FORMAT_EMOJI[option]}</span>
                <span>
                  <strong>{QUIZ_FORMAT_LABELS[option]}</strong>
                  <small>{FORMAT_HINT[option]}</small>
                </span>
              </button>
            ))}
          </div>
          {startFailed ? (
            <p className="form-error" role="alert">Impossible de démarrer : aucune question disponible.</p>
          ) : null}
          <div className="quiz-theme-grid">
            {(["aleatoire", ...QUIZ_CATEGORIES] as QuizMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                className="quiz-theme-action"
                data-primary={mode === "aleatoire"}
                onClick={() => start(mode, format)}
              >
                <span aria-hidden="true">{THEME_EMOJI[mode]}</span>
                <span>
                  <strong>{mode === "aleatoire" ? "Aléatoire" : QUIZ_CATEGORY_LABELS[mode]}</strong>
                  <small>{mode === "aleatoire" ? "Tous thèmes" : "Par thème"}</small>
                </span>
              </button>
            ))}
          </div>
        </section>
      ) : isFinished ? (
        <section className="quiz-card quiz-result" aria-labelledby="quiz-result-title">
          <p className="eyebrow">
            {game.format === "survie" ? "Survie" : null}
            {game.format === "survie" ? " · " : ""}
            {game.mode === "aleatoire" ? "Aléatoire" : QUIZ_CATEGORY_LABELS[game.mode]}
          </p>
          <h1 id="quiz-result-title" ref={resultTitleRef} tabIndex={-1}>
            {game.format === "survie" ? `${score} pts` : `${score}/${game.questions.length}`}
          </h1>
          <p className="quiz-intro">
            {game.format === "survie"
              ? `${game.answers.length} questions, ${score} bonnes réponses.`
              : resultMessage(score, game.questions.length)}
          </p>
          <ol className="quiz-review">
            {game.questions.slice(0, game.answers.length).map((round, index) => {
              const good = game.answers[index] === round.correctShuffledIndex;
              return (
                <li key={round.question.id} data-good={good}>
                  <span aria-hidden="true">{good ? "✓" : "✗"}</span>
                  <span>{round.question.question}</span>
                </li>
              );
            })}
          </ol>
          <div className="quiz-actions">
            <button type="button" className="primary-action" onClick={() => start(game.mode, game.format)}>
              Rejouer
            </button>
            <button type="button" className="secondary-action" onClick={quitToThemes}>
              Thèmes
            </button>
            <Link className="secondary-action" href="/">
              Accueil
            </Link>
          </div>
        </section>
      ) : (
        current && (
          <section className="quiz-card" aria-labelledby="quiz-question-title">
            <div className="quiz-topbar">
              <span className="quiz-progress" aria-live="polite">
                {game.format === "survie" ? `N°${game.currentIndex + 1}` : `${game.currentIndex + 1}/${game.questions.length}`}
              </span>
              <span className="quiz-theme-badge">
                {game.mode === "aleatoire"
                  ? QUIZ_CATEGORY_LABELS[current.question.category]
                  : QUIZ_CATEGORY_LABELS[game.mode]}
              </span>
              {game.format === "survie" ? (
                <span className="quiz-lives" role="img" aria-label={`${game.lives} vie${game.lives > 1 ? "s" : ""} restante${game.lives > 1 ? "s" : ""}`}>
                  {"❤️".repeat(game.lives)}{"🖤".repeat(QUIZ_SURVIVAL_LIVES - game.lives)}
                </span>
              ) : null}
              <span className="quiz-score">{score} pt</span>
            </div>
            <div className="quiz-timer" aria-hidden="true">
              <i data-urgent={timeLeft <= 5} style={{ width: `${timerRatio * 100}%` }} />
            </div>
            <h1
              id="quiz-question-title"
              ref={questionTitleRef}
              tabIndex={-1}
              className="quiz-question"
            >
              {current.question.question}
            </h1>
            <div className="quiz-options" role="group" aria-label="Options">
              {current.shuffledChoices.map((choice, index) => {
                const isSelected = game.selected === index;
                const isCorrect = index === current.correctShuffledIndex;
                const state = game.selected === null ? "idle" : isCorrect ? "good" : isSelected ? "bad" : "dim";
                return (
                  <button
                    key={index}
                    type="button"
                    className="quiz-option"
                    data-state={state}
                    disabled={game.selected !== null}
                    aria-pressed={isSelected}
                    onClick={() => answer(index)}
                  >
                    <span className="quiz-option-key" aria-hidden="true">{index + 1}</span>
                    <span>{choice}</span>
                  </button>
                );
              })}
            </div>
            {game.selected !== null ? (
              <div className="quiz-feedback" aria-live="polite">
                <p data-good={game.selected === current.correctShuffledIndex}>
                  {game.selected === current.correctShuffledIndex
                    ? "Bonne réponse."
                    : game.selected === QUIZ_TIMEOUT_CHOICE
                      ? `Temps écoulé : ${current.shuffledChoices[current.correctShuffledIndex]}.`
                      : `Raté : ${current.shuffledChoices[current.correctShuffledIndex]}.`}
                </p>
                {current.question.explanation ? <p className="quiz-explanation">{current.question.explanation}</p> : null}
                <button type="button" className="primary-action quiz-next" onClick={next} autoFocus>
                  {game.format === "survie"
                    ? game.lives <= 0
                      ? "Voir le résultat"
                      : "Suivant"
                    : game.currentIndex >= total - 1
                      ? "Voir le résultat"
                      : "Suivant"}
                </button>
              </div>
            ) : null}
          </section>
        )
      )}
    </main>
  );
}
