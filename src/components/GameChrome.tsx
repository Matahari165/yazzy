import { RefreshIcon } from "./icons";

export function AppHeader({ onNewGame }: { onNewGame: () => void }) {
  return (
    <header className="topbar">
      <a className="brand" href="#main-content" aria-label="Yazzy, revenir au jeu">
        <span className="brand-die" aria-hidden="true"><i /><i /><i /></span>
        <span>YAZZY</span>
      </a>
      <div className="topbar-meta">
        <span className="mode-pill">SOLO · EXACT</span>
        <button type="button" className="new-game" onClick={onNewGame}>
          <RefreshIcon />
          <span>REJOUER</span>
        </button>
      </div>
    </header>
  );
}

type GameStatusProps = {
  turn: number;
  total: number;
  completedCategories: number;
  title: string;
};

export function GameStatus({ turn, total, completedCategories, title }: GameStatusProps) {
  return (
    <div className="game-status">
      <div>
        <p className="eyebrow">TOUR {Math.min(turn, 15)} / 15</p>
        <h1 id="game-title">{title}</h1>
      </div>
      <div className="score-summary" aria-label={`Score actuel ${total}`}>
        <span>SCORE</span>
        <strong>{total}</strong>
        <small>{completedCategories}/15 cases</small>
      </div>
      <progress
        className="progress-track"
        aria-label={`${completedCategories} cases remplies sur 15`}
        max={15}
        value={completedCategories}
      />
    </div>
  );
}

export function BonusCard({ upper }: { upper: number }) {
  return (
    <div className="bonus-card">
      <div><span>Bonus supérieur</span><strong>{Math.min(upper, 63)} / 63</strong></div>
      <progress className="bonus-track" aria-label={`Progression du bonus : ${upper} sur 63`} max={63} value={Math.min(upper, 63)} />
      <p>{upper >= 63 ? "Bonus obtenu : +50 points." : `${63 - upper} points manquants pour obtenir +50.`}</p>
    </div>
  );
}

export function FinishedCard({ total, onReplay }: { total: number; onReplay: () => void }) {
  return (
    <section className="finished-card">
      <p className="eyebrow">Partie terminée</p>
      <h2>{total} points</h2>
      <p>Ton premier bilan pédagogique sera ajouté dans la prochaine étape.</p>
      <button type="button" className="primary-button" onClick={onReplay}>Rejouer</button>
    </section>
  );
}

export function MathNote() {
  return (
    <div className="math-note">
      <span>FORMULE DES ISSUES</span>
      <code>P(x) = n! / (x₁! · … · x₆!) × (1/6)ⁿ</code>
      <p>Chaque résultat possible est multiplié par sa probabilité. Yazzy garde ensuite la décision donnant le meilleur score moyen.</p>
    </div>
  );
}
