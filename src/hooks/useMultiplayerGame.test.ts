import { describe, expect, it } from "vitest";
import {
  replayCursorAfterResponse,
  shouldDisplayResponseImmediately,
} from "./useMultiplayerGame";

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
