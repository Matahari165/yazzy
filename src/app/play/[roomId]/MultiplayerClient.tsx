"use client";

import Link from "next/link";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FinishedGame } from "@/components/FinishedGame";
import { applySavedTheme } from "@/components/ThemeSwitcher";
import { YatzyBurst } from "@/components/YatzyBurst";
import { GameTable } from "@/components/GameTable";
import { MultiplayerNameGate } from "@/components/MultiplayerNameGate";
import { MultiplayerReactions } from "@/components/MultiplayerReactions";
import { ScoreCard } from "@/components/ScoreCard";
import type { RoomActionEvent } from "@/domain/multiplayerRoomProtocol";
import { CATEGORY_BY_ID, isMaxComboScore, scoreDice, totalScore, type CategoryId, type DieValue } from "@/domain/yatzy";
import { useGameKeyboard } from "@/hooks/useGameKeyboard";
import { useMultiplayerGame } from "@/hooks/useMultiplayerGame";
import { botAudio } from "@/lib/botAudio";
import { readStoredPlayerName, writeStoredPlayerName } from "@/lib/playerNameStorage";

const HUMAN_ROLL_ANIMATION_MS = 300;
const YATZY_BURST_DURATION_MS = 3_400;
const MAX_BURST_DURATION_MS = 3_500;

type YatzyBurstState = {
  id: string;
  author: string;
  diceValue: DieValue | null;
  variant: "player" | "opponent";
};

let cachedReducedMotion: boolean | null = null;

function prefersReducedMotion(): boolean {
  if (cachedReducedMotion !== null) return cachedReducedMotion;
  try {
    cachedReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    return cachedReducedMotion;
  } catch {
    return false;
  }
}

function replayAnnouncement(event: RoomActionEvent, opponentName: string): string {
  const playerState = event.game[event.role]?.state;
  if (event.action.type === "ROLL") {
    const dice = playerState?.dice.join(", ") ?? "";
    const rollNumber = playerState?.rollNumber ?? 0;
    return `${opponentName} a lancé les dés, lancer ${rollNumber} sur 3 : ${dice}.`;
  }
  if (event.action.type === "HOLD") {
    const isHeld = playerState?.held[event.action.index];
    return `${opponentName} ${isHeld ? "garde" : "relâche"} le dé ${event.action.index + 1}.`;
  }
  if (event.action.type === "SCORE") {
    return `${opponentName} inscrit ${CATEGORY_BY_ID[event.action.category].label}.`;
  }
  return `${opponentName} propose une nouvelle partie.`;
}

