"use client";

import { useCallback, useState } from "react";
import { CATEGORIES, scoreDice, type CategoryDefinition, type CategoryId, type Dice } from "@/domain/yatzy";
import { ScoreHelpPopover } from "./ScoreHelpPopover";

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

function formatPoints(score: number) {
  return `${score} point${score > 1 ? "s" : ""}`;
}

function getScoreText(
  category: CategoryDefinition,
  registeredScore: number | undefined,
  scoreWithDice: number | null,
) {
  if (registeredScore !== undefined) {
    return `${formatPoints(registeredScore)} inscrit${registeredScore > 1 ? "s" : ""}`;
  }
  if (scoreWithDice !== null) return `${formatPoints(scoreWithDice)} avec ces dés`;
  if (category.fixedScore !== undefined) return `${formatPoints(category.fixedScore)} si réussie`;
  return `Jusqu’à ${formatPoints(category.maximumScore)}`;
}

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
  const [explainedCategory, setExplainedCategory] = useState<CategoryId | null>(null);
  const upperScore = (scores.ones ?? 0) + (scores.twos ?? 0) + (scores.threes ?? 0) + (scores.fours ?? 0) + (scores.fives ?? 0) + (scores.sixes ?? 0);
  const closeExplanation = useCallback(() => setExplainedCategory(null), []);

  return (
    <section className="score-card" aria-label={label} aria-busy={isCalculating}>
      <div className="score-list" role="list" aria-label={label}>
        {CATEGORIES.map((category, index) => {
          const score = scores[category.id];
          const filled = score !== undefined;
          const isSelected = selected === category.id;
          const isRecommended = recommended === category.id && !filled && !isReadOnly;
          const scoreWithDice = dice.length === 5 ? scoreDice(category.id, dice) : null;
          const currentScore = filled ? score : scoreWithDice !== null && canSelect ? scoreWithDice : null;
          const stateLabel = filled ? "case inscrite" : isSelected ? "case sélectionnée" : isRecommended ? "case conseillée" : "case libre";
          const isExplained = explainedCategory === category.id;
          const scoreText = getScoreText(category, score, scoreWithDice);

          const handleClick = () => {
            if (!filled && !isReadOnly && canSelect) onSelect?.(category.id);
            setExplainedCategory(category.id);
          };

          return (
            <div className="score-list-item" key={category.id} role="listitem">
              <button
                id={`score-row-${category.id}`}
                className="score-row"
                data-filled={filled}
                data-selected={isSelected}
                data-recommended={isRecommended}
                type="button"
                aria-pressed={isSelected}
                aria-haspopup="dialog"
                aria-expanded={isExplained}
                aria-controls={isExplained ? `score-help-${category.id}` : undefined}
                aria-label={`${category.label}, ${stateLabel}, ${filled ? `${score} points inscrits` : currentScore === null ? "aucun score affiché" : `${currentScore} points possibles`}. Ouvrir l’explication.`}
                onClick={handleClick}
              >
                <span className="score-category">{category.label}</span>
                <strong className="score-value">{currentScore === null ? "—" : currentScore}</strong>
              </button>
              {isExplained ? (
                <ScoreHelpPopover
                  anchorId={`score-row-${category.id}`}
                  category={category}
                  placement={index >= CATEGORIES.length - 5 ? "above" : "below"}
                  scoreText={scoreText}
                  onClose={closeExplanation}
                />
              ) : null}
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
