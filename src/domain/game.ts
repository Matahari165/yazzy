import type { BotLevel } from "./bots";
import { flipFairCoin, rollFairDie } from "../lib/random";
import { CATEGORY_BY_ID, CATEGORY_IDS, scoreDice, type CategoryId, type DieValue } from "./yatzy";

export const GAME_VERSION = 3;
export const GAME_STORAGE_KEY = "yazzy.game.v3";

export type PlayerId = "human" | "bot";
export type BotTurnStatus = "idle" | "rolling" | "waiting" | "choosing";

export type PlayerState = {
  dice: DieValue[];
  held: boolean[];
  rollNumber: number;
  scores: Partial<Record<CategoryId, number>>;
};

export type BotTurnState = {
  status: BotTurnStatus;
  targetCategory: CategoryId | null;
  message: string | null;
};

export type GameState = {
  version: typeof GAME_VERSION;
  mode: "bot";
  botLevel: BotLevel;
  activePlayer: PlayerId;
  turn: number;
  human: PlayerState;
  bot: PlayerState;
  botTurn: BotTurnState;
};

const emptyHeld = (): boolean[] => [false, false, false, false, false];

const freshPlayer = (scores: Partial<Record<CategoryId, number>> = {}): PlayerState => ({
  dice: [],
  held: emptyHeld(),
  rollNumber: 0,
  scores,
});

export function createGame(
  botLevel: BotLevel,
  startingPlayer: PlayerId = flipFairCoin() ? "human" : "bot",
): GameState {
  return {
    version: GAME_VERSION,
    mode: "bot",
    botLevel,
    activePlayer: startingPlayer,
    turn: 1,
    human: freshPlayer(),
    bot: freshPlayer(),
    botTurn: startingPlayer === "bot"
      ? { status: "rolling", targetCategory: null, message: "Le bot joue." }
      : { status: "idle", targetCategory: null, message: null },
  };
}

const isDieValue = (value: unknown): value is DieValue =>
  Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 6;

const isCategory = (value: string): value is CategoryId => CATEGORY_IDS.includes(value as CategoryId);

function isStoredPlayer(value: unknown): value is PlayerState {
  if (!value || typeof value !== "object") return false;
  const player = value as Partial<PlayerState>;
  const scores = player.scores && typeof player.scores === "object" && !Array.isArray(player.scores)
    ? Object.entries(player.scores)
    : [];
  const rollNumber = player.rollNumber;
  if (typeof rollNumber !== "number" || !Number.isInteger(rollNumber) || rollNumber < 0 || rollNumber > 3) return false;
  return (
    Array.isArray(player.dice) &&
    (player.dice.length === 0 || player.dice.length === 5) &&
    player.dice.every(isDieValue) &&
    Array.isArray(player.held) &&
    player.held.length === 5 &&
    player.held.every((held) => typeof held === "boolean") &&
    !!player.scores &&
    typeof player.scores === "object" &&
    !Array.isArray(player.scores) &&
    scores.length <= CATEGORY_IDS.length &&
    scores.every(([category, score]) => isCategory(category) && Number.isInteger(score) && Number(score) >= 0 && Number(score) <= 50) &&
    (rollNumber === 0 ? player.dice.length === 0 : player.dice.length === 5)
  );
}

