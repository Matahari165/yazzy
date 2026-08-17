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
import { readStoredGame } from "@/lib/gameStorage";

export function HomeScreen() {
  const router = useRouter();
  const [savedGame, setSavedGame] = useState<GameState | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [roomCode, setRoomCode] = useState("");
  const [roomCodeError, setRoomCodeError] = useState("");

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSavedGame(readStoredGame());
      setHasLoaded(true);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  const canResume = hasLoaded && savedGame !== null && !isFinished(savedGame);

  const startMultiplayer = () => {
    router.push(`/play/${generateRoomCode()}?host=1`);
  };

  const joinMultiplayer = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedCode = normalizeRoomCode(roomCode);

    if (!isRoomCode(normalizedCode)) {
      setRoomCodeError("Saisis les 6 caractères du code envoyé par ton ami.");
      return;
    }

    setRoomCodeError("");
    router.push(`/play/${normalizedCode}`);
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
            <div>
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
              <button className="secondary-action" type="submit">
                Rejoindre
              </button>
            </div>
            {roomCodeError ? (
              <p id="room-code-error" className="form-error" role="alert">{roomCodeError}</p>
            ) : null}
          </form>
        </div>

        <p className="lobby-footnote">
          Aucune inscription nécessaire. Les parties en ligne sont privées et temporaires.
        </p>
      </section>
    </main>
  );
}
