import { describe, expect, it } from "vitest";
import { completeBotTurn } from "./bots/turn";
import {
  createGame,
  isStoredGame,
  rollPlayerTurn,
  scoreBotTurn,
  scoreHumanTurn,
  type PlayerState,
} from "./game";

const diceRoll = (...values: (1 | 2 | 3 | 4 | 5 | 6)[]) => {
  let index = 0;
  return () => values[index++ % values.length];
};

const rolledHuman = (scores: PlayerState["scores"] = {}): PlayerState => ({
  dice: [6, 5, 4, 3, 2],
  held: [false, false, false, false, false],
  rollNumber: 1,
  scores,
});

describe("partie à deux joueurs", () => {
  it("fait passer la main du joueur au bot après une inscription", () => {
    const current = { ...createGame("bot", "calculator"), human: rolledHuman() };
    const next = scoreHumanTurn(current, "largeStraight");

    expect(next.activePlayer).toBe("bot");
    expect(next.human.scores.largeStraight).toBe(20);
    expect(next.botTurn.status).toBe("rolling");
  });

  it("rend la main au joueur après le score du bot", () => {
    const current = {
      ...createGame("bot", "discovery"),
      activePlayer: "bot" as const,
      turn: 1,
      human: { ...rolledHuman({ largeStraight: 20 }), dice: [], rollNumber: 0 },
      bot: rolledHuman(),
      botTurn: { status: "choosing" as const, targetCategory: "largeStraight" as const, message: "Le bot joue." },
    };
    const next = scoreBotTurn(current, "largeStraight");

    expect(next.activePlayer).toBe("human");
    expect(next.turn).toBe(2);
    expect(next.bot.scores.largeStraight).toBe(20);
    expect(next.botTurn.status).toBe("idle");
    expect(isStoredGame(next)).toBe(true);
  });

  it("ne laisse pas le niveau modifier le générateur de dés", () => {
    const values: (1 | 2 | 3 | 4 | 5 | 6)[] = [1, 2, 3, 4, 5];
    const results = ["discovery", "calculator", "strategist"].map((botLevel) =>
      rollPlayerTurn(createGame("bot", botLevel as "discovery" | "calculator" | "strategist").human, diceRoll(...values)),
    );

    expect(results.map((result) => result.dice)).toEqual([
      [1, 2, 3, 4, 5],
      [1, 2, 3, 4, 5],
      [1, 2, 3, 4, 5],
    ]);
  });

  it("termine une séquence de tour bot avec un tirage injecté", () => {
    const current = { ...createGame("bot", "discovery"), activePlayer: "bot" as const, botTurn: { status: "rolling" as const, targetCategory: null, message: "Le bot joue." } };
    const next = completeBotTurn(current, diceRoll(6, 6, 6, 2, 3, 4, 5, 1));

    expect(next.activePlayer).toBe("human");
    expect(Object.keys(next.bot.scores)).toHaveLength(1);
    expect(next.bot.rollNumber).toBe(0);
  });

  it("valide uniquement la sauvegarde version 3 sans toucher à l'ancienne", () => {
    const game = createGame("bot", "strategist");
    expect(isStoredGame(game)).toBe(true);
    expect(isStoredGame({ ...game, version: 2 })).toBe(false);
    expect(isStoredGame({ ...game, mode: "solo" })).toBe(false);
  });
});
