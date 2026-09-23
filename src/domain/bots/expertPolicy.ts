import { GENERAL_PROBABILITIES } from "../generalProbabilities";
import { rollOutcomes } from "../probability";
import {
  CATEGORY_IDS, countDice, countsToDice, scoreDice,
  type CategoryId, type DiceCounts,
} from "../yatzy";
import { chooseFirstOpenCategory } from "./utils";
import type { BotDecisionContext, BotPolicy } from "./types";

type Decision = { category: CategoryId; hold: DiceCounts };
type Forecast = { value: number; variance: number };
const EMPTY_HOLD: DiceCounts = [0, 0, 0, 0, 0, 0];
const holdCache = new Map<string, DiceCounts[]>();
let lastDecision: { key: string; result: Decision } | null = null;

// Approximation de la valeur d'un tour frais. Les probabilités sont exactes ;
// le gain moyen d'une combinaison non fixe reste une estimation prudente.
const AVERAGE_SUCCESS_SCORE: Readonly<Record<CategoryId, number>> = {
  ones: 3, twos: 6, threes: 9, fours: 12, fives: 15, sixes: 18,
  pair: 10, twoPairs: 16, threeOfAKind: 12, fourOfAKind: 17,
  smallStraight: 15, largeStraight: 20, fullHouse: 20, yatzy: 50,
};
const UPPER_VALUE: Partial<Record<CategoryId, number>> = {
  ones: 1, twos: 2, threes: 3, fours: 4, fives: 5, sixes: 6,
};
const FRESH_VALUE = Object.fromEntries(CATEGORY_IDS.map((category) => [
  category,
  UPPER_VALUE[category]
    ? 5 * UPPER_VALUE[category] * (1 - (5 / 6) ** 3)
    : GENERAL_PROBABILITIES[category] * AVERAGE_SUCCESS_SCORE[category],
])) as Record<CategoryId, number>;

function openCategories(scores: BotDecisionContext["scores"]): CategoryId[] {
  return CATEGORY_IDS.filter((category) => scores[category] === undefined);
}

function forecast(categories: CategoryId[], skill = 1): Forecast {
  return categories.reduce((total, category) => {
    const probability = GENERAL_PROBABILITIES[category];
    const average = AVERAGE_SUCCESS_SCORE[category] * skill;
    const upper = UPPER_VALUE[category];
    const perDieChance = 1 - (5 / 6) ** 3;
    return {
      value: total.value + FRESH_VALUE[category] * skill,
      variance: total.variance + (upper
        ? 5 * perDieChance * (1 - perDieChance) * (upper * skill) ** 2
        : probability * (1 - probability) * average ** 2),
    };
  }, { value: 0, variance: 0 });
}

function opponentSkill(context: BotDecisionContext): number {
  const scored = CATEGORY_IDS.filter((category) => context.opponentScores[category] !== undefined);
  if (!scored.length) return 1;
  const expected = scored.reduce((sum, category) => sum + FRESH_VALUE[category], 0);
  const actual = scored.reduce((sum, category) => sum + (context.opponentScores[category] ?? 0), 0);
  // Quatre tours fictifs évitent qu'un seul bon jet ne domine la prévision.
  const prior = 4 * CATEGORY_IDS.reduce((sum, category) => sum + FRESH_VALUE[category], 0) / CATEGORY_IDS.length;
  return Math.max(0.7, Math.min(1.4, (actual + prior) / (expected + prior)));
}

function possibleHolds(counts: DiceCounts): DiceCounts[] {
  const key = counts.join("");
  const cached = holdCache.get(key);
  if (cached) return cached;
  const holds: DiceCounts[] = [];
  const current = [0, 0, 0, 0, 0, 0];
  const visit = (face: number) => {
    if (face === 6) {
      holds.push([...current] as unknown as DiceCounts);
      return;
    }
    for (let n = 0; n <= counts[face]; n += 1) {
      current[face] = n;
      visit(face + 1);
    }
  };
  visit(0);
  holdCache.set(key, holds);
  return holds;
}

