export const CATEGORY_IDS = [
  "ones",
  "twos",
  "threes",
  "fours",
  "fives",
  "sixes",
  "pair",
  "twoPairs",
  "threeOfAKind",
  "fourOfAKind",
  "smallStraight",
  "largeStraight",
  "fullHouse",
  "chance",
  "yatzy",
] as const;

export type CategoryId = (typeof CATEGORY_IDS)[number];
export type DieValue = 1 | 2 | 3 | 4 | 5 | 6;
export type Dice = readonly DieValue[];
export type DiceCounts = readonly [number, number, number, number, number, number];

export type CategoryDefinition = {
  id: CategoryId;
  label: string;
  shortLabel: string;
  rule: string;
  scoring: string;
  section: "upper" | "lower";
  fixedScore?: number;
};

const upper = (
  id: CategoryId,
  label: string,
  shortLabel: string,
  value: number,
): CategoryDefinition => ({
  id,
  label,
  shortLabel,
  section: "upper",
  rule: `Obtenir un ou plusieurs ${label.toLowerCase()}.`,
  scoring: `Somme uniquement les dés de valeur ${value}.`,
});

export const CATEGORIES: readonly CategoryDefinition[] = [
  upper("ones", "As", "As", 1),
  upper("twos", "Deux", "Deux", 2),
  upper("threes", "Trois", "Trois", 3),
  upper("fours", "Quatre", "Quatre", 4),
  upper("fives", "Cinq", "Cinq", 5),
  upper("sixes", "Six", "Six", 6),
  {
    id: "pair",
    label: "Une paire",
    shortLabel: "Paire",
    section: "lower",
    rule: "Au moins deux dés identiques.",
    scoring: "Somme la paire de valeur la plus élevée.",
  },
  {
    id: "twoPairs",
    label: "Deux paires",
    shortLabel: "2 paires",
    section: "lower",
    rule: "Deux paires de valeurs différentes.",
    scoring: "Somme les quatre dés des deux paires.",
  },
  {
    id: "threeOfAKind",
    label: "Brelan",
    shortLabel: "Brelan",
    section: "lower",
    rule: "Au moins trois dés identiques.",
    scoring: "Somme trois dés identiques.",
  },
  {
    id: "fourOfAKind",
    label: "Carré",
    shortLabel: "Carré",
    section: "lower",
    rule: "Au moins quatre dés identiques.",
    scoring: "Somme quatre dés identiques.",
  },
  {
    id: "smallStraight",
    label: "Petite suite",
    shortLabel: "Petite suite",
    section: "lower",
    rule: "Obtenir exactement 1, 2, 3, 4 et 5.",
    scoring: "15 points.",
    fixedScore: 15,
  },
  {
    id: "largeStraight",
    label: "Grande suite",
    shortLabel: "Grande suite",
    section: "lower",
    rule: "Obtenir exactement 2, 3, 4, 5 et 6.",
    scoring: "20 points.",
    fixedScore: 20,
  },
  {
    id: "fullHouse",
    label: "Full",
    shortLabel: "Full",
    section: "lower",
    rule: "Un brelan et une paire de valeurs différentes.",
    scoring: "Somme les cinq dés.",
  },
  {
    id: "chance",
    label: "Chance",
    shortLabel: "Chance",
    section: "lower",
    rule: "Toutes les combinaisons sont acceptées.",
    scoring: "Somme les cinq dés.",
  },
  {
    id: "yatzy",
    label: "Yatzy",
    shortLabel: "Yatzy",
    section: "lower",
    rule: "Cinq dés identiques.",
    scoring: "50 points.",
    fixedScore: 50,
  },
];

export const CATEGORY_BY_ID = Object.fromEntries(
  CATEGORIES.map((category) => [category.id, category]),
) as Record<CategoryId, CategoryDefinition>;

const UPPER_VALUES: Partial<Record<CategoryId, DieValue>> = {
  ones: 1,
  twos: 2,
  threes: 3,
  fours: 4,
  fives: 5,
  sixes: 6,
};

export function countDice(dice: Dice): DiceCounts {
  const counts = [0, 0, 0, 0, 0, 0];
  for (const die of dice) counts[die - 1] += 1;
  return counts as unknown as DiceCounts;
}

export function countsToDice(counts: DiceCounts): DieValue[] {
  return counts.flatMap((count, index) =>
    Array.from({ length: count }, () => (index + 1) as DieValue),
  );
}

export function scoreDice(category: CategoryId, dice: Dice): number {
  const counts = countDice(dice);
  const upperValue = UPPER_VALUES[category];
  if (upperValue) return counts[upperValue - 1] * upperValue;

  const matchingValues = (minimum: number) =>
    counts
      .map((count, index) => ({ count, value: index + 1 }))
      .filter((item) => item.count >= minimum)
      .sort((a, b) => b.value - a.value);

  switch (category) {
    case "pair":
      return (matchingValues(2)[0]?.value ?? 0) * 2;
    case "twoPairs": {
      const pairs = matchingValues(2).slice(0, 2);
      return pairs.length === 2 ? pairs.reduce((sum, pair) => sum + pair.value * 2, 0) : 0;
    }
    case "threeOfAKind":
      return (matchingValues(3)[0]?.value ?? 0) * 3;
    case "fourOfAKind":
      return (matchingValues(4)[0]?.value ?? 0) * 4;
    case "smallStraight":
      return counts.slice(0, 5).every((count) => count === 1) ? 15 : 0;
    case "largeStraight":
      return counts.slice(1).every((count) => count === 1) ? 20 : 0;
    case "fullHouse":
      return [...counts].sort((a, b) => a - b).slice(-2).join(",") === "2,3"
        ? dice.reduce((sum, die) => sum + die, 0)
        : 0;
    case "chance":
      return dice.reduce((sum, die) => sum + die, 0);
    case "yatzy":
      return counts.some((count) => count === 5) ? 50 : 0;
    default:
      return 0;
  }
}

export function upperSubtotal(scores: Partial<Record<CategoryId, number>>): number {
  return CATEGORIES.filter((category) => category.section === "upper").reduce(
    (sum, category) => sum + (scores[category.id] ?? 0),
    0,
  );
}

export function totalScore(scores: Partial<Record<CategoryId, number>>): number {
  const subtotal = Object.values(scores).reduce<number>((sum, score) => sum + (score ?? 0), 0);
  return subtotal + (upperSubtotal(scores) >= 63 ? 50 : 0);
}

export function bestCombinationLabel(dice: Dice): string | null {
  if (dice.length !== 5) return null;
  if (scoreDice("yatzy", dice)) return "Yatzy ! Cinq dés identiques";
  if (scoreDice("largeStraight", dice)) return "Grande suite ! 2–3–4–5–6";
  if (scoreDice("smallStraight", dice)) return "Petite suite ! 1–2–3–4–5";
  if (scoreDice("fullHouse", dice)) return "Full ! Une paire et un brelan";
  if (scoreDice("fourOfAKind", dice)) return "Carré ! Quatre dés identiques";
  if (scoreDice("threeOfAKind", dice)) return "Brelan — trois dés identiques";
  if (scoreDice("twoPairs", dice)) return "Deux paires";
  if (scoreDice("pair", dice)) return "Une paire";
  return null;
}
