import { getCache } from "@vercel/functions";
import { isMultiplayerGameState } from "@/domain/multiplayer";
import type { MultiplayerRole } from "@/domain/multiplayer";
import { isPlayerToken } from "@/domain/multiplayerRoomProtocol";
import {
  PRESENCE_TTL_SECONDS,
  ROOM_TTL_SECONDS,
  type MultiplayerRoomStore,
  type StoredRoom,
} from "./multiplayerRoomService";

const cache = getCache({ namespace: "yazzy-rooms-v2" });

type LocalRoomState = {
  rooms: Map<string, StoredRoom>;
  presence: Map<string, number>;
};

const globalRoomState = globalThis as typeof globalThis & {
  __yazzyLocalRooms?: LocalRoomState;
};

const localState = globalRoomState.__yazzyLocalRooms ??= {
  rooms: new Map(),
  presence: new Map(),
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

function isStoredRoom(value: unknown): value is StoredRoom {
  if (!value || typeof value !== "object") return false;
  const room = value as Partial<StoredRoom>;
  return Boolean(
    isMultiplayerGameState(room.game) &&
      isPlayerToken(room.hostToken) &&
      (room.guestToken === null || isPlayerToken(room.guestToken)) &&
      Number.isInteger(room.version) &&
      room.version! >= 0 &&
      room.lastActionIds &&
      typeof room.lastActionIds === "object" &&
      Object.entries(room.lastActionIds).every(
        ([role, actionId]) =>
          (role === "player1" || role === "player2") && isPlayerToken(actionId),
      ),
  );
}

export const multiplayerRoomStore: MultiplayerRoomStore = {
  async getRoom(roomId) {
    if (!isVercelRuntime()) return localState.rooms.get(roomId) ?? null;
    const value = await cache.get(roomKey(roomId));
    return isStoredRoom(value) && value.game.roomId === roomId ? value : null;
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
};
