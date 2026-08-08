import { evaluateCategory, type CategoryEvaluation } from "../probability";
import {
  CATEGORY_IDS,
  countDice,
  type CategoryId,
  type Dice,
  type DiceCounts,
  type DieValue,
} from "../yatzy";
import type { BotDecisionContext } from "./types";

export function openCategories(scores: Partial<Record<CategoryId, number>>): CategoryId[] {
  return CATEGORY_IDS.filter((category) => scores[category] === undefined);
}

export function evaluateOpenCategories(context: BotDecisionContext): CategoryEvaluation[] {
  if (context.dice.length !== 5) return [];
  return openCategories(context.scores).map((category) =>
    evaluateCategory(category, context.dice, context.remainingRolls),
  );
}

export function chooseFirstOpenCategory(scores: Partial<Record<CategoryId, number>>): CategoryId {
  return openCategories(scores)[0] ?? CATEGORY_IDS[0];
}

export function holdFlagsForDice(dice: Dice, hold: DiceCounts): boolean[] {
  const remaining = [...hold];
  return dice.map((die) => {
    const index = die - 1;
    if (remaining[index] < 1) return false;
    remaining[index] -= 1;
    return true;
  });
}

export function simpleHold(dice: Dice): DiceCounts {
  const counts = countDice(dice);
  const highestGroup = counts.reduce(
    (best, count, index) => {
      if (count > best.count || (count === best.count && index > best.index)) {
        return { count, index };
      }
      return best;
    },
    { count: 0, index: 0 },
  );

  if (highestGroup.count >= 2) {
    return counts.map((count, index) => (index === highestGroup.index ? count : 0)) as unknown as DiceCounts;
  }

  const highestDie = dice.reduce<DieValue | null>((best, die) => (best === null || die > best ? die : best), null);
  return counts.map((count, index) => (highestDie === index + 1 ? count : 0)) as unknown as DiceCounts;
}
