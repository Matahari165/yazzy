"use client";

import { useState } from "react";
import { notFound } from "next/navigation";
import { FinishedGame } from "@/components/FinishedGame";
import { YatzyBurst } from "@/components/YatzyBurst";
import { createGame } from "@/domain/game";
import { createMultiplayerGame, freshPlayerState } from "@/domain/multiplayer";

const WIN = { yatzy: 50, pair: 20, chance: 18 };
const LOSE = { yatzy: 0, pair: 8, chance: 10 };
const TIE = { yatzy: 50, pair: 12, chance: 14 };

function soloGame(local: typeof WIN, opp: typeof WIN) {
  const game = createGame("expert");
  return {
    ...game,
    human: { ...game.human, scores: local },
    bot: { ...game.bot, scores: opp },
  };
}

function duoGame(local: typeof WIN, opp: typeof WIN) {
  const game = createMultiplayerGame("ABCDEF", "player1");
  return {
    ...game,
    status: "finished" as const,
    player1: { playerId: "a", name: "JoA", connectionId: "a", state: freshPlayerState(local) },
    player2: { playerId: "b", name: "JoB", connectionId: "b", state: freshPlayerState(opp) },
  };
}

const SECTIONS: { title: string; node: React.ReactNode }[] = [
  { title: "Solo · Victoire", node: <FinishedGame game={soloGame(WIN, LOSE)} /> },
  { title: "Solo · Défaite", node: <FinishedGame game={soloGame(LOSE, WIN)} /> },
  { title: "Solo · Égalité", node: <FinishedGame game={soloGame(TIE, TIE)} /> },
  {
    title: "Duo · Victoire",
    node: (
      <FinishedGame
        game={duoGame(WIN, LOSE)}
        localRole="player1"
        localName="JoA"
        opponentName="JoB"
        onRematch={() => {}}
      />
    ),
  },
  {
    title: "Duo · Défaite",
    node: (
      <FinishedGame
        game={duoGame(LOSE, WIN)}
        localRole="player1"
        localName="JoA"
        opponentName="JoB"
        onRematch={() => {}}
      />
    ),
  },
  {
    title: "Duo · Égalité",
    node: (
      <FinishedGame
        game={duoGame(TIE, TIE)}
        localRole="player1"
        localName="JoA"
        opponentName="JoB"
        onRematch={() => {}}
      />
    ),
  },
];

export default function PreviewPage() {
  const [burstKey, setBurstKey] = useState(1);
  if (process.env.NODE_ENV === "production") return notFound();

  return (
    <main
      id="main-content"
      style={{ display: "grid", gap: 40, padding: "32px 20px", justifyItems: "center" }}
    >
      <header style={{ textAlign: "center" }}>
        <p className="eyebrow">Aperçu dev</p>
        <h1>Écrans de fin + Yatzy</h1>
        <p style={{ color: "var(--ink-soft)" }}>
          Page visible uniquement en local. Les animations se rejouent à chaque chargement.
        </p>
        <button
          className="primary-action"
          type="button"
          onClick={() => setBurstKey((key) => key + 1)}
          style={{ marginTop: 12 }}
        >
          Rejouer l’explosion Yatzy
        </button>
      </header>
      <YatzyBurst key={burstKey} author="Toi" />
      {SECTIONS.map((section) => (
        <section key={section.title} style={{ width: "min(100%, 580px)", display: "grid", gap: 12 }}>
          <h2 style={{ textAlign: "center", margin: 0 }}>{section.title}</h2>
          {section.node}
        </section>
      ))}
    </main>
  );
}
