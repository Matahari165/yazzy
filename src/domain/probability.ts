import {
  countDice,
  countsToDice,
  scoreDice,
  type CategoryId,
  type Dice,
  type DiceCounts,
} from "./yatzy";

export type CategoryEvaluation = {
  category: CategoryId;
  currentScore: number;
  successProbability: number;
  expectedScore: number;
  bestHoldForExpectedScore: DiceCounts;
  precision: "exact";
};

type Outcome = { counts: DiceCounts; probability: number };
type SolvedState = Omit<CategoryEvaluation, "category" | "currentScore" | "precision">;

const factorial = [1, 1, 2, 6, 24, 120];
const comparisonTolerance = 1e-12;
const outcomeCache = new Map<number, Outcome[]>();
const solveCache = new Map<string, SolvedState>();

function clampProbability(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function enumerateCountVectors(total: number, face = 0, current = [0, 0, 0, 0, 0, 0]): DiceCounts[] {
  if (face === 5) {
    const result = [...current];
    result[face] = total;
    return [result as unknown as DiceCounts];
  }

  const vectors: DiceCounts[] = [];
  for (let count = 0; count <= total; count += 1) {
    const next = [...current];
    next[face] = count;
    vectors.push(...enumerateCountVectors(total - count, face + 1, next));
  }
  return vectors;
}

export function rollOutcomes(numberOfDice: number): Outcome[] {
  const cached = outcomeCache.get(numberOfDice);
  if (cached) return cached;

  const denominator = 6 ** numberOfDice;
  const outcomes = enumerateCountVectors(numberOfDice).map((counts) => {
    const permutations = factorial[numberOfDice] /
      counts.reduce((product, count) => product * factorial[count], 1);
    return { counts, probability: permutations / denominator };
  });
  outcomeCache.set(numberOfDice, outcomes);
  return outcomes;
}

function uniqueHolds(counts: DiceCounts): DiceCounts[] {
  const holds: DiceCounts[] = [];
  const current = [0, 0, 0, 0, 0, 0];

  function visit(face: number) {
    if (face === 6) {
      holds.push([...current] as unknown as DiceCounts);
      return;
    }
    for (let count = 0; count <= counts[face]; count += 1) {
      current[face] = count;
      visit(face + 1);
    }
  }

  visit(0);
  return holds;
}

function combineCounts(left: DiceCounts, right: DiceCounts): DiceCounts {
  return left.map((count, index) => count + right[index]) as unknown as DiceCounts;
}

function countHeld(hold: DiceCounts): number {
  return hold.reduce((sum, count) => sum + count, 0);
}

function stateKey(category: CategoryId, counts: DiceCounts, remainingRolls: number) {
  return `${category}:${counts.join("")}:${remainingRolls}`;
}

function solve(category: CategoryId, counts: DiceCounts, remainingRolls: number): SolvedState {
  const key = stateKey(category, counts, remainingRolls);
  const cached = solveCache.get(key);
  if (cached) return cached;

  if (solveCache.size > 50000) {
    solveCache.clear();
    outcomeCache.clear();
  }

  const dice = countsToDice(counts);
  const score = scoreDice(category, dice);
  if (remainingRolls === 0) {
    const result = {
      successProbability: score > 0 ? 1 : 0,
      expectedScore: score,
      bestHoldForExpectedScore: counts,
    };
    solveCache.set(key, result);
    return result;
  }

  let bestSuccess = -1;
  let bestExpected = -1;
  let bestExpectedHold = counts;

  for (const hold of uniqueHolds(counts)) {
    const rerolledDice = 5 - countHeld(hold);
    let success = 0;
    let expected = 0;

    for (const outcome of rollOutcomes(rerolledDice)) {
      const child = solve(category, combineCounts(hold, outcome.counts), remainingRolls - 1);
      success += outcome.probability * child.successProbability;
      expected += outcome.probability * child.expectedScore;
    }

    if (success > bestSuccess + comparisonTolerance) {
      bestSuccess = success;
    }
    if (expected > bestExpected + comparisonTolerance ||
        (Math.abs(expected - bestExpected) <= comparisonTolerance && countHeld(hold) > countHeld(bestExpectedHold))) {
      bestExpected = expected;
      bestExpectedHold = hold;
    }
  }

  const result = {
    successProbability: clampProbability(bestSuccess),
    expectedScore: bestExpected,
    bestHoldForExpectedScore: bestExpectedHold,
  };
  solveCache.set(key, result);
  return result;
}

export function evaluateCategory(
  category: CategoryId,
  dice: Dice,
  remainingRolls: number,
): CategoryEvaluation {
  const counts = countDice(dice);
  const solved = solve(category, counts, remainingRolls);
  return {
    category,
    currentScore: scoreDice(category, dice),
    ...solved,
    precision: "exact",
  };
}

const generalProbabilityCache = new Map<CategoryId, number>();

/**
 * Probabilité exacte de réussir une catégorie sur un tour complet,
 * en partant de zéro avec au plus trois lancers et les meilleures
 * conservations possibles pour cette catégorie.
 */
export function generalProbability(category: CategoryId): number {
  const cached = generalProbabilityCache.get(category);
  if (cached !== undefined) return cached;

  const probability = evaluateCategory(category, [], 3).successProbability;
  generalProbabilityCache.set(category, probability);
  return probability;
}
