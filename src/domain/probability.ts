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
  bestHoldForSuccess: DiceCounts;
  bestHoldForExpectedScore: DiceCounts;
  precision: "exact";
};

type Outcome = { counts: DiceCounts; probability: number };
type SolvedState = Omit<CategoryEvaluation, "category" | "currentScore" | "precision">;

const factorial = [1, 1, 2, 6, 24, 120];
const outcomeCache = new Map<number, Outcome[]>();
const solveCache = new Map<string, SolvedState>();

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

  const dice = countsToDice(counts);
  const score = scoreDice(category, dice);
  if (remainingRolls === 0) {
    const result = {
      successProbability: score > 0 ? 1 : 0,
      expectedScore: score,
      bestHoldForSuccess: counts,
      bestHoldForExpectedScore: counts,
    };
    solveCache.set(key, result);
    return result;
  }

  let bestSuccess = -1;
  let bestExpected = -1;
  let bestSuccessHold = counts;
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

    if (success > bestSuccess + Number.EPSILON ||
        (Math.abs(success - bestSuccess) < Number.EPSILON && countHeld(hold) > countHeld(bestSuccessHold))) {
      bestSuccess = success;
      bestSuccessHold = hold;
    }
    if (expected > bestExpected + Number.EPSILON ||
        (Math.abs(expected - bestExpected) < Number.EPSILON && countHeld(hold) > countHeld(bestExpectedHold))) {
      bestExpected = expected;
      bestExpectedHold = hold;
    }
  }

  const result = {
    successProbability: bestSuccess,
    expectedScore: bestExpected,
    bestHoldForSuccess: bestSuccessHold,
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

export function evaluateHoldChoice(
  category: CategoryId,
  hold: DiceCounts,
  remainingRolls: number,
): Pick<CategoryEvaluation, "successProbability" | "expectedScore"> {
  if (remainingRolls < 1) {
    const score = scoreDice(category, countsToDice(hold));
    return { successProbability: score > 0 ? 1 : 0, expectedScore: score };
  }

  const rerolledDice = 5 - countHeld(hold);
  let successProbability = 0;
  let expectedScore = 0;
  for (const outcome of rollOutcomes(rerolledDice)) {
    const child = solve(category, combineCounts(hold, outcome.counts), remainingRolls - 1);
    successProbability += outcome.probability * child.successProbability;
    expectedScore += outcome.probability * child.expectedScore;
  }
  return { successProbability, expectedScore };
}

export function formatDiceCounts(counts: DiceCounts): string {
  const dice = countsToDice(counts);
  return dice.length ? dice.join("–") : "aucun dé";
}
