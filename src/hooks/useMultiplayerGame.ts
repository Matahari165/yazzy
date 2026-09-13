"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  holdActiveDie,
  rollActivePlayer,
  scoreActiveCategory,
  type MultiplayerGameState,
  type MultiplayerRole,
} from "../domain/multiplayer";
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
import type { CategoryId, DieValue } from "../domain/yatzy";

const PLAYER_TOKEN_PREFIX = "yazzy.multiplayer.token.v2.";
export const FOREGROUND_POLL_INTERVAL_MS = 800;
export const ACTIVE_TURN_POLL_INTERVAL_MS = 1_000;
export const OPPONENT_TURN_POLL_INTERVAL_MS = 250;
export const BACKGROUND_POLL_INTERVAL_MS = 4_000;
export const MAX_POLL_INTERVAL_MS = 4_000;
export const FAST_FOLLOWUP_POLL_INTERVAL_MS = 120;
const REQUEST_TIMEOUT_MS = 8_000;
const MAX_SILENT_FAILURES = 3;
const REPLAY_ROLL_DELAY_MS = 360;
const REPLAY_SCORE_DELAY_MS = 300;
const REPLAY_STEP_DELAY_MS = 90;

type RoomResponseSource = "connect" | "sync" | "action" | "reaction";
type PendingHold = { actionId: string; index: number };

export function gameWithPendingHolds(
  game: MultiplayerGameState | null,
  role: MultiplayerRole,
  pendingHolds: readonly Pick<PendingHold, "index">[],
): MultiplayerGameState | null {
  return pendingHolds.reduce(
    (current, hold) => current ? holdActiveDie(current, role, hold.index) : null,
    game,
  );
}

export function multiplayerPollDelay(
  isDocumentHidden: boolean,
  consecutiveFailures: number,
  turn: "active" | "opponent" | "neutral" = "neutral",
): number {
  if (isDocumentHidden) return BACKGROUND_POLL_INTERVAL_MS;
  const baseInterval = turn === "opponent"
    ? OPPONENT_TURN_POLL_INTERVAL_MS
    : turn === "active"
      ? ACTIVE_TURN_POLL_INTERVAL_MS
      : FOREGROUND_POLL_INTERVAL_MS;
  if (consecutiveFailures <= 0) return baseInterval;

  return Math.min(
    baseInterval * (2 ** consecutiveFailures),
    MAX_POLL_INTERVAL_MS,
  );
}

export function shouldReplaceCanonicalGame(
  currentVersion: number,
  responseVersion: number,
): boolean {
  return responseVersion > currentVersion;
}

export function canonicalGameAfterResponse<T>(
  currentGame: T | null,
  currentVersion: number,
  responseGame: T,
  responseVersion: number,
): T {
  return currentGame === null || shouldReplaceCanonicalGame(currentVersion, responseVersion)
    ? responseGame
    : currentGame;
}

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
  if (prefersReducedMotion()) return 80;
  if (event.action.type === "ROLL") return REPLAY_ROLL_DELAY_MS;
  if (event.action.type === "SCORE") return REPLAY_SCORE_DELAY_MS;
  return REPLAY_STEP_DELAY_MS;
}

let cachedReducedMotion: boolean | null = null;

function prefersReducedMotion(): boolean {
  if (cachedReducedMotion !== null) return cachedReducedMotion;
  try {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
    cachedReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    return cachedReducedMotion;
  } catch {
    return false;
  }
}

