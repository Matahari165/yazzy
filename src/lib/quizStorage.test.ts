import { describe, expect, it, vi, afterEach } from "vitest";
import { readStoredQuiz, removeStoredQuiz, writeStoredQuiz } from "./quizStorage";
import { createQuizGame } from "../domain/quiz";
import { QUIZ_QUESTIONS_FR } from "../data/quizQuestions.fr";

function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => [...store.keys()][index] ?? null,
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  } as Storage;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("quizStorage", () => {
  it("lit vide sans crash côté serveur", () => {
    expect(readStoredQuiz()).toEqual({ game: null, recentIds: [] });
  });

  it("persiste une partie non terminée et les vus récents", () => {
    const storage = createMemoryStorage();
    vi.stubGlobal("window", { localStorage: storage });
    const game = createQuizGame(QUIZ_QUESTIONS_FR, "science", () => 0.5, [], 3);
    if (!game) throw new Error("no game");
    expect(writeStoredQuiz({ game, recentIds: ["sci-01", "hist-01"] })).toBe(true);
    const stored = readStoredQuiz();
    expect(stored.game?.mode).toBe("science");
    expect(stored.recentIds).toEqual(["sci-01", "hist-01"]);
    expect(removeStoredQuiz()).toBe(true);
    expect(readStoredQuiz().game).toBeNull();
  });

  it("ignore une partie terminée", () => {
    const storage = createMemoryStorage();
    vi.stubGlobal("window", { localStorage: storage });
    const game = createQuizGame(QUIZ_QUESTIONS_FR, "art", () => 0.1, [], 1);
    if (!game) throw new Error("no game");
    const finished = { ...game, isFinished: true };
    writeStoredQuiz({ game: finished, recentIds: [] });
    expect(readStoredQuiz().game).toBeNull();
  });
});
