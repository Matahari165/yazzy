"use client";

import { useEffect, useRef } from "react";
import { formatHoldAction, type CategoryEvaluation } from "@/domain/probability";
import type { CategoryDefinition } from "@/domain/yatzy";

type ScoreHelpPopoverProps = {
  anchorId: string;
  category: CategoryDefinition;
  placement: "above" | "below";
  scoreText: string;
  coachEvaluation?: CategoryEvaluation;
  targetEvaluation?: CategoryEvaluation;
  scoreAction?: () => void;
  scorePoints?: number | null;
  onClose: () => void;
};

const percent = new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 1 });

function focusElement(elementId: string) {
  document.getElementById(elementId)?.focus({ preventScroll: true });
}

export function ScoreHelpPopover({
  anchorId,
  category,
  placement,
  scoreText,
  coachEvaluation,
  targetEvaluation,
  scoreAction,
  scorePoints,
  onClose,
}: ScoreHelpPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = `score-help-title-${category.id}`;

  useEffect(() => {
    closeButtonRef.current?.focus({ preventScroll: true });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      focusElement(anchorId);
      onClose();
    };

    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target;
      const anchor = document.getElementById(anchorId);
      if (
        !(target instanceof Node) ||
        popoverRef.current?.contains(target) ||
        anchor?.contains(target) ||
        (target instanceof Element && target.closest(".score-row"))
      ) return;
      onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("click", handleDocumentClick);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("click", handleDocumentClick);
    };
  }, [anchorId, onClose]);

  const handleClose = () => {
    focusElement(anchorId);
    onClose();
  };

  return (
    <div
      ref={popoverRef}
      className="score-help-popover"
      data-placement={placement}
      id={`score-help-${category.id}`}
      role="dialog"
      aria-labelledby={titleId}
    >
      <header className="score-help-header">
        <h3 id={titleId}>{category.label}</h3>
        <button
          ref={closeButtonRef}
          className="score-help-close"
          type="button"
          aria-label={`Fermer l’explication de ${category.label}`}
          onClick={handleClose}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </header>

      {targetEvaluation && (
        <div style={{ padding: '0 12px', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Chance de marquer</span>
          <strong style={{ fontSize: 14 }}>{percent.format(targetEvaluation.successProbability)}</strong>
        </div>
      )}

      <dl className="score-help-details">
        <div>
          <dt>Réalisation</dt>
          <dd>{category.rule}</dd>
        </div>
        <div>
          <dt>Calcul</dt>
          <dd>{category.scoring}</dd>
        </div>
        <div className="score-help-result">
          <dt>Score</dt>
          <dd>{scoreText}</dd>
        </div>
        {coachEvaluation && coachEvaluation.category === category.id && (
          <div className="score-help-result" style={{ marginTop: 8, gridColumn: "1 / -1", background: 'var(--surface-muted)' }}>
            <dt style={{ color: 'var(--green)' }}>💡 Conseil du Coach</dt>
            <dd style={{ fontSize: 13, textAlign: 'left', marginTop: 4, fontFamily: 'var(--font-body)' }}>
              {formatHoldAction(coachEvaluation.bestHoldForExpectedScore)}.
            </dd>
          </div>
        )}
      </dl>
      {scoreAction && scorePoints !== null && scorePoints !== undefined && (
        <div style={{ marginTop: 8, padding: '0 12px 12px' }}>
           <button 
             onClick={scoreAction} 
             className="primary-action" 
             style={{ width: '100%', minHeight: 44, fontSize: 16 }}
           >
             Inscrire {scorePoints} point{scorePoints > 1 ? "s" : ""}
           </button>
        </div>
      )}
    </div>
  );
}
