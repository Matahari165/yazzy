import { expertPolicy } from "./expertPolicy";
import { strategistPolicy } from "./strategistPolicy";
import type { BotLevel, BotPolicy } from "./types";

export type { BotDecisionContext, BotLevel, BotPolicy } from "./types";
export { BOT_LEVELS } from "./types";

const POLICIES: Record<BotLevel, BotPolicy> = {
  strategist: strategistPolicy,
  expert: expertPolicy,
};

export function getBotPolicy(level: BotLevel): BotPolicy {
  return POLICIES[level];
}
