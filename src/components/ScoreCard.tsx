import { formatDiceCounts, type CategoryEvaluation } from "@/domain/probability";
import {
  CATEGORIES,
  type DieValue,
  type CategoryId,
} from "@/domain/yatzy";
import { DieGlyph } from "./Dice";
import { CloseIcon, InfoIcon } from "./icons";

type ScoreCardProps = {
  scores: Partial<Record<CategoryId, number>>;
  evaluations: CategoryEvaluation[];
  selected: CategoryId | null;
  canSelect: boolean;
  isCalculating: boolean;
  recommended?: CategoryId;
  titleId?: string;
  className?: string;
  onSelect: (category: CategoryId) => void;
};

const percent = new Intl.NumberFormat("fr-FR", {
  style: "percent",
  maximumFractionDigits: 1,
});

const decimal = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 1,
});

export function ScoreCard({
  scores,
  evaluations,
  selected,
  canSelect,
  isCalculating,
  recommended,
  titleId = "score-title",
  className = "",
  onSelect,
}: ScoreCardProps) {
  const evaluationByCategory = new Map(evaluations.map((item) => [item.category, item]));

  const categoryMark = (category: CategoryId, index: number) => {
    if (index < 6) return <DieGlyph value={(index + 1) as DieValue} className="score-die" />;
    const shortMarks: Record<CategoryId, string> = {
      ones: "1", twos: "2", threes: "3", fours: "4", fives: "5", sixes: "6",
      pair: "II", twoPairs: "II²", threeOfAKind: "III", fourOfAKind: "IV",
      smallStraight: "1—5", largeStraight: "2—6", fullHouse: "3+2", chance: "Σ", yatzy: "V",
    };
    return <span className="combo-mark" aria-hidden="true">{shortMarks[category]}</span>;
  };

  return (
    <section className={`score-card ${className}`.trim()} aria-labelledby={titleId}>
      <div className="score-heading">
        <div>
          <p className="eyebrow">FEUILLE DE JEU</p>
          <h2 id={titleId}>Choisis une case</h2>
        </div>
        <span className="exact-badge">100% EXACT</span>
      </div>

      <div className="score-heads" aria-hidden="true">
        <div className="score-table-head">
          <span>COMBINAISON</span><span>PTS</span><span>PROBA</span><span />
        </div>
        <div className="score-table-head score-table-head-secondary">
          <span>COMBINAISON</span><span>PTS</span><span>PROBA</span><span />
        </div>
      </div>

      <div className="score-columns" role="list">
        {CATEGORIES.map((category, index) => {
          const score = scores[category.id];
          const evaluation = evaluationByCategory.get(category.id);
          const isFilled = score !== undefined;
          const isSelected = selected === category.id;
          const isRecommended = recommended === category.id && !isFilled;
          return (
            <div
              className="score-row"
              data-filled={isFilled}
              data-selected={isSelected}
              data-recommended={isRecommended}
              role="listitem"
              key={category.id}
            >
              <button
                type="button"
                className="score-choice"
                disabled={!canSelect || isFilled}
                aria-pressed={isSelected}
                onClick={() => onSelect(category.id)}
              >
                <span className="category-index">{categoryMark(category.id, index)}</span>
                <span className="category-name">
                  {category.shortLabel}
                  {isRecommended ? <small className="recommended-label">Conseillé</small> : null}
                </span>
                <strong className="current-score">
                  {isFilled ? score : evaluation ? evaluation.currentScore : "—"}
                </strong>
                {isFilled ? (
                  <span className="recorded-score">OK</span>
                ) : isCalculating ? (
                  <span className="probability-skeleton" aria-label="Calcul en cours" />
                ) : !evaluation ? (
                  <span className="empty-metric">—</span>
                ) : (
                  <span className="category-metrics">
                    <strong>{category.id === "chance" ? decimal.format(evaluation.expectedScore) : percent.format(evaluation.successProbability)}</strong>
                    <small>
                      {category.id === "chance"
                        ? "pts moyens"
                        : `${decimal.format(evaluation.expectedScore)} pts moy.`}
                    </small>
                  </span>
                )}
              </button>

              <details className="category-details" name={`${titleId}-explanations`}>
                <summary aria-label={`Comprendre la case ${category.label}`}>
                  <InfoIcon />
                </summary>
                <div className="category-popover">
                  <div className="category-popover-heading">
                    <strong>{category.rule}</strong>
                    <button
                      type="button"
                      className="category-popover-close"
                      aria-label={`Fermer l’explication de ${category.label}`}
                      onClick={(event) => {
                        const details = event.currentTarget.closest("details");
                        details?.removeAttribute("open");
                        details?.querySelector("summary")?.focus();
                      }}
                    >
                      <CloseIcon />
                    </button>
                  </div>
                  <p>{category.scoring}</p>
                  {evaluation ? (
                    <>
                      <dl className="math-breakdown">
                        {category.id !== "chance" ? (
                          <><dt>Probabilité de marquer</dt><dd>{percent.format(evaluation.successProbability)}</dd></>
                        ) : null}
                        <dt>Score moyen attendu</dt><dd>{decimal.format(evaluation.expectedScore)} pts</dd>
                        <dt>Meilleurs dés à garder</dt><dd>{formatDiceCounts(evaluation.bestHoldForExpectedScore)}</dd>
                      </dl>
                      <p className="calculation-explainer">
                        Yazzy teste toutes les conservations possibles, puis additionne chaque résultat pondéré par sa probabilité.
                      </p>
                    </>
                  ) : null}
                  <code>P = max<sub>garde</sub> Σ P(issue) × P(suite)</code>
                </div>
              </details>
            </div>
          );
        })}
      </div>
    </section>
  );
}
