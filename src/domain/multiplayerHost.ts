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

export function createHostedGame(roomId: string): MultiplayerGameState {
  const game = createMultiplayerGame(roomId);
  return {
    ...game,
    player1: {
      playerId: HOST_PLAYER_ID,
      connectionId: HOST_CONNECTION_ID,
      state: freshPlayerState(),
    },
  };
}

export function restoreHostedGame(
  saved: MultiplayerGameState,
  roomId: string,
): MultiplayerGameState {
  return {
    ...saved,
    roomId,
    player1: saved.player1
      ? {
          ...saved.player1,
          playerId: HOST_PLAYER_ID,
          connectionId: HOST_CONNECTION_ID,
        }
      : createHostedGame(roomId).player1,
    player2: saved.player2
      ? { ...saved.player2, playerId: GUEST_PLAYER_ID, connectionId: null }
      : null,
  };
}

export function connectGuest(
  game: MultiplayerGameState,
  peerId: string,
): MultiplayerGameState {
  const player2 = game.player2
    ? { ...game.player2, playerId: GUEST_PLAYER_ID, connectionId: peerId }
    : {
        playerId: GUEST_PLAYER_ID,
        connectionId: peerId,
        state: freshPlayerState(),
      };

  return {
    ...game,
    status: game.status === "waiting" ? "playing" : game.status,
    player2,
  };
}

export function disconnectGuest(
  game: MultiplayerGameState,
  peerId: string,
): MultiplayerGameState {
  if (game.player2?.connectionId !== peerId) return game;
  return {
    ...game,
    player2: { ...game.player2, connectionId: null },
  };
}

export function applyPlayerAction(
  game: MultiplayerGameState,
  role: MultiplayerRole,
  action: ClientAction,
  rollDie: () => DieValue,
): MultiplayerGameState {
  if (action.type === "REMATCH") {
    return startRematch(requestRematch(game, role));
  }
  if (action.type === "ROLL") {
    return rollActivePlayer(game, role, rollDie);
  }
  if (action.type === "HOLD") {
    return holdActiveDie(game, role, action.index);
  }
  return scoreActiveCategory(game, role, action.category);
}

export function gameForStorage(game: MultiplayerGameState): MultiplayerGameState {
  return {
    ...game,
    player1: game.player1
      ? { ...game.player1, connectionId: HOST_CONNECTION_ID }
      : null,
    player2: game.player2 ? { ...game.player2, connectionId: null } : null,
  };
}
