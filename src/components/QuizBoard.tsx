"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuizGame } from "@/hooks/useQuizGame";
import {
  countQuizQuestions,
  QUIZ_CATEGORY_LABELS,
  QUIZ_CATEGORIES,
  QUIZ_DIFFICULTY_FILTERS,
  QUIZ_DIFFICULTY_LABELS,
  QUIZ_FORMAT_LABELS,
  QUIZ_SURVIVAL_LIVES,
  QUIZ_TIMEOUT_CHOICE,
  scoreQuizGame,
  type QuizCategory,
  type QuizDifficultyFilter,
  type QuizFormat,
  type QuizMode,
} from "@/domain/quiz";
import { QUIZ_QUESTION_POOL } from "@/data/quizBank";

const QA_MODE_CODE: Record<QuizMode, string> = {
  aleatoire: "MIX",
  science: "SC",
  histoire: "HI",
  art: "AR",
  pays: "PY",
};

const QA_MODE_BLURB: Record<QuizMode, string> = {
  aleatoire: "Tous thèmes",
  science: "Labo & espace",
  histoire: "Époques & récits",
  art: "Toiles & scènes",
  pays: "Cartes & capitales",
};

const QA_FORMAT_BLURB: Record<QuizFormat, string> = {
  classique: "10 questions",
  survie: "Sans fin · 3 vies",
};

const QA_DIFFICULTY_CODE: Record<QuizDifficultyFilter, string> = {
  melange: "★",
  facile: "F",
  moyen: "M",
  difficile: "D",
};

const QA_LETTERS = ["A", "B", "C", "D"] as const;

function resultMessage(score: number, total: number): string {
  const ratio = total === 0 ? 0 : score / total;
  if (ratio === 1) return "Score parfait.";
  if (ratio >= 0.8) return "Excellent score.";
  if (ratio >= 0.5) return "Bonne partie.";
  return "Partie terminée.";
}

