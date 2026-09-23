import { useState, type CSSProperties } from "react";
import Link from "next/link";
import type { GameState } from "@/domain/game";
import type { MultiplayerGameState } from "@/domain/multiplayer";
import { CATEGORY_BY_ID, totalScore, type CategoryId } from "@/domain/yatzy";
import { SoloStats } from "./SoloStats";

type FinishedGameProps = {
  game: GameState | MultiplayerGameState;
  localPlayerId?: "human" | "bot";
  localRole?: "player1" | "player2";
  onRematch?: () => void;
  onSetSeries?: (enabled: boolean) => void;
  rematchRequested?: boolean;
  opponentWantsRematch?: boolean;
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

function seededRandom(key: string): () => number {
  let seed = 2166136261;
  for (const character of key) seed = Math.imul(seed ^ character.charCodeAt(0), 16777619);
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function randomOf<T>(items: readonly T[], random: () => number): T {
  return items[Math.floor(random() * items.length)];
}

function buildPieces(count: number, colors: readonly string[], slow: boolean, random: () => number): ConfettiPiece[] {
  return Array.from({ length: count }, (_, index) => ({
    left: random() * 100,
    delay: slow
      ? random() * 2.2
      : index % 4 === 0
        ? 1.6 + random() * 1.2
        : random() * 1.1,
    duration: slow ? 4.5 + random() * 3 : 2.4 + random() * 1.8,
    size: 6 + random() * 7,
    color: randomOf(colors, random),
    round: random() < 0.35,
    drift: (random() - 0.5) * 260,
  }));
}

function pickParty(outcome: GameOutcome, isMultiplayer: boolean, opponentLabel: string, random: () => number): Party {
  const fill = (template: string) => template.replaceAll("{o}", opponentLabel);
  if (outcome === "win") {
    // Trois vagues : explosion, retombée, pluie tardive.
    const pieces = buildPieces(90, randomOf(WIN_PALETTES, random), false, random).map((piece, index) =>
      index % 3 === 0
        ? { ...piece, delay: 1.6 + random() * 1.2, duration: piece.duration + 1 }
        : piece,
    );
    return {
      variant: randomOf(PARTY_VARIANTS, random),
      emoji: randomOf(WIN_EMOJIS, random),
      tagline: fill(randomOf(isMultiplayer ? WIN_TAGLINES_DUO : WIN_TAGLINES_BOT, random)),
      pieces,
    };
  }
  if (outcome === "loss") {
    return {
      variant: "rain",
      emoji: randomOf(LOSS_EMOJIS, random),
      tagline: fill(randomOf(isMultiplayer ? LOSS_TAGLINES_DUO : LOSS_TAGLINES_BOT, random)),
      pieces: buildPieces(26, LOSS_COLORS, true, random),
    };
  }
  return {
    variant: "sway",
    emoji: randomOf(TIE_EMOJIS, random),
    tagline: randomOf(TIE_TAGLINES, random),
    pieces: buildPieces(36, TIE_COLORS, false, random),
  };
}

function bestHit(scores: Partial<Record<CategoryId, number>>): { label: string; points: number } | null {
  let best: { label: string; points: number } | null = null;
  for (const [category, points] of Object.entries(scores)) {
    if (typeof points !== "number") continue;
    if (!best || points > best.points) {
      best = { label: CATEGORY_BY_ID[category as CategoryId]?.label ?? category, points };
    }
  }
  return best;
}

function countZeros(scores: Partial<Record<CategoryId, number>>): number {
  return Object.values(scores).filter((points) => points === 0).length;
}

export function FinishedGame({
  game,
  localPlayerId = "human",
  localRole,
  onRematch,
  onSetSeries,
  rematchRequested = false,
  opponentWantsRematch = false,
  localName = "Toi",
  opponentName = "Ami",
  onLeave,
}: FinishedGameProps) {
  const isMultiplayer = "player1" in game;

  let localPoints: number;
  let opponentPoints: number;
  let localScores: Partial<Record<CategoryId, number>>;
  let opponentScores: Partial<Record<CategoryId, number>>;

  if (isMultiplayer) {
    const p1Scores = game.player1?.state.scores ?? {};
    const p2Scores = game.player2?.state.scores ?? {};
    localScores = localRole === "player1" ? p1Scores : p2Scores;
    opponentScores = localRole === "player1" ? p2Scores : p1Scores;
    localPoints = totalScore(localScores);
    opponentPoints = totalScore(opponentScores);
  } else {
    localScores = localPlayerId === "human" ? game.human.scores : game.bot.scores;
    opponentScores = localPlayerId === "human" ? game.bot.scores : game.human.scores;
    localPoints = totalScore(localScores);
    opponentPoints = totalScore(opponentScores);
  }

  const isTie = localPoints === opponentPoints;
  const isWinner = localPoints > opponentPoints;
  const outcome: GameOutcome = isTie ? "tie" : isWinner ? "win" : "loss";
  const mode = isMultiplayer ? "duo" : "bot";
  const opponentLabel = isMultiplayer ? opponentName : "Bot";
  const playerLabel = isMultiplayer ? localName : "Toi";
  const localDuelWins = isMultiplayer && localRole ? game.duelWins[localRole] : 0;
  const opponentDuelWins = isMultiplayer && localRole ? game.duelWins[localRole === "player1" ? "player2" : "player1"] : 0;
  const localSeriesWins = isMultiplayer && localRole ? game.series.wins[localRole] : 0;
  const opponentSeriesWins = isMultiplayer && localRole ? game.series.wins[localRole === "player1" ? "player2" : "player1"] : 0;
  const seriesWinner = isMultiplayer ? game.series.winner : null;
  const seriesBest = isMultiplayer ? game.series.bestMove : null;
  const resultTitle = isTie ? "Égalité" : isWinner ? "Victoire" : "Défaite";
  const gap = Math.abs(localPoints - opponentPoints);
  const verdict = isTie
    ? `Égalité à ${localPoints} points`
    : isWinner
      ? `${isMultiplayer ? "+" : "Victoire de "}${gap} point${gap > 1 ? "s" : ""}`
      : `${isMultiplayer ? "−" : "Défaite de "}${gap} point${gap > 1 ? "s" : ""}`;

  const playerIsWinner = isWinner;
  const opponentIsWinner = !isWinner && !isTie;

  const localBest = bestHit(localScores);
  const localYatzy = localScores.yatzy === 50;
  const opponentYatzy = opponentScores.yatzy === 50;
  const localZeros = countZeros(localScores);

  const partyKey = isMultiplayer
    ? `${game.roomId}:${game.rematchCount}:${localRole}:${outcome}`
    : `${game.gameId ?? "ancienne-partie"}:${localPoints}:${opponentPoints}:${outcome}`;
  const [party] = useState<Party>(() => pickParty(outcome, isMultiplayer, opponentLabel, seededRandom(partyKey)));

  const startingNewSeries = isMultiplayer && game.series.enabled && game.series.bestMove === null;
  const rematchLabel = rematchRequested
    ? "En attente de ton ami… (1/2)"
    : opponentWantsRematch
      ? startingNewSeries ? "Accepter la série" : "Accepter la revanche"
      : startingNewSeries ? "Lancer la série" : "Revanche";

  return (
    <section
      className="finished-card finished-celebration"
      tabIndex={-1}
      aria-labelledby="finished-title"
      aria-live="polite"
      data-game-mode={mode}
      data-outcome={outcome}
    >
      <div
        className="finished-confetti"
        data-variant={party.variant}
        data-outcome={outcome}
        aria-hidden="true"
      >
        {party.pieces.slice(0, outcome === "win" ? 24 : 0).map((piece, index) => (
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
        <div className="finished-party-emoji" aria-hidden="true">{outcome === "win" ? "🏆" : outcome === "loss" ? "🎲" : "🤝"}</div>
        <h1 id="finished-title" className="finished-result" tabIndex={-1}>
          {resultTitle}{outcome === "win" ? " !" : ""}
        </h1>
        <p className="finished-verdict">{verdict}</p>
        {!isMultiplayer ? <p className="finished-tagline">{outcome === "win" ? "Le bot demande sa revanche." : outcome === "loss" ? "La revanche t’attend." : "On refait une partie ?"}</p> : null}
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
          <strong className="finished-score-number" data-score={localPoints} aria-hidden="true">{localPoints}</strong>
          {playerIsWinner ? <span className="finished-score-status">Gagnant</span> : null}
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
          <strong className="finished-score-number" data-score={opponentPoints} aria-hidden="true">{opponentPoints}</strong>
          {opponentIsWinner ? <span className="finished-score-status">Gagnant</span> : null}
        </article>
      </div>

      {isMultiplayer ? (
        <section className="duo-rivalry" aria-label={game.series.enabled ? "Série" : "Duel"}>
          <div className="duo-rivalry-score">
            <span>{game.series.enabled ? "Série · premier à 3" : "Vos parties"}</span>
            <strong aria-label={`${playerLabel} ${game.series.enabled ? localSeriesWins : localDuelWins} victoires, ${opponentLabel} ${game.series.enabled ? opponentSeriesWins : opponentDuelWins} victoires`}>
              {game.series.enabled ? localSeriesWins : localDuelWins}<span aria-hidden="true">–</span>{game.series.enabled ? opponentSeriesWins : opponentDuelWins}
            </strong>
          </div>
          {seriesWinner ? (
            <p className="duo-series-winner">{seriesWinner === localRole ? "Tu remportes la série" : `${opponentLabel} remporte la série`}</p>
          ) : null}
          {seriesWinner && seriesBest ? (
            <p className="duo-series-best">Coup de la série · {seriesBest.playerName} · {CATEGORY_BY_ID[seriesBest.category].label} {seriesBest.points}</p>
          ) : null}
        </section>
      ) : null}

      <dl className="finished-stats" aria-label="Détails de la partie">
        <div className="finished-stat">
          <dt><span className="finished-stat-icon" aria-hidden="true">↗</span>Écart</dt>
          <dd>{isTie ? "0" : isWinner ? `+${gap}` : `−${gap}`}</dd>
        </div>
        <div className="finished-stat">
          <dt><span className="finished-stat-icon" aria-hidden="true">★</span>Meilleur coup</dt>
          <dd>{localBest ? `${localBest.label} · ${localBest.points}` : "—"}</dd>
        </div>
        <div className="finished-stat">
          <dt><span className="finished-stat-icon" aria-hidden="true">⚄</span>Yatzy</dt>
          <dd>{localYatzy ? "Réussi" : opponentYatzy ? `${opponentLabel} l’a eu` : "Aucun"}</dd>
        </div>
        <div className="finished-stat">
          <dt><span className="finished-stat-icon" aria-hidden="true">▦</span>Cases à 0</dt>
          <dd>{localZeros}</dd>
        </div>
      </dl>

      {!isMultiplayer ? <details className="solo-stats-disclosure"><summary>Statistiques solo</summary><SoloStats /></details> : null}

      <div className="finished-actions">
        {isMultiplayer && onRematch ? (
          <>
            {seriesWinner && onSetSeries ? (
              <button className="primary-action" type="button" onClick={() => onSetSeries(true)}>Nouvelle série</button>
            ) : (
              <button className="primary-action" type="button" disabled={rematchRequested} onClick={onRematch}>
                {rematchLabel}
              </button>
            )}
            {opponentWantsRematch && !rematchRequested ? (
              <p className="finished-rematch-hint" role="status">Ton ami veut déjà la revanche !</p>
            ) : null}
            {!game.series.enabled && onSetSeries ? (
              <button className="duo-series-option" type="button" onClick={() => onSetSeries(true)}>Jouer en série · premier à 3</button>
            ) : null}
          </>
        ) : (
          <Link className="primary-action" href="/bot" onClick={onLeave}><span aria-hidden="true">▶</span> Rejouer</Link>
        )}
        <Link className="secondary-action" href="/" onClick={onLeave}><span aria-hidden="true">⌂</span> Accueil</Link>
      </div>
    </section>
  );
}
