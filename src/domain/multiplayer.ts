import { type CategoryId, type DieValue, scoreDice, CATEGORY_IDS } from "./yatzy";
import { isPlayerName } from "./playerName";
import { flipFairCoin } from "../lib/random";

export type MultiplayerRole = "player1" | "player2";

export type MultiplayerPlayerState = {
  dice: DieValue[];
  held: boolean[];
  rollNumber: number;
  scores: Partial<Record<CategoryId, number>>;
};

export type PlayerSlot = {
  playerId: string;
  name: string;
  connectionId: string | null;
  state: MultiplayerPlayerState;
};

export type MultiplayerGameState = {
  roomId: string;
  status: "waiting" | "playing" | "finished";
  player1: PlayerSlot | null;
  player2: PlayerSlot | null;
  activePlayer: MultiplayerRole;
  turn: number;
  rematchReady: MultiplayerRole[];
};

const emptyHeld = (): boolean[] => [false, false, false, false, false];

export function freshPlayerState(
  scores: Partial<Record<CategoryId, number>> = {},
): MultiplayerPlayerState {
  return {
    dice: [],
    held: emptyHeld(),
    rollNumber: 0,
    scores,
  };
}

export function randomMultiplayerRole(): MultiplayerRole {
  return flipFairCoin() ? "player1" : "player2";
}

export function createMultiplayerGame(
  roomId: string,
  startingPlayer: MultiplayerRole = randomMultiplayerRole(),
): MultiplayerGameState {
  return {
    roomId,
    status: "waiting",
    player1: null,
    player2: null,
    activePlayer: startingPlayer,
    turn: 1,
    rematchReady: [],
  };
}

export function rollPlayerDice(
  player: MultiplayerPlayerState,
  rollDie: () => DieValue,
): MultiplayerPlayerState {
  if (player.rollNumber >= 3 || (player.rollNumber > 0 && player.held.every(Boolean))) {
    return player;
  }

  const dice = Array.from({ length: 5 }, (_, index) =>
    player.rollNumber > 0 && player.held[index] ? player.dice[index] : rollDie(),
  ) as DieValue[];

  return {
    ...player,
    dice,
    held: player.rollNumber === 0 ? emptyHeld() : player.held,
    rollNumber: player.rollNumber + 1,
  };
}

export function toggleHeldDie(
  player: MultiplayerPlayerState,
  index: number,
): MultiplayerPlayerState {
  if (player.rollNumber === 0 || player.rollNumber >= 3 || index < 0 || index >= 5) {
    return player;
  }

  const held = [...player.held];
  held[index] = !held[index];

  return {
    ...player,
    held,
  };
}

export function scoreCategory(
  player: MultiplayerPlayerState,
  category: CategoryId,
): MultiplayerPlayerState {
  if (player.rollNumber === 0 || player.dice.length !== 5 || player.scores[category] !== undefined) {
    return player;
  }

  return {
    dice: [],
    held: emptyHeld(),
    rollNumber: 0,
    scores: {
      ...player.scores,
      [category]: scoreDice(category, player.dice),
    },
  };
}

export function isCategoryId(value: string): value is CategoryId {
  return CATEGORY_IDS.includes(value as CategoryId);
}

function isPlayerState(value: unknown): value is MultiplayerPlayerState {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<MultiplayerPlayerState>;
  const scores = state.scores;

  return Boolean(
    Array.isArray(state.dice) &&
      (state.dice.length === 0 || state.dice.length === 5) &&
      state.dice.every((die) => Number.isInteger(die) && die >= 1 && die <= 6) &&
      Array.isArray(state.held) &&
      state.held.length === 5 &&
      state.held.every((held) => typeof held === "boolean") &&
      Number.isInteger(state.rollNumber) &&
      state.rollNumber! >= 0 &&
      state.rollNumber! <= 3 &&
      scores &&
      typeof scores === "object" &&
      Object.entries(scores).every(
        ([category, score]) =>
          isCategoryId(category) && typeof score === "number" && Number.isFinite(score),
      ),
  );
}

