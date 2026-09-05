import { describe, expect, it } from "vitest";
import {
  createQuizGame,
  isQuizQuestion,
  nextQuizQuestion,
  pickQuizQuestions,
  QUIZ_QUESTIONS_PER_GAME,
  QUIZ_SURVIVAL_LIVES,
  QUIZ_TIMEOUT_CHOICE,
  scoreQuizGame,
  selectQuizAnswer,
  timeoutQuizAnswer,
  toRoundQuestion,
  type QuizQuestion,
} from "./quiz";
import { QUIZ_QUESTIONS_FR } from "../data/quizQuestions.fr";

const pool: QuizQuestion[] = [
  { id: "a-1", category: "science", question: "Q1 ?", choices: ["A", "B", "C", "D"], answerIndex: 0 },
  { id: "a-2", category: "science", question: "Q2 ?", choices: ["A", "B", "C", "D"], answerIndex: 1 },
  { id: "b-1", category: "histoire", question: "Q3 ?", choices: ["A", "B", "C", "D"], answerIndex: 2 },
];

const deterministic = (sequence: number[]) => {
  let i = 0;
  return () => sequence[i++ % sequence.length] ?? 0;
};

describe("quiz domain", () => {
  it("valide le dataset FR embarqué", () => {
    expect(QUIZ_QUESTIONS_FR.length).toBeGreaterThanOrEqual(100);
    expect(QUIZ_QUESTIONS_FR.every(isQuizQuestion)).toBe(true);
    const ids = new Set(QUIZ_QUESTIONS_FR.map((q) => q.id));
    expect(ids.size).toBe(QUIZ_QUESTIONS_FR.length);
    for (const category of ["science", "histoire", "art", "pays"] as const) {
      expect(QUIZ_QUESTIONS_FR.filter((q) => q.category === category).length).toBeGreaterThanOrEqual(20);
    }
    expect(QUIZ_QUESTIONS_FR.filter((q) => q.category === "science").length).toBeGreaterThanOrEqual(35);
  });

  it("filtre par thème et mélange sans remise", () => {
    const picked = pickQuizQuestions(pool, "science", 10, deterministic([0.9, 0.1, 0.5]));
    expect(picked).toHaveLength(2);
    expect(picked.every((q) => q.category === "science")).toBe(true);
  });

  it("pioche en aléatoire dans tous les thèmes", () => {
    const picked = pickQuizQuestions(pool, "aleatoire", 2, deterministic([0.1]));
    expect(picked).toHaveLength(2);
  });

  it("évite les questions vues récemment quand c'est possible", () => {
    const picked = pickQuizQuestions(pool, "aleatoire", 1, deterministic([0]), ["a-1", "a-2"]);
    expect(picked[0].id).toBe("b-1");
  });

  it("mélange les choix en gardant la bonne réponse traçable", () => {
    const round = toRoundQuestion(pool[0], deterministic([0.99, 0.5, 0.1]));
    expect(round.shuffledChoices).toHaveLength(4);
    expect(round.shuffledChoices[round.correctShuffledIndex]).toBe("A");
  });

  it("déroule une partie : réponse puis question suivante", () => {
    const game = createQuizGame(pool, "aleatoire", deterministic([0.1]), [], 2);
    expect(game).not.toBeNull();
    if (!game) return;
    expect(game.questions).toHaveLength(2);
    const answered = selectQuizAnswer(game, 0);
    expect(answered.selected).toBe(0);
    // Pas de double réponse.
    expect(selectQuizAnswer(answered, 1)).toBe(answered);
    const next = nextQuizQuestion(answered);
    expect(next.currentIndex).toBe(1);
    expect(next.selected).toBeNull();
  });

  it("calcule le score", () => {
    const game = createQuizGame(pool, "aleatoire", deterministic([0]), [], 1);
    if (!game) throw new Error("no game");
    const correct = game.questions[0].correctShuffledIndex;
    const answered = selectQuizAnswer(game, correct);
    const finished = nextQuizQuestion(answered);
    expect(scoreQuizGame(answered)).toBe(1);
    expect(finished.isFinished).toBe(true);
    expect(QUIZ_QUESTIONS_PER_GAME).toBe(10);
  });

  it("crée une survie avec tout le thème et 3 vies", () => {
    const game = createQuizGame(pool, "science", deterministic([0.1]), [], 10, "survie");
    expect(game).not.toBeNull();
    if (!game) return;
    expect(game.format).toBe("survie");
    expect(game.lives).toBe(QUIZ_SURVIVAL_LIVES);
    expect(game.questions).toHaveLength(2);
  });

  it("perd une vie par mauvaise réponse en survie et termine à 0 vie", () => {
    let game = createQuizGame(pool, "aleatoire", deterministic([0]), [], 10, "survie");
    if (!game) throw new Error("no game");
    for (let life = QUIZ_SURVIVAL_LIVES; life > 0; life -= 1) {
      const round = game.questions[game.currentIndex];
      const wrong = (round.correctShuffledIndex + 1) % 4;
      game = selectQuizAnswer(game, wrong);
      expect(game.lives).toBe(life - 1);
      game = nextQuizQuestion(game);
    }
    expect(game.isFinished).toBe(true);
  });

  it("ne perd pas de vie sur une bonne réponse en survie", () => {
    const game = createQuizGame(pool, "aleatoire", deterministic([0]), [], 2, "survie");
    if (!game) throw new Error("no game");
    const correct = game.questions[0].correctShuffledIndex;
    expect(selectQuizAnswer(game, correct).lives).toBe(QUIZ_SURVIVAL_LIVES);
  });

  it("compte le timeout comme une mauvaise réponse", () => {
    const game = createQuizGame(pool, "aleatoire", deterministic([0]), [], 1);
    if (!game) throw new Error("no game");
    const timedOut = timeoutQuizAnswer(game);
    expect(timedOut.selected).toBe(QUIZ_TIMEOUT_CHOICE);
    expect(scoreQuizGame(timedOut)).toBe(0);
    expect(nextQuizQuestion(timedOut).isFinished).toBe(true);
  });
});
