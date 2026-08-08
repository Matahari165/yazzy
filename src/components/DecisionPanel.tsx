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
        <div>
          <p className="eyebrow">TA DÉCISION</p>
          <h2 id="decision-title">{definition.label}</h2>
        </div>
        <strong className="decision-points">{points} pts</strong>
      </div>
      <dl className="decision-facts">
        <div>
          <dt>Score possible</dt>
          <dd>{points} point{points > 1 ? "s" : ""}</dd>
        </div>
        <div>
          <dt>{category === "chance" ? "Score moyen" : "Chance de marquer"}</dt>
          <dd>
            {isCalculating ? "Calcul…" : calculationError ? "Indisponible" : evaluation ? category === "chance" ? `${decimal.format(evaluation.expectedScore)} pts` : percent.format(evaluation.successProbability) : "—"}
          </dd>
        </div>
      </dl>
      <p className="decision-reason">{reason}</p>
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
          <p>{definition.scoring}</p>
          {evaluation ? <p>Le moteur exact compare toutes les conservations possibles. Le score moyen attendu est de {decimal.format(evaluation.expectedScore)} point{evaluation.expectedScore > 1 ? "s" : ""}.</p> : null}
          <code>P = max des choix gardés × probabilité de chaque issue</code>
        </div>
      ) : null}
    </section>
  );
}
