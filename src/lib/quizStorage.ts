import {
  isStoredQuizGame,
  QUIZ_RECENT_IDS_MAX,
  QUIZ_STORAGE_KEY,
  type QuizState,
} from "../domain/quiz";

export type StoredQuiz = {
  game: QuizState | null;
  recentIds: string[];
};

function emptyStored(): StoredQuiz {
  return { game: null, recentIds: [] };
}

export function removeStoredQuiz(): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.removeItem(QUIZ_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

export function readStoredQuiz(): StoredQuiz {
  if (typeof window === "undefined") return emptyStored();
  try {
    const raw = window.localStorage.getItem(QUIZ_STORAGE_KEY);
    if (!raw) return emptyStored();
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return emptyStored();
    const { game, recentIds } = parsed as Partial<StoredQuiz>;
    return {
      game: game && isStoredQuizGame(game) && !game.isFinished ? game : null,
      recentIds: Array.isArray(recentIds)
        ? recentIds.filter((id): id is string => typeof id === "string").slice(0, QUIZ_RECENT_IDS_MAX)
        : [],
    };
  } catch {
    return emptyStored();
  }
}

export function writeStoredQuiz(value: StoredQuiz): boolean {
  if (typeof window === "undefined") return false;
  try {
    const payload: StoredQuiz = {
      game: value.game && !value.game.isFinished ? value.game : null,
      recentIds: value.recentIds.filter((id) => typeof id === "string").slice(0, QUIZ_RECENT_IDS_MAX),
    };
    window.localStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}
