import type { DieValue } from "@/domain/yatzy";

const PIPS: Record<DieValue, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

export function DieGlyph({ value, className = "" }: { value: DieValue; className?: string }) {
  return (
    <span className={`die-glyph ${className}`.trim()} aria-hidden="true">
      {Array.from({ length: 9 }, (_, pip) => (
        <span className="pip" data-visible={PIPS[value].includes(pip)} key={pip} />
      ))}
    </span>
  );
}

type DiceProps = {
  value: DieValue;
  held: boolean;
  disabled: boolean;
  rolling: boolean;
  index: number;
  onToggle: () => void;
};

export function Dice({ value, held, disabled, rolling, index, onToggle }: DiceProps) {
  return (
    <button
      type="button"
      className="die"
      data-held={held}
      data-rolling={rolling && !held}
      aria-pressed={held}
      aria-keyshortcuts={`Alt+${index + 1}`}
      aria-label={`Dé ${index + 1} : ${value}${disabled ? ", résultat final" : held ? ", gardé" : ", à relancer"}`}
      disabled={disabled || rolling}
      onClick={onToggle}
    >
      <DieGlyph value={value} className="die-face" />
      <span className="die-state">{disabled ? "Final" : held ? "Gardé" : "Relancer"}</span>
      <kbd aria-hidden="true">⌥{index + 1}</kbd>
    </button>
  );
}
