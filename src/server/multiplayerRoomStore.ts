import { getCache } from "@vercel/functions";
import { isMultiplayerGameState } from "@/domain/multiplayer";
import type { MultiplayerRole } from "@/domain/multiplayer";
import {
  isPlayerToken,
  isRoomActionEvent,
  isRoomReaction,
  type RoomReaction,
} from "@/domain/multiplayerRoomProtocol";
import {
  MAX_ROOM_ACTION_EVENTS,
  PRESENCE_TTL_SECONDS,
  REACTION_TTL_SECONDS,
  ROOM_TTL_SECONDS,
  type MultiplayerRoomStore,
  type StoredRoom,
} from "./multiplayerRoomService";

const cache = getCache({ namespace: "yazzy-rooms-v3" });

type LocalRoomState = {
  rooms: Map<string, StoredRoom>;
  presence: Map<string, number>;
  reactions: Map<string, RoomReaction>;
};

const globalRoomState = globalThis as typeof globalThis & {
  __yazzyLocalRoomsV3?: LocalRoomState;
};

const localState = globalRoomState.__yazzyLocalRoomsV3 ??= {
  rooms: new Map(),
  presence: new Map(),
  reactions: new Map(),
};

function isVercelRuntime(): boolean {
  return process.env.VERCEL === "1";
}

function roomKey(roomId: string): string {
  return `room:${roomId}`;
}

function presenceKey(roomId: string, role: MultiplayerRole): string {
  return `presence:${roomId}:${role}`;
}

function reactionKey(roomId: string): string {
  return `reaction:${roomId}`;
}

function normalizeStoredRoom(value: unknown): StoredRoom | null {
  if (!value || typeof value !== "object") return null;
  const room = value as Partial<StoredRoom>;
  const actionEvents = room.actionEvents ?? [];
  const actionEventFloorVersion = room.actionEventFloorVersion ?? -1;
  if (
    !isMultiplayerGameState(room.game) ||
    !isPlayerToken(room.hostToken) ||
    (room.guestToken !== null && !isPlayerToken(room.guestToken)) ||
    (room.guestTokenLocked !== undefined && typeof room.guestTokenLocked !== "boolean") ||
    !Number.isInteger(room.version) ||
    room.version! < 0 ||
    !room.lastActionIds ||
    typeof room.lastActionIds !== "object" ||
    !Object.entries(room.lastActionIds).every(
      ([role, actionId]) =>
        (role === "player1" || role === "player2") && isPlayerToken(actionId),
    ) ||
    !Array.isArray(actionEvents) ||
    !Number.isInteger(actionEventFloorVersion) ||
    actionEventFloorVersion < -1 ||
    actionEventFloorVersion > room.version! ||
    actionEvents.length > MAX_ROOM_ACTION_EVENTS ||
    !actionEvents.every(
      (event, index) =>
        isRoomActionEvent(event) &&
        event.version <= room.version! &&
        event.game.roomId === room.game!.roomId &&
        (index === 0 || actionEvents[index - 1].version < event.version),
    ) ||
    (actionEvents.length > 0 && actionEventFloorVersion >= actionEvents[0].version)
  ) {
    return null;
  }

  return {
    game: room.game,
    hostToken: room.hostToken,
    guestToken: room.guestToken,
    guestTokenLocked: room.guestTokenLocked ?? false,
    version: room.version!,
    lastActionIds: room.lastActionIds,
    actionEvents,
    actionEventFloorVersion,
  };
}

export const multiplayerRoomStore: MultiplayerRoomStore = {
  async getRoom(roomId) {
    const value = isVercelRuntime()
      ? await cache.get(roomKey(roomId))
      : localState.rooms.get(roomId);
    const room = normalizeStoredRoom(value);
    return room?.game.roomId === roomId ? room : null;
  },

  async setRoom(roomId, room) {
    if (!isVercelRuntime()) {
      localState.rooms.set(roomId, structuredClone(room));
      return;
    }
    await cache.set(roomKey(roomId), room, {
      ttl: ROOM_TTL_SECONDS,
      tags: [`room-${roomId}`],
      name: "Yazzy private room",
    });
  },

  async getPresence(roomId, role) {
    if (!isVercelRuntime()) return localState.presence.get(presenceKey(roomId, role)) ?? null;
    const value = await cache.get(presenceKey(roomId, role));
    return typeof value === "number" && Number.isFinite(value) ? value : null;
  },

  async setPresence(roomId, role, timestamp) {
    if (!isVercelRuntime()) {
      localState.presence.set(presenceKey(roomId, role), timestamp);
      return;
    }
    await cache.set(presenceKey(roomId, role), timestamp, {
      ttl: PRESENCE_TTL_SECONDS,
      tags: [`room-${roomId}`],
      name: "Yazzy player presence",
    });
  },

  async getReaction(roomId) {
    if (!isVercelRuntime()) return localState.reactions.get(reactionKey(roomId)) ?? null;
    const value = await cache.get(reactionKey(roomId));
    return isRoomReaction(value) ? value : null;
  },

  async setReaction(roomId, reaction) {
    if (!isVercelRuntime()) {
      localState.reactions.set(reactionKey(roomId), structuredClone(reaction));
      return;
    }
    await cache.set(reactionKey(roomId), reaction, {
      ttl: REACTION_TTL_SECONDS,
      tags: [`room-${roomId}`],
      name: "Yazzy live reaction",
    });
  },
};
