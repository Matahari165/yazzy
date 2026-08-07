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
};

export function CoachPanel({ isCalculating, tone, targetEvaluation, feedback, upper }: CoachPanelProps) {
  const targetLabel = targetEvaluation
    ? CATEGORY_BY_ID[targetEvaluation.category].label
    : null;

  return (
    <aside id="coach-panel" className="lesson-panel" aria-label="Explications et stratégie">
      <div className="lesson-heading">
        <p className="eyebrow">LABO YAZZY</p>
        <h2>Comprends chaque coup.</h2>
        <p>Les nombres affichés viennent du vrai calcul des issues possibles, jamais d’un niveau truqué.</p>
      </div>
      <CoachCard
        loading={isCalculating}
        tone={tone}
        title={
          isCalculating
            ? "Je calcule les possibilités…"
            : targetLabel
              ? `Vise ${targetLabel}`
              : "Lance les dés pour commencer"
        }
        message={
          feedback ??
          (targetEvaluation
            ? `Pour le meilleur score moyen dans cette case, garde ${formatDiceCounts(targetEvaluation.bestHoldForExpectedScore)}.`
            : "Après le lancer, la colonne menthe affiche la probabilité exacte de chaque case.")
        }
        detail="Le coach compare toutes les manières de garder ou relancer les dés pour ce tour."
      />
      <MathNote />
      <BonusCard upper={upper} />
    </aside>
  );
}
