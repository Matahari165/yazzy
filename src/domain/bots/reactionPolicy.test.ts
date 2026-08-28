import { describe, expect, it } from "vitest";
import {
  chooseBotReaction,
  INITIAL_BOT_REACTION_HISTORY,
  recordBotReaction,
  type BotReactionEvent,
} from "./reactionPolicy";

const event = (overrides: Partial<BotReactionEvent> = {}): BotReactionEvent => ({
  actor: "bot",
  category: "sixes",
  points: 24,
  scoredCount: 1,
  ...overrides,
});

describe("réactions du bot", () => {
  it("réagit toujours à un Yatzy avec un emoji adapté à l'acteur", () => {
    expect(chooseBotReaction(event({ category: "yatzy", points: 50 }), INITIAL_BOT_REACTION_HISTORY, () => 0, 10_000)).toBe("😈");
    expect(chooseBotReaction(event({ actor: "human", category: "yatzy", points: 50 }), INITIAL_BOT_REACTION_HISTORY, () => 0, 10_000)).toBe("👏");
  });

  it("peut réagir aux bons coups humains sans réagir aux scores ordinaires du bot", () => {
    expect(chooseBotReaction(event({ actor: "human", category: "fullHouse", points: 28 }), INITIAL_BOT_REACTION_HISTORY, () => 0, 10_000)).toBe("👏");
    expect(chooseBotReaction(event({ actor: "human", category: "sixes", points: 24 }), INITIAL_BOT_REACTION_HISTORY, () => 0, 10_000)).toBe("👏");
    expect(chooseBotReaction(event({ category: "sixes", points: 12 }), INITIAL_BOT_REACTION_HISTORY, () => 0, 10_000)).toBeNull();
    expect(chooseBotReaction(event({ points: 0 }), INITIAL_BOT_REACTION_HISTORY, () => 0, 10_000)).toBeNull();
  });

  it("se moque des scores humains nuls ou très faibles", () => {
    expect(chooseBotReaction(event({ actor: "human", points: 0 }), INITIAL_BOT_REACTION_HISTORY, () => 0, 10_000)).toBe("😂");
    expect(chooseBotReaction(event({ actor: "human", category: "sixes", points: 6 }), INITIAL_BOT_REACTION_HISTORY, () => 0, 10_000)).toBe("😂");
    expect(chooseBotReaction(event({ actor: "human", category: "smallStraight", points: 15 }), INITIAL_BOT_REACTION_HISTORY, () => 0, 10_000)).toBe("👏");
    expect(chooseBotReaction(event({ actor: "human", points: 0 }), INITIAL_BOT_REACTION_HISTORY, () => 0.999, 10_000)).toBeNull();
  });

  it("varie le résultat et applique une probabilité aux coups non légendaires", () => {
    const bigMove = event({ category: "fullHouse", points: 28 });
    expect(chooseBotReaction(bigMove, INITIAL_BOT_REACTION_HISTORY, () => 0, 10_000)).toBe("😈");
    expect(chooseBotReaction(bigMove, INITIAL_BOT_REACTION_HISTORY, () => 0.999, 10_000)).toBeNull();
  });

  it("réserve ses propres réactions aux gros enjeux", () => {
    expect(chooseBotReaction(event({ category: "pair", points: 12 }), INITIAL_BOT_REACTION_HISTORY, () => 0, 10_000)).toBeNull();
    expect(chooseBotReaction(event({ category: "yatzy", points: 0 }), INITIAL_BOT_REACTION_HISTORY, () => 0, 10_000)).toBe("😭");
    expect(chooseBotReaction(event({ category: "sixes", points: 24, isEndgame: true }), INITIAL_BOT_REACTION_HISTORY, () => 0, 10_000)).toBe("😈");
    expect(chooseBotReaction(event({ category: "fullHouse", points: 28 }), INITIAL_BOT_REACTION_HISTORY, () => 0.999, 10_000)).toBeNull();
  });

  it("évite de répéter immédiatement le même emoji", () => {
    const history = { ...INITIAL_BOT_REACTION_HISTORY, lastEmoji: "😈" as const };
    expect(chooseBotReaction(event({ category: "fullHouse", points: 28 }), history, () => 0, 10_000)).toBe("🤑");
  });

  it("respecte les délais par score et par temps", () => {
    const history = recordBotReaction(INITIAL_BOT_REACTION_HISTORY, 2, "🔥", 10_000);
    expect(chooseBotReaction(event({ scoredCount: 3 }), history, () => 0, 20_000)).toBeNull();
    expect(chooseBotReaction(event({ scoredCount: 5 }), history, () => 0, 12_000)).toBeNull();
    expect(chooseBotReaction(event({ category: "fullHouse", points: 28, scoredCount: 5 }), history, () => 0, 20_000)).toBe("😈");
  });

  it("limite une partie à six réactions", () => {
    expect(chooseBotReaction(event({ category: "yatzy", points: 50 }), {
      ...INITIAL_BOT_REACTION_HISTORY,
      sentCount: 6,
    }, () => 0, 10_000)).toBeNull();
  });
});