function addCounts(left: DiceCounts, right: DiceCounts): DiceCounts {
  return left.map((count, index) => count + right[index]) as unknown as DiceCounts;
}

function terminalChoice(context: BotDecisionContext, counts: DiceCounts, open: CategoryId[]): {
  category: CategoryId; utility: number;
} {
  const dice = countsToDice(counts);
  const theirOpen = openCategories(context.opponentScores);
  const theirFuture = forecast(theirOpen, opponentSkill(context));
  const endingSoon = open.length <= 4;
  let best = { category: open[0], utility: -Infinity };

  for (const category of open) {
    const ourFuture = forecast(open.filter((candidate) => candidate !== category));
    const points = scoreDice(category, dice);
    const margin = context.ownScore + points + ourFuture.value
      - context.opponentScore - theirFuture.value;
    const uncertainty = Math.sqrt(ourFuture.variance + theirFuture.variance);
    const winChance = uncertainty < 0.01
      ? margin > 0 ? 1 : margin < 0 ? 0 : 0.5
      : 1 / (1 + Math.exp(-margin / Math.max(2, uncertainty * 0.62)));
    const utility = margin + (endingSoon ? 65 : 10) * winChance;
    if (utility > best.utility + 1e-9) best = { category, utility };
  }
  return best;
}

function choose(context: BotDecisionContext): Decision {
  const open = openCategories(context.scores);
  if (!open.length || context.dice.length !== 5) {
    return { category: chooseFirstOpenCategory(context.scores), hold: EMPTY_HOLD };
  }
  const key = [context.dice.join(""), context.remainingRolls, context.ownScore, context.opponentScore,
    ...CATEGORY_IDS.map((category) => `${context.scores[category] ?? "_"}:${context.opponentScores[category] ?? "_"}`),
  ].join("|");
  if (lastDecision?.key === key) return lastDecision.result;

  const solved = new Map<string, number>();
  const endChoices = new Map<string, ReturnType<typeof terminalChoice>>();
  const getEnd = (counts: DiceCounts) => {
    const diceKey = counts.join("");
    let choice = endChoices.get(diceKey);
    if (!choice) {
      choice = terminalChoice(context, counts, open);
      endChoices.set(diceKey, choice);
    }
    return choice;
  };
  const solve = (counts: DiceCounts, remaining: number): { value: number; hold: DiceCounts } => {
    if (remaining === 0) return { value: getEnd(counts).utility, hold: counts };
    const stateKey = `${counts.join("")}:${remaining}`;
    const cached = solved.get(stateKey);
    if (cached !== undefined) return { value: cached, hold: counts };
    let bestValue = -Infinity;
    let bestHold = counts;
    for (const hold of possibleHolds(counts)) {
      const rerolled = 5 - hold.reduce((sum, count) => sum + count, 0);
      let expected = 0;
      for (const outcome of rollOutcomes(rerolled)) {
        expected += outcome.probability * solve(addCounts(hold, outcome.counts), remaining - 1).value;
      }
      if (expected > bestValue + 1e-9) {
        bestValue = expected;
        bestHold = hold;
      }
    }
    solved.set(stateKey, bestValue);
    return { value: bestValue, hold: bestHold };
  };

  const counts = countDice(context.dice);
  const result = { category: getEnd(counts).category, hold: solve(counts, context.remainingRolls).hold };
  lastDecision = { key, result };
  return result;
}

export const expertPolicy: BotPolicy = {
  level: "expert",
  label: "Expert",
  description: "Compare les dés et les cases ensemble, prévoit les scores restants et adapte le risque à la victoire.",
  precision: "heuristic",
  reassessAfterRoll: true,
  pickCategory: (context) => choose(context).category,
  pickHold: (context) => choose(context).hold,
};