export function MultiplayerClient({
  roomId,
  isHost,
}: {
  roomId: string;
  isHost?: boolean;
}) {
  const [playerName, setPlayerName] = useState<string | null>(null);
  const {
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
    latestReaction,
    sendReaction,
    isReplayingOpponentRoll,
    replayedOpponentEvent,
    replayGapDetected,
    pendingAction,
  } = useMultiplayerGame(roomId, isHost, playerName);
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | null>(null);
  const [highlightedPlayerCategory, setHighlightedPlayerCategory] = useState<CategoryId | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [yatzyBurst, setYatzyBurst] = useState<YatzyBurstState | null>(null);
  const [maxBurst, setMaxBurst] = useState<{ category: CategoryId; side: "player" | "opponent"; burstKey: number } | null>(null);
  const [inviteLink, setInviteLink] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const rollTimerRef = useRef<number | null>(null);
  const burstTimerRef = useRef<number | null>(null);
  const burstSequenceRef = useRef(0);
  const maxBurstKeyRef = useRef(0);
  const maxBurstTimerRef = useRef<number | null>(null);
  const yatzyCelebratedRef = useRef<string | null>(null);
  const maxCelebratedRef = useRef<string | null>(null);

  const triggerMaxBurst = useCallback((category: CategoryId, side: "player" | "opponent") => {
    maxBurstKeyRef.current += 1;
    setMaxBurst({ category, side, burstKey: maxBurstKeyRef.current });
    // La célébration locale s'efface après ~3,5 s : étincelles + doré.
    if (maxBurstTimerRef.current !== null) window.clearTimeout(maxBurstTimerRef.current);
    maxBurstTimerRef.current = window.setTimeout(() => {
      maxBurstTimerRef.current = null;
      setMaxBurst(null);
    }, MAX_BURST_DURATION_MS);
  }, []);

  const showYatzyBurst = useCallback(
    (author: string, diceValue: DieValue | null = null, variant: "player" | "opponent" = "player") => {
      burstSequenceRef.current += 1;
      setYatzyBurst({ id: `yatzy-burst-${burstSequenceRef.current}`, author, diceValue, variant });
      if (burstTimerRef.current !== null) window.clearTimeout(burstTimerRef.current);
      burstTimerRef.current = window.setTimeout(() => {
        burstTimerRef.current = null;
        setYatzyBurst(null);
      }, YATZY_BURST_DURATION_MS);
    },
    [],
  );

  const resultSoundPlayedRef = useRef(false);
  useEffect(() => {
    if (status !== "finished" || !game || !localRole || resultSoundPlayedRef.current) return;
    resultSoundPlayedRef.current = true;
    const p1 = game.player1?.state.scores ?? {};
    const p2 = game.player2?.state.scores ?? {};
    const localPoints = totalScore(localRole === "player1" ? p1 : p2);
    const opponentPoints = totalScore(localRole === "player1" ? p2 : p1);
    const outcome = localPoints === opponentPoints ? "tie" : localPoints > opponentPoints ? "win" : "loss";
    botAudio.playEffect(outcome);
  }, [status, game, localRole]);

  useEffect(() => {
    applySavedTheme();
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        setPlayerName(readStoredPlayerName());
      } catch {
        setPlayerName("");
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const localState = localPlayer?.state;
  const opponentState = opponentPlayer?.state;
  // Tour par tour : on reste jouable même si la présence adverse flappe
  // (le serveur accepte les ACTION sans gate). Le bandeau prévient quand même.
  const canAct = Boolean(isMyTurn && isConnected);
  // Refs miroirs à jour après chaque rendu : le handler de clic reste stable,
  // GameTable ne recrée plus ses 5 handlers à chaque HOLD.
  const localStateRef = useRef(localState);
  const canActRef = useRef(canAct);
  useEffect(() => {
    localStateRef.current = localState;
    canActRef.current = canAct;
  });

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        setInviteLink(`${window.location.origin}/play/${roomId}`);
      } catch {
        setInviteLink("");
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [roomId]);

  useEffect(() => () => {
    if (rollTimerRef.current !== null) window.clearTimeout(rollTimerRef.current);
    if (burstTimerRef.current !== null) window.clearTimeout(burstTimerRef.current);
    if (maxBurstTimerRef.current !== null) window.clearTimeout(maxBurstTimerRef.current);
  }, []);

  useEffect(() => {
    if (status !== "finished") return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById("finished-title")?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [status]);

  useEffect(() => {
    const event = replayedOpponentEvent;
    if (!event || event.action.type !== "SCORE") return;
    const scored = event.game[event.role]?.state.scores?.[event.action.category];
    if (event.action.category === "yatzy" && scored === 50) {
      if (event.actionId !== yatzyCelebratedRef.current) {
        yatzyCelebratedRef.current = event.actionId;
        botAudio.playEffect("win");
        showYatzyBurst(opponentPlayer?.name ?? "Ami", null, "opponent");
      }
    }
    if (
      scored !== undefined &&
      isMaxComboScore(event.action.category, scored) &&
      event.actionId !== maxCelebratedRef.current
    ) {
      maxCelebratedRef.current = event.actionId;
      triggerMaxBurst(event.action.category, "opponent");
    }
  }, [replayedOpponentEvent, opponentPlayer, showYatzyBurst, triggerMaxBurst]);

  const handleRoll = useCallback(() => {
    if (!canAct || isRolling || !localState || localState.rollNumber >= 3) return;
    if (localState.rollNumber > 0 && localState.held.every(Boolean)) return;
    botAudio.playEffect("dice");
    roll();
    setIsRolling(true);
    if (rollTimerRef.current !== null) window.clearTimeout(rollTimerRef.current);
    const duration = prefersReducedMotion() ? 80 : HUMAN_ROLL_ANIMATION_MS;
    rollTimerRef.current = window.setTimeout(() => {
      rollTimerRef.current = null;
      setIsRolling(false);
    }, duration);
  }, [canAct, isRolling, localState, roll]);

  const handleScore = useCallback((category = selectedCategory) => {
    if (!category || !canAct || isRolling) return;
    setHighlightedPlayerCategory(category);
    if (localState) {
      const localPoints = scoreDice(category, localState.dice);
      const isYatzy = category === "yatzy" && localPoints === 50;
      botAudio.playEffect(isYatzy ? "win" : "score");
      if (isYatzy) {
        const dice = localState.dice;
        const face = dice.length === 5 && dice.every((die) => die === dice[0]) ? dice[0] : null;
        showYatzyBurst(localPlayer?.name ?? "Toi", face, "player");
      }
      if (isMaxComboScore(category, localPoints)) {
        triggerMaxBurst(category, "player");
      }
    }
    score(category);
    setSelectedCategory(null);
  }, [selectedCategory, canAct, isRolling, score, localState, localPlayer, showYatzyBurst, triggerMaxBurst]);

  const handleToggleDie = useCallback((index: number) => {
    if (!canActRef.current) return;
    const state = localStateRef.current;
    if (!state || state.rollNumber === 0) return;
    const isHeld = state.held[index] ?? false;
    botAudio.playEffect(isHeld ? "release" : "hold");
    toggleHeld(index);
  }, [toggleHeld]);

  useGameKeyboard({
    disabled: status !== "playing" || !canAct,
    canRoll: Boolean(localState && localState.rollNumber < 3 && !localState.held.every(Boolean) && !isRolling),
    canScore: selectedCategory !== null && !isRolling,
    onRoll: handleRoll,
    onScore: handleScore,
    onToggleDie: handleToggleDie,
  });

  const handleCopyLink = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopyStatus("Lien copié");
    } catch {
      setCopyStatus("Sélectionne le lien puis copie-le");
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      setCopyStatus("Code copié");
    } catch {
      setCopyStatus("Copie manuellement le code affiché");
    }
  };

  const handlePlayerName = (name: string) => {
    setPlayerName(writeStoredPlayerName(name));
  };

  if (playerName === null) {
    return <main id="main-content" className="app-loading" aria-busy="true" role="status"><p>Préparation de la partie…</p></main>;
  }

  if (!playerName) {
    return <MultiplayerNameGate onSave={handlePlayerName} />;
  }

  if (connectionError && !game) {
    return (
      <main id="main-content" className="multiplayer-state-card" role="alert">
        <p className="eyebrow">CONNEXION IMPOSSIBLE</p>
        <h1>Le salon ne répond pas</h1>
        <p>{connectionError}</p>
        <div className="multiplayer-state-actions">
          <button className="primary-action" type="button" onClick={reconnect}>Réessayer</button>
          <Link className="secondary-action" href="/">Retour à l’accueil</Link>
        </div>
      </main>
    );
  }

  if (status === "connecting") {
    return (
      <main id="main-content" className="app-loading" aria-busy="true">
        <p role="status">Connexion à la partie {roomId}…</p>
      </main>
    );
  }

  if (status === "room_full") {
    return (
      <main id="main-content" className="multiplayer-state-card">
        <p className="eyebrow">SALON COMPLET</p>
        <h1>Deux amis jouent déjà ici</h1>
        <p>Crée une nouvelle partie privée depuis l’accueil.</p>
        <Link className="primary-action" href="/">Retour à l’accueil</Link>
      </main>
    );
  }

  if (status === "waiting") {
    return (
      <main id="main-content" className="game-shell">
        <header className="game-header waiting-header">
          <Link className="game-logo" href="/">YAZZY</Link>
          <span className="mode-label">{playerName}</span>
          <Link className="quit-link" href="/">Quitter</Link>
        </header>

        <section className="waiting-room" aria-labelledby="waiting-title">
          <span className="waiting-dice" aria-hidden="true">•••</span>
          <h1 id="waiting-title">En attente</h1>
          <div className="room-code-block">
            <span className="sr-only">Code de partie</span>
            <strong>{roomId}</strong>
          </div>
          <div className="invite-actions">
            <button className="primary-action" type="button" onClick={handleCopyCode}>Copier le code</button>
            <button className="secondary-action" type="button" onClick={handleCopyLink}>Copier le lien</button>
          </div>
          <div className="invite-field">
            <label className="sr-only" htmlFor="invite-link">Lien de partie</label>
            <input id="invite-link" type="text" readOnly value={inviteLink} onFocus={(event) => event.currentTarget.select()} />
          </div>
          {copyStatus ? <p className="copy-status" role="status">{copyStatus}</p> : null}
          {connectionError ? (
            <div className="multiplayer-state-actions" role="alert">
              <p>{connectionError}</p>
              <button className="secondary-action" type="button" onClick={reconnect}>Réessayer</button>
            </div>
          ) : (
            <p className="waiting-status" role="status"><i aria-hidden="true" /> En attente de ton ami…</p>
          )}
        </section>
      </main>
    );
  }

  if (!game || !localState || !opponentState || !localRole) {
    return <main id="main-content" className="app-loading" aria-busy="true"><p>Chargement…</p></main>;
  }

  return (
    <>
      <MultiplayerGameView
        game={game}
        localRole={localRole}
        localPlayer={localPlayer}
        opponentPlayer={opponentPlayer}
        localState={localState}
        opponentState={opponentState}
        isMyTurn={isMyTurn}
        canAct={canAct}
        isConnected={isConnected}
        opponentOnline={opponentOnline}
        status={status}
        selectedCategory={selectedCategory}
        highlightedPlayerCategory={highlightedPlayerCategory}
        maxBurst={maxBurst}
        isRolling={isRolling}
        pendingAction={pendingAction}
        replayedOpponentEvent={replayedOpponentEvent}
        isReplayingOpponentRoll={isReplayingOpponentRoll}
        replayGapDetected={replayGapDetected}
        latestReaction={latestReaction}
        onSelectCategory={setSelectedCategory}
        onRoll={handleRoll}
        onScore={handleScore}
        onToggleDie={handleToggleDie}
        onRematch={rematch}
        onSendReaction={sendReaction}
      />
      {yatzyBurst ? (
        <YatzyBurst
          key={yatzyBurst.id}
          author={yatzyBurst.author}
          diceValue={yatzyBurst.diceValue ?? undefined}
          variant={yatzyBurst.variant}
        />
      ) : null}
    </>
  );
}

