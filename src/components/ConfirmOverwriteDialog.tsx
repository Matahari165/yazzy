"use client";

import { useEffect, useRef } from "react";

type ConfirmOverwriteDialogProps = {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmOverwriteDialog({ open, onCancel, onConfirm }: ConfirmOverwriteDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      confirmRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="confirm-dialog"
      aria-labelledby="overwrite-title"
      aria-describedby="overwrite-description"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div className="confirm-dialog-card">
        <p className="eyebrow">NOUVELLE PARTIE</p>
        <h2 id="overwrite-title">Remplacer la partie actuelle ?</h2>
        <p id="overwrite-description">La partie enregistrée sera remplacée par cette nouvelle partie. L’ancienne sauvegarde v1 n’est jamais supprimée.</p>
        <div className="confirm-dialog-actions">
          <button className="secondary-action" type="button" onClick={onCancel}>Garder la partie</button>
          <button className="primary-action" type="button" ref={confirmRef} onClick={onConfirm}>Commencer</button>
        </div>
      </div>
    </dialog>
  );
}