function isPlayerSlot(value: unknown): value is PlayerSlot | null {
  if (value === null) return true;
  if (!value || typeof value !== "object") return false;
  const slot = value as Partial<PlayerSlot>;
  return Boolean(
    typeof slot.playerId === "string" &&
      isPlayerName(slot.name) &&
      (slot.connectionId === null || typeof slot.connectionId === "string") &&
      isPlayerState(slot.state),
  );
}

export function isMultiplayerGameState(value: unknown): value is MultiplayerGameState {
  if (!value || typeof value !== "object") return false;
  const game = value as Partial<MultiplayerGameState>;
  return Boolean(
    typeof game.roomId === "string" &&
      (game.status === "waiting" || game.status === "playing" || game.status === "finished") &&
      isPlayerSlot(game.player1) &&
      isPlayerSlot(game.player2) &&
      (game.activePlayer === "player1" || game.activePlayer === "player2") &&
      Number.isInteger(game.turn) &&
      game.turn! >= 1 &&
      game.turn! <= CATEGORY_IDS.length + 1 &&
      Array.isArray(game.rematchReady) &&
      game.rematchReady.every((role) => role === "player1" || role === "player2") &&
      new Set(game.rematchReady).size === game.rematchReady.length,
  );
}

export function isGameFinished(game: MultiplayerGameState): boolean {
  if (!game.player1 || !game.player2) return false;
  return CATEGORY_IDS.every(
    (category) =>
      game.player1!.state.scores[category] !== undefined &&
      game.player2!.state.scores[category] !== undefined
  );
}

export function switchTurn(game: MultiplayerGameState): MultiplayerGameState {
  const isPlayer2 = game.activePlayer === "player2";
  return {
    ...game,
    activePlayer: isPlayer2 ? "player1" : "player2",
    turn: isPlayer2 ? Math.min(CATEGORY_IDS.length + 1, game.turn + 1) : game.turn,
  };
}

function canPlay(game: MultiplayerGameState, role: MultiplayerRole): boolean {
  return Boolean(
    game.status === "playing" &&
    game.activePlayer === role &&
    game[role] &&
    game.player1?.connectionId &&
    game.player2?.connectionId,
  );
}

export function rollActivePlayer(
  game: MultiplayerGameState,
  role: MultiplayerRole,
  rollDie: () => DieValue,
): MultiplayerGameState {
  if (!canPlay(game, role)) return game;
  const player = game[role]!;
  const state = rollPlayerDice(player.state, rollDie);
  return state === player.state ? game : { ...game, [role]: { ...player, state } };
}

export function holdActiveDie(
  game: MultiplayerGameState,
  role: MultiplayerRole,
  index: number,
): MultiplayerGameState {
  if (!canPlay(game, role)) return game;
  const player = game[role]!;
  const state = toggleHeldDie(player.state, index);
  return state === player.state ? game : { ...game, [role]: { ...player, state } };
}

export function scoreActiveCategory(
  game: MultiplayerGameState,
  role: MultiplayerRole,
  category: CategoryId,
): MultiplayerGameState {
  if (!canPlay(game, role)) return game;
  const player = game[role]!;
  const state = scoreCategory(player.state, category);
  if (state === player.state) return game;

  let next = switchTurn({ ...game, [role]: { ...player, state } });
  const nextRole = next.activePlayer;
  const nextPlayer = next[nextRole]!;
  next = {
    ...next,
    [nextRole]: {
      ...nextPlayer,
      state: freshPlayerState(nextPlayer.state.scores),
    },
  };

  return isGameFinished(next) ? { ...next, status: "finished" } : next;
}

export function requestRematch(
  game: MultiplayerGameState,
  role: MultiplayerRole,
): MultiplayerGameState {
  if (game.status !== "finished" || game.rematchReady.includes(role)) return game;
  return { ...game, rematchReady: [...game.rematchReady, role] };
}

export function startRematch(
  game: MultiplayerGameState,
  startingPlayer: MultiplayerRole = randomMultiplayerRole(),
): MultiplayerGameState {
  if (!game.player1 || !game.player2 || game.rematchReady.length !== 2) return game;

  return {
    ...createMultiplayerGame(game.roomId, startingPlayer),
    status: "playing",
    player1: { ...game.player1, state: freshPlayerState() },
    player2: { ...game.player2, state: freshPlayerState() },
  };
}
