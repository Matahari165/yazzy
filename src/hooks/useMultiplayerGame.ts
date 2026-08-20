"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MultiplayerGameState, MultiplayerRole } from "../domain/multiplayer";
import {
  isRoomResponse,
  type ReactionEmoji,
  type RoomActionEvent,
  type RoomCommand,
  type RoomFailure,
  type RoomReaction,
  type RoomSuccess,
} from "../domain/multiplayerRoomProtocol";
import type { ClientAction } from "../domain/protocol";
import type { CategoryId } from "../domain/yatzy";

const PLAYER_TOKEN_PREFIX = "yazzy.multiplayer.token.v2.";
const POLL_INTERVAL_MS = 800;
const REQUEST_TIMEOUT_MS = 8_000;
const MAX_SILENT_FAILURES = 3;
const REPLAY_ROLL_DELAY_MS = 420;
const REPLAY_STEP_DELAY_MS = 260;

type RoomResponseSource = "connect" | "sync" | "action" | "reaction";

export function replayCursorAfterResponse(
  currentCursor: number,
  responseVersion: number,
  source: RoomResponseSource,
): number {
  return source === "connect" || source === "sync"
    ? Math.max(currentCursor, responseVersion)
    : currentCursor;
}

export function shouldDisplayResponseImmediately(
  eventCursor: number,
  responseVersion: number,
  source: RoomResponseSource,
): boolean {
  return source !== "reaction" || responseVersion <= eventCursor;
}

function replayDelay(event: RoomActionEvent): number {
  return event.action.type === "ROLL" ? REPLAY_ROLL_DELAY_MS : REPLAY_STEP_DELAY_MS;
}

function playerToken(roomId: string, role: MultiplayerRole, preferredToken?: string): string {
  const key = `${PLAYER_TOKEN_PREFIX}${roomId}.${role}`;
  try {
    if (preferredToken) {
      localStorage.setItem(key, preferredToken);
      return preferredToken;
    }
    const saved = localStorage.getItem(key);
    if (saved) return saved;
    const token = crypto.randomUUID();
    localStorage.setItem(key, token);
    return token;
  } catch {
    return crypto.randomUUID();
  }
}

