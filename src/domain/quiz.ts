export const QUIZ_VERSION = 3;
export const QUIZ_STORAGE_KEY = "yazzy.quiz.v1";
export const QUIZ_QUESTIONS_PER_GAME = 10;
export const QUIZ_RECENT_IDS_MAX = 1000;
export const QUIZ_TIME_PER_QUESTION_S = 15;
export const QUIZ_SURVIVAL_LIVES = 3;
/** Choix enregistré quand le chrono de 15 s expire sans réponse. */
export const QUIZ_TIMEOUT_CHOICE = -1;

export const QUIZ_CATEGORIES = ["science", "histoire", "art", "pays"] as const;
export type QuizCategory = (typeof QUIZ_CATEGORIES)[number];
export type QuizMode = QuizCategory | "aleatoire";

export type QuizFormat = "classique" | "survie";

export const QUIZ_MODES: QuizMode[] = ["aleatoire", ...QUIZ_CATEGORIES];

export const QUIZ_DIFFICULTIES = ["facile", "moyen", "difficile"] as const;
export type QuizDifficulty = (typeof QUIZ_DIFFICULTIES)[number];
export type QuizDifficultyFilter = QuizDifficulty | "melange";

export const QUIZ_DIFFICULTY_FILTERS: QuizDifficultyFilter[] = [
  "melange",
  ...QUIZ_DIFFICULTIES,
];

export const QUIZ_DIFFICULTY_LABELS: Record<QuizDifficultyFilter, string> = {
  melange: "Mélange",
  facile: "Facile",
  moyen: "Moyen",
  difficile: "Difficile",
};

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

export const QUIZ_FORMAT_LABELS: Record<QuizFormat, string> = {
  classique: "Partie",
  survie: "Survie",
};

export type QuizQuestion = {
  id: string;
  category: QuizCategory;
  /** Difficulté. Optionnelle pour rester compatible avec le pack historique (sans difficulté, jouable dans tous les filtres). */
  difficulty?: QuizDifficulty;
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
  format: QuizFormat;
  difficulty: QuizDifficultyFilter;
  questions: QuizRoundQuestion[];
  currentIndex: number;
  selected: number | null;
  answers: number[];
  /** Vies restantes en survie (3 au départ), 0 en classique. */
  lives: number;
  isFinished: boolean;
};

export function isQuizCategory(value: unknown): value is QuizCategory {
  return typeof value === "string" && (QUIZ_CATEGORIES as readonly string[]).includes(value);
}

export function isQuizMode(value: unknown): value is QuizMode {
  return value === "aleatoire" || isQuizCategory(value);
}

export function isQuizFormat(value: unknown): value is QuizFormat {
  return value === "classique" || value === "survie";
}

export function isQuizDifficulty(value: unknown): value is QuizDifficulty {
  return value === "facile" || value === "moyen" || value === "difficile";
}

export function isQuizDifficultyFilter(value: unknown): value is QuizDifficultyFilter {
  return value === "melange" || isQuizDifficulty(value);
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
    (q.explanation === undefined || typeof q.explanation === "string") &&
    (q.difficulty === undefined || isQuizDifficulty(q.difficulty))
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
  difficulty: QuizDifficultyFilter = "melange",
): QuizQuestion[] {
  const byMode =
    mode === "aleatoire" ? [...pool] : pool.filter((q) => q.category === mode);
  // Les questions historiques sans difficulté restent jouables dans tous les filtres.
  const filtered =
    difficulty === "melange"
      ? byMode
      : byMode.filter((q) => q.difficulty === undefined || q.difficulty === difficulty);
  if (filtered.length === 0) return [];
  const recent = new Set(recentIds);
  const fresh = filtered.filter((q) => !recent.has(q.id));
  // Préfère les questions non vues récemment, complète avec les autres si besoin.
  const ordered = [...shuffleArray(fresh, rand), ...shuffleArray(filtered.filter((q) => recent.has(q.id)), rand)];
  return ordered.slice(0, Math.min(count, filtered.length));
}

export function countQuizQuestions(
  pool: readonly QuizQuestion[],
  mode: QuizMode,
  difficulty: QuizDifficultyFilter = "melange",
): number {
  const byMode =
    mode === "aleatoire" ? pool : pool.filter((q) => q.category === mode);
  if (difficulty === "melange") return byMode.length;
  return byMode.filter((q) => q.difficulty === undefined || q.difficulty === difficulty).length;
}

