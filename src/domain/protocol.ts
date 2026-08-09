import type { CategoryId } from "./yatzy";
import type { MultiplayerGameState } from "./multiplayer";

// Actions sent by the client to the server
export type ClientAction =
  | { type: "JOIN" }
  | { type: "ROLL" }
  | { type: "HOLD"; index: number }
  | { type: "SCORE"; category: CategoryId }
  | { type: "REMATCH" };

// Messages sent by the server to clients
export type ServerMessage =
  | { type: "GAME_STATE"; state: MultiplayerGameState; yourRole: "player1" | "player2" }
  | { type: "WAITING_FOR_OPPONENT" }
  | { type: "OPPONENT_CONNECTED" }
  | { type: "OPPONENT_DISCONNECTED" }
  | { type: "ERROR"; message: string }
  | { type: "ROOM_FULL" };

export function parseClientAction(raw: string): ClientAction | null {
  try {
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object" || typeof data.type !== "string") {
      return null;
    }
    
    switch (data.type) {
      case "JOIN":
      case "ROLL":
      case "REMATCH":
        return { type: data.type };
      case "HOLD":
        if (typeof data.index === "number") {
          return { type: "HOLD", index: data.index };
        }
        break;
      case "SCORE":
        if (typeof data.category === "string") {
          return { type: "SCORE", category: data.category as CategoryId };
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
