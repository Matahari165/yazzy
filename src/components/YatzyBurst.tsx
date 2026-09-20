import { useMemo, type CSSProperties } from "react";

const BURST_COLORS = ["#f6d47c", "#e9b44c", "#c85a32", "#ffffff", "#f0a180"];
const STAR_GLYPHS = ["⭐", "✨", "💫", "🌟", "⭐", "✨", "💫", "🌟", "⭐", "✨", "💫", "🌟", "⭐", "✨"];

type BurstPiece = {
  left: number;
  delay: number;
  duration: number;
  size: number;
  color: string;
  round: boolean;
};

type BurstStar = {
  glyph: string;
  delay: number;
  size: number;
  dx: number;
  dy: number;
};

function buildPieces(count: number): BurstPiece[] {
  return Array.from({ length: count }, () => ({
    left: Math.random() * 100,
    delay: Math.random() * 0.45,
    duration: 1.4 + Math.random() * 0.7,
    size: 6 + Math.random() * 7,
    color: BURST_COLORS[Math.floor(Math.random() * BURST_COLORS.length)],
    round: Math.random() < 0.35,
  }));
}

function buildStars(): BurstStar[] {
  return STAR_GLYPHS.map((glyph, index) => {
    const angle = (index / STAR_GLYPHS.length) * Math.PI * 2;
    const distance = 130 + (index % 3) * 45;
    return {
      glyph,
      delay: Math.random() * 0.25,
      size: 22 + Math.random() * 22,
      dx: Math.round(Math.cos(angle) * distance),
      dy: Math.round(Math.sin(angle) * distance),
    };
  });
}

export function YatzyBurst({ author }: { author: string }) {
  // Monté uniquement après un lancer côté client : pas de divergence serveur/client.
  const pieces = useMemo(() => buildPieces(42), []);
  const stars = useMemo(() => buildStars(), []);
  return (
    <div
      className="yatzy-burst"
      role="status"
      aria-label={`Yatzy ! 50 points pour ${author}`}
    >
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
        <span className="yatzy-burst-dice">🎲</span>
        <strong>YATZY !</strong>
        <small>+50 · {author}</small>
      </div>
    </div>
  );
}
