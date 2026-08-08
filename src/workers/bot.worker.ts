/// <reference lib="webworker" />

import { prepareBotStep, completeBotTurn } from "@/domain/bots/turn";
import type { GameState } from "@/domain/game";

type BotRequest = {
  type: "prepare" | "complete";
  requestId: number;
  state: GameState;
};

self.onmessage = (event: MessageEvent<BotRequest>) => {
  const { type, requestId, state } = event.data;
  
  if (type === "prepare") {
    self.postMessage({ type: "result", requestId, state: prepareBotStep(state) });
  } else if (type === "complete") {
    self.postMessage({ type: "result", requestId, state: completeBotTurn(state) });
  }
};

export {};
