import { describe, expect, it } from "vitest";
import { parseRoomCommand } from "../domain/multiplayerRoomProtocol";
import {
  handleRoomCommand,
  type MultiplayerRoomStore,
  type StoredRoom,
} from "./multiplayerRoomService";
import type { MultiplayerRole } from "../domain/multiplayer";
import type { RoomReaction } from "../domain/multiplayerRoomProtocol";
import type { DieValue } from "../domain/yatzy";

const HOST_TOKEN = "11111111-1111-4111-8111-111111111111";
const GUEST_TOKEN = "22222222-2222-4222-8222-222222222222";
const OTHER_TOKEN = "33333333-3333-4333-8333-333333333333";
const ACTION_ID = "44444444-4444-4444-8444-444444444444";
const REACTION_ID = "55555555-5555-4555-8555-555555555555";
const HOLD_ACTION_ID = "66666666-6666-4666-8666-666666666666";
const SECOND_ROLL_ACTION_ID = "77777777-7777-4777-8777-777777777777";
const SCORE_ACTION_ID = "88888888-8888-4888-8888-888888888888";

class MemoryRoomStore implements MultiplayerRoomStore {
  room: StoredRoom | null = null;
  presence = new Map<MultiplayerRole, number>();
  reaction: RoomReaction | null = null;

  async getRoom() {
    return this.room;
  }

  async setRoom(_roomId: string, room: StoredRoom) {
    this.room = structuredClone(room);
  }

  async getPresence(_roomId: string, role: MultiplayerRole) {
    return this.presence.get(role) ?? null;
  }

  async setPresence(_roomId: string, role: MultiplayerRole, timestamp: number) {
    this.presence.set(role, timestamp);
  }

  async getReaction() {
    return this.reaction;
  }

  async setReaction(_roomId: string, reaction: RoomReaction) {
    this.reaction = structuredClone(reaction);
  }
}

class ConcurrentReadRoomStore extends MemoryRoomStore {
  activeOperations = 0;
  peakOperations = 0;

  private async track<T>(operation: () => Promise<T>): Promise<T> {
    this.activeOperations += 1;
    this.peakOperations = Math.max(this.peakOperations, this.activeOperations);
    await new Promise((resolve) => setTimeout(resolve, 5));
    try {
      return await operation();
    } finally {
      this.activeOperations -= 1;
    }
  }

  override getPresence(roomId: string, role: MultiplayerRole) {
    return this.track(() => super.getPresence(roomId, role));
  }

  override setPresence(roomId: string, role: MultiplayerRole, timestamp: number) {
    return this.track(() => super.setPresence(roomId, role, timestamp));
  }

  override getReaction() {
    return this.track(() => super.getReaction());
  }
}

async function command(
  store: MemoryRoomStore,
  body: Parameters<typeof handleRoomCommand>[0]["command"],
  now: number,
  die: DieValue = 6,
) {
  return handleRoomCommand({
    roomId: "AMIS12",
    command: body,
    store,
    now,
    rollDie: () => die,
    pickStartingPlayer: () => "player1",
  });
}

