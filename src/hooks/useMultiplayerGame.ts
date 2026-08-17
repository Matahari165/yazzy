"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DataPayload, MessageAction, Room } from "@trystero-p2p/mqtt";
import {
  isMultiplayerGameState,
  type MultiplayerGameState,
  type MultiplayerRole,
} from "../domain/multiplayer";
import {
  applyPlayerAction,
  connectGuest,
  createHostedGame,
  disconnectGuest,
  gameForStorage,
  restoreHostedGame,
} from "../domain/multiplayerHost";
import { parseClientActionValue, type ClientAction } from "../domain/protocol";
import type { CategoryId } from "../domain/yatzy";
import { rollFairDie } from "../lib/random";

const APP_ID = "com.yazzy.game.online.v1";
const HOST_STORAGE_PREFIX = "yazzy.multiplayer.host.v1.";
const MQTT_RELAY_URLS = [
  "wss://broker.emqx.io:8084/mqtt",
  "wss://broker-cn.emqx.io:8084/mqtt",
  "wss://broker.hivemq.com:8884/mqtt",
];

type HelloMessage = { role: "host" | "guest" };
type StateMessage = {
  state: MultiplayerGameState;
  yourRole: MultiplayerRole;
};
type ControlMessage = { type: "ROOM_FULL" };

function isHelloMessage(value: unknown): value is HelloMessage {
  return Boolean(
    value &&
      typeof value === "object" &&
      "role" in value &&
      (value.role === "host" || value.role === "guest"),
  );
}

function isStateMessage(value: unknown): value is StateMessage {
  return Boolean(
    value &&
      typeof value === "object" &&
      "state" in value &&
      "yourRole" in value &&
      (value.yourRole === "player1" || value.yourRole === "player2") &&
      isMultiplayerGameState(value.state),
  );
}

function isControlMessage(value: unknown): value is ControlMessage {
  return Boolean(
    value &&
      typeof value === "object" &&
      "type" in value &&
      value.type === "ROOM_FULL",
  );
}

function readHostedGame(roomId: string): MultiplayerGameState {
  const fallback = createHostedGame(roomId);
  try {
    const raw = localStorage.getItem(`${HOST_STORAGE_PREFIX}${roomId}`);
    if (!raw) return fallback;
    const saved: unknown = JSON.parse(raw);
    if (!isMultiplayerGameState(saved) || saved.roomId !== roomId) return fallback;
    return restoreHostedGame(saved, roomId);
  } catch {
    return fallback;
  }
}

function sendMessage(
  action: MessageAction | null,
  payload: unknown,
  target: string,
  onError?: () => void,
) {
  if (!action) return;
  void action
    .send(payload as DataPayload, { target })
    .catch(() => onError?.());
}

export type MultiplayerStatus =
  | "connecting"
  | "waiting"
  | "playing"
  | "finished"
  | "room_full";

