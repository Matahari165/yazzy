"use client";

type SoundToggleProps = {
  enabled: boolean;
  onToggle: () => void;
};

export function SoundToggle({ enabled, onToggle }: SoundToggleProps) {
  return (
    <button
      className="sound-toggle"
      type="button"
      aria-label={enabled ? "Couper le son" : "Activer le son"}
      aria-pressed={enabled}
      title={enabled ? "Couper le son" : "Activer le son"}
      onClick={onToggle}
    >
      <span aria-hidden="true">{enabled ? "♪" : "♪̸"}</span>
    </button>
  );
}