describe("service de salon privé", () => {
  it("regroupe les accès indépendants nécessaires à une réponse", async () => {
    const store = new ConcurrentReadRoomStore();

    await command(store, {
      type: "CONNECT",
      role: "player1",
      token: HOST_TOKEN,
      playerName: "Alice",
    }, 1_000);

    expect(store.peakOperations).toBe(3);
  });

  it("permet à un nouvel invité de rejoindre après la déconnexion de l’ancien", async () => {
    const store = new MemoryRoomStore();
    await command(store, { type: "CONNECT", role: "player1", token: HOST_TOKEN, playerName: "Alice" }, 1_000);
    await command(store, { type: "CONNECT", role: "player2", token: GUEST_TOKEN, playerName: "Bob" }, 1_001);

    const replacement = await command(store, {
      type: "CONNECT",
      role: "player2",
      token: OTHER_TOKEN,
      playerName: "Charlie",
    }, 20_000);

    expect(replacement.body).toMatchObject({ ok: true, yourRole: "player2" });
    expect(store.room?.guestToken).toBe(OTHER_TOKEN);
  });

  it("synchronise une action du serveur entre les deux joueurs", async () => {
    const store = new MemoryRoomStore();
    await command(store, { type: "CONNECT", role: "player1", token: HOST_TOKEN, playerName: "Alice" }, 1_000);
    await command(store, { type: "CONNECT", role: "player2", token: GUEST_TOKEN, playerName: "Bob" }, 1_001);
    const action = await command(store, {
      type: "ACTION",
      role: "player1",
      token: HOST_TOKEN,
      actionId: ACTION_ID,
      action: { type: "ROLL" },
    }, 1_002);
    const guestSync = await command(store, {
      type: "SYNC",
      role: "player2",
      token: GUEST_TOKEN,
      playerName: "Bob",
      afterVersion: 1,
    }, 1_003);

    expect(action.status).toBe(200);
    expect(guestSync.status).toBe(200);
    if (guestSync.body.ok) {
      expect(guestSync.body.game.player1?.state.dice).toEqual([6, 6, 6, 6, 6]);
      expect(guestSync.body.version).toBe(2);
    }
  });

  it("restitue dans l’ordre chaque étape manquée entre deux synchronisations", async () => {
    const store = new MemoryRoomStore();
    await command(store, { type: "CONNECT", role: "player1", token: HOST_TOKEN, playerName: "Alice" }, 1_000);
    await command(store, { type: "CONNECT", role: "player2", token: GUEST_TOKEN, playerName: "Bob" }, 1_001);
    const baseline = await command(store, {
      type: "SYNC",
      role: "player2",
      token: GUEST_TOKEN,
      playerName: "Bob",
      afterVersion: -1,
    }, 1_002);

    expect(baseline.body).toMatchObject({ ok: true, version: 1, events: [] });

    await command(store, {
      type: "ACTION",
      role: "player1",
      token: HOST_TOKEN,
      actionId: ACTION_ID,
      action: { type: "ROLL" },
    }, 1_003, 6);
    await command(store, {
      type: "ACTION",
      role: "player1",
      token: HOST_TOKEN,
      actionId: HOLD_ACTION_ID,
      action: { type: "HOLD", index: 0 },
    }, 1_004);
    await command(store, {
      type: "ACTION",
      role: "player1",
      token: HOST_TOKEN,
      actionId: SECOND_ROLL_ACTION_ID,
      action: { type: "ROLL" },
    }, 1_005, 5);
    await command(store, {
      type: "ACTION",
      role: "player1",
      token: HOST_TOKEN,
      actionId: SCORE_ACTION_ID,
      action: { type: "SCORE", category: "ones" },
    }, 1_006);

    const caughtUp = await command(store, {
      type: "SYNC",
      role: "player2",
      token: GUEST_TOKEN,
      playerName: "Bob",
      afterVersion: 1,
    }, 1_007);

    expect(caughtUp.status).toBe(200);
    if (caughtUp.body.ok) {
      expect(caughtUp.body.events.map((event) => event.action.type)).toEqual([
        "ROLL",
        "HOLD",
        "ROLL",
        "SCORE",
      ]);
      expect(caughtUp.body.events.map((event) => event.role)).toEqual([
        "player1",
        "player1",
        "player1",
        "player1",
      ]);
      expect(caughtUp.body.events.map((event) => event.version)).toEqual([2, 3, 4, 5]);
      expect(caughtUp.body.events[0].game.player1?.state).toMatchObject({
        dice: [6, 6, 6, 6, 6],
        rollNumber: 1,
      });
      expect(caughtUp.body.events[1].game.player1?.state.held).toEqual([
        true,
        false,
        false,
        false,
        false,
      ]);
      expect(caughtUp.body.events[2].game.player1?.state).toMatchObject({
        dice: [6, 5, 5, 5, 5],
        rollNumber: 2,
      });
      expect(caughtUp.body.events[3].game).toMatchObject({
        activePlayer: "player2",
        player1: { state: { dice: [], scores: { ones: 0 } } },
      });
      expect(caughtUp.body.game).toEqual(caughtUp.body.events[3].game);
    }

    const reconnectedHost = await command(store, {
      type: "CONNECT",
      role: "player1",
      token: HOST_TOKEN,
      playerName: "Alice",
    }, 1_008);
    expect(reconnectedHost.body).toMatchObject({ ok: true, version: 5, events: [] });
  });

  it("borne le journal des actions du salon", async () => {
    const store = new MemoryRoomStore();
    await command(store, { type: "CONNECT", role: "player1", token: HOST_TOKEN, playerName: "Alice" }, 1_000);
    await command(store, { type: "CONNECT", role: "player2", token: GUEST_TOKEN, playerName: "Bob" }, 1_001);
    await command(store, {
      type: "ACTION",
      role: "player1",
      token: HOST_TOKEN,
      actionId: ACTION_ID,
      action: { type: "ROLL" },
    }, 1_002);

    for (let index = 0; index < 70; index += 1) {
      await command(store, {
        type: "ACTION",
        role: "player1",
        token: HOST_TOKEN,
        actionId: `99999999-9999-4999-8999-${String(index).padStart(12, "0")}`,
        action: { type: "HOLD", index: 0 },
      }, 1_003 + index);
    }

    expect(store.room?.actionEvents).toHaveLength(64);
    expect(store.room?.actionEvents.at(-1)?.version).toBe(store.room?.version);
    expect(store.room?.actionEvents[0].version).toBe((store.room?.version ?? 0) - 63);
    expect(store.room?.actionEventFloorVersion).toBe((store.room?.version ?? 0) - 64);

    const truncatedSync = await command(store, {
      type: "SYNC",
      role: "player2",
      token: GUEST_TOKEN,
      playerName: "Bob",
      afterVersion: 1,
    }, 1_100);
    expect(truncatedSync.body).toMatchObject({
      ok: true,
      eventsTruncated: true,
      events: store.room?.actionEvents,
    });
  });

  it("refuse un troisième joueur tant que l’invité est actif", async () => {
    const store = new MemoryRoomStore();
    await command(store, { type: "CONNECT", role: "player1", token: HOST_TOKEN, playerName: "Alice" }, 1_000);
    await command(store, { type: "CONNECT", role: "player2", token: GUEST_TOKEN, playerName: "Bob" }, 1_001);
    const thirdPlayer = await command(store, {
      type: "CONNECT",
      role: "player2",
      token: OTHER_TOKEN,
      playerName: "Charlie",
    }, 1_002);

    expect(thirdPlayer.status).toBe(409);
    expect(thirdPlayer.body).toMatchObject({ ok: false, code: "ROOM_FULL" });
  });

  it("autorise une reprise depuis un autre navigateur après une déconnexion", async () => {
    const store = new MemoryRoomStore();
    await command(store, { type: "CONNECT", role: "player1", token: HOST_TOKEN, playerName: "Alice" }, 1_000);
    await command(store, { type: "CONNECT", role: "player2", token: GUEST_TOKEN, playerName: "Bob" }, 1_001);
    const resumed = await command(store, {
      type: "CONNECT",
      role: "player2",
      token: OTHER_TOKEN,
      playerName: "Charlie",
    }, 10_500);

    expect(resumed.status).toBe(200);
    expect(store.room?.guestToken).toBe(OTHER_TOKEN);
    expect(store.room?.game.player2?.state.scores).toEqual({});
  });

  it("n’applique pas deux fois la même action réseau", async () => {
    const store = new MemoryRoomStore();
    await command(store, { type: "CONNECT", role: "player1", token: HOST_TOKEN, playerName: "Alice" }, 1_000);
    await command(store, { type: "CONNECT", role: "player2", token: GUEST_TOKEN, playerName: "Bob" }, 1_001);
    const first = await command(store, {
      type: "ACTION",
      role: "player1",
      token: HOST_TOKEN,
      actionId: ACTION_ID,
      action: { type: "ROLL" },
    }, 1_002, 6);
    const duplicate = await command(store, {
      type: "ACTION",
      role: "player1",
      token: HOST_TOKEN,
      actionId: ACTION_ID,
      action: { type: "ROLL" },
    }, 1_003, 1);

    expect(first.body).toMatchObject({ ok: true, version: 2 });
    expect(duplicate.body).toMatchObject({ ok: true, version: 2 });
    expect(store.room?.game.player1?.state.dice).toEqual([6, 6, 6, 6, 6]);
  });

  it("transmet une réaction live sans modifier la partie", async () => {
    const store = new MemoryRoomStore();
    await command(store, { type: "CONNECT", role: "player1", token: HOST_TOKEN, playerName: "Alice" }, 1_000);
    await command(store, { type: "CONNECT", role: "player2", token: GUEST_TOKEN, playerName: "Bob" }, 1_001);
    const beforeGame = structuredClone(store.room?.game);

    const reaction = await command(store, {
      type: "REACTION",
      role: "player1",
      token: HOST_TOKEN,
      reactionId: REACTION_ID,
      emoji: "😆",
    }, 1_002);
    const guestSync = await command(store, {
      type: "SYNC",
      role: "player2",
      token: GUEST_TOKEN,
      playerName: "Bob",
      afterVersion: 1,
    }, 1_003);
    const expiredSync = await command(store, {
      type: "SYNC",
      role: "player2",
      token: GUEST_TOKEN,
      playerName: "Bob",
      afterVersion: 1,
    }, 6_003);

    expect(reaction.body).toMatchObject({
      ok: true,
      latestReaction: { id: REACTION_ID, role: "player1", emoji: "😆" },
    });
    expect(guestSync.body).toMatchObject({
      ok: true,
      latestReaction: { id: REACTION_ID, role: "player1", emoji: "😆" },
    });
    expect(expiredSync.body).toMatchObject({ ok: true, latestReaction: null });
    expect(store.room?.game).toEqual(beforeGame);
    expect(store.reaction).toMatchObject({ id: REACTION_ID, emoji: "😆" });
  });

  it("attribue automatiquement les rôles lorsque deux joueurs rejoignent un salon permanent", async () => {
    const store = new MemoryRoomStore();

    // Premier arrivé : crée la table et devient player1 (même sans rôle spécifié)
    const firstConnect = await command(store, {
      type: "CONNECT",
      token: HOST_TOKEN,
      playerName: "Alice",
    }, 1_000);

    expect(firstConnect.status).toBe(200);
    expect(firstConnect.body).toMatchObject({
      ok: true,
      yourRole: "player1",
      game: { status: "waiting", roomId: "AMIS12" },
    });
    expect(store.room?.hostToken).toBe(HOST_TOKEN);
    expect(store.room?.guestToken).toBeNull();

    // Deuxième arrivé : rejoint la table et devient player2 automatiquement
    const secondConnect = await command(store, {
      type: "CONNECT",
      token: GUEST_TOKEN,
      playerName: "Bob",
    }, 1_005);

    expect(secondConnect.status).toBe(200);
    expect(secondConnect.body).toMatchObject({
      ok: true,
      yourRole: "player2",
      game: { status: "playing", roomId: "AMIS12" },
    });
    expect(store.room?.guestToken).toBe(GUEST_TOKEN);

    // Reconnexion de chaque joueur avec son jeton : conservation de leurs rôles
    const hostReconnect = await command(store, {
      type: "CONNECT",
      token: HOST_TOKEN,
      playerName: "Alice",
    }, 1_010);
    expect(hostReconnect.body).toMatchObject({ ok: true, yourRole: "player1" });

    const guestReconnect = await command(store, {
      type: "CONNECT",
      token: GUEST_TOKEN,
      playerName: "Bob",
    }, 1_015);
    expect(guestReconnect.body).toMatchObject({ ok: true, yourRole: "player2" });
  });

  it("crée le salon même si le joueur qui arrive en premier avait le rôle player2 dans l'URL", async () => {
    const store = new MemoryRoomStore();

    const connectAsGuestOnEmpty = await command(store, {
      type: "CONNECT",
      role: "player2",
      token: GUEST_TOKEN,
      playerName: "Bob",
    }, 1_000);

    expect(connectAsGuestOnEmpty.status).toBe(200);
    expect(connectAsGuestOnEmpty.body).toMatchObject({
      ok: true,
      yourRole: "player1",
      game: { status: "waiting" },
    });
  });
});

describe("validation des commandes de salon", () => {
  it("refuse les jetons et actions fabriqués", () => {
    expect(parseRoomCommand({
      type: "SYNC",
      role: "player1",
      token: "court",
      playerName: "Alice",
      afterVersion: 0,
    })).toBeNull();
    expect(parseRoomCommand({
      type: "CONNECT",
      role: "player2",
      token: GUEST_TOKEN,
      playerName: "Bob",
      pairedGuestToken: OTHER_TOKEN,
    })).toBeNull();
    expect(parseRoomCommand({
      type: "ACTION",
      role: "player2",
      token: GUEST_TOKEN,
      actionId: ACTION_ID,
      action: { type: "HOLD", index: 9 },
    })).toBeNull();
  });
});
