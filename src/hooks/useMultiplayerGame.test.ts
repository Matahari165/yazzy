import { afterEach, describe, expect, it, vi } from "vitest";
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
  shouldRetryRoomFailure,
} from "./useMultiplayerGame";
import { createMultiplayerPollLoop } from "./multiplayerPollLoop";
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
    expect(multiplayerPollDelay(false, 3)).toBe(6_400);
    expect(multiplayerPollDelay(false, 4)).toBe(12_800);
    expect(multiplayerPollDelay(false, 5)).toBe(25_600);
    expect(multiplayerPollDelay(false, 6)).toBe(MAX_POLL_INTERVAL_MS);
    expect(multiplayerPollDelay(false, 8)).toBe(MAX_POLL_INTERVAL_MS);
  });
});

describe("shouldRetryRoomFailure", () => {
  it("retente une panne temporaire du service mais arrête sur un refus permanent", () => {
    expect(shouldRetryRoomFailure({
      ok: false,
      code: "SERVICE_UNAVAILABLE",
      message: "Réessaie.",
    })).toBe(true);
    expect(shouldRetryRoomFailure({
      ok: false,
      code: "ACCESS_DENIED",
      message: "Place indisponible.",
    })).toBe(false);
    expect(shouldRetryRoomFailure({
      ok: false,
      code: "ROOM_NOT_FOUND",
      message: "Salon expiré.",
    })).toBe(false);
  });
});

describe("createMultiplayerPollLoop", () => {
  afterEach(() => vi.useRealTimers());

  it("fusionne les demandes pendant un SYNC en vol et ne chevauche pas le transport", async () => {
    vi.useFakeTimers();
    const releases: Array<() => void> = [];
    let activeRequests = 0;
    let maximumActiveRequests = 0;
    const fakeFetch = vi.fn((..._request: unknown[]) => new Promise<void>((resolve) => {
      activeRequests += 1;
      maximumActiveRequests = Math.max(maximumActiveRequests, activeRequests);
      releases.push(() => {
        activeRequests -= 1;
        resolve();
      });
    }));
    const loop = createMultiplayerPollLoop({
      poll: async () => {
        await fakeFetch("/api/rooms/AMIS12", { method: "POST" });
        return 1_000;
      },
      getDelay: () => 1_000,
      isOnline: () => true,
      isVisible: () => true,
      jitter: (delay) => delay,
    });

    loop.start(0);
    await vi.advanceTimersByTimeAsync(0);
    expect(fakeFetch).toHaveBeenCalledTimes(1);

    loop.request(0);
    loop.request(120);
    loop.request(120);
    expect(fakeFetch).toHaveBeenCalledTimes(1);

    releases[0]();
    await vi.advanceTimersByTimeAsync(0);
    expect(fakeFetch).toHaveBeenCalledTimes(2);
    expect(maximumActiveRequests).toBe(1);

    loop.stop();
    releases[1]();
    await vi.advanceTimersByTimeAsync(0);
    expect(fakeFetch).toHaveBeenCalledTimes(2);
  });

  it("garde le battement masqué puis synchronise immédiatement au retour", async () => {
    vi.useFakeTimers();
    let visible = true;
    const fakeFetch = vi.fn(async (..._request: unknown[]) => undefined);
    const loop = createMultiplayerPollLoop({
      poll: async () => {
        await fakeFetch("/api/rooms/AMIS12", { method: "POST" });
        return undefined;
      },
      getDelay: () => visible ? 1_000 : 4_000,
      isOnline: () => true,
      isVisible: () => visible,
      jitter: (delay) => delay,
    });

    loop.start();
    await vi.advanceTimersByTimeAsync(1_000);
    expect(fakeFetch).toHaveBeenCalledTimes(1);

    visible = false;
    loop.visibilityChanged(false);
    await vi.advanceTimersByTimeAsync(3_999);
    expect(fakeFetch).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(fakeFetch).toHaveBeenCalledTimes(2);

    visible = true;
    loop.visibilityChanged(true);
    await vi.advanceTimersByTimeAsync(0);
    expect(fakeFetch).toHaveBeenCalledTimes(3);
    loop.stop();
  });

  it("suspend les requêtes hors ligne et reprend immédiatement au retour du réseau", async () => {
    vi.useFakeTimers();
    let online = false;
    const fakeFetch = vi.fn(async (..._request: unknown[]) => undefined);
    const loop = createMultiplayerPollLoop({
      poll: async () => {
        await fakeFetch("/api/rooms/AMIS12", { method: "POST" });
        return undefined;
      },
      getDelay: () => 1_000,
      isOnline: () => online,
      isVisible: () => true,
      jitter: (delay) => delay,
    });

    loop.start(0);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(fakeFetch).not.toHaveBeenCalled();

    online = true;
    loop.online();
    await vi.advanceTimersByTimeAsync(0);
    expect(fakeFetch).toHaveBeenCalledTimes(1);
    loop.stop();
  });

  it("ignore les événements de réveil tant que CONNECT n’a pas réussi", async () => {
    vi.useFakeTimers();
    const fakeFetch = vi.fn(async (..._request: unknown[]) => undefined);
    const loop = createMultiplayerPollLoop({
      poll: async () => {
        await fakeFetch("/api/rooms/AMIS12", { method: "POST" });
        return undefined;
      },
      getDelay: () => 1_000,
      isOnline: () => true,
      isVisible: () => true,
      jitter: (delay) => delay,
    });

    loop.visibilityChanged(true);
    loop.online();
    loop.request(0);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(fakeFetch).not.toHaveBeenCalled();

    loop.start(0);
    await vi.advanceTimersByTimeAsync(0);
    expect(fakeFetch).toHaveBeenCalledTimes(1);
    loop.stop();
  });

  it("arrête le polling après une réponse permanente du salon", async () => {
    vi.useFakeTimers();
    const fakeFetch = vi.fn(async (..._request: unknown[]) => undefined);
    const loop = createMultiplayerPollLoop({
      poll: async () => {
        await fakeFetch("/api/rooms/AMIS12", { method: "POST" });
        return null;
      },
      getDelay: () => 1_000,
      isOnline: () => true,
      isVisible: () => true,
      jitter: (delay) => delay,
    });

    loop.start(0);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(fakeFetch).toHaveBeenCalledTimes(1);
    loop.stop();
  });

  it("ne garde pas de relance rapide si l’onglet se cache pendant le SYNC", async () => {
    vi.useFakeTimers();
    let visible = true;
    let releaseSync!: () => void;
    const fakeFetch = vi.fn((..._request: unknown[]) => new Promise<void>((resolve) => {
      releaseSync = resolve;
    }));
    const loop = createMultiplayerPollLoop({
      poll: async () => {
        await fakeFetch("/api/rooms/AMIS12", { method: "POST" });
        return 120;
      },
      getDelay: () => visible ? 800 : 4_000,
      isOnline: () => true,
      isVisible: () => visible,
      jitter: (delay) => delay,
    });

    loop.start(0);
    await vi.advanceTimersByTimeAsync(0);
    expect(fakeFetch).toHaveBeenCalledTimes(1);

    visible = false;
    loop.visibilityChanged(false);
    releaseSync();
    await vi.advanceTimersByTimeAsync(0);
    expect(fakeFetch).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(3_999);
    expect(fakeFetch).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(fakeFetch).toHaveBeenCalledTimes(2);
    loop.stop();
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
