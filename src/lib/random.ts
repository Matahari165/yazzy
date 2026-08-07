import type { DieValue } from "@/domain/yatzy";

const UINT32_RANGE = 2 ** 32;
const FAIR_LIMIT = Math.floor(UINT32_RANGE / 6) * 6;

export function rollFairDie(): DieValue {
  const buffer = new Uint32Array(1);
  do {
    globalThis.crypto.getRandomValues(buffer);
  } while (buffer[0] >= FAIR_LIMIT);
  return ((buffer[0] % 6) + 1) as DieValue;
}
