import { memo, type CSSProperties } from "react";
import type { DieValue } from "@/domain/yatzy";

const PIPS: Record<DieValue, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

export const DieGlyph = memo(function DieGlyph({
  value,
  className = "",
  concealPips = false,
}: {
  value: DieValue;
  className?: string;
  concealPips?: boolean;
}) {
  return (
    <span className={`die-glyph ${className}`.trim()} aria-hidden="true">
      {Array.from({ length: 9 }, (_, pip) => (
        <span className="pip" data-visible={!concealPips && PIPS[value].includes(pip)} key={pip} />
      ))}
    </span>
  );
});

type DiceProps = {
  value: DieValue;
  held: boolean;
  highlighted?: boolean;
  disabled: boolean;
  finalResult?: boolean;
  rolling: boolean;
  rollAnimationStyle?: CSSProperties;
  concealPipsWhileRolling?: boolean;
  index: number;
  onToggle: () => void;
};

export const Dice = memo(function Dice({
  value,
  held,
  highlighted = false,
  disabled,
  finalResult = false,
  rolling,
  rollAnimationStyle,
  concealPipsWhileRolling = false,
  index,
  onToggle,
}: DiceProps) {
  const concealPips = concealPipsWhileRolling && rolling && !held;

  return (
    <button
      type="button"
      className="die-button"
      data-held={held}
      data-highlighted={highlighted}
      data-rolling={rolling && !held}
      style={rollAnimationStyle}
      aria-pressed={held}
      aria-keyshortcuts={`Alt+${index + 1}`}
      aria-label={concealPips
        ? `Dé ${index + 1} : lancement en cours`
        : `Dé ${index + 1} : ${value}, ${finalResult ? "résultat final" : held ? "gardé" : "à relancer"}`}
      disabled={disabled}
      onClick={onToggle}
    >
      <DieGlyph value={value} className="die-face" concealPips={concealPips} />
    </button>
  );
});