function pollJitter(delay: number): number {
  // ±15% pour éviter que les deux clients ne se synchronisent en rafale.
  const jitter = 0.85 + Math.random() * 0.3;
  return Math.max(60, Math.round(delay * jitter));
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
) {
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
  const actionGenerationRef = useRef(0);
  const pendingHoldsRef = useRef<PendingHold[]>([]);
  const actionQueueRef = useRef<Promise<void>>(Promise.resolve());
  const triggerPollRef = useRef<((delay?: number) => void) | null>(null);
  const [pendingHoldCount, setPendingHoldCount] = useState(0);
  const [pendingAction, setPendingAction] = useState<Exclude<ClientAction["type"], "HOLD"> | null>(null);

  const drainReplay = useCallback(function drainNextReplay() {
    if (replayTimerRef.current !== null) return;
    const nextEvent = replayQueueRef.current.shift();
    if (!nextEvent) {
      setReplayedOpponentEvent((current) => (current === null ? current : null));
      // Garde le preview optimiste (ROLL/SCORE) jusqu'à la réponse ACTION.
      if (actionPendingRef.current) return;
      const role = roleRef.current;
      const visible = role
        ? gameWithPendingHolds(canonicalGameRef.current, role, pendingHoldsRef.current)
        : canonicalGameRef.current;
      // Évite un setGame avec la même référence en idle (laisse React tranquille).
      setGame((current) => (current === visible ? current : visible ?? current));
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
    actionGenerationRef.current += 1;
    if (replayTimerRef.current !== null) {
      window.clearTimeout(replayTimerRef.current);
      replayTimerRef.current = null;
    }
    replayQueueRef.current = [];
    pendingHoldsRef.current = [];
    actionQueueRef.current = Promise.resolve();
    actionPendingRef.current = false;
    setPendingHoldCount(0);
    setPendingAction(null);
    setReplayedOpponentEvent(null);
    setReplayGapDetected(false);
    canonicalGameRef.current = null;
    canonicalVersionRef.current = -1;
    eventCursorRef.current = -1;
  }, []);

  const applySuccess = useCallback((response: RoomSuccess, source: RoomResponseSource) => {
    const shouldReplaceGame = shouldReplaceCanonicalGame(
      canonicalVersionRef.current,
      response.version,
    );
    canonicalGameRef.current = canonicalGameAfterResponse(
      canonicalGameRef.current,
      canonicalVersionRef.current,
      response.game,
      response.version,
    );
    if (shouldReplaceGame) {
      canonicalVersionRef.current = response.version;
    }
    const hasPendingHolds = pendingHoldsRef.current.length > 0;
    const visibleGame = hasPendingHolds
      ? gameWithPendingHolds(
          canonicalGameRef.current,
          response.yourRole,
          pendingHoldsRef.current,
        )
      : canonicalGameRef.current;
    // Pendant un SCORE optimiste, un SYNC avec une vieille version ne doit pas
    // écraser l'aperçu local (évite le flicker à 1 RTT).
    const keepOptimisticPreview = source === "sync"
      && actionPendingRef.current
      && !shouldReplaceGame;

    if (source === "sync" && response.eventsTruncated) {
      replayGenerationRef.current += 1;
      if (replayTimerRef.current !== null) window.clearTimeout(replayTimerRef.current);
      replayTimerRef.current = null;
      replayQueueRef.current = [];
      setReplayedOpponentEvent((current) => (current === null ? current : null));
      setReplayGapDetected((current) => (current ? current : true));
      if (!keepOptimisticPreview) setGame(visibleGame);
    } else if (source === "sync") {
      setReplayGapDetected((current) => (current ? false : current));
      const unseenEvents = response.events.filter((event) => event.version > eventCursorRef.current);
      const opponentEvents = unseenEvents.filter((event) => event.role !== response.yourRole);
      if (opponentEvents.length > 0) replayQueueRef.current.push(...opponentEvents);
      if (replayTimerRef.current === null && replayQueueRef.current.length === 0) {
        // SYNC idle sans changement : ne touche à rien pour laisser React tranquille.
        // setGame avec la même référence bail déjà, mais on évite même l'appel.
        if (!keepOptimisticPreview && (shouldReplaceGame || hasPendingHolds)) {
          setGame(visibleGame);
        }
      } else {
        drainReplay();
      }
    } else if (
      replayTimerRef.current === null &&
      replayQueueRef.current.length === 0 &&
      shouldDisplayResponseImmediately(eventCursorRef.current, response.version, source)
    ) {
      setGame(visibleGame);
    }

    eventCursorRef.current = replayCursorAfterResponse(
      eventCursorRef.current,
      response.version,
      source,
    );
    setLocalRole((current) => (current === response.yourRole ? current : response.yourRole));
    setOpponentOnline((current) => (current === response.opponentOnline ? current : response.opponentOnline));
    setLatestReaction((currentReaction) => (
      currentReaction?.id === response.latestReaction?.id
        ? currentReaction
        : response.latestReaction
    ));
    setIsConnected((current) => (current ? current : true));
    setConnectionError((current) => (current === null ? current : null));
    setRoomFull((current) => (current ? false : current));
  }, [drainReplay]);

  useEffect(() => {
    if (!playerName) return;

    let cancelled = false;
    let pollTimer: number | null = null;
    let consecutiveFailures = 0;
    let emptyOpponentSyncs = 0;
    const role: MultiplayerRole = isHost ? "player1" : "player2";
    const token = playerToken(roomId, role);
    roleRef.current = role;
    tokenRef.current = token;
    resetReplay();

    const schedulePoll = (overrideDelay?: number) => {
      if (!cancelled) {
        const currentGame = canonicalGameRef.current;
        const turn = currentGame?.status !== "playing"
          ? "neutral"
          : currentGame.activePlayer === role
            ? "active"
            : "opponent";
        let baseDelay = overrideDelay
          ?? multiplayerPollDelay(document.visibilityState === "hidden", consecutiveFailures, turn);
        // Tour adverse idle : backoff doux après ~2s sans évènement (8 SYNC vides
        // à 250ms). On reste réactif grâce au fast-followup dès qu'un event arrive.
        if (overrideDelay === undefined && turn === "opponent" && consecutiveFailures === 0) {
          if (emptyOpponentSyncs >= 16) baseDelay = Math.max(baseDelay, 700);
          else if (emptyOpponentSyncs >= 8) baseDelay = Math.max(baseDelay, 500);
        }
        pollTimer = window.setTimeout(
          () => {
            pollTimer = null;
            void poll();
          },
          pollJitter(baseDelay),
        );
      }
    };

    const poll = async () => {
      let followUpDelay: number | undefined;
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
          const hadEvents = response.events.length > 0;
          // Un bump de version sans events (rename) ne doit pas casser le backoff.
          const versionAdvanced = response.version > canonicalVersionRef.current;
          applySuccess(response, "sync");
          if (hadEvents) {
            emptyOpponentSyncs = 0;
            // Rafale adverse : un SYNC qui ramène des évènements en annonce souvent d'autres.
            // On re-sonde vite une fois au lieu d'attendre le prochain tick.
            if (document.visibilityState !== "hidden") {
              followUpDelay = FAST_FOLLOWUP_POLL_INTERVAL_MS;
            }
          } else if (!versionAdvanced) {
            emptyOpponentSyncs += 1;
          } else {
            emptyOpponentSyncs = 0;
          }
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
      schedulePoll(followUpDelay);
    };

    const connect = async (attempt = 0): Promise<void> => {
      try {
        const response = await sendRoomCommand(roomId, {
          type: "CONNECT",
          role,
          token,
          playerName,
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
          attempt < 3
        ) {
          await new Promise((resolve) => window.setTimeout(resolve, 700));
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

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible" || pollTimer === null) return;
      window.clearTimeout(pollTimer);
      pollTimer = window.setTimeout(() => {
        pollTimer = null;
        void poll();
      }, 0);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    triggerPollRef.current = (delay?: number) => {
      if (cancelled) return;
      if (pollTimer !== null) window.clearTimeout(pollTimer);
      pollTimer = null;
      schedulePoll(delay);
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
      triggerPollRef.current = null;
      window.clearTimeout(startTimer);
      if (pollTimer !== null) window.clearTimeout(pollTimer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      resetReplay();
    };
  }, [
    applySuccess,
    connectionAttempt,
    isHost,
    playerName,
    resetReplay,
    roomId,
  ]);

  const dispatch = useCallback((action: ClientAction) => {
    const role = roleRef.current;
    const token = tokenRef.current;
    if (!role || !token) return;

    const isHold = action.type === "HOLD";
    // Anti double-clic : un seul ROLL/SCORE/REMATCH en vol. Les HOLD restent
    // optimistes et mis en file même pendant un ROLL, pour garder le rythme solo.
    // Si un SCORE arrive alors qu'un ROLL termine son RTT, on l'enchaîne dès que possible.
    if (!isHold && actionPendingRef.current) {
      if (action.type === "SCORE") {
        actionQueueRef.current.then(() => {
          if (roleRef.current && canonicalGameRef.current?.activePlayer === roleRef.current) {
            dispatch(action);
          }
        });
      }
      return;
    }

    const actionId = crypto.randomUUID();
    const generation = actionGenerationRef.current;
    if (isHold) {
      pendingHoldsRef.current.push({ actionId, index: action.index });
      setPendingHoldCount(pendingHoldsRef.current.length);
      setGame((current) => current ? holdActiveDie(current, role, action.index) : current);
    } else {
      actionPendingRef.current = true;
      setPendingAction(action.type);
      if (action.type === "ROLL") {
        // Preview locale immédiate : l'animation part sur de nouveaux dés sans
        // attendre le RTT. Le serveur reste autoritaire et réconcilie à l'arrivée.
        const previewDie = () => (Math.floor(Math.random() * 6) + 1) as DieValue;
        setGame((current) => current ? rollActivePlayer(current, role, previewDie) : current);
      } else if (action.type === "SCORE") {
        // Score optimiste immédiat : la feuille s'actualise sans attendre le RTT.
        // Le serveur reste autoritaire et réconcilie à l'arrivée.
        setGame((current) => current ? scoreActiveCategory(current, role, action.category) : current);
      }
    }

    actionQueueRef.current = actionQueueRef.current.then(async () => {
      if (generation !== actionGenerationRef.current) return;
      try {
        const response = await sendRoomCommand(roomId, {
          type: "ACTION",
          role,
          token,
          actionId,
          action,
        });
        if (generation !== actionGenerationRef.current) return;
        if (isHold) {
          pendingHoldsRef.current = pendingHoldsRef.current.filter(
            (pending) => pending.actionId !== actionId,
          );
          setPendingHoldCount(pendingHoldsRef.current.length);
        }
        if (response.ok) {
          applySuccess(response, "action");
          triggerPollRef.current?.(FAST_FOLLOWUP_POLL_INTERVAL_MS);
        } else {
          if (response.code === "OPPONENT_OFFLINE") setOpponentOnline(false);
          else if (response.code === "ROOM_FULL") setRoomFull(true);
          else setConnectionError(connectionMessage(response));
          if (action.type === "ROLL" || action.type === "SCORE") {
            // Le preview est invalide : on annule les projections
            pendingHoldsRef.current = [];
            setPendingHoldCount(0);
            setGame(canonicalGameRef.current);
            actionGenerationRef.current += 1;
            actionPendingRef.current = false;
            setPendingAction(null);
          } else {
            setGame(gameWithPendingHolds(canonicalGameRef.current, role, pendingHoldsRef.current));
          }
        }
      } catch {
        if (generation !== actionGenerationRef.current) return;
        if (isHold) {
          pendingHoldsRef.current = pendingHoldsRef.current.filter(
            (pending) => pending.actionId !== actionId,
          );
          setPendingHoldCount(pendingHoldsRef.current.length);
          setGame(gameWithPendingHolds(canonicalGameRef.current, role, pendingHoldsRef.current));
        } else if (action.type === "ROLL" || action.type === "SCORE") {
          pendingHoldsRef.current = [];
          setPendingHoldCount(0);
          setGame(canonicalGameRef.current);
          actionGenerationRef.current += 1;
          actionPendingRef.current = false;
          setPendingAction(null);
        } else {
          setGame(gameWithPendingHolds(canonicalGameRef.current, role, pendingHoldsRef.current));
        }
        setIsConnected(false);
        setConnectionError("L’action n’a pas été envoyée. Yazzy va tenter de se reconnecter.");
      } finally {
        if (!isHold && generation === actionGenerationRef.current) {
          actionPendingRef.current = false;
          setPendingAction(null);
        }
      }
    });
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
    hasPendingHolds: pendingHoldCount > 0,
    pendingAction,
  };
}
