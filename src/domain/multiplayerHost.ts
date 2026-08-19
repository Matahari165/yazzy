import {
  createMultiplayerGame,
  freshPlayerState,
  holdActiveDie,
  requestRematch,
  rollActivePlayer,
  scoreActiveCategory,
  startRematch,
  type MultiplayerGameState,
  type MultiplayerRole,
} from "./multiplayer";
import type { ClientAction } from "./protocol";
import type { DieValue } from "./yatzy";

const HOST_PLAYER_ID = "host";
const HOST_CONNECTION_ID = "local-host";
const GUEST_PLAYER_ID = "guest";
const GUEST_CONNECTION_ID = "server-guest";

export function createHostedGame(
  roomId: string,
  playerName = "Joueur 1",
  startingPlayer?: MultiplayerRole,
): MultiplayerGameState {
  const game = createMultiplayerGame(roomId, startingPlayer);
  return {
    ...game,
    player1: {
      playerId: HOST_PLAYER_ID,
      name: playerName,
      connectionId: HOST_CONNECTION_ID,
      state: freshPlayerState(),
    },
  };
}

export function connectGuest(
  game: MultiplayerGameState,
  playerName = "Joueur 2",
  connectionId = GUEST_CONNECTION_ID,
): MultiplayerGameState {
  const player2 = game.player2
    ? { ...game.player2, playerId: GUEST_PLAYER_ID, name: playerName, connectionId }
    : {
        playerId: GUEST_PLAYER_ID,
        name: playerName,
        connectionId,
        state: freshPlayerState(),
      };

  return {
    ...game,
    status: game.status === "waiting" ? "playing" : game.status,
    player2,
  };
}

export function applyPlayerAction(
  game: MultiplayerGameState,
  role: MultiplayerRole,
  action: ClientAction,
  rollDie: () => DieValue,
  pickStartingPlayer?: () => MultiplayerRole,
): MultiplayerGameState {
  if (action.type === "REMATCH") {
    const readyGame = requestRematch(game, role);
    return readyGame.rematchReady.length === 2
      ? startRematch(readyGame, pickStartingPlayer?.())
      : readyGame;
  }
  if (action.type === "ROLL") {
    return rollActivePlayer(game, role, rollDie);
  }
  if (action.type === "HOLD") {
    return holdActiveDie(game, role, action.index);
  }
  return scoreActiveCategory(game, role, action.category);
}