/** Compte animé vers la valeur cible (jackpot, score final). */
function useCountUp(target: number, durationMs = 600): number {
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(target);
  useEffect(() => {
    const from = fromRef.current;
    if (from === target) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - t) * (1 - t) * (1 - t);
      const value = Math.round(from + (target - from) * eased);
      setDisplay(value);
      if (t < 1) frame = requestAnimationFrame(tick);
      else fromRef.current = target;
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      fromRef.current = target;
    };
  }, [target, durationMs]);
  return display;
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
  const [difficulty, setDifficulty] = useState<QuizDifficultyFilter>("melange");
  const [failCtx, setFailCtx] = useState<{ mode: QuizMode; format: QuizFormat; difficulty: QuizDifficultyFilter } | null>(null);
  const handleStart = (mode: QuizMode) => {
    const ok = start(mode, format, difficulty);
    setFailCtx(ok ? null : { mode, format, difficulty });
  };
  const retryLast = () => {
    const ctx = failCtx ?? { mode: "aleatoire" as QuizMode, format, difficulty };
    if (ctx.format !== format) setFormat(ctx.format);
    if (ctx.difficulty !== difficulty) setDifficulty(ctx.difficulty);
    const ok = start(ctx.mode, ctx.format, ctx.difficulty);
    setFailCtx(ok ? null : ctx);
  };
  const goToThemes = () => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document
      .getElementById("quiz-themes")
      ?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "nearest" });
  };
  const resultTitleRef = useRef<HTMLHeadingElement>(null);
  const questionTitleRef = useRef<HTMLHeadingElement>(null);

  const isFinished = game?.isFinished ?? false;
  const current = game && !isFinished ? game.questions[game.currentIndex] : null;
  const score = game ? scoreQuizGame(game) : 0;
  const displayScore = useCountUp(score, 450);
  const finalScore = useCountUp(isFinished ? score : 0, 900);
  const timerRatio = Math.max(0, Math.min(1, timeLeft / timePerQuestion));
  const secondsLeft = Math.ceil(timeLeft);
  const urgent = !!game && !isFinished && game.selected === null && timeLeft <= 5;

  const { streak, bestStreak } = useMemo(() => {
    if (!game) return { streak: 0, bestStreak: 0 };
    let run = 0;
    let best = 0;
    // Série en cours : bonnes réponses consécutives en partant de la fin.
    for (let i = game.answers.length - 1; i >= 0; i -= 1) {
      const round = game.questions[i];
      if (round && game.answers[i] === round.correctShuffledIndex) run += 1;
      else break;
    }
    let cursor = 0;
    game.answers.forEach((choice, index) => {
      const round = game.questions[index];
      if (round && choice === round.correctShuffledIndex) {
        cursor += 1;
        best = Math.max(best, cursor);
      } else cursor = 0;
    });
    return { streak: run, bestStreak: best };
  }, [game]);

  const burstPieces = useMemo(() => {
    if (!current || game?.selected !== current.correctShuffledIndex) return [];
    const colors = ["#FFB020", "#FF6B4A", "#57E6A8", "#FFC62E", "#8FD0FF"];
    return Array.from({ length: 16 }, (_, i) => {
      const angle = (i / 16) * Math.PI * 2 + Math.random() * 0.5;
      const dist = 46 + Math.random() * 58;
      return {
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
        rot: Math.round(Math.random() * 360),
        color: colors[i % colors.length],
        size: 5 + Math.round(Math.random() * 5),
      };
    });
  }, [current, game?.selected]);

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
      const key = event.key.toLowerCase();
      const digit = key >= "1" && key <= "4" ? Number(key) - 1 : -1;
      const letter = ["a", "b", "c", "d"].indexOf(key);
      const index = digit >= 0 ? digit : letter;
      if (index >= 0) {
        event.preventDefault();
        answer(index);
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
      <main id="main-content" className="qa" aria-busy="true">
        <p className="qa-loading" role="status">
          <span className="qa-loading-dots" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <span key={i} className="qa-loading-dot" style={{ "--i": i } as React.CSSProperties} />
            ))}
          </span>
          Chargement…
          <span className="qa-loading-rail" aria-hidden="true">
            <i />
          </span>
        </p>
      </main>
    );
  }

  return (
    <main
      id="main-content"
      className="qa"
      data-urgent={urgent}
    >
      <header className="qa-bar">
        <Link className="qa-brand" href="/" aria-label="Yazzy, revenir à l’accueil">
          <span className="qa-brand-tile" aria-hidden="true">
            Y<span>!</span>
          </span>
          <span className="qa-brand-text">
            <strong>Yazzy Quiz</strong>
          </span>
        </Link>

        {game && !isFinished ? (
          <span className="qa-live">
            <i aria-hidden="true" />
            En cours
          </span>
        ) : null}

        <Link
          className="qa-quit"
          href="/"
          aria-label="Quitter le quiz"
        >
          <span aria-hidden="true">×</span>
        </Link>
      </header>

      {!game ? (
        <section className="qa-hero" aria-labelledby="quiz-theme-title">
          <div className="qa-hero-top">
            <h1 id="quiz-theme-title">Quiz</h1>
          </div>

          <div className="qa-formats" role="group" aria-label="Format de partie">
            {(["classique", "survie"] as QuizFormat[]).map((option, i) => (
              <button
                key={option}
                type="button"
                className="qa-format qa-rise"
                style={{ "--i": i } as React.CSSProperties}
                data-active={format === option}
                aria-pressed={format === option}
                onClick={() => setFormat(option)}
              >
                <span className="qa-format-code" aria-hidden="true">
                  {option === "classique" ? "10Q" : "∞"}
                </span>
                <span className="qa-format-text">
                  <strong>{QUIZ_FORMAT_LABELS[option]}</strong>
                  <small>{QA_FORMAT_BLURB[option]}</small>
                </span>
                <span className="qa-format-check" aria-hidden="true">
                  →
                </span>
              </button>
            ))}
          </div>

          {startFailed ? (
            <div className="qa-fail">
              <p className="qa-error" role="alert">
                Impossible de démarrer : aucune question disponible.
              </p>
              <div className="qa-fail-actions">
                <button type="button" className="qa-retry" onClick={retryLast}>
                  Réessayer <span aria-hidden="true">↻</span>
                </button>
              </div>
              <p className="qa-empty">
                <span>
                  {failCtx && failCtx.mode !== "aleatoire"
                    ? `Aucune question en ${QUIZ_CATEGORY_LABELS[failCtx.mode as QuizCategory]} pour le moment.`
                    : "Aucune question dans ce thème pour le moment."}
                </span>
                <button type="button" className="qa-empty-btn" onClick={goToThemes}>
                  Changer de thème
                </button>
              </p>
            </div>
          ) : null}

          <p className="qa-group-label" id="quiz-difficulty-label">
            Difficulté · {QUIZ_QUESTION_POOL.length} questions
          </p>
          <div className="qa-formats" role="group" aria-labelledby="quiz-difficulty-label">
            {QUIZ_DIFFICULTY_FILTERS.map((option, i) => (
              <button
                key={option}
                type="button"
                className="qa-format qa-rise"
                style={{ "--i": i } as React.CSSProperties}
                data-active={difficulty === option}
                aria-pressed={difficulty === option}
                onClick={() => setDifficulty(option)}
              >
                <span className="qa-format-code" aria-hidden="true">
                  {QA_DIFFICULTY_CODE[option]}
                </span>
                <span className="qa-format-text">
                  <strong>{QUIZ_DIFFICULTY_LABELS[option]}</strong>
                  <small>{countQuizQuestions(QUIZ_QUESTION_POOL, "aleatoire", option)} questions</small>
                </span>
                <span className="qa-format-check" aria-hidden="true">
                  →
                </span>
              </button>
            ))}
          </div>

          <div className="qa-themes" id="quiz-themes">
            {(["aleatoire", ...QUIZ_CATEGORIES] as QuizMode[]).map((mode, i) => (
              <button
                key={mode}
                type="button"
                className="qa-theme qa-rise"
                style={{ "--i": i } as React.CSSProperties}
                data-hero={mode === "aleatoire"}
                data-cat={mode}
                onClick={() => handleStart(mode)}
              >
                <span className="qa-theme-stub" aria-hidden="true">
                  {QA_MODE_CODE[mode]}
                </span>
                <span className="qa-theme-text">
                  <strong>{mode === "aleatoire" ? "Aléatoire" : QUIZ_CATEGORY_LABELS[mode as QuizCategory]}</strong>
                  <small>{QA_MODE_BLURB[mode]}</small>
                </span>
              </button>
            ))}
          </div>
        </section>
      ) : isFinished ? (
        <section className="qa-panel qa-result" aria-labelledby="quiz-result-title">
          <p className="qa-kicker">
            {game.format === "survie" ? "Survie" : "Partie"} ·{" "}
            {game.mode === "aleatoire" ? "Aléatoire" : QUIZ_CATEGORY_LABELS[game.mode]}
            {game.difficulty && game.difficulty !== "melange"
              ? ` · ${QUIZ_DIFFICULTY_LABELS[game.difficulty]}`
              : null}
          </p>
          {score === game.questions.length && game.questions.length > 0 ? (
            <p className="qa-stamp" aria-hidden="true">
              Sans faute
            </p>
          ) : null}
          <h1 id="quiz-result-title" ref={resultTitleRef} tabIndex={-1} className="qa-final">
            <span className="qa-final-num" aria-label={`${score} points`}>
              {game.format === "survie" ? `${finalScore} pts` : `${finalScore}/${game.questions.length}`}
            </span>
          </h1>
          <p className="qa-sub">
            {game.format === "survie"
              ? `${game.answers.length} questions, ${score} bonnes réponses.`
              : resultMessage(score, game.questions.length)}
          </p>

          <dl className="qa-stats">
            <div>
              <dt>Bonnes</dt>
              <dd>{score}</dd>
            </div>
            <div>
              <dt>Jouées</dt>
              <dd>{game.answers.length}</dd>
            </div>
            <div>
              <dt>Série max</dt>
              <dd>×{Math.max(bestStreak, score > 0 ? 1 : 0)}</dd>
            </div>
          </dl>

          <ol className="qa-review">
            {game.questions.slice(0, game.answers.length).map((round, index) => {
              const good = game.answers[index] === round.correctShuffledIndex;
              const correct = round.shuffledChoices[round.correctShuffledIndex];
              return (
                <li key={round.question.id} data-good={good} style={{ "--i": Math.min(index, 3) } as React.CSSProperties}>
                  <span className="qa-review-mark" aria-hidden="true">
                    {good ? "✓" : "✗"}
                  </span>
                  <span className="qa-review-text">
                    <span className="qa-review-q">{round.question.question}</span>
                    {good ? null : <small>Réponse : {correct}</small>}
                    <span className="sr-only">{good ? "Bonne réponse." : `Raté. Bonne réponse : ${correct}.`}</span>
                  </span>
                </li>
              );
            })}
          </ol>

          <div className="qa-actions">
            <button type="button" className="qa-primary" onClick={() => start(game.mode, game.format, game.difficulty ?? "melange")}>
              Rejouer <span aria-hidden="true">↻</span>
            </button>
            <button type="button" className="qa-ghost-btn" onClick={quitToThemes}>
              Thèmes
            </button>
            <Link className="qa-ghost-btn" href="/">
              Accueil
            </Link>
          </div>
        </section>
      ) : (
        current && (
          <section className="qa-panel qa-round" aria-labelledby="quiz-question-title" key={game.currentIndex}>
            <div className="qa-hud">
              <div className="qa-hud-left">
                <span className="qa-count" aria-live="polite">
                  {game.format === "survie"
                    ? `N°${game.currentIndex + 1}`
                    : `${game.currentIndex + 1}/${game.questions.length}`}
                </span>
                <span className="qa-ticket" data-cat={current.question.category}>
                  <i aria-hidden="true" />
                  {QUIZ_CATEGORY_LABELS[current.question.category]}
                </span>
                {game.format === "survie" ? (
                  <span
                    className="qa-lives"
                    role="img"
                    aria-label={`${game.lives} vie${game.lives > 1 ? "s" : ""} restante${game.lives > 1 ? "s" : ""}`}
                  >
                    {Array.from({ length: QUIZ_SURVIVAL_LIVES }, (_, i) => (
                      <b key={i} data-on={i < game.lives} aria-hidden="true" />
                    ))}
                  </span>
                ) : (
                  <span className="qa-segments" aria-hidden="true">
                    {game.questions.map((_, i) => (
                      <b
                        key={i}
                        data-done={i < game.currentIndex}
                        data-now={i === game.currentIndex}
                      />
                    ))}
                  </span>
                )}
              </div>
              <div className="qa-hud-right">
                {streak >= 2 ? (
                  <span className="qa-streak" key={streak}>
                    série ×{streak}
                  </span>
                ) : null}
                <span className="qa-jackpot" aria-label={`${score} points`}>
                  <small>Score</small>
                  <strong key={score}>{String(displayScore).padStart(2, "0")}</strong>
                </span>
              </div>
            </div>

            <div className="qa-timer">
              <span className="sr-only">Temps restant : {secondsLeft} secondes</span>
              {urgent && secondsLeft === 5 ? (
                <span className="sr-only" role="status">
                  Plus que 5 secondes.
                </span>
              ) : null}
              <div className="qa-timer-rail" aria-hidden="true">
                <i data-urgent={urgent} style={{ width: `${timerRatio * 100}%` }} />
              </div>
              <span className="qa-timer-num" data-urgent={urgent} aria-hidden="true">
                {secondsLeft}s
              </span>
            </div>

            <h1 id="quiz-question-title" ref={questionTitleRef} tabIndex={-1} className="qa-question">
              {current.question.question}
            </h1>

            <div className="qa-options" role="group" aria-label="Options">
              {current.shuffledChoices.map((choice, index) => {
                const isSelected = game.selected === index;
                const isCorrect = index === current.correctShuffledIndex;
                const state = game.selected === null ? "idle" : isCorrect ? "good" : isSelected ? "bad" : "dim";
                return (
                  <button
                    key={`${game.currentIndex}-${index}`}
                    type="button"
                    className="qa-option"
                    data-state={state}
                    disabled={game.selected !== null}
                    aria-pressed={isSelected}
                    aria-keyshortcuts={`${index + 1} ${QA_LETTERS[index].toLowerCase()}`}
                    aria-label={`${QA_LETTERS[index]} : ${choice}${game.selected !== null && isCorrect ? " (bonne réponse)" : ""}`}
                    onClick={() => answer(index)}
                  >
                    <span className="qa-option-key" aria-hidden="true">
                      {QA_LETTERS[index]}
                    </span>
                    <span className="qa-option-label">{choice}</span>
                    <span className="qa-option-touch" aria-hidden="true">
                      {index + 1}
                    </span>
                    {state === "good" && burstPieces.length > 0 ? (
                      <span className="qa-burst" aria-hidden="true">
                        {burstPieces.map((p, i) => (
                          <i
                            key={i}
                            style={
                              {
                                "--dx": `${p.x}px`,
                                "--dy": `${p.y}px`,
                                "--rot": `${p.rot}deg`,
                                background: p.color,
                                width: p.size,
                                height: Math.max(3, p.size - 2),
                              } as React.CSSProperties
                            }
                          />
                        ))}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            {game.selected !== null ? (
              <div className="qa-sheet" aria-live="polite">
                <p className="qa-verdict" data-good={game.selected === current.correctShuffledIndex}>
                  <span className="qa-verdict-stamp" aria-hidden="true">
                    {game.selected === current.correctShuffledIndex
                      ? "Bonne réponse"
                      : game.selected === QUIZ_TIMEOUT_CHOICE
                        ? "Temps écoulé"
                        : "Raté"}
                  </span>
                  <span className="qa-verdict-text">
                    {game.selected === current.correctShuffledIndex
                      ? streak >= 2
                        ? `Série ×${streak}`
                        : ""
                      : game.selected === QUIZ_TIMEOUT_CHOICE
                        ? `Réponse : ${current.shuffledChoices[current.correctShuffledIndex]}`
                        : `Réponse : ${current.shuffledChoices[current.correctShuffledIndex]}`}
                  </span>
                </p>
                {current.question.explanation ? (
                  <p className="qa-explain">{current.question.explanation}</p>
                ) : null}
                <button type="button" className="qa-primary qa-next" onClick={next} autoFocus>
                  {game.format === "survie"
                    ? game.lives <= 0
                      ? "Voir le résultat"
                      : "Suivant"
                    : game.currentIndex >= total - 1
                      ? "Voir le résultat"
                      : "Suivant"}
                  <span aria-hidden="true">→</span>
                </button>
              </div>
            ) : null}
          </section>
        )
      )}
    </main>
  );
}
