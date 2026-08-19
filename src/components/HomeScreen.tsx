"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { isFinished, type GameState } from "@/domain/game";
import {
  generateRoomCode,
  isRoomCode,
  normalizeRoomCode,
} from "@/domain/roomCode";
import { CATEGORY_IDS } from "@/domain/yatzy";
import {
  normalizePlayerName,
  PLAYER_NAME_MAX_LENGTH,
} from "@/domain/playerName";
import { readStoredGame } from "@/lib/gameStorage";
import {
  readStoredPlayerName,
  writeStoredPlayerName,
} from "@/lib/playerNameStorage";

export function HomeScreen() {
  const router = useRouter();
  const [savedGame, setSavedGame] = useState<GameState | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [roomCode, setRoomCode] = useState("");
  const [roomCodeError, setRoomCodeError] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [playerNameError, setPlayerNameError] = useState("");

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSavedGame(readStoredGame());
      setPlayerName(readStoredPlayerName());
      setHasLoaded(true);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  const canResume = hasLoaded && savedGame !== null && !isFinished(savedGame);

  const savePlayerName = () => {
    const normalizedName = normalizePlayerName(playerName);
    if (!normalizedName) {
      setPlayerNameError("Choisis un pseudo pour la partie.");
      return null;
    }
    writeStoredPlayerName(normalizedName);
    setPlayerName(normalizedName);
    setPlayerNameError("");
    return normalizedName;
  };

  const startMultiplayer = () => {
    if (!savePlayerName()) return;
    router.push(`/play/${generateRoomCode()}?host=1`);
  };

  const joinMultiplayer = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedCode = normalizeRoomCode(roomCode);

    if (!isRoomCode(normalizedCode)) {
      setRoomCodeError("Saisis les 6 caractères du code envoyé par ton ami.");
      return;
    }

    if (!savePlayerName()) return;

    setRoomCodeError("");
    router.push(`/play/${normalizedCode}`);
  };

  const pasteRoomCode = async () => {
    setRoomCodeError("");
    try {
      if (!navigator.clipboard?.readText) throw new Error("Clipboard unavailable");
      const normalizedCode = normalizeRoomCode(await navigator.clipboard.readText());
      setRoomCode(normalizedCode);

      if (!isRoomCode(normalizedCode)) {
        setRoomCodeError("Le presse-papiers ne contient pas un code de partie valide.");
        return;
      }

      if (!savePlayerName()) return;
      router.push(`/play/${normalizedCode}`);
    } catch {
      setRoomCodeError("Impossible de lire le presse-papiers. Colle le code dans le champ.");
    }
  };

  return (
    <main id="main-content" className="lobby-shell">
      <section className="lobby-card" aria-labelledby="lobby-title">
        <header className="lobby-brand">
          <span className="logo-mark" aria-hidden="true"><span /><span /><span /></span>
          <div>
            <p className="eyebrow">YAZZY</p>
            <h1 id="lobby-title">Le Yatzy simple et malin</h1>
          </div>
        </header>

        <div className="lobby-actions">
          {canResume ? (
            <Link className="secondary-action" href="/game">
              <span>Reprendre la partie</span>
              <small>Tour {Math.min(savedGame.turn, CATEGORY_IDS.length)} sur {CATEGORY_IDS.length}</small>
            </Link>
          ) : null}
          <Link className="primary-action" href="/bot">Jouer contre un bot</Link>
          <div className="player-name-field">
            <label htmlFor="player-name">Ton pseudo en multijoueur</label>
            <input
              id="player-name"
              name="player-name"
              type="text"
              value={playerName}
              onChange={(event) => {
                setPlayerName(event.currentTarget.value.slice(0, PLAYER_NAME_MAX_LENGTH));
                setPlayerNameError("");
              }}
              onBlur={() => {
                const normalizedName = normalizePlayerName(playerName);
                setPlayerName(normalizedName);
                if (normalizedName) writeStoredPlayerName(normalizedName);
              }}
              placeholder="Ex. Alex"
              autoComplete="nickname"
              maxLength={PLAYER_NAME_MAX_LENGTH}
              aria-describedby={playerNameError ? "player-name-error" : undefined}
              aria-invalid={playerNameError ? true : undefined}
            />
            {playerNameError ? (
              <p id="player-name-error" className="form-error" role="alert">{playerNameError}</p>
            ) : null}
          </div>
          <button
            className="primary-action"
            type="button"
            onClick={startMultiplayer}
          >
            <span>Jouer avec un ami</span>
            <small>Créer un code privé</small>
          </button>
          <form className="lobby-code-form" onSubmit={joinMultiplayer} noValidate>
            <label htmlFor="room-code">Rejoindre avec un code</label>
            <div className="lobby-code-controls">
              <input
                id="room-code"
                name="room-code"
                type="text"
                value={roomCode}
                onChange={(event) => {
                  setRoomCode(normalizeRoomCode(event.currentTarget.value));
                  setRoomCodeError("");
                }}
                placeholder="ABCD23"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                inputMode="text"
                maxLength={6}
                aria-describedby={roomCodeError ? "room-code-error" : undefined}
                aria-invalid={roomCodeError ? true : undefined}
              />
              <div className="lobby-code-actions">
                <button className="secondary-action" type="button" onClick={pasteRoomCode}>
                  Coller le code
                </button>
                <button className="secondary-action" type="submit">
                  Rejoindre
                </button>
              </div>
            </div>
            {roomCodeError ? (
              <p id="room-code-error" className="form-error" role="alert">{roomCodeError}</p>
            ) : null}
          </form>
        </div>
      </section>
    </main>
  );
}
