import type { CategoryEvaluation } from "@/domain/probability";
import { CATEGORY_BY_ID, type CategoryId } from "@/domain/yatzy";
import { BonusCard } from "./GameChrome";
import { MobileScoreSheet } from "./MobileScoreSheet";
import { ScoreCard } from "./ScoreCard";
import { ScoreSheetIcon } from "./icons";

type ScorePanelsProps = {
  scores: Partial<Record<CategoryId, number>>;
  evaluations: CategoryEvaluation[];
  selectedCategory: CategoryId | null;
  recommendedCategory?: CategoryId;
  selectedPoints: number;
  openCategoryCount: number;
  upper: number;
  canSelect: boolean;
  isCalculating: boolean;
  mobileOpen: boolean;
  onMobileOpen: () => void;
  onMobileClose: () => void;
  onSelect: (category: CategoryId) => void;
};

export function ScorePanels(props: ScorePanelsProps) {
  const scoreCardProps = {
    scores: props.scores,
    evaluations: props.evaluations,
    selected: props.selectedCategory,
    canSelect: props.canSelect,
    isCalculating: props.isCalculating,
    recommended: props.recommendedCategory,
    onSelect: props.onSelect,
  };

  return (
    <>
      {props.canSelect ? (
        <button type="button" className="mobile-score-toggle" onClick={props.onMobileOpen}>
          <ScoreSheetIcon />
          <span>{props.selectedCategory ? CATEGORY_BY_ID[props.selectedCategory].label : "Ouvrir la feuille"}</span>
          <strong>{props.selectedCategory ? `${props.selectedPoints} pts` : `${props.openCategoryCount} cases`}</strong>
        </button>
      ) : null}

      <aside className="side-column">
        <ScoreCard {...scoreCardProps} className="desktop-score-card" titleId="desktop-score-title" />
        <BonusCard upper={props.upper} />
      </aside>

      <MobileScoreSheet open={props.mobileOpen} onClose={props.onMobileClose}>
        <ScoreCard {...scoreCardProps} className="mobile-score-card" titleId="mobile-score-title" />
      </MobileScoreSheet>
    </>
  );
}
