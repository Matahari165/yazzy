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

  const socket = usePartySocket({
    host: process.env.NEXT_PUBLIC_PARTYKIT_HOST || "localhost:1999",
    room: roomId,
    id: getPlayerId(),
    onMessage: (e) => {
      try {
        const msg = JSON.parse(e.data) as ServerMessage;
        switch (msg.type) {
          case "GAME_STATE":
            setGame(msg.state);
            setLocalRole(msg.yourRole);
            // Optionally derive opponentOnline from GAME_STATE if the other slot is filled and has a connectionId
            if (msg.yourRole === "player1") {
              setOpponentOnline(!!msg.state.player2?.connectionId);
            } else if (msg.yourRole === "player2") {
              setOpponentOnline(!!msg.state.player1?.connectionId);
            }
            break;
          case "WAITING_FOR_OPPONENT":
            break;
          case "OPPONENT_CONNECTED":
            setOpponentOnline(true);
            break;
          case "OPPONENT_DISCONNECTED":
            setOpponentOnline(false);
            break;
          case "ROOM_FULL":
            setServerStatus("room_full");
            break;
          case "ERROR":
            console.error("Server error:", msg.message);
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
    status,
    roll,
    toggleHeld,
    score,
    rematch,
    isMyTurn,
    localPlayer,
    opponentPlayer,
  };
}
