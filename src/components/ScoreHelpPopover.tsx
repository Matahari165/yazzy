"use client";

import { useEffect, useRef } from "react";
import type { CategoryDefinition } from "@/domain/yatzy";

type ScoreHelpPopoverProps = {
  anchorId: string;
  category: CategoryDefinition;
  placement: "above" | "below";
  scoreText: string;
  onClose: () => void;
};

function focusElement(elementId: string) {
  document.getElementById(elementId)?.focus({ preventScroll: true });
}

export function ScoreHelpPopover({
  anchorId,
  category,
  placement,
  scoreText,
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
      </dl>
    </div>
  );
}
