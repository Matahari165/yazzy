import { CATEGORIES, scoreDice, type CategoryId, type Dice } from "@/domain/yatzy";

type ScoreCardProps = {
  label: string;
  scores: Partial<Record<CategoryId, number>>;
  dice: Dice;
  selected: CategoryId | null;
  recommended?: CategoryId;
  canSelect: boolean;
  isReadOnly?: boolean;
  isCalculating?: boolean;
  onSelect?: (category: CategoryId) => void;
};

export function ScoreCard({
  label,
  scores,
  dice,
  selected,
  recommended,
  canSelect,
  isReadOnly = false,
  isCalculating = false,
  onSelect,
}: ScoreCardProps) {
  const upperScore = (scores.ones ?? 0) + (scores.twos ?? 0) + (scores.threes ?? 0) + (scores.fours ?? 0) + (scores.fives ?? 0) + (scores.sixes ?? 0);

  return (
    <section className="score-card" aria-label={label} aria-busy={isCalculating}>
      <div className="score-list" role="list" aria-label={label}>
        {CATEGORIES.map((category) => {
          const score = scores[category.id];
          const filled = score !== undefined;
          const isSelected = selected === category.id;
          const isRecommended = recommended === category.id && !filled && !isReadOnly;
          const currentScore = filled ? score : dice.length === 5 && canSelect ? scoreDice(category.id, dice) : null;
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
                <span className="score-category">{category.label}</span>
                <strong className="score-value">{currentScore === null ? "—" : currentScore}</strong>
              </button>
            </div>
          );
        })}
      </div>

      <footer className="bonus-summary">
        <div>
          <span>Bonus</span>
          <strong>{Math.min(63, upperScore)} / 63</strong>
        </div>
        <progress max={63} value={Math.min(63, upperScore)} aria-label="Progression du bonus supérieur" />
      </footer>
    </section>
  );
}
