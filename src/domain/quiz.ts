export const QUIZ_VERSION = 1;
export const QUIZ_STORAGE_KEY = "yazzy.quiz.v1";
export const QUIZ_QUESTIONS_PER_GAME = 10;
export const QUIZ_RECENT_IDS_MAX = 100;

export const QUIZ_CATEGORIES = ["science", "histoire", "art", "pays"] as const;
export type QuizCategory = (typeof QUIZ_CATEGORIES)[number];
export type QuizMode = QuizCategory | "aleatoire";

export const QUIZ_MODES: QuizMode[] = ["aleatoire", ...QUIZ_CATEGORIES];

export const QUIZ_CATEGORY_LABELS: Record<QuizCategory, string> = {
  science: "Sciences",
  histoire: "Histoire",
  art: "Arts",
  pays: "Pays",
};

export const QUIZ_MODE_LABELS: Record<QuizMode, string> = {
  aleatoire: "Aléatoire",
  ...QUIZ_CATEGORY_LABELS,
};

export type QuizQuestion = {
  id: string;
  category: QuizCategory;
  question: string;
  choices: [string, string, string, string];
  answerIndex: number;
  explanation?: string;
};

export type QuizRoundQuestion = {
  question: QuizQuestion;
  shuffledChoices: [string, string, string, string];
  correctShuffledIndex: number;
};

export type QuizState = {
  version: typeof QUIZ_VERSION;
  mode: QuizMode;
  questions: QuizRoundQuestion[];
  currentIndex: number;
  selected: number | null;
  answers: number[];
  isFinished: boolean;
};

export function isQuizCategory(value: unknown): value is QuizCategory {
  return typeof value === "string" && (QUIZ_CATEGORIES as readonly string[]).includes(value);
}

export function isQuizMode(value: unknown): value is QuizMode {
  return value === "aleatoire" || isQuizCategory(value);
}

export function isQuizQuestion(value: unknown): value is QuizQuestion {
  if (!value || typeof value !== "object") return false;
  const q = value as Partial<QuizQuestion>;
  return (
    typeof q.id === "string" &&
    q.id.length > 0 &&
    isQuizCategory(q.category) &&
    typeof q.question === "string" &&
    q.question.trim().length > 0 &&
    Array.isArray(q.choices) &&
    q.choices.length === 4 &&
    q.choices.every((c) => typeof c === "string" && c.trim().length > 0) &&
    Number.isInteger(q.answerIndex) &&
    (q.answerIndex as number) >= 0 &&
    (q.answerIndex as number) <= 3 &&
    (q.explanation === undefined || typeof q.explanation === "string")
  );
}

export function shuffleArray<T>(items: readonly T[], rand: () => number = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function toRoundQuestion(
  question: QuizQuestion,
  rand: () => number = Math.random,
): QuizRoundQuestion {
  const order = shuffleArray([0, 1, 2, 3], rand);
  const shuffled = order.map((index) => question.choices[index]) as [
    string,
    string,
    string,
    string,
  ];
  return {
    question,
    shuffledChoices: shuffled,
    correctShuffledIndex: order.indexOf(question.answerIndex),
  };
}

export function pickQuizQuestions(
  pool: readonly QuizQuestion[],
  mode: QuizMode,
  count: number = QUIZ_QUESTIONS_PER_GAME,
  rand: () => number = Math.random,
  recentIds: readonly string[] = [],
): QuizQuestion[] {
  const filtered =
    mode === "aleatoire" ? [...pool] : pool.filter((q) => q.category === mode);
  if (filtered.length === 0) return [];
  const recent = new Set(recentIds);
  const fresh = filtered.filter((q) => !recent.has(q.id));
  // Préfère les questions non vues récemment, complète avec les autres si besoin.
  const ordered = [...shuffleArray(fresh, rand), ...shuffleArray(filtered.filter((q) => recent.has(q.id)), rand)];
  return ordered.slice(0, Math.min(count, filtered.length));
}

export function createQuizGame(
  pool: readonly QuizQuestion[],
  mode: QuizMode,
  rand: () => number = Math.random,
  recentIds: readonly string[] = [],
  count: number = QUIZ_QUESTIONS_PER_GAME,
): QuizState | null {
  const picked = pickQuizQuestions(pool, mode, count, rand, recentIds);
  if (picked.length === 0) return null;
  return {
    version: QUIZ_VERSION,
    mode,
    questions: picked.map((q) => toRoundQuestion(q, rand)),
    currentIndex: 0,
    selected: null,
    answers: [],
    isFinished: false,
  };
}

export function selectQuizAnswer(current: QuizState, choiceIndex: number): QuizState {
  if (current.isFinished || current.selected !== null) return current;
  if (!Number.isInteger(choiceIndex) || choiceIndex < 0 || choiceIndex > 3) return current;
  const answers = [...current.answers];
  answers[current.currentIndex] = choiceIndex;
  return { ...current, selected: choiceIndex, answers };
}

export function nextQuizQuestion(current: QuizState): QuizState {
  if (current.isFinished || current.selected === null) return current;
  const isLast = current.currentIndex >= current.questions.length - 1;
  if (isLast) return { ...current, isFinished: true };
  return { ...current, currentIndex: current.currentIndex + 1, selected: null };
}

export function scoreQuizGame(current: QuizState): number {
  return current.questions.reduce(
    (score, round, index) => score + (current.answers[index] === round.correctShuffledIndex ? 1 : 0),
    0,
  );
}

export function isStoredQuizGame(value: unknown): value is QuizState {
  if (!value || typeof value !== "object") return false;
  const game = value as Partial<QuizState>;
  if (game.version !== QUIZ_VERSION || !isQuizMode(game.mode)) return false;
  if (!Array.isArray(game.questions) || game.questions.length === 0) return false;
  if (
    !game.questions.every(
      (round) =>
        !!round &&
        typeof round === "object" &&
        isQuizQuestion((round as QuizRoundQuestion).question) &&
        Array.isArray((round as QuizRoundQuestion).shuffledChoices) &&
        (round as QuizRoundQuestion).shuffledChoices.length === 4 &&
        Number.isInteger((round as QuizRoundQuestion).correctShuffledIndex),
    )
  )
    return false;
  if (
    typeof game.currentIndex !== "number" ||
    !Number.isInteger(game.currentIndex) ||
    game.currentIndex < 0 ||
    game.currentIndex >= game.questions.length
  )
    return false;
  if (game.selected !== null && (typeof game.selected !== "number" || game.selected < 0 || game.selected > 3))
    return false;
  if (!Array.isArray(game.answers)) return false;
  if (
    !game.answers.every(
      (answer) => Number.isInteger(answer) && (answer as number) >= 0 && (answer as number) <= 3,
    ) ||
    game.answers.length > game.questions.length
  )
    return false;
  const rounds = game.questions as QuizRoundQuestion[];
  if (
    !rounds.every(
      (round) =>
        Number.isInteger(round.correctShuffledIndex) &&
        round.correctShuffledIndex >= 0 &&
        round.correctShuffledIndex <= 3 &&
        round.shuffledChoices.every((choice) => typeof choice === "string" && choice.trim().length > 0),
    )
  )
    return false;
  return typeof game.isFinished === "boolean";
}
