import { useState, type CSSProperties } from "react";
import Link from "next/link";
import type { GameState } from "@/domain/game";
import type { MultiplayerGameState } from "@/domain/multiplayer";
import { totalScore } from "@/domain/yatzy";

type FinishedGameProps = {
  game: GameState | MultiplayerGameState;
  localPlayerId?: "human" | "bot";
  localRole?: "player1" | "player2";
  onRematch?: () => void;
  rematchRequested?: boolean;
  localName?: string;
  opponentName?: string;
  onLeave?: () => void;
};

type GameOutcome = "win" | "loss" | "tie";

type PartyVariant = "rain" | "sway" | "pop";

type ConfettiPiece = {
  left: number;
  delay: number;
  duration: number;
  size: number;
  color: string;
  round: boolean;
  drift: number;
};

type Party = {
  variant: PartyVariant;
  emoji: string;
  tagline: string;
  pieces: ConfettiPiece[];
};

const PARTY_VARIANTS: PartyVariant[] = ["rain", "sway", "pop"];

const WIN_PALETTES = [
  ["#c85a32", "#4a8072", "#3d5a80", "#e9b44c"],
  ["#ee6378", "#7c62d6", "#3a80d2", "#e9b44c"],
  ["#4a8072", "#e9b44c", "#c85a32", "#3d5a80"],
];
const WIN_EMOJIS = ["🏆", "🎉", "👑", "🍾", "🥳", "⭐"];
const WIN_TAGLINES_DUO = [
  "{o} réclame déjà sa revanche !",
  "Victoire ! {o} peut aller se rhabiller.",
  "{o} a vu passer des étoiles.",
  "Écraseur de dés en chef !",
  "{o} dit que les dés étaient truqués.",
];
const WIN_TAGLINES_BOT = [
  "Le bot a grillé un circuit.",
  "Le bot demande sa revanche. En binaire.",
  "Victoire ! Le bot boude dans son coin.",
  "Tu as battu un robot. La classe.",
];

const TIE_COLORS = ["#e9b44c", "#f6d47c", "#c85a32", "#4a8072"];
const TIE_EMOJIS = ["🤝", "⚖️", "✨"];
const TIE_TAGLINES = [
  "Match nul ! On refait ?",
  "Égalité parfaite. Suspect…",
  "Personne ne gagne, tout le monde rigole.",
];

const LOSS_COLORS = ["#cfc8bd", "#b9b0a6", "#a8a29e", "#d8d0c4"];
const LOSS_EMOJIS = ["🥲", "🌧️", "🍀", "💩"];
const LOSS_TAGLINES_DUO = [
  "{o} te doit un café.",
  "{o} fait la danse de la victoire.",
  "La revanche sonne déjà…",
  "Les dés t'ont trahi. Eux aussi veulent une revanche.",
];
const LOSS_TAGLINES_BOT = [
  "Le bot fait la danse de la victoire.",
  "Il a eu chaud quand même. Enfin, presque.",
  "Le bot te prête un mouchoir.",
  "Secoue plus fort la prochaine fois !",
];

function randomOf<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function buildPieces(count: number, colors: readonly string[], slow: boolean): ConfettiPiece[] {
  return Array.from({ length: count }, () => ({
    left: Math.random() * 100,
    delay: Math.random() * (slow ? 2.2 : 1.1),
    duration: slow ? 4.5 + Math.random() * 3 : 2.4 + Math.random() * 1.8,
    size: 6 + Math.random() * 7,
    color: randomOf(colors),
    round: Math.random() < 0.35,
    drift: (Math.random() - 0.5) * 260,
  }));
}

function pickParty(outcome: GameOutcome, isMultiplayer: boolean, opponentLabel: string): Party {
  const fill = (template: string) => template.replaceAll("{o}", opponentLabel);
  if (outcome === "win") {
    // Deuxième vague : un tiers des confettis retombe plus tard.
    const pieces = buildPieces(56, randomOf(WIN_PALETTES), false).map((piece, index) =>
      index % 3 === 0
        ? { ...piece, delay: 1.6 + Math.random() * 1.2, duration: piece.duration + 1 }
        : piece,
    );
    return {
      variant: randomOf(PARTY_VARIANTS),
      emoji: randomOf(WIN_EMOJIS),
      tagline: fill(randomOf(isMultiplayer ? WIN_TAGLINES_DUO : WIN_TAGLINES_BOT)),
      pieces,
    };
  }
  if (outcome === "loss") {
    return {
      variant: "rain",
      emoji: randomOf(LOSS_EMOJIS),
      tagline: fill(randomOf(isMultiplayer ? LOSS_TAGLINES_DUO : LOSS_TAGLINES_BOT)),
      pieces: buildPieces(22, LOSS_COLORS, true),
    };
  }
  return {
    variant: "sway",
    emoji: randomOf(TIE_EMOJIS),
    tagline: randomOf(TIE_TAGLINES),
    pieces: buildPieces(30, TIE_COLORS, false),
  };
}