export function isStoredGame(value: unknown): value is GameState {
  if (!value || typeof value !== "object") return false;
  const game = value as Partial<GameState>;
  const humanCount = game.human && typeof game.human === "object" ? Object.keys(game.human.scores ?? {}).length : -1;
  const botCount = game.bot && typeof game.bot === "object" ? Object.keys(game.bot.scores ?? {}).length : -1;
  const hasValidScoreOrder = humanCount === botCount || (
    humanCount === botCount + 1 && game.activePlayer === "bot"
  ) || (
    botCount === humanCount + 1 && game.activePlayer === "human"
  );
  const botTurn = game.botTurn;
  const turn = game.turn;
  if (typeof turn !== "number" || !Number.isInteger(turn) || turn < 1 || turn > CATEGORY_IDS.length + 1) return false;
  const hasValidTarget = Boolean(botTurn?.targetCategory === null || botTurn?.status === "idle" || (
    typeof botTurn?.targetCategory === "string" &&
    isCategory(botTurn.targetCategory) &&
    game.bot &&
    typeof game.bot === "object" &&
    game.bot.scores?.[botTurn.targetCategory] === undefined
  ));
  return (
    game.version === GAME_VERSION &&
    game.mode === "bot" &&
    (game.botLevel === "discovery" || game.botLevel === "calculator" || game.botLevel === "strategist") &&
    (game.activePlayer === "human" || game.activePlayer === "bot") &&
    hasValidScoreOrder &&
    turn === botCount + 1 &&
    isStoredPlayer(game.human) &&
    isStoredPlayer(game.bot) &&
    !!botTurn &&
    (botTurn.status === "idle" || botTurn.status === "rolling" || botTurn.status === "waiting" || botTurn.status === "choosing") &&
    hasValidTarget &&
    (botTurn.message === null || typeof botTurn.message === "string") &&
    (game.activePlayer === "human" ? botTurn.status === "idle" : botTurn.status !== "idle")
  );
}

export function rollPlayerTurn(
  current: PlayerState,
  rollDie: () => DieValue = rollFairDie,
): PlayerState {
  if (current.rollNumber >= 3 || (current.rollNumber > 0 && current.held.every(Boolean))) return current;

  const dice = Array.from({ length: 5 }, (_, index) =>
    current.rollNumber > 0 && current.held[index] ? current.dice[index] : rollDie(),
  );

  return {
    ...current,
    dice,
    held: current.rollNumber === 0 ? emptyHeld() : current.held,
    rollNumber: current.rollNumber + 1,
  };
}

export function togglePlayerHeld(current: PlayerState, index: number): PlayerState {
  if (current.rollNumber === 0 || current.rollNumber >= 3 || index < 0 || index >= 5) return current;
  return { ...current, held: current.held.map((held, dieIndex) => (dieIndex === index ? !held : held)) };
}

function scorePlayerTurn(current: PlayerState, category: CategoryId): PlayerState {
  if (current.rollNumber === 0 || current.dice.length !== 5 || current.scores[category] !== undefined) return current;
  return {
    dice: [],
    held: emptyHeld(),
    rollNumber: 0,
    scores: { ...current.scores, [category]: scoreDice(category, current.dice) },
  };
}

export function scoreHumanTurn(current: GameState, category: CategoryId): GameState {
  if (current.activePlayer !== "human") return current;
  const human = scorePlayerTurn(current.human, category);
  if (human === current.human) return current;
  const finished = CATEGORY_IDS.every(
    (categoryId) => human.scores[categoryId] !== undefined && current.bot.scores[categoryId] !== undefined,
  );
  if (finished) {
    return {
      ...current,
      human,
      activePlayer: "human",
      botTurn: { status: "idle", targetCategory: null, message: null },
    };
  }
  return {
    ...current,
    human,
    activePlayer: "bot",
    bot: freshPlayer(current.bot.scores),
    botTurn: { status: "rolling", targetCategory: null, message: "Le bot joue." },
  };
}

export function scoreBotTurn(current: GameState, category: CategoryId): GameState {
  if (current.activePlayer !== "bot") return current;
  const bot = scorePlayerTurn(current.bot, category);
  if (bot === current.bot) return current;
  const points = bot.scores[category] ?? 0;
  return {
    ...current,
    bot,
    activePlayer: "human",
    turn: Math.min(CATEGORY_IDS.length + 1, current.turn + 1),
    botTurn: {
      status: "idle",
      targetCategory: category,
      message: `Bot : ${CATEGORY_BY_ID[category].label} · ${points} point${points > 1 ? "s" : ""}.`,
    },
  };
}

export function isFinished(game: GameState): boolean {
  return CATEGORY_IDS.every((category) => game.human.scores[category] !== undefined && game.bot.scores[category] !== undefined);
}
