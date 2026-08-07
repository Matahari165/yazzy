import type { CategoryId, DieValue } from "@/domain/yatzy";
import { Dice } from "./Dice";

type GameTableProps = {
  dice: DieValue[];
  held: boolean[];
  heldCount: number;
  rollNumber: number;
  selectedCategory: CategoryId | null;
  selectedPoints: number;
  isRolling: boolean;
  rollHighlight: string | null;
  onToggleDie: (index: number) => void;
  onRoll: () => void;
  onScore: () => void;
};

export function GameTable({
  dice,
  held,
  heldCount,
  rollNumber,
  selectedCategory,
  selectedPoints,
  isRolling,
  rollHighlight,
  onToggleDie,
  onRoll,
  onScore,
}: GameTableProps) {
  return (
    <div className="table-surface" data-rolling={isRolling} aria-busy={isRolling}>
      <div className="roll-status">
        <span>Lancer {rollNumber === 0 ? "—" : `${rollNumber}/3`}</span>
        <span>{isRolling ? "Les dés roulent…" : rollNumber === 0 ? "5 dés à lancer" : `${heldCount} dé${heldCount > 1 ? "s" : ""} gardé${heldCount > 1 ? "s" : ""}`}</span>
      </div>

      {rollHighlight && !isRolling ? <div className="combo-banner" role="status">{rollHighlight}</div> : null}

      <div className="dice-row" aria-label="Tes cinq dés">
        {dice.length === 5
          ? dice.map((value, index) => (
              <Dice
                key={index}
                value={value}
                index={index}
                held={held[index]}
                disabled={rollNumber >= 3}
                rolling={isRolling}
                onToggle={() => onToggleDie(index)}
              />
            ))
          : Array.from({ length: 5 }, (_, index) => <span className="die-placeholder" key={index} />)}
      </div>

      <div className="play-actions">
        <button
          type="button"
          className="primary-button"
          disabled={isRolling || rollNumber >= 3 || (rollNumber > 0 && heldCount === 5)}
          onClick={onRoll}
        >
          {isRolling
            ? "Les dés roulent…"
            : rollNumber === 0
            ? "Lancer les dés"
            : `Relancer ${5 - heldCount} dé${5 - heldCount > 1 ? "s" : ""}`}
          <kbd>R</kbd>
        </button>
        {selectedCategory ? (
          <button type="button" className="score-button" disabled={isRolling} onClick={onScore}>
            Inscrire {selectedPoints} point{selectedPoints > 1 ? "s" : ""}
          </button>
        ) : (
          <p className="action-hint">
            {rollNumber === 0
              ? "Aucun compte nécessaire. La partie est sauvegardée sur cet appareil."
              : "Clique une case pour en faire ton objectif ou inscrire ton score."}
          </p>
        )}
      </div>
    </div>
  );
}
