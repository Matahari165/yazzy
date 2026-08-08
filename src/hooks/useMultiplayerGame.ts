"use client";

import { useCallback, useState } from "react";
import usePartySocket from "partysocket/react";
import { createGame, rollPlayerTurn, scoreHumanTurn, scoreBotTurn, togglePlayerHeld, type GameState, isFinished } from "../domain/game";
import type { CategoryId } from "../domain/yatzy";

export function useMultiplayerGame(roomId: string, localPlayerId: "human" | "bot") {
  const [game, setGame] = useState<GameState>(() => createGame("multiplayer", roomId));
  const [hasLoaded, setHasLoaded] = useState(false);

  const socket = usePartySocket({
    host: process.env.NEXT_PUBLIC_PARTYKIT_HOST || "127.0.0.1:1999",
    room: roomId,
    onMessage: (e) => {
      try {
        const nextState = JSON.parse(e.data);
        setGame(nextState);
        setHasLoaded(true);
      } catch {}
    },
    onOpen: () => {
      setTimeout(() => {
        setHasLoaded((loaded) => {
          if (!loaded) {
            setGame((current) => {
              socket.send(JSON.stringify(current));
              return current;
            });
            return true;
          }
          return loaded;
        });
      }, 500);
    }
  });

  const roll = useCallback(() => {
    setGame((current) => {
      if (current.activePlayer !== localPlayerId) return current;
      const playerField = localPlayerId === "human" ? "human" : "bot";
      const nextState = {
        ...current,
        [playerField]: rollPlayerTurn(current[playerField]),
      };
      socket.send(JSON.stringify(nextState));
      return nextState;
    });
  }, [localPlayerId, socket]);

  const toggleHeld = useCallback((index: number) => {
    setGame((current) => {
      if (current.activePlayer !== localPlayerId) return current;
      const playerField = localPlayerId === "human" ? "human" : "bot";
      const nextState = {
        ...current,
        [playerField]: togglePlayerHeld(current[playerField], index),
      };
      socket.send(JSON.stringify(nextState));
      return nextState;
    });
  }, [localPlayerId, socket]);

  const score = useCallback((category: CategoryId) => {
    setGame((current) => {
      if (current.activePlayer !== localPlayerId) return current;
      const nextState = localPlayerId === "human" ? scoreHumanTurn(current, category) : scoreBotTurn(current, category);
      socket.send(JSON.stringify(nextState));
      return nextState;
    });
  }, [localPlayerId, socket]);

  return {
    game,
    roll,
    toggleHeld,
    score,
    isFinished: isFinished(game),
    hasLoaded,
    isOpponentTurn: game.activePlayer !== localPlayerId,
  };
}
