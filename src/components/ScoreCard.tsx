import { formatDiceCounts, type CategoryEvaluation } from "@/domain/probability";
import {
  CATEGORIES,
  type CategoryId,
} from "@/domain/yatzy";
import { InfoIcon } from "./icons";

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

  return (
    <section className={`score-card ${className}`.trim()} aria-labelledby={titleId}>
      <div className="score-heading">
        <div>
          <p className="eyebrow">Feuille nordique</p>
          <h2 id={titleId}>Choisis ton objectif</h2>
        </div>
        <span className="exact-badge">Calcul exact</span>
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
                <span className="category-index">{String(index + 1).padStart(2, "0")}</span>
                <span className="category-name">
                  {category.label}
                  {isRecommended ? <small className="recommended-label">Conseillé</small> : null}
                </span>
                {isFilled ? (
                  <strong className="recorded-score">{score}</strong>
                ) : isCalculating ? (
                  <span className="probability-skeleton" aria-label="Calcul en cours" />
                ) : !evaluation ? (
                  <span className="empty-metric">Après le lancer</span>
                ) : (
                  <span className="category-metrics">
                    <strong>{decimal.format(evaluation.expectedScore)} pts</strong>
                    <small>
                      {category.id === "chance"
                        ? "moyenne attendue"
                        : `${percent.format(evaluation.successProbability)} de réussite`}
                    </small>
                  </span>
                )}
              </button>

              <details className="category-details" name={`${titleId}-explanations`}>
                <summary aria-label={`Comprendre la case ${category.label}`}>
                  <InfoIcon />
                </summary>
                <div className="category-popover">
                  <strong>{category.rule}</strong>
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
