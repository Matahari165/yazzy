import { CATEGORIES, scoreDice, type CategoryId, type Dice } from "@/domain/yatzy";
import type { CategoryEvaluation } from "@/domain/probability";

type ScoreCardProps = {
  title: string;
  eyebrow: string;
  scores: Partial<Record<CategoryId, number>>;
  dice: Dice;
  evaluations: CategoryEvaluation[];
  selected: CategoryId | null;
  recommended?: CategoryId;
  canSelect: boolean;
  isReadOnly?: boolean;
  isCalculating?: boolean;
  onSelect?: (category: CategoryId) => void;
};

export function ScoreCard({
  title,
  eyebrow,
  scores,
  dice,
  evaluations,
  selected,
  recommended,
  canSelect,
  isReadOnly = false,
  isCalculating = false,
  onSelect,
}: ScoreCardProps) {
  const evaluationByCategory = new Map(evaluations.map((evaluation) => [evaluation.category, evaluation]));
  const completed = Object.keys(scores).length;
  const upperScore = (scores.ones ?? 0) + (scores.twos ?? 0) + (scores.threes ?? 0) + (scores.fours ?? 0) + (scores.fives ?? 0) + (scores.sixes ?? 0);

  return (
    <section className="score-card" aria-labelledby="score-card-title" aria-busy={isCalculating}>
      <header className="score-card-header">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2 id="score-card-title">{title}</h2>
        </div>
        <span className="score-progress">{completed}/15 cases</span>
      </header>

      <div className="score-list" role="list" aria-label={title}>
        {CATEGORIES.map((category) => {
          const score = scores[category.id];
          const filled = score !== undefined;
          const isSelected = selected === category.id;
          const isRecommended = recommended === category.id && !filled && !isReadOnly;
          const currentScore = filled ? score : dice.length === 5 && canSelect ? scoreDice(category.id, dice) : null;
          const evaluation = evaluationByCategory.get(category.id);
          const stateLabel = filled ? "case inscrite" : isSelected ? "case sélectionnée" : isRecommended ? "case conseillée" : "case libre";

          return (
            <div className="score-list-item" key={category.id} role="listitem">
              <button
                className="score-row"
                data-filled={filled}
                data-selected={isSelected}
                data-recommended={isRecommended}
                type="button"
                disabled={isReadOnly || !canSelect || filled}
                aria-pressed={isSelected}
                aria-label={`${category.label}, ${stateLabel}, ${filled ? `${score} points inscrits` : currentScore === null ? "aucun score affiché" : `${currentScore} points possibles`}`}
                onClick={() => onSelect?.(category.id)}
              >
                <span className="score-category">
                  <span>{category.label}</span>
                  {isRecommended ? <small>Conseillée</small> : null}
                  {isSelected ? <small>Sélectionnée</small> : null}
                </span>
                <strong className="score-value">{currentScore === null ? "—" : currentScore}</strong>
                <span className="score-state">
                  {filled ? "Inscrite" : isSelected ? "Prête" : isReadOnly ? "Libre" : evaluation && isCalculating ? "Calcul…" : "Libre"}
                </span>
              </button>
            </div>
          );
        })}
      </div>

      <footer className="bonus-summary">
        <div>
          <span>Bonus supérieur</span>
          <strong>{Math.min(63, upperScore)} / 63</strong>
        </div>
        <progress max={63} value={Math.min(63, upperScore)} aria-label="Progression du bonus supérieur" />
      </footer>
    </section>
  );
}
