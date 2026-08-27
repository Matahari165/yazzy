import { expertPolicy } from "./expertPolicy";
import type { BotLevel, BotPolicy } from "./types";

export type { BotDecisionContext, BotLevel, BotPolicy } from "./types";

const POLICIES: Record<BotLevel, BotPolicy> = {
  expert: expertPolicy,
};

export function getBotPolicy(level: BotLevel): BotPolicy {
  return POLICIES[level];
}
