import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_PERMANENT_ROOM_CODE,
  PERMANENT_ROOM_STORAGE_KEY,
  readPermanentRoomCode,
  writePermanentRoomCode,
} from "./permanentRoomStorage";

function createMemoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear() {
      values.clear();
    },
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(values.keys())[index] ?? null;
    },
    removeItem(key: string) {
      values.delete(key);
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("permanentRoomStorage", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {
      localStorage: createMemoryStorage(),
    });
  });

  it("retourne le code par défaut quand le stockage est vide", () => {
    expect(readPermanentRoomCode()).toBe(DEFAULT_PERMANENT_ROOM_CODE);
  });

  it("mémorise et lit un code de salon valide", () => {
    const saved = writePermanentRoomCode("ABC234");
    expect(saved).toBe("ABC234");
    expect(readPermanentRoomCode()).toBe("ABC234");
  });

  it("nettoie une valeur corrompue et revient au défaut", () => {
    window.localStorage.setItem(PERMANENT_ROOM_STORAGE_KEY, "invalide!!!");
    expect(readPermanentRoomCode()).toBe(DEFAULT_PERMANENT_ROOM_CODE);
    expect(window.localStorage.getItem(PERMANENT_ROOM_STORAGE_KEY)).toBeNull();
  });

  it("ignore l'écriture d'un code invalide", () => {
    writePermanentRoomCode("ABC234");
    const result = writePermanentRoomCode("code_trop_long_ou_invalide");
    expect(result).toBe("ABC234");
    expect(readPermanentRoomCode()).toBe("ABC234");
  });
});
