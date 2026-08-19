import { describe, expect, it } from "vitest";
import { flipFairCoin } from "./random";

const fillWith = (value: number) => (values: Uint32Array) => {
  values[0] = value;
  return values;
};

describe("tirage du premier joueur", () => {
  it("accepte les deux résultats d’un tirage binaire", () => {
    expect(flipFairCoin(fillWith(0))).toBe(true);
    expect(flipFairCoin(fillWith(1))).toBe(false);
  });
});
