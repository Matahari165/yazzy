import { type CategoryId, type DieValue, scoreDice, CATEGORY_IDS } from "./yatzy";

export type MultiplayerPlayerState = {
  dice: DieValue[];
  held: boolean[];
  rollNumber: number;
  scores: Partial<Record<CategoryId, number>>;
};

export type PlayerSlot = {
  playerId: string;
  connectionId: string | null;
  state: MultiplayerPlayerState;
};

export type MultiplayerGameState = {
  roomId: string;
  status: "waiting" | "playing" | "finished";
  player1: PlayerSlot | null;
  player2: PlayerSlot | null;
  activePlayer: "player1" | "player2";
  turn: number;
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

export function createMultiplayerGame(roomId: string): MultiplayerGameState {
  return {
    roomId,
    status: "waiting",
    player1: null,
    player2: null,
    activePlayer: "player1",
    turn: 1,
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

export function isGameFinished(game: MultiplayerGameState): boolean {
  if (!game.player1 || !game.player2) return false;
  return CATEGORY_IDS.every(
    (category) =>
      game.player1!.state.scores[category] !== undefined &&
      game.player2!.state.scores[category] !== undefined
  );
}

export function getActivePlayerSlot(game: MultiplayerGameState): PlayerSlot | null {
  return game[game.activePlayer];
}

export function switchTurn(game: MultiplayerGameState): MultiplayerGameState {
  const isPlayer2 = game.activePlayer === "player2";
  return {
    ...game,
    activePlayer: isPlayer2 ? "player1" : "player2",
    turn: isPlayer2 ? Math.min(CATEGORY_IDS.length + 1, game.turn + 1) : game.turn,
  };
}
