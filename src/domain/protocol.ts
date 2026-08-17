import { isCategoryId } from "./multiplayer";
import type { CategoryId } from "./yatzy";

// Actions sent by the client to the server
export type ClientAction =
  | { type: "ROLL" }
  | { type: "HOLD"; index: number }
  | { type: "SCORE"; category: CategoryId }
  | { type: "REMATCH" };

export function parseClientActionValue(data: unknown): ClientAction | null {
  if (!data || typeof data !== "object" || !("type" in data) || typeof data.type !== "string") {
    return null;
  }

  switch (data.type) {
    case "ROLL":
    case "REMATCH":
      return { type: data.type };
    case "HOLD":
      if ("index" in data && Number.isInteger(data.index) && Number(data.index) >= 0 && Number(data.index) < 5) {
        return { type: "HOLD", index: Number(data.index) };
      }
      break;
    case "SCORE":
      if ("category" in data && typeof data.category === "string" && isCategoryId(data.category)) {
        return { type: "SCORE", category: data.category };
      }
      break;
  }
  return null;
}
