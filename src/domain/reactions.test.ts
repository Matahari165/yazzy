import { describe, expect, it } from "vitest";
import {
  isReactionText,
  REACTION_TEXT_MAX_LENGTH,
  STRIP_EMOJI,
  STRIP_PHRASE,
} from "./reactions";
import { isMaxComboScore } from "./yatzy";
import {
  isRoomReaction,
  parseRoomCommand,
} from "./multiplayerRoomProtocol";

const TOKEN = "12345678-1234-4123-8123-123456789012";
const REACTION_ID = "55555555-5555-4555-8555-555555555555";

describe("isReactionText", () => {
  it("accepte une phrase courte sans caractères de contrôle", () => {
    expect(isReactionText(STRIP_PHRASE)).toBe(true);
  });

  it("refuse les textes vides, trop longs ou avec contrôles", () => {
    expect(isReactionText("")).toBe(false);
    expect(isReactionText("x".repeat(REACTION_TEXT_MAX_LENGTH + 1))).toBe(false);
    expect(isReactionText("coucou\ntoi")).toBe(false);
    expect(isReactionText(42)).toBe(false);
  });
});

describe("commande REACTION avec texte", () => {
  it("accepte un texte optionnel et le transmet", () => {
    expect(
      parseRoomCommand({
        type: "REACTION",
        role: "player1",
        token: TOKEN,
        reactionId: REACTION_ID,
        emoji: STRIP_EMOJI,
        text: STRIP_PHRASE,
      }),
    ).toMatchObject({ type: "REACTION", emoji: STRIP_EMOJI, text: STRIP_PHRASE });
  });

  it("accepte l'absence de texte et refuse un texte trop long", () => {
    expect(
      parseRoomCommand({
        type: "REACTION",
        role: "player1",
        token: TOKEN,
        reactionId: REACTION_ID,
        emoji: STRIP_EMOJI,
      }),
    ).toMatchObject({ type: "REACTION", text: undefined });
    expect(
      parseRoomCommand({
        type: "REACTION",
        role: "player1",
        token: TOKEN,
        reactionId: REACTION_ID,
        emoji: STRIP_EMOJI,
        text: "x".repeat(REACTION_TEXT_MAX_LENGTH + 1),
      }),
    ).toBeNull();
  });

  it("valide les réactions avec texte, sans texte et historiques", () => {
    const base = { id: REACTION_ID, role: "player1", emoji: STRIP_EMOJI, sentAt: 1_000 };
    expect(isRoomReaction({ ...base, text: STRIP_PHRASE })).toBe(true);
    expect(isRoomReaction({ ...base, text: null })).toBe(true);
    expect(isRoomReaction(base)).toBe(true);
    expect(isRoomReaction({ ...base, text: "x".repeat(REACTION_TEXT_MAX_LENGTH + 1) })).toBe(false);
  });
});

describe("isMaxComboScore", () => {
  it("vrai uniquement pour une combinaison à son maximum", () => {
    expect(isMaxComboScore("yatzy", 50)).toBe(true);
    expect(isMaxComboScore("largeStraight", 20)).toBe(true);
    expect(isMaxComboScore("smallStraight", 15)).toBe(true);
    expect(isMaxComboScore("fullHouse", 28)).toBe(true);
    // Combinaison remplie mais pas au max : pas de célébration.
    expect(isMaxComboScore("yatzy", 0)).toBe(false);
    expect(isMaxComboScore("fullHouse", 25)).toBe(false);
    // Chiffres de base exclus même au maximum.
    expect(isMaxComboScore("sixes", 30)).toBe(false);
    expect(isMaxComboScore("ones", 5)).toBe(false);
  });
});