export function FinishedGame({
  game,
  localPlayerId = "human",
  localRole,
  onRematch,
  rematchRequested = false,
  localName = "Toi",
  opponentName = "Ami",
  onLeave,
}: FinishedGameProps) {
  const isMultiplayer = "player1" in game;

  let localPoints: number;
  let opponentPoints: number;

  if (isMultiplayer) {
    const p1Scores = game.player1?.state.scores ?? {};
    const p2Scores = game.player2?.state.scores ?? {};
    localPoints = totalScore(localRole === "player1" ? p1Scores : p2Scores);
    opponentPoints = totalScore(localRole === "player1" ? p2Scores : p1Scores);
  } else {
    const humanPoints = totalScore(game.human.scores);
    const botPoints = totalScore(game.bot.scores);
    localPoints = localPlayerId === "human" ? humanPoints : botPoints;
    opponentPoints = localPlayerId === "human" ? botPoints : humanPoints;
  }

  const isTie = localPoints === opponentPoints;
  const isWinner = localPoints > opponentPoints;
  const outcome: GameOutcome = isTie ? "tie" : isWinner ? "win" : "loss";
  const mode = isMultiplayer ? "duo" : "bot";
  const opponentLabel = isMultiplayer ? opponentName : "Bot";
  const playerLabel = isMultiplayer ? localName : "Toi";
  const resultTitle = isTie ? "Égalité" : isWinner ? "Victoire" : "Défaite";

  const playerIsWinner = isWinner;
  const opponentIsWinner = !isWinner && !isTie;

  // Tiré au sort une fois à l'ouverture : cet écran ne se monte que côté
  // client une fois la partie chargée, donc pas de divergence serveur/client.
  const [party] = useState<Party>(() => pickParty(outcome, isMultiplayer, opponentLabel));

  return (
    <section
      className="finished-card finished-celebration"
      tabIndex={-1}
      aria-labelledby="finished-title"
      aria-live="polite"
      data-game-mode={mode}
      data-outcome={outcome}
    >
      <div className="finished-ambient" data-outcome={outcome} aria-hidden="true">
        <span className="finished-rays" />
        <span className="finished-rain" />
      </div>
      <div
        className="finished-confetti"
        data-variant={party.variant}
        data-outcome={outcome}
        aria-hidden="true"
      >
        {party.pieces.map((piece, index) => (
          <i
            key={index}
            style={
              {
                left: `${piece.left}%`,
                width: piece.size,
                height: piece.round ? piece.size : Math.round(piece.size * 0.62),
                background: piece.color,
                borderRadius: piece.round ? "50%" : "2px",
                animationDelay: `${piece.delay.toFixed(2)}s`,
                animationDuration: `${piece.duration.toFixed(2)}s`,
                "--drift": `${Math.round(piece.drift)}px`,
              } as CSSProperties
            }
          />
        ))}
      </div>

      <header className="finished-hero" data-outcome={outcome}>
        <div className="finished-party-emoji" aria-hidden="true">{party.emoji}</div>
        <h1 id="finished-title" className="finished-result" tabIndex={-1}>
          {resultTitle}
        </h1>
        <p className="finished-tagline">{party.tagline}</p>
      </header>

      <div className="finished-scoreboard" role="list" aria-label="Scores finaux">
        <article
          className="finished-player-score"
          role="listitem"
          data-score-column="player"
          data-winner={playerIsWinner}
          data-local-player="true"
          aria-label={`${playerLabel} : ${localPoints} points${playerIsWinner ? ", gagnant" : isTie ? ", égalité" : ""}`}
        >
          <div className="finished-score-topline">
            <span className="finished-player-name">{playerLabel}</span>
            {playerIsWinner ? (
              <span className="finished-winner-mark" aria-hidden="true">✦</span>
            ) : null}
          </div>
          <strong className="finished-score-number" data-score={localPoints}>{localPoints}</strong>
        </article>

        <article
          className="finished-player-score"
          role="listitem"
          data-score-column="opponent"
          data-winner={opponentIsWinner}
          data-local-player="false"
          aria-label={`${opponentLabel} : ${opponentPoints} points${opponentIsWinner ? ", gagnant" : isTie ? ", égalité" : ""}`}
        >
          <div className="finished-score-topline">
            <span className="finished-player-name">{opponentLabel}</span>
            {opponentIsWinner ? (
              <span className="finished-winner-mark" aria-hidden="true">✦</span>
            ) : null}
          </div>
          <strong className="finished-score-number" data-score={opponentPoints}>{opponentPoints}</strong>
        </article>
      </div>

      <div className="finished-actions">
        {isMultiplayer && onRematch ? (
          <button className="primary-action" type="button" disabled={rematchRequested} onClick={onRematch}>
            {rematchRequested ? "En attente…" : "Revanche"}
          </button>
        ) : (
          <Link className="primary-action" href="/bot" onClick={onLeave}>Rejouer</Link>
        )}
        <Link className="secondary-action" href="/" onClick={onLeave}>Accueil</Link>
      </div>
    </section>
  );
}
