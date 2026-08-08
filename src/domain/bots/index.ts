import { calculatorPolicy } from "./calculatorPolicy";
import { discoveryPolicy } from "./discoveryPolicy";
import { strategistPolicy } from "./strategistPolicy";
import type { BotLevel, BotPolicy } from "./types";

export type { BotDecisionContext, BotLevel, BotPolicy } from "./types";
export { BOT_LEVELS } from "./types";

const POLICIES: Record<BotLevel, BotPolicy> = {
  discovery: discoveryPolicy,
  calculator: calculatorPolicy,
  strategist: strategistPolicy,
};

export function getBotPolicy(level: BotLevel): BotPolicy {
  return POLICIES[level];
}