async function sendRoomCommand(roomId: string, command: RoomCommand) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`/api/rooms/${encodeURIComponent(roomId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(command),
      cache: "no-store",
      signal: controller.signal,
    });
    const payload: unknown = await response.json();
    if (!isRoomResponse(payload)) throw new Error("Invalid room response");
    return payload;
  } finally {
    window.clearTimeout(timeout);
  }
}

function connectionMessage(failure: RoomFailure): string {
  if (failure.code === "ROOM_NOT_FOUND") {
    return "Ce code ne correspond à aucune partie active. Vérifie-le avec ton ami.";
  }
  if (failure.code === "ROOM_TAKEN") {
    return "Ce code est déjà utilisé. Crée une nouvelle partie depuis l’accueil.";
  }
  if (failure.code === "ACCESS_DENIED") {
    return "Cette place de joueur n’est plus disponible dans ce navigateur.";
  }
  return failure.message;
}

export type MultiplayerStatus =
  | "connecting"
  | "waiting"
  | "playing"
  | "finished"
  | "room_full";

export function useMultiplayerGame(
  roomId: string,
  isHost: boolean,
  playerName: string | null,
  pairing?: { localToken: string; guestToken: string | null } | null,
) {
  const hasPairing = Boolean(pairing?.localToken);
  const [game, setGame] = useState<MultiplayerGameState | null>(null);
  const [localRole, setLocalRole] = useState<MultiplayerRole | null>(null);
  const [opponentOnline, setOpponentOnline] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [roomFull, setRoomFull] = useState(false);
  const [latestReaction, setLatestReaction] = useState<RoomReaction | null>(null);
  const [connectionAttempt, setConnectionAttempt] = useState(0);
  const [replayedOpponentEvent, setReplayedOpponentEvent] = useState<RoomActionEvent | null>(null);
  const [replayGapDetected, setReplayGapDetected] = useState(false);

  const tokenRef = useRef<string | null>(null);
  const roleRef = useRef<MultiplayerRole | null>(null);
  const canonicalVersionRef = useRef(-1);
  const eventCursorRef = useRef(-1);
  const canonicalGameRef = useRef<MultiplayerGameState | null>(null);
  const replayQueueRef = useRef<RoomActionEvent[]>([]);
  const replayTimerRef = useRef<number | null>(null);
  const replayGenerationRef = useRef(0);
  const actionPendingRef = useRef(false);

  const drainReplay = useCallback(function drainNextReplay() {
    if (replayTimerRef.current !== null) return;
    const nextEvent = replayQueueRef.current.shift();
    if (!nextEvent) {
      setReplayedOpponentEvent(null);
      setGame(canonicalGameRef.current);
      return;
    }

    const generation = replayGenerationRef.current;
    setReplayedOpponentEvent(nextEvent);
    setGame(nextEvent.game);
    replayTimerRef.current = window.setTimeout(() => {
      replayTimerRef.current = null;
      if (generation === replayGenerationRef.current) drainNextReplay();
    }, replayDelay(nextEvent));
  }, []);

  const resetReplay = useCallback(() => {
    replayGenerationRef.current += 1;
    if (replayTimerRef.current !== null) {
      window.clearTimeout(replayTimerRef.current);
      replayTimerRef.current = null;
    }
    replayQueueRef.current = [];
    setReplayedOpponentEvent(null);
    setReplayGapDetected(false);
    canonicalGameRef.current = null;
    canonicalVersionRef.current = -1;
    eventCursorRef.current = -1;
  }, []);

  const applySuccess = useCallback((response: RoomSuccess, source: RoomResponseSource) => {
    if (response.version >= canonicalVersionRef.current) {
      canonicalGameRef.current = response.game;
      canonicalVersionRef.current = response.version;
    }

    if (source === "sync" && response.eventsTruncated) {
      replayGenerationRef.current += 1;
      if (replayTimerRef.current !== null) window.clearTimeout(replayTimerRef.current);
      replayTimerRef.current = null;
      replayQueueRef.current = [];
      setReplayedOpponentEvent(null);
      setReplayGapDetected(true);
      setGame(response.game);
    } else if (source === "sync") {
      setReplayGapDetected(false);
      const unseenEvents = response.events.filter((event) => event.version > eventCursorRef.current);
      replayQueueRef.current.push(
        ...unseenEvents.filter((event) => event.role !== response.yourRole),
      );
      if (replayTimerRef.current === null && replayQueueRef.current.length === 0) {
        setGame(canonicalGameRef.current);
      } else {
        drainReplay();
      }
    } else if (
      replayTimerRef.current === null &&
      replayQueueRef.current.length === 0 &&
      shouldDisplayResponseImmediately(eventCursorRef.current, response.version, source)
    ) {
      setGame(canonicalGameRef.current);
    }

    eventCursorRef.current = replayCursorAfterResponse(
      eventCursorRef.current,
      response.version,
      source,
    );
    setLocalRole(response.yourRole);
    setOpponentOnline(response.opponentOnline);
    setLatestReaction(response.latestReaction);
    setIsConnected(true);
    setConnectionError(null);
    setRoomFull(false);
  }, [drainReplay]);

  useEffect(() => {
    if (!playerName) return;

    let cancelled = false;
    let pollTimer: number | null = null;
    let consecutiveFailures = 0;
    const role: MultiplayerRole = isHost ? "player1" : "player2";
    const token = playerToken(roomId, role, pairing?.localToken);
    roleRef.current = role;
    tokenRef.current = token;
    resetReplay();

    const schedulePoll = () => {
      if (!cancelled) pollTimer = window.setTimeout(poll, POLL_INTERVAL_MS);
    };

    const poll = async () => {
      try {
        const response = await sendRoomCommand(roomId, {
          type: "SYNC",
          role,
          token,
          playerName,
          afterVersion: eventCursorRef.current,
        });
        if (cancelled) return;
        if (response.ok) {
          consecutiveFailures = 0;
          applySuccess(response, "sync");
        } else {
          consecutiveFailures += 1;
          if (consecutiveFailures >= MAX_SILENT_FAILURES) {
            setIsConnected(false);
            setConnectionError(connectionMessage(response));
          }
        }
      } catch {
        if (cancelled) return;
        consecutiveFailures += 1;
        if (consecutiveFailures >= MAX_SILENT_FAILURES) {
          setIsConnected(false);
          setOpponentOnline(false);
          setConnectionError("La connexion au salon est interrompue. Yazzy essaie de la rétablir.");
        }
      }
      schedulePoll();
    };

    const connect = async (attempt = 0): Promise<void> => {
      try {
        const response = await sendRoomCommand(roomId, {
          type: "CONNECT",
          role,
          token,
          playerName,
          ...(role === "player1" && pairing?.guestToken
            ? { pairedGuestToken: pairing.guestToken }
            : {}),
        });
        if (cancelled) return;
        if (response.ok) {
          applySuccess(response, "connect");
          schedulePoll();
          return;
        }
        if (
          response.code === "ROOM_NOT_FOUND" &&
          role === "player2" &&
          (hasPairing || attempt < 3)
        ) {
          await new Promise((resolve) => window.setTimeout(resolve, hasPairing ? 1_200 : 700));
          if (!cancelled) await connect(attempt + 1);
          return;
        }
        if (response.code === "ROOM_FULL") setRoomFull(true);
        setConnectionError(connectionMessage(response));
      } catch {
        if (!cancelled) {
          setConnectionError("Le salon ne répond pas. Vérifie ta connexion puis réessaie.");
        }
      }
    };

    const startTimer = window.setTimeout(() => {
      setGame(null);
      setLocalRole(null);
      setOpponentOnline(false);
      setIsConnected(false);
      setConnectionError(null);
      setRoomFull(false);
      void connect();
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(startTimer);
      if (pollTimer !== null) window.clearTimeout(pollTimer);
      resetReplay();
    };
  }, [
    applySuccess,
    connectionAttempt,
    hasPairing,
    isHost,
    pairing?.guestToken,
    pairing?.localToken,
    playerName,
    resetReplay,
    roomId,
  ]);

  const dispatch = useCallback(async (action: ClientAction) => {
    const role = roleRef.current;
    const token = tokenRef.current;
    if (!role || !token || actionPendingRef.current) return;

    actionPendingRef.current = true;
    try {
      const response = await sendRoomCommand(roomId, {
        type: "ACTION",
        role,
        token,
        actionId: crypto.randomUUID(),
        action,
      });
      if (response.ok) {
        applySuccess(response, "action");
      } else if (response.code === "OPPONENT_OFFLINE") {
        setOpponentOnline(false);
      } else if (response.code === "ROOM_FULL") {
        setRoomFull(true);
      } else {
        setConnectionError(connectionMessage(response));
      }
    } catch {
      setIsConnected(false);
      setConnectionError("L’action n’a pas été envoyée. Yazzy va tenter de se reconnecter.");
    } finally {
      actionPendingRef.current = false;
    }
  }, [applySuccess, roomId]);

  const roll = useCallback(() => void dispatch({ type: "ROLL" }), [dispatch]);
  const toggleHeld = useCallback((index: number) => {
    void dispatch({ type: "HOLD", index });
  }, [dispatch]);
  const score = useCallback((category: CategoryId) => {
    void dispatch({ type: "SCORE", category });
  }, [dispatch]);
  const rematch = useCallback(() => void dispatch({ type: "REMATCH" }), [dispatch]);
  const sendReaction = useCallback(async (emoji: ReactionEmoji) => {
    const role = roleRef.current;
    const token = tokenRef.current;
    if (!role || !token) return;

    try {
      const response = await sendRoomCommand(roomId, {
        type: "REACTION",
        role,
        token,
        reactionId: crypto.randomUUID(),
        emoji,
      });
      if (response.ok) {
        applySuccess(response, "reaction");
      } else if (response.code === "OPPONENT_OFFLINE") {
        setOpponentOnline(false);
      } else {
        setConnectionError(connectionMessage(response));
      }
    } catch {
      setIsConnected(false);
      setConnectionError("La réaction n’a pas été envoyée. Yazzy va tenter de se reconnecter.");
    }
  }, [applySuccess, roomId]);
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
    sendReaction,
    reconnect,
    isMyTurn,
    localPlayer,
    opponentPlayer,
    latestReaction,
    isReplayingOpponentRoll: replayedOpponentEvent?.action.type === "ROLL",
    replayedOpponentEvent,
    replayGapDetected,
  };
}
