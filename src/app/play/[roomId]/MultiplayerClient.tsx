"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { FinishedGame } from "@/components/FinishedGame";
import { GameTable } from "@/components/GameTable";
import { MultiplayerNameGate } from "@/components/MultiplayerNameGate";
import { MultiplayerReactions } from "@/components/MultiplayerReactions";
import { ScoreCard } from "@/components/ScoreCard";
import type { RoomActionEvent } from "@/domain/multiplayerRoomProtocol";
import { CATEGORY_BY_ID, totalScore, type CategoryId } from "@/domain/yatzy";
import { useGameKeyboard } from "@/hooks/useGameKeyboard";
import { useMultiplayerGame } from "@/hooks/useMultiplayerGame";
import { readStoredPlayerName, writeStoredPlayerName } from "@/lib/playerNameStorage";

const HUMAN_ROLL_ANIMATION_MS = 360;

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
  isHost: boolean;
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
    hasPendingHolds,
    pendingAction,
  } = useMultiplayerGame(roomId, isHost, playerName);
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | null>(null);
  const [highlightedPlayerCategory, setHighlightedPlayerCategory] = useState<CategoryId | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const rollTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setPlayerName(readStoredPlayerName());
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  const localState = localPlayer?.state;
  const opponentState = opponentPlayer?.state;
  const canAct = Boolean(isMyTurn && isConnected && opponentOnline);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setInviteLink(`${window.location.origin}/play/${roomId}`);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [roomId]);

  useEffect(() => () => {
    if (rollTimerRef.current !== null) window.clearTimeout(rollTimerRef.current);
  }, []);

  const handleRoll = () => {
    if (!canAct || isRolling || hasPendingHolds || pendingAction || !localState || localState.rollNumber >= 3) return;
    if (localState.rollNumber > 0 && localState.held.every(Boolean)) return;
    roll();
    setIsRolling(true);
    if (rollTimerRef.current !== null) window.clearTimeout(rollTimerRef.current);
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 80 : HUMAN_ROLL_ANIMATION_MS;
    rollTimerRef.current = window.setTimeout(() => {
      rollTimerRef.current = null;
      setIsRolling(false);
    }, duration);
  };

  const handleScore = (category = selectedCategory) => {
    if (!category || !canAct || isRolling || hasPendingHolds || pendingAction) return;
    setHighlightedPlayerCategory(category);
    score(category);
    setSelectedCategory(null);
  };

  useGameKeyboard({
    disabled: status !== "playing" || !canAct || isRolling || hasPendingHolds || pendingAction !== null,
    canRoll: Boolean(localState && localState.rollNumber < 3 && !localState.held.every(Boolean)),
    canScore: selectedCategory !== null && !isRolling,
    onRoll: handleRoll,
    onScore: handleScore,
    onToggleDie: toggleHeld,
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
    return <main id="main-content" className="app-loading" aria-busy="true"><p>Préparation de la partie…</p></main>;
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
          <p className="eyebrow">PARTIE PRIVÉE</p>
          <h1 id="waiting-title">Invite ton ami</h1>
          <p>Envoie-lui ce code. La partie commencera automatiquement dès qu’il l’aura saisi.</p>
          <div className="room-code-block">
            <span>Code de la partie</span>
            <strong>{roomId}</strong>
          </div>
          <div className="invite-actions">
            <button className="primary-action" type="button" onClick={handleCopyCode}>Copier le code</button>
            <button className="secondary-action" type="button" onClick={handleCopyLink}>Copier le lien</button>
          </div>
          <div className="invite-field">
            <label htmlFor="invite-link">Lien privé à partager</label>
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
    return <main id="main-content" className="app-loading" aria-busy="true"><p>Chargement de la partie…</p></main>;
  }

  const rematchRequested = game.rematchReady.includes(localRole);
  const localName = localPlayer.name;
  const opponentName = opponentPlayer.name;
  const highlightedOpponentDie = replayedOpponentEvent?.action.type === "HOLD"
    ? replayedOpponentEvent.action.index
    : null;
  const highlightedOpponentCategory = replayedOpponentEvent?.action.type === "SCORE"
    ? replayedOpponentEvent.action.category
    : null;
  const connectionNotice = !isConnected
    ? "Ta connexion est interrompue. Reconnexion en cours…"
    : !opponentOnline
      ? `${opponentName} est déconnecté·e. La partie reprendra à son retour.`
      : null;

  return (
    <main id="main-content" className="game-shell">
      <header className="game-header multiplayer-game-header">
        <Link className="game-logo" href="/">YAZZY</Link>
        <div className="multiplayer-total-summary" aria-label={`Total : ${localName} ${totalScore(localState.scores)}, ${opponentName} ${totalScore(opponentState.scores)}`}>
          <span className="total-label">Total</span>
          <strong className="score-value total-score-value" aria-hidden="true">{totalScore(localState.scores)}</strong>
          <strong className="score-value score-value-bot" aria-hidden="true">{totalScore(opponentState.scores)}</strong>
        </div>
        <Link
          className="quit-link multiplayer-quit-link"
          href="/"
          aria-label="Quitter la partie"
          onClick={(event) => {
            if (!window.confirm("Quitter la partie en cours ?")) event.preventDefault();
          }}
        >
          <span aria-hidden="true">×</span>
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
          onRematch={rematch}
          rematchRequested={rematchRequested}
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
            canSelect={canAct && localState.rollNumber > 0 && !isRolling && !hasPendingHolds && pendingAction === null}
            isReadOnly={!canAct}
            activeColumn={isMyTurn ? "player" : "opponent"}
            highlightedPlayerCategory={highlightedPlayerCategory}
            highlightedOpponentCategory={highlightedOpponentCategory}
            showTotal={false}
            onSelect={setSelectedCategory}
            onScore={handleScore}
          />

          <GameTable
            dice={isMyTurn ? localState.dice : opponentState.dice}
            held={isMyTurn ? localState.held : opponentState.held}
            rollNumber={isMyTurn ? localState.rollNumber : opponentState.rollNumber}
            selectedCategory={isMyTurn ? selectedCategory : null}
            animationSeed={replayedOpponentEvent?.version ?? game.turn * 20 + (isMyTurn ? 1 : 2) * 5 + (isMyTurn ? localState.rollNumber : opponentState.rollNumber)}
            isRolling={isMyTurn ? isRolling : isReplayingOpponentRoll}
            isDisabled={!canAct || pendingAction !== null}
            isRollDisabled={hasPendingHolds || pendingAction !== null}
            isObserver={!isMyTurn}
            highlightedDieIndex={!isMyTurn ? highlightedOpponentDie : null}
            label={isMyTurn ? `Les dés de ${localName}` : `Les dés de ${opponentName}`}
            trailingControl={(
              <MultiplayerReactions
                disabled={!isConnected || !opponentOnline}
                latestReaction={latestReaction}
                localRole={localRole}
                localName={localName}
                opponentName={opponentName}
                onSend={sendReaction}
              />
            )}
            onToggleDie={toggleHeld}
            onRoll={handleRoll}
          />
        </div>
      )}
    </main>
  );
}
