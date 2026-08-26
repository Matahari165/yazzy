import type { CategoryId } from "./yatzy";

/**
 * Valeurs exactes du solveur pour un tour complet, précalculées afin que
 * l'ouverture d'une explication de score ne bloque pas le thread principal.
 */
export const GENERAL_PROBABILITIES: Readonly<Record<CategoryId, number>> = {
  ones: 0.9350945284811236,
  twos: 0.9350945284811256,
  threes: 0.9350945284811253,
  fours: 0.9350945284811253,
  fives: 0.9350945284811254,
  sixes: 0.9350945284811254,
  pair: 0.9992061677589782,
  twoPairs: 0.7424185382584789,
  threeOfAKind: 0.7431952700299742,
  fourOfAKind: 0.2907935835069175,
  smallStraight: 0.19682907969393246,
  largeStraight: 0.19682907969393265,
  fullHouse: 0.36288287852038087,
  yatzy: 0.04602864252569883,
};
