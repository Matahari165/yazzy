"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { BOT_LEVELS, getBotPolicy, type BotLevel } from "@/domain/bots";
import { createGame } from "@/domain/game";
import { readStoredGame, writeStoredGame } from "@/lib/gameStorage";
import { ConfirmOverwriteDialog } from "./ConfirmOverwriteDialog";

export function BotSetupScreen() {
  const router = useRouter();
  const [selectedLevel, setSelectedLevel] = useState<BotLevel>("strategist");
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const startGame = () => {
    writeStoredGame(createGame("bot", selectedLevel));
    router.push("/game");
  };

  const requestStart = () => {
    const stored = readStoredGame();
    if (stored) {
      setIsConfirmOpen(true);
      return;
    }
    startGame();
  };

  return (
    <main id="main-content" className="setup-shell">
      <section className="setup-card" aria-labelledby="setup-title">
        <header className="setup-header">
          <Link className="back-link" href="/">← Accueil</Link>
          <p className="eyebrow">JOUER CONTRE UN BOT</p>
          <h1 id="setup-title">Choisis ton adversaire</h1>
        </header>

        <div className="level-list" role="radiogroup" aria-label="Niveau du bot">
          {BOT_LEVELS.map((level) => {
            const policy = getBotPolicy(level);
            const selected = selectedLevel === level;
            return (
              <button
                className="level-card"
                data-selected={selected}
                key={level}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setSelectedLevel(level)}
              >
                <span className="level-card-top">
                  <strong>{policy.label}</strong>
                  {level === "strategist" ? <span className="recommended-chip">Conseillé</span> : null}
                </span>
                <span>{policy.description}</span>
              </button>
            );
          })}
        </div>

        <button className="primary-action setup-submit" type="button" onClick={requestStart}>Commencer</button>
      </section>

      <ConfirmOverwriteDialog
        open={isConfirmOpen}
        onCancel={() => setIsConfirmOpen(false)}
        onConfirm={() => {
          setIsConfirmOpen(false);
          startGame();
        }}
      />
    </main>
  );
}
