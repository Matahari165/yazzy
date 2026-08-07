"use client";

import { useEffect, useRef } from "react";
import { RefreshIcon } from "./icons";

type ResetGameDialogProps = {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ResetGameDialog({ open, onCancel, onConfirm }: ResetGameDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      cancelRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="reset-dialog"
      aria-labelledby="reset-dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div className="reset-dialog-card">
        <span className="reset-dialog-icon" aria-hidden="true"><RefreshIcon /></span>
        <p className="eyebrow">NOUVELLE PARTIE</p>
        <h2 id="reset-dialog-title">Effacer ce score ?</h2>
        <p>La partie actuelle sera remplacée. Cette action ne peut pas être annulée.</p>
        <div className="reset-dialog-actions">
          <button ref={cancelRef} type="button" className="dialog-cancel" onClick={onCancel}>Continuer la partie</button>
          <button type="button" className="dialog-confirm" onClick={onConfirm}>Recommencer</button>
        </div>
      </div>
    </dialog>
  );
}
