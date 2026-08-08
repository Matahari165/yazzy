"use client";

import { useCallback, useState } from "react";
import { CATEGORIES, scoreDice, type CategoryDefinition, type CategoryId, type Dice, totalScore } from "@/domain/yatzy";
import type { CategoryEvaluation } from "@/domain/probability";
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
  humanScores: Partial<Record<CategoryId, number>>;
  botScores: Partial<Record<CategoryId, number>>;
  dice: Dice;
  selected: CategoryId | null;
  recommended?: CategoryId;
  coachEvaluation?: CategoryEvaluation;
  isCoachEnabled: boolean;
  onToggleCoach: () => void;
  canSelect: boolean;
  isReadOnly?: boolean;
  isCalculating?: boolean;
  onSelect?: (category: CategoryId) => void;
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
  humanScores,
  botScores,
  dice,
  selected,
  recommended,
  coachEvaluation,
  isCoachEnabled,
  onToggleCoach,
  canSelect,
  isReadOnly = false,
  isCalculating = false,
  onSelect,
  onScore,
}: ScoreCardProps) {
  const [explainedCategory, setExplainedCategory] = useState<CategoryId | null>(null);
  const upperScore = (humanScores.ones ?? 0) + (humanScores.twos ?? 0) + (humanScores.threes ?? 0) + (humanScores.fours ?? 0) + (humanScores.fives ?? 0) + (humanScores.sixes ?? 0);
  const closeExplanation = useCallback(() => setExplainedCategory(null), []);

  return (
    <section className="score-card" aria-label={label} aria-busy={isCalculating}>
      <header style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px 14px 0' }}>
         <button onClick={onToggleCoach} style={{ background: isCoachEnabled ? 'var(--green-soft)' : 'var(--surface-muted)', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', padding: '4px 10px', color: isCoachEnabled ? 'var(--green)' : 'var(--ink-soft)', fontSize: 11, fontWeight: 'bold', cursor: 'pointer', transition: 'all 150ms' }}>
           💡 Coach {isCoachEnabled ? "Activé" : "Désactivé"}
         </button>
      </header>
      <div className="score-legend" aria-hidden="true">
        <span>Toi</span>
        <span>Bot</span>
        <span className="score-legend-repeat">Toi</span>
        <span className="score-legend-repeat">Bot</span>
      </div>
      <div className="score-list" role="list" aria-label={label}>
        {CATEGORIES.map((category, index) => {
          const score = humanScores[category.id];
          const botScore = botScores[category.id];
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
                aria-label={`${category.label}, toi : ${filled ? `${score} points inscrits` : currentScore === null ? "aucun score affiché" : `${currentScore} points possibles`}, bot : ${botScore === undefined ? "aucun score inscrit" : `${botScore} points inscrits`}. ${stateLabel}. Ouvrir l’explication.`}
                onClick={handleClick}
              >
                <span className="score-category">
                  {category.label}
                  {VISUAL_HINTS[category.id] && <span style={{ display: 'block', fontSize: 13, color: 'var(--ink-soft)', fontWeight: 'normal', letterSpacing: '0.15em', marginTop: 1 }}>{VISUAL_HINTS[category.id]}</span>}
                </span>
                <strong className="score-value" aria-hidden="true">{currentScore === null ? "" : currentScore}</strong>
                <strong className="score-value score-value-bot" aria-hidden="true">{botScore === undefined ? "" : botScore}</strong>
              </button>
              {isExplained ? (
                <ScoreHelpPopover
                  anchorId={`score-row-${category.id}`}
                  category={category}
                  placement={index >= CATEGORIES.length - 5 ? "above" : "below"}
                  scoreText={scoreText}
                  coachEvaluation={coachEvaluation}
                  scoreAction={(!filled && !isReadOnly && canSelect && onScore) ? () => { closeExplanation(); onScore(); } : undefined}
                  scorePoints={currentScore}
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
      <div className="total-row">
        <span style={{ fontSize: 16, fontWeight: 800 }}>Total</span>
        <strong className="score-value" style={{ color: 'var(--ink)' }}>{totalScore(humanScores)}</strong>
        <strong className="score-value score-value-bot">{totalScore(botScores)}</strong>
      </div>
    </section>
  );
}
