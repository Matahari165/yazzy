"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { FinishedGame } from "@/components/FinishedGame";
import { DiceTray, GameTable } from "@/components/GameTable";
import { ScoreCard } from "@/components/ScoreCard";
import type { CategoryId } from "@/domain/yatzy";
import { useGameKeyboard } from "@/hooks/useGameKeyboard";
import { useMultiplayerGame } from "@/hooks/useMultiplayerGame";

export function MultiplayerClient({ roomId }: { roomId: string }) {
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
  } = useMultiplayerGame(roomId);
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const rollTimerRef = useRef<number | null>(null);

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
    if (!canAct || isRolling || !localState || localState.rollNumber >= 3) return;
    if (localState.rollNumber > 0 && localState.held.every(Boolean)) return;
    roll();
    setIsRolling(true);
    if (rollTimerRef.current !== null) window.clearTimeout(rollTimerRef.current);
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 80 : 260;
    rollTimerRef.current = window.setTimeout(() => {
      rollTimerRef.current = null;
      setIsRolling(false);
    }, duration);
  };

  const handleScore = () => {
    if (!selectedCategory || !canAct || isRolling) return;
    score(selectedCategory);
    setSelectedCategory(null);
  };

  useGameKeyboard({
    disabled: status !== "playing" || !canAct || isRolling,
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

  if (status === "unavailable") {
    return (
      <main id="main-content" className="multiplayer-state-card" role="alert">
        <p className="eyebrow">MODE EN LIGNE INDISPONIBLE</p>
        <h1>Les parties privées ne sont pas encore activées</h1>
        <p>{connectionError}</p>
        <div className="multiplayer-state-actions">
          <Link className="primary-action" href="/bot">Jouer contre un bot</Link>
          <Link className="secondary-action" href="/">Retour à l’accueil</Link>
        </div>
      </main>
    );
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
          <span className="mode-label">PARTIE PRIVÉE</span>
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
          <p className="copy-status" role="status">{copyStatus || "Aucune inscription nécessaire"}</p>
          <p className="waiting-status" role="status"><i aria-hidden="true" /> En attente de ton ami…</p>
        </section>
      </main>
    );
  }

  if (!game || !localState || !opponentState || !localRole) {
    return <main id="main-content" className="app-loading" aria-busy="true"><p>Chargement de la partie…</p></main>;
  }

  const rematchRequested = game.rematchReady.includes(localRole);
  const connectionNotice = !isConnected
    ? "Ta connexion est interrompue. Reconnexion en cours…"
    : !opponentOnline
      ? "Ton ami est déconnecté. La partie reprendra à son retour."
      : null;

  return (
    <main id="main-content" className="game-shell">
      <header className="game-header">
        <Link className="game-logo" href="/">YAZZY</Link>
        <span className="mode-label">AMI</span>
        <div className="match-score" aria-label={isMyTurn ? "C’est ton tour" : "C’est le tour de ton ami"}>
          <span className="match-player" data-active={isMyTurn}>
            <i className="turn-dot" aria-hidden="true" /> Toi
          </span>
          <span className="score-separator" aria-hidden="true">·</span>
          <span className="match-player" data-active={!isMyTurn} data-online={opponentOnline}>
            <i className="turn-dot" aria-hidden="true" /> Ami
          </span>
        </div>
        <Link className="quit-link" href="/">Quitter</Link>
      </header>

      {connectionNotice ? <p className="connection-notice" role="status">{connectionNotice}</p> : null}

      {status === "finished" ? (
        <FinishedGame
          game={game}
          localRole={localRole}
          onRematch={rematch}
          rematchRequested={rematchRequested}
        />
      ) : (
        <div className="game-content">
          <ScoreCard
            label="Feuille de score : toi et ton ami"
            playerLabel="Toi"
            opponentLabel="Ami"
            humanScores={localState.scores}
            botScores={opponentState.scores}
            dice={localState.dice}
            selected={canAct ? selectedCategory : null}
            canSelect={canAct && localState.rollNumber > 0 && !isRolling}
            isReadOnly={!canAct}
            onSelect={setSelectedCategory}
            onScore={handleScore}
          />

          {isMyTurn ? (
            <GameTable
              dice={localState.dice}
              held={localState.held}
              rollNumber={localState.rollNumber}
              selectedCategory={selectedCategory}
              isRolling={isRolling}
              isDisabled={!canAct}
              onToggleDie={toggleHeld}
              onRoll={handleRoll}
            />
          ) : (
            <section className="opponent-turn-panel" aria-labelledby="opponent-turn-title" aria-live="polite">
              <p className="eyebrow">TOUR DE TON AMI</p>
              <h2 id="opponent-turn-title">
                {opponentState.rollNumber > 0 ? `Lancer ${opponentState.rollNumber} sur 3` : "Il choisit son lancer…"}
              </h2>
              <DiceTray
                dice={opponentState.dice}
                held={opponentState.held}
                rollNumber={opponentState.rollNumber}
                rolling={false}
                disabled
                label="Les dés de ton ami"
              />
              <p>Tu vois ses dés et ses choix en direct.</p>
            </section>
          )}
        </div>
      )}
    </main>
  );
}
