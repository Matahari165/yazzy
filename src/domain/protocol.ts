import { isCategoryId, type MultiplayerGameState } from "./multiplayer";
import type { CategoryId } from "./yatzy";

// Actions sent by the client to the server
export type ClientAction =
  | { type: "ROLL" }
  | { type: "HOLD"; index: number }
  | { type: "SCORE"; category: CategoryId }
  | { type: "REMATCH" };

// Messages sent by the server to clients
export type ServerMessage =
  | { type: "GAME_STATE"; state: MultiplayerGameState; yourRole: "player1" | "player2" }
  | { type: "ERROR"; message: string }
  | { type: "ROOM_FULL" };

export function parseClientAction(raw: string): ClientAction | null {
  try {
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object" || typeof data.type !== "string") {
      return null;
    }
    
    switch (data.type) {
      case "ROLL":
      case "REMATCH":
        return { type: data.type };
      case "HOLD":
        if (Number.isInteger(data.index) && data.index >= 0 && data.index < 5) {
          return { type: "HOLD", index: data.index };
        }
        break;
      case "SCORE":
        if (typeof data.category === "string" && isCategoryId(data.category)) {
          return { type: "SCORE", category: data.category };
        }
        break;
    }
    return null;
  } catch {
    return null;
  }
}

export function serializeServerMessage(msg: ServerMessage): string {
  return JSON.stringify(msg);
}
