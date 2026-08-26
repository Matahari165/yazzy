import {
  isMultiplayerGameState,
  type MultiplayerGameState,
  type MultiplayerRole,
} from "./multiplayer";
import { parseClientActionValue, type ClientAction } from "./protocol";
import { isPlayerName } from "./playerName";

export const REACTION_EMOJIS = ["😆", "😂", "🤭", "🤑", "😏", "🤪", "😨", "🤯", "😭", "🤬", "💀"] as const;
export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];

export type RoomReaction = {
  id: string;
  role: MultiplayerRole;
  emoji: ReactionEmoji;
  sentAt: number;
};

export type RoomActionEvent = {
  actionId: string;
  role: MultiplayerRole;
  version: number;
  action: ClientAction;
  game: MultiplayerGameState;
};

export type RoomCommand =
  | {
      type: "CONNECT";
      role: MultiplayerRole;
      token: string;
      playerName: string;
    }
  | {
      type: "SYNC";
      role: MultiplayerRole;
      token: string;
      playerName: string;
      afterVersion: number;
    }
  | {
      type: "ACTION";
      role: MultiplayerRole;
      token: string;
      actionId: string;
      action: ClientAction;
    }
  | {
      type: "REACTION";
      role: MultiplayerRole;
      token: string;
      reactionId: string;
      emoji: ReactionEmoji;
    };

export type RoomErrorCode =
  | "INVALID_REQUEST"
  | "ROOM_NOT_FOUND"
  | "ROOM_TAKEN"
  | "ROOM_FULL"
  | "ACCESS_DENIED"
  | "OPPONENT_OFFLINE"
  | "SERVICE_UNAVAILABLE";

export type RoomSuccess = {
  ok: true;
  game: MultiplayerGameState;
  yourRole: MultiplayerRole;
  opponentOnline: boolean;
  version: number;
  events: RoomActionEvent[];
  eventsTruncated: boolean;
  latestReaction: RoomReaction | null;
};

export type RoomFailure = {
  ok: false;
  code: RoomErrorCode;
  message: string;
};

export type RoomResponse = RoomSuccess | RoomFailure;

const ROOM_ERROR_CODES: RoomErrorCode[] = [
  "INVALID_REQUEST",
  "ROOM_NOT_FOUND",
  "ROOM_TAKEN",
  "ROOM_FULL",
  "ACCESS_DENIED",
  "OPPONENT_OFFLINE",
  "SERVICE_UNAVAILABLE",
];

function isRole(value: unknown): value is MultiplayerRole {
  return value === "player1" || value === "player2";
}

function isRoomErrorCode(value: unknown): value is RoomErrorCode {
  return typeof value === "string" && ROOM_ERROR_CODES.includes(value as RoomErrorCode);
}

function isReactionEmoji(value: unknown): value is ReactionEmoji {
  return typeof value === "string" && REACTION_EMOJIS.includes(value as ReactionEmoji);
}

export function isRoomReaction(value: unknown): value is RoomReaction {
  if (!value || typeof value !== "object") return false;
  const reaction = value as Partial<RoomReaction>;
  return Boolean(
    isPlayerToken(reaction.id) &&
      isRole(reaction.role) &&
      isReactionEmoji(reaction.emoji) &&
      typeof reaction.sentAt === "number" &&
      Number.isFinite(reaction.sentAt),
  );
}

export function isPlayerToken(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(value);
}

export function isRoomActionEvent(value: unknown): value is RoomActionEvent {
  if (!value || typeof value !== "object") return false;
  const event = value as Partial<RoomActionEvent>;
  return Boolean(
    isPlayerToken(event.actionId) &&
      isRole(event.role) &&
      Number.isInteger(event.version) &&
      event.version! >= 0 &&
      parseClientActionValue(event.action) &&
      isMultiplayerGameState(event.game),
  );
}

export function parseRoomCommand(value: unknown): RoomCommand | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  if ("pairedGuestToken" in data) return null;
  if (!isRole(data.role) || !isPlayerToken(data.token)) return null;

  if (
    data.type === "CONNECT" &&
    isPlayerName(data.playerName)
  ) {
    return {
      type: data.type,
      role: data.role,
      token: data.token,
      playerName: data.playerName,
    };
  }

  if (
    data.type === "SYNC" &&
    isPlayerName(data.playerName) &&
    Number.isInteger(data.afterVersion) &&
    (data.afterVersion as number) >= -1
  ) {
    return {
      type: data.type,
      role: data.role,
      token: data.token,
      playerName: data.playerName,
      afterVersion: data.afterVersion as number,
    };
  }

  if (data.type === "ACTION" && isPlayerToken(data.actionId)) {
    const action = parseClientActionValue(data.action);
    if (action) {
      return {
        type: "ACTION",
        role: data.role,
        token: data.token,
        actionId: data.actionId,
        action,
      };
    }
  }

  if (data.type === "REACTION" && isPlayerToken(data.reactionId) && isReactionEmoji(data.emoji)) {
    return {
      type: "REACTION",
      role: data.role,
      token: data.token,
      reactionId: data.reactionId,
      emoji: data.emoji,
    };
  }

  return null;
}

export function isRoomResponse(value: unknown): value is RoomResponse {
  if (!value || typeof value !== "object" || !("ok" in value)) return false;
  const response = value as Partial<RoomResponse>;

  if (response.ok === false) {
    return isRoomErrorCode(response.code) && typeof response.message === "string";
  }

  const successResponse = response as Partial<RoomSuccess>;
  const events = successResponse.events;
  const hasOrderedEvents = Array.isArray(events) && events.every(
    (event, index) =>
      isRoomActionEvent(event) &&
      event.version <= successResponse.version! &&
      (index === 0 || events[index - 1].version < event.version),
  );

  return Boolean(
    successResponse.ok === true &&
      "game" in successResponse &&
      isMultiplayerGameState(successResponse.game) &&
      isRole(successResponse.yourRole) &&
      typeof successResponse.opponentOnline === "boolean" &&
      Number.isInteger(successResponse.version) &&
      successResponse.version! >= 0 &&
      hasOrderedEvents &&
      typeof successResponse.eventsTruncated === "boolean" &&
      "latestReaction" in successResponse &&
      (successResponse.latestReaction === null || isRoomReaction(successResponse.latestReaction)),
  );
}