export function createQuizGame(
  pool: readonly QuizQuestion[],
  mode: QuizMode,
  rand: () => number = Math.random,
  recentIds: readonly string[] = [],
  count: number = QUIZ_QUESTIONS_PER_GAME,
  format: QuizFormat = "classique",
  difficulty: QuizDifficultyFilter = "melange",
): QuizState | null {
  // En survie on enchaîne tout le thème jusqu'à épuisement des vies.
  const effectiveCount = format === "survie" ? Number.MAX_SAFE_INTEGER : count;
  const picked = pickQuizQuestions(pool, mode, effectiveCount, rand, recentIds, difficulty);
  if (picked.length === 0) return null;
  return {
    version: QUIZ_VERSION,
    mode,
    format,
    difficulty,
    questions: picked.map((q) => toRoundQuestion(q, rand)),
    currentIndex: 0,
    selected: null,
    answers: [],
    lives: format === "survie" ? QUIZ_SURVIVAL_LIVES : 0,
    isFinished: false,
  };
}

export function selectQuizAnswer(current: QuizState, choiceIndex: number): QuizState {
  if (current.isFinished || current.selected !== null) return current;
  if (!Number.isInteger(choiceIndex) || choiceIndex < QUIZ_TIMEOUT_CHOICE || choiceIndex > 3)
    return current;
  const round = current.questions[current.currentIndex];
  if (!round) return current;
  const isWrong = choiceIndex !== round.correctShuffledIndex;
  const answers = [...current.answers];
  answers[current.currentIndex] = choiceIndex;
  return {
    ...current,
    selected: choiceIndex,
    answers,
    lives:
      current.format === "survie" && isWrong
        ? Math.max(0, current.lives - 1)
        : current.lives,
  };
}

/** Le chrono de 15 s a expiré : enregistré comme une mauvaise réponse. */
export function timeoutQuizAnswer(current: QuizState): QuizState {
  return selectQuizAnswer(current, QUIZ_TIMEOUT_CHOICE);
}

export function nextQuizQuestion(current: QuizState): QuizState {
  if (current.isFinished || current.selected === null) return current;
  const isLast = current.currentIndex >= current.questions.length - 1;
  const outOfLives = current.format === "survie" && current.lives <= 0;
  if (isLast || outOfLives) return { ...current, isFinished: true };
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
  if (game.version !== QUIZ_VERSION || !isQuizMode(game.mode) || !isQuizFormat(game.format))
    return false;
  if (
    game.difficulty !== undefined &&
    game.difficulty !== null &&
    !isQuizDifficultyFilter(game.difficulty)
  )
    return false;
  if (!Array.isArray(game.questions) || game.questions.length === 0) return false;
  if (
    !game.questions.every(
      (round) =>
        !!round &&
        typeof round === "object" &&
        isQuizQuestion((round as QuizRoundQuestion).question) &&
        Array.isArray((round as QuizRoundQuestion).shuffledChoices) &&
        (round as QuizRoundQuestion).shuffledChoices.length === 4 &&
        (round as QuizRoundQuestion).shuffledChoices.every(
          (choice) => typeof choice === "string" && choice.trim().length > 0,
        ) &&
        Number.isInteger((round as QuizRoundQuestion).correctShuffledIndex) &&
        (round as QuizRoundQuestion).correctShuffledIndex >= 0 &&
        (round as QuizRoundQuestion).correctShuffledIndex <= 3,
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
  if (
    game.selected !== null &&
    (typeof game.selected !== "number" ||
      !Number.isInteger(game.selected) ||
      game.selected < QUIZ_TIMEOUT_CHOICE ||
      game.selected > 3)
  )
    return false;
  if (
    !Array.isArray(game.answers) ||
    game.answers.length > game.questions.length ||
    !game.answers.every(
      (answer) =>
        Number.isInteger(answer) && (answer as number) >= QUIZ_TIMEOUT_CHOICE && (answer as number) <= 3,
    )
  )
    return false;
  if (typeof game.lives !== "number" || !Number.isInteger(game.lives) || game.lives < 0) return false;
  if (game.format === "classique" && game.lives !== 0) return false;
  if (game.format === "survie" && game.lives > QUIZ_SURVIVAL_LIVES) return false;
  return typeof game.isFinished === "boolean";
}
