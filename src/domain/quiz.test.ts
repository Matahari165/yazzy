import { describe, expect, it } from "vitest";
import {
  countQuizQuestions,
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
import { QUIZ_QUESTION_POOL } from "../data/quizBank";

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
  it("garde le pack historique valide", () => {
    expect(QUIZ_QUESTIONS_FR.length).toBeGreaterThanOrEqual(100);
    expect(QUIZ_QUESTIONS_FR.every(isQuizQuestion)).toBe(true);
  });

  it("valide la méga-banque : volume, unicité, difficultés", () => {
    expect(QUIZ_QUESTION_POOL.length).toBeGreaterThanOrEqual(1900);
    expect(QUIZ_QUESTION_POOL.every(isQuizQuestion)).toBe(true);
    const ids = new Set(QUIZ_QUESTION_POOL.map((q) => q.id));
    expect(ids.size).toBe(QUIZ_QUESTION_POOL.length);
    // Aucun libellé rejoué deux fois dans le même thème.
    const labels = new Set(QUIZ_QUESTION_POOL.map((q) => `${q.category}::${q.question.trim().toLowerCase()}`));
    expect(labels.size).toBe(QUIZ_QUESTION_POOL.length);
    for (const category of ["science", "histoire", "art", "pays"] as const) {
      for (const difficulty of ["facile", "moyen", "difficile"] as const) {
        const count = QUIZ_QUESTION_POOL.filter(
          (q) => q.category === category && q.difficulty === difficulty,
        ).length;
        expect(count).toBeGreaterThanOrEqual(150);
      }
    }
    // Chaque réponse pointe vers le bon choix et les choix sont distincts.
    for (const q of QUIZ_QUESTION_POOL) {
      expect(new Set(q.choices).size).toBe(4);
      expect(q.choices[q.answerIndex]).toBeTruthy();
    }
  });

  it("filtre par difficulté et compte sans remise", () => {
    expect(countQuizQuestions(QUIZ_QUESTION_POOL, "aleatoire", "facile")).toBeGreaterThanOrEqual(600);
    const picked = pickQuizQuestions(QUIZ_QUESTION_POOL, "science", 10, deterministic([0.3]), [], "difficile");
    expect(picked).toHaveLength(10);
    expect(picked.every((q) => q.difficulty === undefined || q.difficulty === "difficile")).toBe(true);
    const game = createQuizGame(QUIZ_QUESTION_POOL, "pays", deterministic([0.7]), [], 5, "classique", "facile");
    expect(game?.difficulty).toBe("facile");
    expect(game?.questions).toHaveLength(5);
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
