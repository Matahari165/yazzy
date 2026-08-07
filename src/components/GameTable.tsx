import { CATEGORY_BY_ID, type CategoryId, type DieValue } from "@/domain/yatzy";
import { Dice } from "./Dice";
import { SparkIcon } from "./icons";

type GameTableProps = {
  dice: DieValue[];
  held: boolean[];
  heldCount: number;
  rollNumber: number;
  selectedCategory: CategoryId | null;
  selectedPoints: number;
  isRolling: boolean;
  isCalculating: boolean;
  rollHighlight: string | null;
  coachMessage: string | null;
  recommendationMessage: string | null;
  recommendedCategory: CategoryId | null;
  coachTone: "neutral" | "success" | "tip";
  onToggleDie: (index: number) => void;
  onRoll: () => void;
  onScore: () => void;
};

type DiceTrayProps = Pick<
  GameTableProps,
  "dice" | "held" | "rollNumber" | "isRolling" | "onToggleDie"
> & { className: string };

function DiceTray({ dice, held, rollNumber, isRolling, onToggleDie, className }: DiceTrayProps) {
  return (
    <div className={className} aria-label="Tes cinq dés">
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
  );
}

type RollButtonProps = Pick<GameTableProps, "heldCount" | "rollNumber" | "isRolling" | "isCalculating" | "onRoll"> & {
  className?: string;
};

function RollButton({ heldCount, rollNumber, isRolling, isCalculating, onRoll, className = "" }: RollButtonProps) {
  if (rollNumber >= 3) {
    return <div className={`roll-complete ${className}`.trim()} role="status"><strong>3 / 3</strong><span>Choisis une case</span></div>;
  }

  if (rollNumber > 0 && heldCount === 5) {
    return <div className={`roll-complete ${className}`.trim()} role="status"><strong>TOUS GARDÉS</strong><span>Choisis une case ou libère un dé</span></div>;
  }

  return (
    <button
      type="button"
      className={`primary-button ${className}`.trim()}
      disabled={isRolling || isCalculating}
      onClick={onRoll}
    >
      <span>{isRolling ? "ROULE…" : isCalculating ? "CALCUL…" : rollNumber === 0 ? "LANCER" : "RELANCER"}</span>
      <small>{isCalculating ? "choix optimal" : rollNumber === 0 ? "les 5 dés" : `${5 - heldCount} dé${5 - heldCount > 1 ? "s" : ""}`}</small>
    </button>
  );
}

function RollMeter({ rollNumber }: { rollNumber: number }) {
  const rollsLeft = Math.max(0, 3 - rollNumber);
  return (
    <div className="roll-meter" aria-label={`${rollsLeft} lancers restants`}>
      {[1, 2, 3].map((step) => (
        <span key={step} data-used={step <= rollNumber}>{step}</span>
      ))}
    </div>
  );
}

export function GameTable({
  dice,
  held,
  heldCount,
  rollNumber,
  selectedCategory,
  selectedPoints,
  isRolling,
  isCalculating,
  rollHighlight,
  coachMessage,
  recommendationMessage,
  recommendedCategory,
  coachTone,
  onToggleDie,
  onRoll,
  onScore,
}: GameTableProps) {
  return (
    <>
      <div className="table-surface" data-rolling={isRolling} aria-busy={isRolling}>
        <div className="roll-status" aria-live="polite">
          <strong>{isRolling ? "ÇA ROULE…" : rollNumber === 0 ? "PRÊT ?" : `${heldCount} GARDÉ${heldCount > 1 ? "S" : ""}`}</strong>
          <span>{rollNumber === 0 ? "Lance les cinq dés" : rollNumber >= 3 ? "Aucun lancer restant · choisis une case" : "Clique les dés à conserver"}</span>
        </div>

        {rollHighlight && !isRolling ? <div className="combo-banner" role="status">{rollHighlight}</div> : null}

        <DiceTray
          className="dice-row"
          dice={dice}
          held={held}
          rollNumber={rollNumber}
          isRolling={isRolling}
          onToggleDie={onToggleDie}
        />

        <div className="play-actions">
          <RollButton heldCount={heldCount} rollNumber={rollNumber} isRolling={isRolling} isCalculating={isCalculating} onRoll={onRoll} />
          <RollMeter rollNumber={rollNumber} />
          {selectedCategory ? (
            <button type="button" className="score-button" disabled={isRolling || isCalculating} onClick={onScore}>
              INSCRIRE <strong>{selectedPoints}</strong>
            </button>
          ) : (
            <p className="action-hint">
              {rollNumber === 0
                ? "Trois lancers par tour"
                : "Choisis ensuite une case dans la grille."}
            </p>
          )}
        </div>
      </div>

      <section className="mobile-play-dock" aria-label="Commandes de jeu" data-tone={coachTone}>
        {coachMessage && !selectedCategory ? (
          <a className="mobile-feedback" href="#coach-panel">
            <SparkIcon />
            <span><strong>CONSEIL · VOIR POURQUOI →</strong><small>{coachMessage}</small></span>
          </a>
        ) : null}
        <div className="mobile-dock-main">
          <DiceTray
            className="mobile-dice-row"
            dice={dice}
            held={held}
            rollNumber={rollNumber}
            isRolling={isRolling}
            onToggleDie={onToggleDie}
          />
          <div className="mobile-dock-actions">
            <RollButton
              className="mobile-roll-button"
              heldCount={heldCount}
              rollNumber={rollNumber}
              isRolling={isRolling}
              isCalculating={isCalculating}
              onRoll={onRoll}
            />
            <RollMeter rollNumber={rollNumber} />
          </div>
          {selectedCategory ? (
            <button type="button" className="mobile-score-button" disabled={isRolling || isCalculating} onClick={onScore}>
              <span>INSCRIRE {selectedPoints} PTS</span><small>{CATEGORY_BY_ID[selectedCategory].shortLabel}</small>
            </button>
          ) : rollNumber > 0 && !isCalculating && recommendationMessage && recommendedCategory ? (
            <a className="mobile-dock-hint mobile-recommendation-link" href={`#score-${recommendedCategory}`}>
              <span>{recommendationMessage}</span><strong>VOIR LA CASE ↑</strong>
            </a>
          ) : (
            <p className="mobile-dock-hint" aria-live="polite">
              {rollNumber === 0 ? "3 lancers pour construire ton coup" : isCalculating ? "Calcul du meilleur choix…" : "Touche les dés à garder, puis choisis une case."}
            </p>
          )}
        </div>
      </section>
    </>
  );
}
