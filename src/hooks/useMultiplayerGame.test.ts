import { describe, expect, it } from "vitest";
import {
  ACTIVE_TURN_POLL_INTERVAL_MS,
  BACKGROUND_POLL_INTERVAL_MS,
  canonicalGameAfterResponse,
  FOREGROUND_POLL_INTERVAL_MS,
  gameWithPendingHolds,
  MAX_POLL_INTERVAL_MS,
  multiplayerPollDelay,
  OPPONENT_TURN_POLL_INTERVAL_MS,
  replayCursorAfterResponse,
  shouldFollowUpAfterAction,
  shouldReplaceCanonicalGame,
  shouldDisplayResponseImmediately,
} from "./useMultiplayerGame";
import { rollActivePlayer } from "../domain/multiplayer";
import { connectGuest, createHostedGame } from "../domain/multiplayerHost";

describe("replayCursorAfterResponse", () => {
  it("ne saute pas les actions adverses après une réaction", () => {
    const cursorBeforeReaction = 4;
    const cursorAfterReaction = replayCursorAfterResponse(cursorBeforeReaction, 6, "reaction");

    expect(cursorAfterReaction).toBe(4);
    expect(shouldDisplayResponseImmediately(cursorAfterReaction, 6, "reaction")).toBe(false);
    expect(replayCursorAfterResponse(cursorAfterReaction, 7, "sync")).toBe(7);
  });

  it("prend la connexion comme point de départ sans rejouer l’historique", () => {
    expect(replayCursorAfterResponse(-1, 12, "connect")).toBe(12);
  });

  it("laisse une action locale au prochain cycle de synchronisation", () => {
    expect(replayCursorAfterResponse(8, 9, "action")).toBe(8);
  });
});

describe("multiplayerPollDelay", () => {
  it("garde 800 ms au premier plan sans erreur", () => {
    expect(multiplayerPollDelay(false, 0)).toBe(FOREGROUND_POLL_INTERVAL_MS);
  });

  it("observe plus vite le tour adverse et ralentit pendant le tour local", () => {
    expect(multiplayerPollDelay(false, 0, "opponent")).toBe(OPPONENT_TURN_POLL_INTERVAL_MS);
    expect(multiplayerPollDelay(false, 0, "active")).toBe(ACTIVE_TURN_POLL_INTERVAL_MS);
  });

  it("ralentit à 4 s lorsque la page est masquée", () => {
    expect(multiplayerPollDelay(true, 0)).toBe(BACKGROUND_POLL_INTERVAL_MS);
    expect(multiplayerPollDelay(true, 2)).toBe(BACKGROUND_POLL_INTERVAL_MS);
  });

  it("applique un délai progressif plafonné après les erreurs", () => {
    expect(multiplayerPollDelay(false, 1)).toBe(1_600);
    expect(multiplayerPollDelay(false, 2)).toBe(3_200);
    expect(multiplayerPollDelay(false, 3)).toBe(MAX_POLL_INTERVAL_MS);
    expect(multiplayerPollDelay(false, 8)).toBe(MAX_POLL_INTERVAL_MS);
  });
});

describe("gameWithPendingHolds", () => {
  it("projette immédiatement plusieurs clics sans modifier l’état canonique", () => {
    const connected = connectGuest(createHostedGame("AMIS12", "Alice", "player1"), "Bob");
    const canonical = rollActivePlayer(connected, "player1", () => 6);

    const projected = gameWithPendingHolds(canonical, "player1", [
      { index: 0 },
      { index: 2 },
    ]);

    expect(projected?.player1?.state.held).toEqual([true, false, true, false, false]);
    expect(canonical.player1?.state.held).toEqual([false, false, false, false, false]);
  });

  it("respecte un double clic sur le même dé", () => {
    const connected = connectGuest(createHostedGame("AMIS12", "Alice", "player1"), "Bob");
    const canonical = rollActivePlayer(connected, "player1", () => 6);

    const projected = gameWithPendingHolds(canonical, "player1", [
      { index: 1 },
      { index: 1 },
    ]);

    expect(projected?.player1?.state.held[1]).toBe(false);
  });
});

describe("shouldFollowUpAfterAction", () => {
  it("ne re-sonde pas derrière un HOLD : la réponse porte déjà la partie", () => {
    expect(shouldFollowUpAfterAction("HOLD")).toBe(false);
  });

  it("re-sonde vite après ROLL, SCORE et REMATCH", () => {
    expect(shouldFollowUpAfterAction("ROLL")).toBe(true);
    expect(shouldFollowUpAfterAction("SCORE")).toBe(true);
    expect(shouldFollowUpAfterAction("REMATCH")).toBe(true);
  });
});

describe("shouldReplaceCanonicalGame", () => {
  it("conserve la même référence quand la version serveur ne change pas", () => {
    const currentGame = { turn: 4 };
    const duplicateResponseGame = { turn: 4 };

    expect(shouldReplaceCanonicalGame(12, 12)).toBe(false);
    expect(shouldReplaceCanonicalGame(12, 11)).toBe(false);
    expect(shouldReplaceCanonicalGame(12, 13)).toBe(true);
    expect(canonicalGameAfterResponse(currentGame, 12, duplicateResponseGame, 12))
      .toBe(currentGame);
    expect(canonicalGameAfterResponse(currentGame, 12, { turn: 5 }, 13))
      .toEqual({ turn: 5 });
  });
});
