"use client";

import { useCallback, useState } from "react";
import { CATEGORIES, scoreDice, type CategoryDefinition, type CategoryId, type Dice, totalScore } from "@/domain/yatzy";
import { ScoreHelpPopover } from "./ScoreHelpPopover";

const VISUAL_HINTS: Partial<Record<CategoryId, string>> = {
  pair: "⚅ ⚅",
  twoPairs: "⚅ ⚅ ⚄ ⚄",
  threeOfAKind: "⚅ ⚅ ⚅",
  fourOfAKind: "⚅ ⚅ ⚅ ⚅",
  smallStraight: "⚀ ⚁ ⚂ ⚃ ⚄",
  largeStraight: "⚁ ⚂ ⚃ ⚄ ⚅",
  fullHouse: "⚅ ⚅ ⚅ ⚄ ⚄",
  yatzy: "⚅ ⚅ ⚅ ⚅ ⚅",
};

type ScoreCardProps = {
  label: string;
  playerLabel?: string;
  opponentLabel?: string;
  humanScores: Partial<Record<CategoryId, number>>;
  botScores: Partial<Record<CategoryId, number>>;
  dice: Dice;
  selected: CategoryId | null;
  canSelect: boolean;
  isReadOnly?: boolean;
  activeColumn?: "player" | "opponent";
  showBonusSummary?: boolean;
  onSelect?: (category: CategoryId | null) => void;
  onScore?: () => void;
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
  playerLabel = "Toi",
  opponentLabel = "Bot",
  humanScores,
  botScores,
  dice,
  selected,
  canSelect,
  isReadOnly = false,
  activeColumn,
  showBonusSummary = true,
  onSelect,
  onScore,
}: ScoreCardProps) {
  const [explainedCategory, setExplainedCategory] = useState<CategoryId | null>(null);
  const upperScore = (humanScores.ones ?? 0) + (humanScores.twos ?? 0) + (humanScores.threes ?? 0) + (humanScores.fours ?? 0) + (humanScores.fives ?? 0) + (humanScores.sixes ?? 0);
  const closeExplanation = useCallback(() => {
    setExplainedCategory(null);
    onSelect?.(null);
  }, [onSelect]);

  return (
    <section className="score-card" aria-label={label}>
      <div className="score-legend" aria-hidden="true">
        <span data-active={activeColumn === "player"}>{playerLabel}</span>
        <span data-active={activeColumn === "opponent"}>{opponentLabel}</span>
        <span className="score-legend-repeat" data-active={activeColumn === "player"}>{playerLabel}</span>
        <span className="score-legend-repeat" data-active={activeColumn === "opponent"}>{opponentLabel}</span>
      </div>
      <div className="score-list" role="list" aria-label={label}>
        {CATEGORIES.map((category, index) => {
          const score = humanScores[category.id];
          const botScore = botScores[category.id];
          const filled = score !== undefined;
          const isSelected = selected === category.id;
          const scoreWithDice = dice.length === 5 ? scoreDice(category.id, dice) : null;
          const currentScore = filled ? score : scoreWithDice !== null && canSelect ? scoreWithDice : null;
          const stateLabel = filled ? "case inscrite" : isSelected ? "case sélectionnée" : "case libre";
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
                data-actionable={!filled && !isReadOnly && canSelect}
                data-selected={isSelected}
                type="button"
                aria-pressed={isSelected}
                aria-haspopup="dialog"
                aria-expanded={isExplained}
                aria-controls={isExplained ? `score-help-${category.id}` : undefined}
                aria-label={`${category.label}, ${playerLabel.toLowerCase()} : ${filled ? `${score} points inscrits` : currentScore === null ? "aucun score affiché" : `${currentScore} points possibles`}, ${opponentLabel.toLowerCase()} : ${botScore === undefined ? "aucun score inscrit" : `${botScore} points inscrits`}. ${stateLabel}. Ouvrir l’explication.`}
                onClick={handleClick}
              >
                <span className="score-category">
                  {category.label}
                  {VISUAL_HINTS[category.id] && <span className="score-category-hint">{VISUAL_HINTS[category.id]}</span>}
                </span>
                <strong
                  className="score-value"
                  data-state={filled ? "filled" : currentScore !== null && canSelect ? "preview" : "empty"}
                  aria-hidden="true"
                >
                  {currentScore === null ? "" : currentScore}
                </strong>
                <strong
                  className="score-value score-value-bot"
                  data-state={botScore === undefined ? "empty" : "filled"}
                  aria-hidden="true"
                >
                  {botScore === undefined ? "" : botScore}
                </strong>
              </button>
              {isExplained ? (
                <ScoreHelpPopover
                  anchorId={`score-row-${category.id}`}
                  category={category}
                  placement={index >= CATEGORIES.length - 5 ? "above" : "below"}
                  scoreText={scoreText}
                  scoreAction={(!filled && !isReadOnly && canSelect && onScore) ? () => { closeExplanation(); onScore(); } : undefined}
                  scorePoints={currentScore}
                  onClose={closeExplanation}
                />
              ) : null}
            </div>
          );
        })}
      </div>

      {showBonusSummary ? (
        <footer className="bonus-summary">
          <div>
            <span>Bonus</span>
            <strong>{Math.min(63, upperScore)} / 63</strong>
          </div>
        </footer>
      ) : null}
      <div className="total-row">
        <span className="total-label">Total</span>
        <strong className="score-value total-score-value">{totalScore(humanScores)}</strong>
        <strong className="score-value score-value-bot">{totalScore(botScores)}</strong>
      </div>
    </section>
  );
}
