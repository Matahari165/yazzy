/// <reference lib="webworker" />

import { evaluateCategory, evaluateHoldChoice, formatDiceCounts } from "@/domain/probability";
import { countDice, type CategoryId, type DieValue } from "@/domain/yatzy";

type EvaluateRequest = {
  type: "evaluate";
  requestId: number;
  categories: CategoryId[];
  dice: DieValue[];
  remainingRolls: number;
};

type AnalyzeHoldRequest = {
  type: "analyze-hold";
  requestId: number;
  category: CategoryId;
  dice: DieValue[];
  heldIndexes: number[];
  remainingRolls: number;
};

self.onmessage = (event: MessageEvent<EvaluateRequest | AnalyzeHoldRequest>) => {
  const request = event.data;

  if (request.type === "evaluate") {
    const evaluations = request.categories.map((category) =>
      evaluateCategory(category, request.dice, request.remainingRolls),
    );
    self.postMessage({ type: "evaluations", requestId: request.requestId, evaluations });
    return;
  }

  const evaluation = evaluateCategory(request.category, request.dice, request.remainingRolls);
  const heldDice = request.dice.filter((_, index) => request.heldIndexes.includes(index));
  const chosen = evaluateHoldChoice(
    request.category,
    countDice(heldDice),
    request.remainingRolls,
  );

  self.postMessage({
    type: "hold-analysis",
    requestId: request.requestId,
    analysis: {
      category: request.category,
      chosenExpectedScore: chosen.expectedScore,
      bestExpectedScore: evaluation.expectedScore,
      bestHoldLabel: formatDiceCounts(evaluation.bestHoldForExpectedScore),
    },
  });
};

export {};
