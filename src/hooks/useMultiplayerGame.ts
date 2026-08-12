"use client";

import { useCallback, useState } from "react";
import usePartySocket from "partysocket/react";
import type { MultiplayerGameState } from "../domain/multiplayer";
import type { ServerMessage, ClientAction } from "../domain/protocol";
import type { CategoryId } from "../domain/yatzy";

function getPlayerId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("yazzy.playerId");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("yazzy.playerId", id);
  }
  return id;
}

export type MultiplayerStatus = "connecting" | "waiting" | "playing" | "finished" | "room_full";

export function useMultiplayerGame(roomId: string) {
  const [game, setGame] = useState<MultiplayerGameState | null>(null);
  const [localRole, setLocalRole] = useState<"player1" | "player2" | null>(null);
  const [opponentOnline, setOpponentOnline] = useState(false);
  const [serverStatus, setServerStatus] = useState<MultiplayerStatus>("connecting");
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const playerId = getPlayerId();

  const socket = usePartySocket({
    host: process.env.NEXT_PUBLIC_PARTYKIT_HOST || "localhost:1999",
    room: roomId,
    query: { playerId },
    onOpen: () => {
      setIsConnected(true);
      setConnectionError(null);
    },
    onClose: () => {
      setIsConnected(false);
    },
    onError: () => {
      setConnectionError("Connexion interrompue. Yazzy essaie de te reconnecter.");
    },
    onMessage: (e) => {
      try {
        const msg = JSON.parse(e.data) as ServerMessage;
        switch (msg.type) {
          case "GAME_STATE":
            setGame(msg.state);
            setLocalRole(msg.yourRole);
            if (msg.yourRole === "player1") {
              setOpponentOnline(!!msg.state.player2?.connectionId);
            } else if (msg.yourRole === "player2") {
              setOpponentOnline(!!msg.state.player1?.connectionId);
            }
            break;
          case "ROOM_FULL":
            setServerStatus("room_full");
            break;
          case "ERROR":
            setConnectionError(msg.message);
            break;
        }
      } catch (err) {
        console.error("Failed to parse server message:", err);
      }
    },
  });

  const roll = useCallback(() => {
    const action: ClientAction = { type: "ROLL" };
    socket.send(JSON.stringify(action));
  }, [socket]);

  const toggleHeld = useCallback((index: number) => {
    const action: ClientAction = { type: "HOLD", index };
    socket.send(JSON.stringify(action));
  }, [socket]);

  const score = useCallback((category: CategoryId) => {
    const action: ClientAction = { type: "SCORE", category };
    socket.send(JSON.stringify(action));
  }, [socket]);

  const rematch = useCallback(() => {
    const action: ClientAction = { type: "REMATCH" };
    socket.send(JSON.stringify(action));
  }, [socket]);

  const reconnect = useCallback(() => {
    setConnectionError(null);
    socket.reconnect();
  }, [socket]);

  let status: MultiplayerStatus = serverStatus;
  if (status !== "room_full") {
    if (!game) {
      status = "connecting";
    } else {
      status = game.status;
    }
  }

  const isMyTurn = game?.activePlayer === localRole;
  const localPlayer = localRole && game ? game[localRole] : null;
  
  const opponentRole = localRole === "player1" ? "player2" : localRole === "player2" ? "player1" : null;
  const opponentPlayer = opponentRole && game ? game[opponentRole] : null;

  return {
    game,
    localRole,
    opponentOnline,
    isConnected,
    connectionError,
    status,
    roll,
    toggleHeld,
    score,
    rematch,
    reconnect,
    isMyTurn,
    localPlayer,
    opponentPlayer,
  };
}
