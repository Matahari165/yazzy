"use client";

import { useCallback, useState } from "react";
import { CATEGORIES, scoreDice, type CategoryId, type Dice, totalScore } from "@/domain/yatzy";
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
  opponentDice?: Dice;
  selected: CategoryId | null;
  canSelect: boolean;
  isReadOnly?: boolean;
  activeColumn?: "player" | "opponent";
  highlightedPlayerCategory?: CategoryId | null;
  highlightedOpponentCategory?: CategoryId | null;
  onSelect?: (category: CategoryId | null) => void;
  onScore?: (category: CategoryId) => void;
};

export function ScoreCard({
  label,
  playerLabel = "Toi",
  opponentLabel = "Bot",
  humanScores,
  botScores,
  dice,
  opponentDice = [],
  selected,
  canSelect,
  isReadOnly = false,
  activeColumn,
  highlightedPlayerCategory = null,
  highlightedOpponentCategory = null,
  onSelect,
  onScore,
}: ScoreCardProps) {
  const [explainedCategory, setExplainedCategory] = useState<CategoryId | null>(null);
  const closeExplanation = useCallback(() => {
    setExplainedCategory(null);
    onSelect?.(null);
  }, [onSelect]);

  return (
    <section className="score-card" aria-label={label}>
      <div className="score-list" role="list" aria-label={label}>
        {CATEGORIES.map((category, index) => {
          const score = humanScores[category.id];
          const botScore = botScores[category.id];
          const filled = score !== undefined;
          const opponentFilled = botScore !== undefined;
          const visuallyFilledColumn = activeColumn === "opponent"
            ? opponentFilled ? "opponent" : "none"
            : filled ? "player" : "none";
          const isSelected = selected === category.id;
          const scoreWithDice = dice.length === 5 && activeColumn !== "opponent"
            ? scoreDice(category.id, dice)
            : null;
          const opponentScoreWithDice = opponentDice.length === 5 && activeColumn === "opponent"
            ? scoreDice(category.id, opponentDice)
            : null;
          const currentScore = filled ? score : scoreWithDice !== null && canSelect ? scoreWithDice : null;
          const currentOpponentScore = botScore ?? opponentScoreWithDice;
          const stateLabel = filled ? "case inscrite" : isSelected ? "case sélectionnée" : "case libre";
          const isExplained = explainedCategory === category.id;
          const canScoreDirectly = !filled && !isReadOnly && canSelect && currentScore !== null && Boolean(onScore);

          const handleDetailsClick = () => {
            if (!filled && !isReadOnly && canSelect) onSelect?.(category.id);
            setExplainedCategory(category.id);
          };

          const handleDirectScore = () => {
            setExplainedCategory(null);
            onSelect?.(null);
            onScore?.(category.id);
          };

          return (
            <div className="score-list-item" key={category.id} role="listitem">
              <div
                className="score-row"
                data-actionable={!filled && !isReadOnly && canSelect}
                data-filled={visuallyFilledColumn !== "none"}
                data-filled-column={visuallyFilledColumn}
                data-selected={isSelected}
              >
                <button
                  id={`score-row-${category.id}`}
                  className="score-row-details"
                  type="button"
                  aria-pressed={isSelected}
                  aria-haspopup="dialog"
                  aria-expanded={isExplained}
                  aria-controls={isExplained ? `score-help-${category.id}` : undefined}
                  aria-label={`${category.label}, ${playerLabel.toLowerCase()} : ${filled ? `${score} points inscrits` : currentScore === null ? "aucun score affiché" : `${currentScore} points possibles`}, ${opponentLabel.toLowerCase()} : ${botScore !== undefined ? `${botScore} points inscrits` : opponentScoreWithDice !== null ? `${opponentScoreWithDice} points possibles` : "aucun score affiché"}. ${stateLabel}. Ouvrir l’explication.`}
                  onClick={handleDetailsClick}
                />
                <span className="score-category" aria-hidden="true">
                  <span className="score-category-label score-category-label-full">
                    {category.label}
                  </span>
                  <span className="score-category-label score-category-label-short" aria-hidden="true">
                    {category.shortLabel}
                  </span>
                  {VISUAL_HINTS[category.id] && <span className="score-category-hint">{VISUAL_HINTS[category.id]}</span>}
                </span>
                {canScoreDirectly ? (
                  <button
                    className="score-value score-value-direct"
                    data-highlighted={highlightedPlayerCategory === category.id}
                    data-state="preview"
                    type="button"
                    aria-label={`Inscrire directement ${currentScore} point${currentScore === 1 ? "" : "s"} dans ${category.label}`}
                    onClick={handleDirectScore}
                  >
                    <span aria-hidden="true">{currentScore}</span>
                  </button>
                ) : (
                  <strong
                    className="score-value"
                    data-highlighted={highlightedPlayerCategory === category.id}
                    data-state={filled ? "filled" : "empty"}
                    aria-hidden="true"
                  >
                    {currentScore === null ? "" : currentScore}
                  </strong>
                )}
                <strong
                  className="score-value score-value-bot"
                  data-highlighted={highlightedOpponentCategory === category.id}
                  data-state={botScore !== undefined ? "filled" : opponentScoreWithDice !== null ? "preview" : "empty"}
                  aria-hidden="true"
                >
                  {currentOpponentScore === null || currentOpponentScore === undefined ? "" : currentOpponentScore}
                </strong>
              </div>
              {isExplained ? (
                <ScoreHelpPopover
                  anchorId={`score-row-${category.id}`}
                  category={category}
                  placement={index >= CATEGORIES.length - 5 ? "above" : "below"}
                  scoreAction={(!filled && !isReadOnly && canSelect && onScore) ? () => { closeExplanation(); onScore(category.id); } : undefined}
                  onClose={closeExplanation}
                />
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="total-row">
        <span className="total-label">Total</span>
        <strong className="score-value total-score-value">{totalScore(humanScores)}</strong>
        <strong className="score-value score-value-bot">{totalScore(botScores)}</strong>
      </div>
    </section>
  );
}
