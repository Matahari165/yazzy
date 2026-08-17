import {
  isMultiplayerGameState,
  type MultiplayerGameState,
  type MultiplayerRole,
} from "./multiplayer";
import { parseClientActionValue, type ClientAction } from "./protocol";

export type RoomCommand =
  | { type: "CONNECT"; role: MultiplayerRole; token: string }
  | { type: "SYNC"; role: MultiplayerRole; token: string }
  | {
      type: "ACTION";
      role: MultiplayerRole;
      token: string;
      actionId: string;
      action: ClientAction;
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

export function isPlayerToken(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(value);
}

export function parseRoomCommand(value: unknown): RoomCommand | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  if (!isRole(data.role) || !isPlayerToken(data.token)) return null;

  if (data.type === "CONNECT" || data.type === "SYNC") {
    return { type: data.type, role: data.role, token: data.token };
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

  return null;
}

export function isRoomResponse(value: unknown): value is RoomResponse {
  if (!value || typeof value !== "object" || !("ok" in value)) return false;
  const response = value as Partial<RoomResponse>;

  if (response.ok === false) {
    return isRoomErrorCode(response.code) && typeof response.message === "string";
  }

  return Boolean(
    response.ok === true &&
      "game" in response &&
      isMultiplayerGameState(response.game) &&
      isRole(response.yourRole) &&
      typeof response.opponentOnline === "boolean" &&
      Number.isInteger(response.version) &&
      response.version! >= 0,
  );
}
