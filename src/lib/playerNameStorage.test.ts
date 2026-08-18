import { afterEach, describe, expect, it, vi } from "vitest";
import { PLAYER_NAME_STORAGE_KEY } from "../domain/playerName";
import { readStoredPlayerName, writeStoredPlayerName } from "./playerNameStorage";

function createMemoryStorage(initial: Record<string, string> = {}): Storage {
  const values = new Map(Object.entries(initial));
  return {
    get length() { return values.size; },
    clear() { values.clear(); },
    getItem(key) { return values.get(key) ?? null; },
    key(index) { return Array.from(values.keys())[index] ?? null; },
    removeItem(key) { values.delete(key); },
    setItem(key, value) { values.set(key, value); },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("stockage du pseudo multijoueur", () => {
  it("relit le pseudo local existant", () => {
    let cookie = "";
    vi.stubGlobal("window", {
      localStorage: createMemoryStorage({ [PLAYER_NAME_STORAGE_KEY]: "Alice" }),
      location: { protocol: "https:" },
    });
    vi.stubGlobal("document", {
      get cookie() { return cookie; },
      set cookie(value: string) { cookie = value; },
    });

    expect(readStoredPlayerName()).toBe("Alice");
    expect(cookie).toContain("yazzy.playerName=Alice");
  });

  it("restaure le pseudo depuis le cookie si le stockage local a été vidé", () => {
    const localStorage = createMemoryStorage();
    vi.stubGlobal("window", { localStorage, location: { protocol: "https:" } });
    vi.stubGlobal("document", { cookie: "yazzy.playerName=Alice%20Martin" });

    expect(readStoredPlayerName()).toBe("Alice Martin");
    expect(localStorage.getItem(PLAYER_NAME_STORAGE_KEY)).toBe("Alice Martin");
  });

  it("continue avec le cookie si le stockage local est indisponible", () => {
    let cookie = "";
    vi.stubGlobal("window", {
      localStorage: {
        getItem() { throw new Error("blocked"); },
        setItem() { throw new Error("blocked"); },
      },
      location: { protocol: "https:" },
    });
    vi.stubGlobal("document", {
      get cookie() { return cookie; },
      set cookie(value: string) { cookie = value; },
    });

    expect(writeStoredPlayerName("  Bob  ")).toBe("Bob");
    expect(cookie).toContain("yazzy.playerName=Bob");
    expect(cookie).toContain("SameSite=Lax; Secure");
  });
});
