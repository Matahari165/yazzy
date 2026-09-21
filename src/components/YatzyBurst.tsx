import { useMemo, type CSSProperties } from "react";
import type { DieValue } from "@/domain/yatzy";
import { DieGlyph } from "./Dice";

const BURST_COLORS = ["#f6d47c", "#e9b44c", "#c85a32", "#ffffff", "#f0a180", "#4a8072"];
const STAR_GLYPHS = ["⭐", "✨", "💫", "🌟", "⭐", "✨", "💫", "🌟", "⭐", "✨", "💫", "🌟", "⭐", "✨", "💫", "🌟", "⭐", "✨"];

type BurstPiece = {
  left: number;
  delay: number;
  duration: number;
  size: number;
  color: string;
  round: boolean;
  drift: number;
};

type BurstStar = {
  glyph: string;
  delay: number;
  size: number;
  dx: number;
  dy: number;
};

function buildPieces(count: number): BurstPiece[] {
  return Array.from({ length: count }, (_, index) => ({
    left: Math.random() * 100,
    // Trois vagues : impact immédiat, explosion, pluie tardive.
    delay: index % 4 === 0 ? 1.5 + Math.random() * 0.9 : Math.random() * 0.55,
    duration: 1.6 + Math.random() * 1.1,
    size: 6 + Math.random() * 8,
    color: BURST_COLORS[Math.floor(Math.random() * BURST_COLORS.length)],
    round: Math.random() < 0.35,
    drift: (Math.random() - 0.5) * 220,
  }));
}

function buildStars(): BurstStar[] {
  return STAR_GLYPHS.map((glyph, index) => {
    const angle = (index / STAR_GLYPHS.length) * Math.PI * 2;
    const distance = 140 + (index % 3) * 55;
    return {
      glyph,
      delay: 0.15 + Math.random() * 0.3,
      size: 22 + Math.random() * 24,
      dx: Math.round(Math.cos(angle) * distance),
      dy: Math.round(Math.sin(angle) * distance),
    };
  });
}

function isDieValue(value: unknown): value is DieValue {
  return Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 6;
}

export function YatzyBurst({
  author,
  diceValue,
  variant = "player",
}: {
  author: string;
  diceValue?: DieValue | number;
  variant?: "player" | "opponent";
}) {
  // Monté uniquement après un lancer côté client : pas de divergence serveur/client.
  const pieces = useMemo(() => buildPieces(96), []);
  const stars = useMemo(() => buildStars(), []);
  const face: DieValue | null = isDieValue(diceValue) ? diceValue : null;

  return (
    <div
      className="yatzy-burst"
      role="status"
      aria-label={`Yatzy ! 50 points pour ${author}${face ? `, cinq fois le ${face}` : ""}`}
      data-variant={variant}
    >
      <div className="yatzy-flash" aria-hidden="true" />
      <div className="yatzy-rays" aria-hidden="true" />
      <div className="yatzy-rings" aria-hidden="true">
        <span />
        <span />
      </div>
      <div className="yatzy-burst-confetti" aria-hidden="true">
        {pieces.map((piece, index) => (
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
      <div className="yatzy-burst-stars" aria-hidden="true">
        {stars.map((star, index) => (
          <i
            key={index}
            style={
              {
                fontSize: star.size,
                animationDelay: `${star.delay.toFixed(2)}s`,
                "--dx": `${star.dx}px`,
                "--dy": `${star.dy}px`,
              } as CSSProperties
            }
          >
            {star.glyph}
          </i>
        ))}
      </div>
      <div className="yatzy-burst-splash" aria-hidden="true">
        <p className="yatzy-kicker">Cinq dés identiques</p>
        {face ? (
          <div className="yatzy-dice-row">
            {[0, 1, 2, 3, 4].map((index) => (
              <span className="yatzy-mini-die" key={index}>
                <DieGlyph value={face} />
              </span>
            ))}
          </div>
        ) : (
          <span className="yatzy-burst-dice">🎲</span>
        )}
        <strong>YATZY !</strong>
        <small>+50 · {author}</small>
      </div>
    </div>
  );
}
