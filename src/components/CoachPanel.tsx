import { formatDiceCounts, type CategoryEvaluation } from "@/domain/probability";
import { CATEGORY_BY_ID } from "@/domain/yatzy";
import { CoachCard } from "./CoachCard";
import { BonusCard, MathNote } from "./GameChrome";

type CoachPanelProps = {
  isCalculating: boolean;
  tone: "neutral" | "success" | "tip";
  targetEvaluation?: CategoryEvaluation;
  feedback: string | null;
  upper: number;
  remainingRolls: number;
  isTargetSelected: boolean;
  isFinished: boolean;
};

const decimal = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });

export function CoachPanel({
  isCalculating,
  tone,
  targetEvaluation,
  feedback,
  upper,
  remainingRolls,
  isTargetSelected,
  isFinished,
}: CoachPanelProps) {
  const targetLabel = targetEvaluation
    ? CATEGORY_BY_ID[targetEvaluation.category].label
    : null;
  let coachTitle = "Lance les dés pour commencer";
  let coachMessage = "Après le lancer, la colonne menthe affiche la probabilité exacte de chaque case.";

  if (isFinished) {
    coachTitle = "Feuille complète";
    coachMessage = "Le bilan final est affiché dans la borne. Ton dernier choix reste expliqué juste au-dessus.";
  } else if (isCalculating) {
    coachTitle = "Je calcule les possibilités…";
  } else if (targetEvaluation && targetLabel) {
    if (remainingRolls === 0) {
      coachTitle = isTargetSelected
        ? `Si tu inscris ${targetLabel}`
        : `Meilleure case maintenant : ${targetLabel}`;
      coachMessage = `${targetEvaluation.currentScore} point${targetEvaluation.currentScore > 1 ? "s" : ""} immédiatement. Aucun lancer ne reste.`;
    } else {
      coachTitle = isTargetSelected
        ? `Pour viser ${targetLabel}`
        : `Meilleur rendement ce tour : ${targetLabel}`;
      coachMessage = `Garde ${formatDiceCounts(targetEvaluation.bestHoldForExpectedScore)} pour viser ${decimal.format(targetEvaluation.expectedScore)} points de moyenne.`;
    }
  }

  return (
    <aside id="coach-panel" className="lesson-panel" aria-label="Explications et stratégie">
      <div className="lesson-heading">
        <p className="eyebrow">LABO YAZZY</p>
        <h2>Comprends chaque coup.</h2>
        <p>Les nombres affichés viennent du vrai calcul des issues possibles, jamais d’un niveau truqué.</p>
      </div>
      {feedback ? (
        <section className="decision-review" data-tone={tone} aria-live="polite">
          <p className="eyebrow">BILAN DU DERNIER CHOIX</p>
          <p>{feedback}</p>
        </section>
      ) : null}
      <CoachCard
        loading={isCalculating}
        tone={tone}
        title={coachTitle}
        message={coachMessage}
        detail={isFinished
          ? "Rejouer crée une nouvelle feuille avec le même moteur de probabilités exactes."
          : "Le coach optimise le score moyen du tour en cours. Le bonus et les tours suivants ne sont pas encore intégrés."}
      />
      <MathNote />
      <BonusCard upper={upper} />
    </aside>
  );
}
