import type { MultiplayerGameState, MultiplayerRole } from "../domain/multiplayer";
import {
  applyPlayerAction,
  connectGuest,
  createHostedGame,
} from "../domain/multiplayerHost";
import type {
  RoomCommand,
  RoomActionEvent,
  RoomErrorCode,
  RoomFailure,
  RoomReaction,
  RoomSuccess,
} from "../domain/multiplayerRoomProtocol";
import type { DieValue } from "../domain/yatzy";

export const ROOM_TTL_SECONDS = 6 * 60 * 60;
export const PRESENCE_TTL_SECONDS = 20;
export const REACTION_TTL_SECONDS = 10;
export const MAX_ROOM_ACTION_EVENTS = 64;
const ONLINE_WINDOW_MS = 8_000;
const REACTION_WINDOW_MS = 5_000;

export type StoredRoom = {
  game: MultiplayerGameState;
  hostToken: string;
  guestToken: string | null;
  version: number;
  lastActionIds: Partial<Record<MultiplayerRole, string>>;
  actionEvents: RoomActionEvent[];
  actionEventFloorVersion: number;
};

export type MultiplayerRoomStore = {
  getRoom(roomId: string): Promise<StoredRoom | null>;
  setRoom(roomId: string, room: StoredRoom): Promise<void>;
  getPresence(roomId: string, role: MultiplayerRole): Promise<number | null>;
  setPresence(roomId: string, role: MultiplayerRole, timestamp: number): Promise<void>;
  getReaction(roomId: string): Promise<RoomReaction | null>;
  setReaction(roomId: string, reaction: RoomReaction): Promise<void>;
};

export type RoomServiceResult =
  | { status: 200; body: RoomSuccess }
  | { status: 400 | 403 | 404 | 409; body: RoomFailure };

function failure(
  status: 400 | 403 | 404 | 409,
  code: RoomErrorCode,
  message: string,
): RoomServiceResult {
  return { status, body: { ok: false, code, message } };
}

function tokenFor(room: StoredRoom, role: MultiplayerRole): string | null {
  return role === "player1" ? room.hostToken : room.guestToken;
}

async function presenceStatus(
  store: MultiplayerRoomStore,
  roomId: string,
  role: MultiplayerRole,
  now: number,
): Promise<boolean> {
  const opponentRole = role === "player1" ? "player2" : "player1";
  const lastSeen = await store.getPresence(roomId, opponentRole);
  return lastSeen !== null && now - lastSeen <= ONLINE_WINDOW_MS;
}

async function success(
  store: MultiplayerRoomStore,
  roomId: string,
  room: StoredRoom,
  role: MultiplayerRole,
  now: number,
  events: RoomActionEvent[] = [],
  eventsTruncated = false,
): Promise<RoomServiceResult> {
  await store.setPresence(roomId, role, now);
  const latestReaction = await store.getReaction(roomId);
  return {
    status: 200,
    body: {
      ok: true,
      game: room.game,
      yourRole: role,
      opponentOnline: await presenceStatus(store, roomId, role, now),
      version: room.version,
      events,
      eventsTruncated,
      latestReaction: latestReaction && now - latestReaction.sentAt <= REACTION_WINDOW_MS
        ? latestReaction
        : null,
    },
  };
}

function updatePlayerName(
  game: MultiplayerGameState,
  role: MultiplayerRole,
  playerName: string,
): MultiplayerGameState {
  const player = game[role];
  if (!player || player.name === playerName) return game;
  return { ...game, [role]: { ...player, name: playerName } };
}

