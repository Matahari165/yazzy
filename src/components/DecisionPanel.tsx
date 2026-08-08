"use client";

import { useState } from "react";
import { formatHoldAction, type CategoryEvaluation } from "@/domain/probability";
import { CATEGORY_BY_ID, type CategoryId } from "@/domain/yatzy";

type DecisionPanelProps = {
  category: CategoryId;
  points: number;
  evaluation?: CategoryEvaluation;
  remainingRolls: number;
  isCalculating: boolean;
  calculationError: string | null;
  disabled: boolean;
  onScore: () => void;
};

const percent = new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 1 });
const decimal = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });

export function DecisionPanel({
  category,
  points,
  evaluation,
  remainingRolls,
  isCalculating,
  calculationError,
  disabled,
  onScore,
}: DecisionPanelProps) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const definition = CATEGORY_BY_ID[category];
  const reason = remainingRolls > 0 && evaluation
    ? `${formatHoldAction(evaluation.bestHoldForExpectedScore)} pour viser le meilleur score moyen de cette case.`
    : remainingRolls > 0
      ? "Le conseil arrive dès que le calcul est terminé."
      : "Aucun lancer ne reste : tu peux inscrire ce résultat.";

  return (
    <section className="decision-panel" aria-labelledby="decision-title">
      <div className="decision-panel-heading">
        <h2 id="decision-title">{definition.label}</h2>
        <strong className="decision-points">{points} pts</strong>
      </div>
      <p className="decision-metric">
        <span>{category === "chance" ? "Score moyen" : "Chance de marquer"}</span>
        <strong>{isCalculating ? "Calcul…" : calculationError ? "Indisponible" : evaluation ? category === "chance" ? `${decimal.format(evaluation.expectedScore)} pts` : percent.format(evaluation.successProbability) : "—"}</strong>
      </p>
      <div className="decision-actions">
        <button className="secondary-action" type="button" aria-expanded={isDetailsOpen} onClick={() => setIsDetailsOpen((open) => !open)}>
          {isDetailsOpen ? "Masquer les détails" : "Comprendre"}
        </button>
        <button className="primary-action" type="button" disabled={disabled} onClick={onScore}>
          Inscrire {points} point{points > 1 ? "s" : ""}
        </button>
      </div>
      {isDetailsOpen ? (
        <div className="decision-details">
          <p>{reason}</p>
          <p>{definition.scoring}</p>
        </div>
      ) : null}
    </section>
  );
}
