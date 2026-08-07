"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { CloseIcon } from "./icons";

type MobileScoreSheetProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
};

export function MobileScoreSheet({ open, onClose, children }: MobileScoreSheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      closeButtonRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 721px)");
    const closeAfterResize = () => {
      if (desktop.matches) onClose();
    };
    desktop.addEventListener("change", closeAfterResize);
    return () => desktop.removeEventListener("change", closeAfterResize);
  }, [onClose]);

  return (
    <dialog
      ref={dialogRef}
      className="mobile-score-sheet"
      aria-labelledby="mobile-sheet-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onClose();
        }
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="mobile-sheet-handle" aria-hidden="true" />
      <div className="mobile-sheet-heading">
        <div>
          <p className="eyebrow">Probabilités exactes</p>
          <h2 id="mobile-sheet-title">Ta feuille de score</h2>
        </div>
        <button ref={closeButtonRef} type="button" className="sheet-close" aria-label="Fermer la feuille" onClick={onClose}>
          <CloseIcon />
        </button>
      </div>
      <div className="mobile-sheet-content">{children}</div>
    </dialog>
  );
}