const MultiplayerGameView = memo(function MultiplayerGameView({
  game,
  localRole,
  localPlayer,
  opponentPlayer,
  localState,
  opponentState,
  isMyTurn,
  canAct,
  isConnected,
  opponentOnline,
  status,
  selectedCategory,
  highlightedPlayerCategory,
  maxBurst,
  isRolling,
  pendingAction,
  replayedOpponentEvent,
  isReplayingOpponentRoll,
  replayGapDetected,
  latestReaction,
  onSelectCategory,
  onRoll,
  onScore,
  onToggleDie,
  onRematch,
  onSendReaction,
}: {
  game: NonNullable<ReturnType<typeof useMultiplayerGame>["game"]>;
  localRole: NonNullable<ReturnType<typeof useMultiplayerGame>["localRole"]>;
  localPlayer: NonNullable<ReturnType<typeof useMultiplayerGame>["localPlayer"]>;
  opponentPlayer: NonNullable<ReturnType<typeof useMultiplayerGame>["opponentPlayer"]>;
  localState: NonNullable<NonNullable<ReturnType<typeof useMultiplayerGame>["localPlayer"]>["state"]>;
  opponentState: NonNullable<NonNullable<ReturnType<typeof useMultiplayerGame>["opponentPlayer"]>["state"]>;
  isMyTurn: boolean;
  canAct: boolean;
  isConnected: boolean;
  opponentOnline: boolean;
  status: ReturnType<typeof useMultiplayerGame>["status"];
  selectedCategory: CategoryId | null;
  highlightedPlayerCategory: CategoryId | null;
  maxBurst: { category: CategoryId; side: "player" | "opponent"; burstKey: number } | null;
  isRolling: boolean;
  pendingAction: ReturnType<typeof useMultiplayerGame>["pendingAction"];
  replayedOpponentEvent: RoomActionEvent | null;
  isReplayingOpponentRoll: boolean;
  replayGapDetected: boolean;
  latestReaction: ReturnType<typeof useMultiplayerGame>["latestReaction"];
  onSelectCategory: (category: CategoryId | null) => void;
  onRoll: () => void;
  onScore: (category?: CategoryId | null) => void;
  onToggleDie: (index: number) => void;
  onRematch: () => void;
  onSendReaction: (emoji: Parameters<ReturnType<typeof useMultiplayerGame>["sendReaction"]>[0]) => void;
}) {
  const rematchRequested = game.rematchReady.includes(localRole);
  const opponentRole = localRole === "player1" ? "player2" : "player1";
  const opponentWantsRematch = game.rematchReady.includes(opponentRole) && !rematchRequested;
  const localName = localPlayer.name;
  const opponentName = opponentPlayer.name;
  const highlightedOpponentDie = replayedOpponentEvent?.action.type === "HOLD"
    ? replayedOpponentEvent.action.index
    : null;
  const highlightedOpponentCategory = replayedOpponentEvent?.action.type === "SCORE"
    ? replayedOpponentEvent.action.category
    : null;
  const localTotal = useMemo(() => totalScore(localState.scores), [localState.scores]);
  const opponentTotal = useMemo(() => totalScore(opponentState.scores), [opponentState.scores]);
  const animationSeed = isMyTurn
    ? game.turn * 20 + 5 + localState.rollNumber
    : (replayedOpponentEvent?.version ?? game.turn * 20 + 10 + opponentState.rollNumber);
  const reactionsControl = useMemo(() => (
    <MultiplayerReactions
      disabled={!isConnected || !opponentOnline}
      latestReaction={latestReaction}
      localRole={localRole}
      localName={localName}
      opponentName={opponentName}
      onSend={onSendReaction}
    />
  ), [isConnected, opponentOnline, latestReaction, localRole, localName, opponentName, onSendReaction]);
  const connectionNotice = !isConnected
    ? "Ta connexion est interrompue. Reconnexion en cours…"
    : !opponentOnline
      ? `${opponentName} est déconnecté·e. La partie reprendra à son retour.`
      : null;

  return (
    <main id="main-content" className="game-shell">
      <header className="game-header multiplayer-game-header">
        <Link className="game-logo" href="/">YAZZY</Link>
        <div className="multiplayer-total-summary" aria-label={`Total : ${localName} ${localTotal}, ${opponentName} ${opponentTotal}`}>
          <span className="total-label">Total</span>
          <strong className="score-value total-score-value" aria-hidden="true">{localTotal}</strong>
          <strong className="score-value score-value-bot" aria-hidden="true">{opponentTotal}</strong>
        </div>
        <Link
          className="quit-link multiplayer-quit-link"
          href="/"
          aria-label="Quitter la partie"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </Link>
      </header>

      {connectionNotice ? <p className="connection-notice" role="status">{connectionNotice}</p> : null}
      <p className="sr-only" role="status" aria-live="polite">
        {replayGapDetected
          ? "Certaines étapes n’ont pas pu être rejouées. La partie est maintenant synchronisée."
          : replayedOpponentEvent
            ? replayAnnouncement(replayedOpponentEvent, opponentName)
            : ""}
      </p>

      {status === "finished" ? (
        <FinishedGame
          game={game}
          localRole={localRole}
          onRematch={onRematch}
          rematchRequested={rematchRequested}
          opponentWantsRematch={opponentWantsRematch}
          localName={localName}
          opponentName={opponentName}
        />
      ) : (
        <div className="game-content">
          <ScoreCard
            label={`Feuille de score : ${localName} et ${opponentName}`}
            playerLabel={localName}
            opponentLabel={opponentName}
            humanScores={localState.scores}
            botScores={opponentState.scores}
            dice={localState.dice}
            opponentDice={opponentState.dice}
            selected={canAct ? selectedCategory : null}
            canSelect={canAct && localState.rollNumber > 0 && !isRolling}
            isReadOnly={!canAct}
            activeColumn={isMyTurn ? "player" : "opponent"}
            highlightedPlayerCategory={highlightedPlayerCategory}
            highlightedOpponentCategory={highlightedOpponentCategory}
            maxBurst={maxBurst}
            showTotal={false}
            onSelect={onSelectCategory}
            onScore={onScore}
          />

          <GameTable
            dice={isMyTurn ? localState.dice : opponentState.dice}
            held={isMyTurn ? localState.held : opponentState.held}
            rollNumber={isMyTurn ? localState.rollNumber : opponentState.rollNumber}
            selectedCategory={isMyTurn ? selectedCategory : null}
            animationSeed={animationSeed}
            isRolling={isMyTurn ? isRolling : isReplayingOpponentRoll}
            isDisabled={!canAct}
            isRollDisabled={false}
            isObserver={!isMyTurn}
            highlightedDieIndex={!isMyTurn ? highlightedOpponentDie : null}
            label={isMyTurn ? `Les dés de ${localName}` : `Les dés de ${opponentName}`}
            trailingControl={reactionsControl}
            onToggleDie={onToggleDie}
            onRoll={onRoll}
          />
        </div>
      )}
    </main>
  );
});
