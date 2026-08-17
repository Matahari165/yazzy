import { describe, expect, it } from "vitest";
import {
  generateRoomCode,
  isRoomCode,
  normalizeRoomCode,
  ROOM_CODE_LENGTH,
} from "./roomCode";

describe("codes de partie", () => {
  it("génère un code court sans caractère ambigu", () => {
    const code = generateRoomCode((values) => {
      values.set([0, 1, 7, 8, 15, 31]);
      return values;
    });

    expect(code).toHaveLength(ROOM_CODE_LENGTH);
    expect(code).toBe("239AHZ");
    expect(isRoomCode(code)).toBe(true);
  });

  it("normalise la saisie avant de la valider", () => {
    expect(normalizeRoomCode(" ab-cd 23 ")).toBe("ABCD23");
    expect(isRoomCode("ABCD23")).toBe(true);
  });

  it("refuse un code incomplet ou contenant 0, 1, I ou O", () => {
    expect(isRoomCode("ABC23")).toBe(false);
    expect(isRoomCode("ABCI23")).toBe(false);
    expect(isRoomCode("ABC012")).toBe(false);
  });
});