export async function handleRoomCommand({
  roomId,
  command,
  store,
  now,
  rollDie,
}: {
  roomId: string;
  command: RoomCommand;
  store: MultiplayerRoomStore;
  now: number;
  rollDie: () => DieValue;
}): Promise<RoomServiceResult> {
  let room = await store.getRoom(roomId);

  if (command.type === "CONNECT" && command.role === "player1") {
    if (!room) {
      room = {
        game: createHostedGame(roomId, command.playerName),
        hostToken: command.token,
        guestToken: null,
        version: 0,
        lastActionIds: {},
        actionEvents: [],
        actionEventFloorVersion: -1,
      };
      await store.setRoom(roomId, room);
    } else if (room.hostToken !== command.token) {
      return failure(409, "ROOM_TAKEN", "Ce code appartient déjà à une autre partie.");
    } else {
      const nextGame = updatePlayerName(room.game, command.role, command.playerName);
      if (nextGame !== room.game) {
        room = { ...room, game: nextGame, version: room.version + 1 };
        await store.setRoom(roomId, room);
      }
    }
    return success(store, roomId, room, command.role, now);
  }

  if (!room) {
    return failure(404, "ROOM_NOT_FOUND", "Aucune partie active ne correspond à ce code.");
  }

  if (command.type === "CONNECT" && command.role === "player2") {
    if (room.guestToken && room.guestToken !== command.token) {
      const lastSeen = await store.getPresence(roomId, "player2");
      if (lastSeen !== null && now - lastSeen <= ONLINE_WINDOW_MS) {
        return failure(409, "ROOM_FULL", "Deux amis jouent déjà dans cette partie.");
      }
    }

    const nextGame = connectGuest(room.game, command.playerName);
    room = {
      ...room,
      game: nextGame,
      guestToken: command.token,
      version: nextGame === room.game ? room.version : room.version + 1,
    };
    await store.setRoom(roomId, room);
    return success(store, roomId, room, command.role, now);
  }

  if (tokenFor(room, command.role) !== command.token) {
    return failure(403, "ACCESS_DENIED", "Cette place de joueur n’est pas disponible.");
  }

  if (command.type === "SYNC") {
    const nextGame = updatePlayerName(room.game, command.role, command.playerName);
    if (nextGame !== room.game) {
      room = { ...room, game: nextGame, version: room.version + 1 };
      await store.setRoom(roomId, room);
    }
  }

  if (command.type === "REACTION") {
    const opponentOnline = await presenceStatus(store, roomId, command.role, now);
    if (!opponentOnline) {
      await store.setPresence(roomId, command.role, now);
      return failure(409, "OPPONENT_OFFLINE", "Ton ami doit être connecté pour réagir.");
    }

    const latestReaction = await store.getReaction(roomId);
    if (latestReaction?.id !== command.reactionId) {
      await store.setReaction(roomId, {
        id: command.reactionId,
        role: command.role,
        emoji: command.emoji,
        sentAt: now,
      });
    }
  }

  if (command.type === "ACTION") {
    const opponentOnline = await presenceStatus(store, roomId, command.role, now);
    if (!opponentOnline) {
      await store.setPresence(roomId, command.role, now);
      return failure(409, "OPPONENT_OFFLINE", "Ton ami doit être connecté pour continuer.");
    }

    if (room.lastActionIds[command.role] !== command.actionId) {
      const nextGame = applyPlayerAction(room.game, command.role, command.action, rollDie);
      const nextVersion = nextGame === room.game ? room.version : room.version + 1;
      const nextEvent: RoomActionEvent | null = nextGame === room.game
        ? null
        : {
            actionId: command.actionId,
            role: command.role,
            version: nextVersion,
            action: structuredClone(command.action),
            game: structuredClone(nextGame),
          };
      const appendedEvents = nextEvent ? [...room.actionEvents, nextEvent] : room.actionEvents;
      const overflow = Math.max(0, appendedEvents.length - MAX_ROOM_ACTION_EVENTS);
      const droppedThroughVersion = overflow > 0
        ? appendedEvents[overflow - 1].version
        : room.actionEventFloorVersion;
      room = {
        ...room,
        game: nextGame,
        version: nextVersion,
        lastActionIds: {
          ...room.lastActionIds,
          [command.role]: command.actionId,
        },
        actionEvents: appendedEvents.slice(-MAX_ROOM_ACTION_EVENTS),
        actionEventFloorVersion: Math.max(room.actionEventFloorVersion, droppedThroughVersion),
      };
      await store.setRoom(roomId, room);
    }
  }

  const missedEvents = command.type === "SYNC"
    ? room.actionEvents.filter((event) => event.version > command.afterVersion)
    : [];
  const eventsTruncated = command.type === "SYNC"
    && command.afterVersion < room.actionEventFloorVersion;
  return success(store, roomId, room, command.role, now, missedEvents, eventsTruncated);
}