export function useMultiplayerGame(roomId: string, isHost: boolean) {
  const initialGame = isHost ? createHostedGame(roomId) : null;
  const [game, setGame] = useState<MultiplayerGameState | null>(initialGame);
  const [localRole, setLocalRole] = useState<MultiplayerRole | null>(
    isHost ? "player1" : null,
  );
  const [opponentOnline, setOpponentOnline] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [roomFull, setRoomFull] = useState(false);
  const [connectionAttempt, setConnectionAttempt] = useState(0);

  const gameRef = useRef<MultiplayerGameState | null>(initialGame);
  const stateActionRef = useRef<MessageAction | null>(null);
  const clientActionRef = useRef<MessageAction | null>(null);
  const guestPeerRef = useRef<string | null>(null);
  const hostPeerRef = useRef<string | null>(null);

  const persistHostGame = useCallback((next: MultiplayerGameState) => {
    try {
      localStorage.setItem(
        `${HOST_STORAGE_PREFIX}${roomId}`,
        JSON.stringify(gameForStorage(next)),
      );
    } catch {
      // La partie reste jouable si le stockage local est indisponible.
    }
  }, [roomId]);

  const commitHostGame = useCallback((next: MultiplayerGameState, broadcast = true) => {
    gameRef.current = next;
    setGame(next);
    persistHostGame(next);

    const guestPeer = guestPeerRef.current;
    if (broadcast && guestPeer) {
      sendMessage(stateActionRef.current, { state: next, yourRole: "player2" }, guestPeer);
    }
  }, [persistHostGame]);

  useEffect(() => {
    let cancelled = false;
    let activeRoom: Room | null = null;

    const setupRoom = async () => {
      try {
        const { joinRoom } = await import("@trystero-p2p/mqtt");
        if (cancelled) return;

        const room = joinRoom(
          {
            appId: APP_ID,
            password: roomId,
            relayConfig: { urls: MQTT_RELAY_URLS },
          },
          roomId,
          {
            onJoinError: ({ error }) => {
              if (cancelled) return;
              console.warn("Échec de la liaison privée Yazzy:", error);
              setIsConnected(false);
              setConnectionError("La liaison directe a échoué. Réessaie dans un instant.");
            },
          },
        );
        activeRoom = room;

        const helloAction = room.makeAction("yz-hello");
        const stateAction = room.makeAction("yz-state");
        const clientAction = room.makeAction("yz-action");
        const controlAction = room.makeAction("yz-control");
        stateActionRef.current = stateAction;
        clientActionRef.current = clientAction;

        const reportSendError = () => {
          if (!cancelled) {
            setConnectionError("Un échange a échoué. Yazzy essaie de rétablir la partie.");
          }
        };

        const sendHello = (peerId: string) => {
          sendMessage(
            helloAction,
            { role: isHost ? "host" : "guest" },
            peerId,
            reportSendError,
          );
        };

        const sendState = (peerId: string, next: MultiplayerGameState) => {
          sendMessage(
            stateAction,
            { state: next, yourRole: "player2" },
            peerId,
            reportSendError,
          );
        };

        helloAction.onMessage = (payload, { peerId }) => {
          if (!isHelloMessage(payload)) return;

          if (isHost) {
            if (payload.role !== "guest") return;
            const currentGuest = guestPeerRef.current;
            if (currentGuest && currentGuest !== peerId) {
              sendMessage(controlAction, { type: "ROOM_FULL" }, peerId);
              return;
            }

            guestPeerRef.current = peerId;
            setOpponentOnline(true);
            setConnectionError(null);
            const current = gameRef.current ?? createHostedGame(roomId);
            const next = connectGuest(current, peerId);
            commitHostGame(next, false);
            sendState(peerId, next);
            return;
          }

          if (payload.role !== "host") return;
          const currentHost = hostPeerRef.current;
          if (currentHost && currentHost !== peerId) return;
          hostPeerRef.current = peerId;
          setConnectionError(null);
          sendHello(peerId);
        };

        stateAction.onMessage = (payload, { peerId }) => {
          if (isHost || !isStateMessage(payload) || payload.yourRole !== "player2") return;
          const currentHost = hostPeerRef.current;
          if (currentHost && currentHost !== peerId) return;

          hostPeerRef.current = peerId;
          gameRef.current = payload.state;
          setGame(payload.state);
          setLocalRole("player2");
          setIsConnected(true);
          setOpponentOnline(true);
          setConnectionError(null);
        };

        clientAction.onMessage = (payload, { peerId }) => {
          if (!isHost || guestPeerRef.current !== peerId) return;
          const action = parseClientActionValue(payload);
          const current = gameRef.current;
          if (!action || !current) return;
          const next = applyPlayerAction(current, "player2", action, rollFairDie);
          if (next !== current) commitHostGame(next);
        };

        controlAction.onMessage = (payload, { peerId }) => {
          if (isHost || !isControlMessage(payload)) return;
          if (hostPeerRef.current && hostPeerRef.current !== peerId) return;
          if (payload.type === "ROOM_FULL") {
            setRoomFull(true);
            setIsConnected(false);
          }
        };

        room.onPeerJoin = (peerId) => sendHello(peerId);
        room.onPeerLeave = (peerId) => {
          if (isHost && guestPeerRef.current === peerId) {
            guestPeerRef.current = null;
            setOpponentOnline(false);
            const current = gameRef.current;
            if (current) commitHostGame(disconnectGuest(current, peerId), false);
          } else if (!isHost && hostPeerRef.current === peerId) {
            hostPeerRef.current = null;
            setIsConnected(false);
            setOpponentOnline(false);
            setConnectionError("Ton ami a quitté la partie. La reconnexion reste ouverte.");
          }
        };

        if (isHost) setIsConnected(true);
        Object.keys(room.getPeers()).forEach(sendHello);
      } catch {
        if (!cancelled) {
          setIsConnected(false);
          setConnectionError("Impossible d’ouvrir la connexion privée. Réessaie dans un instant.");
        }
      }
    };

    const startTimer = window.setTimeout(() => {
      setConnectionError(null);
      setRoomFull(false);
      setOpponentOnline(false);
      setIsConnected(false);
      guestPeerRef.current = null;
      hostPeerRef.current = null;

      if (isHost) {
        const hostedGame = readHostedGame(roomId);
        gameRef.current = hostedGame;
        setGame(hostedGame);
        setLocalRole("player1");
        persistHostGame(hostedGame);
      } else {
        setLocalRole(null);
      }

      void setupRoom();
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(startTimer);
      stateActionRef.current = null;
      clientActionRef.current = null;
      if (activeRoom) void activeRoom.leave();
    };
  }, [commitHostGame, connectionAttempt, isHost, persistHostGame, roomId]);

  const dispatch = useCallback((action: ClientAction) => {
    if (isHost) {
      const current = gameRef.current;
      if (!current) return;
      const next = applyPlayerAction(current, "player1", action, rollFairDie);
      if (next !== current) commitHostGame(next);
      return;
    }

    const hostPeer = hostPeerRef.current;
    if (!hostPeer) return;
    sendMessage(clientActionRef.current, action, hostPeer, () => {
      setConnectionError("L’action n’a pas été envoyée. Vérifie ta connexion.");
    });
  }, [commitHostGame, isHost]);

  const roll = useCallback(() => dispatch({ type: "ROLL" }), [dispatch]);
  const toggleHeld = useCallback((index: number) => {
    dispatch({ type: "HOLD", index });
  }, [dispatch]);
  const score = useCallback((category: CategoryId) => {
    dispatch({ type: "SCORE", category });
  }, [dispatch]);
  const rematch = useCallback(() => dispatch({ type: "REMATCH" }), [dispatch]);
  const reconnect = useCallback(() => {
    setConnectionError(null);
    setConnectionAttempt((attempt) => attempt + 1);
  }, []);

  let status: MultiplayerStatus = roomFull ? "room_full" : "connecting";
  if (!roomFull && game) status = game.status;

  const isMyTurn = game?.activePlayer === localRole;
  const localPlayer = localRole && game ? game[localRole] : null;
  const opponentRole = localRole === "player1"
    ? "player2"
    : localRole === "player2"
      ? "player1"
      : null;
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
