import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  acceptGuestPlayerPairing,
  createHostPlayerPairing,
  PLAYER_PAIRING_STORAGE_KEY,
  readStoredPlayerPairing,
  removeStoredPlayerPairing,
  updatePlayerPairingPartnerName,
} from "./playerPairingStorage";

function createMemoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    clear() { values.clear(); },
    getItem(key) { return values.get(key) ?? null; },
    key(index) { return Array.from(values.keys())[index] ?? null; },
    removeItem(key) { values.delete(key); },
    setItem(key, value) { values.set(key, value); },
  };
}

afterEach(() => vi.unstubAllGlobals());

describe("playerPairingStorage", () => {
  beforeEach(() => {
    vi.stubGlobal("window", { localStorage: createMemoryStorage() });
    vi.stubGlobal("crypto", { randomUUID: vi.fn()
      .mockReturnValueOnce("11111111-1111-4111-8111-111111111111")
      .mockReturnValueOnce("22222222-2222-4222-8222-222222222222") });
  });

  it("creates and reads a protected host pairing", () => {
    const pairing = createHostPlayerPairing("ABC234");
    expect(pairing).toMatchObject({ roomId: "ABC234", role: "player1", partnerName: "" });
    expect(readStoredPlayerPairing()).toEqual(pairing);
  });

  it("accepts the invited guest token and remembers the partner name", () => {
    const token = "33333333-3333-4333-8333-333333333333";
    expect(acceptGuestPlayerPairing("DEF567", token)).toMatchObject({
      roomId: "DEF567",
      role: "player2",
      localToken: token,
    });
    expect(updatePlayerPairingPartnerName(" Alice ")?.partnerName).toBe("Alice");
  });

  it("rejects invalid stored data and can remove a pairing", () => {
    window.localStorage.setItem(PLAYER_PAIRING_STORAGE_KEY, "{}");
    expect(readStoredPlayerPairing()).toBeNull();
    expect(window.localStorage.getItem(PLAYER_PAIRING_STORAGE_KEY)).toBeNull();

    acceptGuestPlayerPairing("DEF567", "33333333-3333-4333-8333-333333333333");
    removeStoredPlayerPairing();
    expect(readStoredPlayerPairing()).toBeNull();
  });
});
