import type { CategoryEvaluation } from "@/domain/probability";
import { type CategoryId, type DieValue } from "@/domain/yatzy";
import type { GameState } from "@/domain/game";
import { Dice } from "./Dice";
import { DecisionPanel } from "./DecisionPanel";

type DiceTrayProps = {
  dice: DieValue[];
  held: boolean[];
  rollNumber: number;
  rolling: boolean;
  disabled: boolean;
  finalResult?: boolean;
  label: string;
  onToggle?: (index: number) => void;
};

export function DiceTray({ dice, held, rollNumber, rolling, disabled, finalResult, label, onToggle }: DiceTrayProps) {
  return (
    <div className="dice-tray" role="group" aria-label={label}>
      {dice.length === 5
        ? dice.map((value, index) => (
            <Dice
              key={index}
              value={value}
              index={index}
              held={held[index]}
              disabled={disabled || rollNumber >= 3}
              finalResult={finalResult ?? rollNumber >= 3}
              rolling={rolling}
              onToggle={() => onToggle?.(index)}
            />
          ))
        : Array.from({ length: 5 }, (_, index) => <span className="die-placeholder" key={index} aria-hidden="true" />)}
    </div>
  );
}

type GameTableProps = {
  dice: DieValue[];
  held: boolean[];
  rollNumber: number;
  selectedCategory: CategoryId | null;
  selectedPoints: number;
  targetEvaluation?: CategoryEvaluation;
  isRolling: boolean;
  isCalculating: boolean;
  calculationError: string | null;
  onToggleDie: (index: number) => void;
  onRoll: () => void;
  onScore: () => void;
};

export function GameTable({
  dice,
  held,
  rollNumber,
  selectedCategory,
  selectedPoints,
  targetEvaluation,
  isRolling,
  isCalculating,
  calculationError,
  onToggleDie,
  onRoll,
  onScore,
}: GameTableProps) {
  const heldCount = held.filter(Boolean).length;
  const canRoll = rollNumber < 3 && !(rollNumber > 0 && heldCount === 5) && !isRolling && !isCalculating;
  const actionLabel = rollNumber === 0 ? "Lancer" : "Relancer";
  const usedRolls = Math.min(rollNumber, 3);
  const remainingRolls = 3 - usedRolls;
  const mustScore = usedRolls >= 3 || (usedRolls > 0 && heldCount === 5);
  const rollStatus = usedRolls === 0
    ? "Trois lancers disponibles"
    : `${usedRolls} lancer${usedRolls > 1 ? "s" : ""} utilisé${usedRolls > 1 ? "s" : ""}, ${remainingRolls} disponible${remainingRolls !== 1 ? "s" : ""}`;

  return (
    <section className="game-table" aria-label="Zone de lancer" aria-busy={isCalculating}>
      {selectedCategory ? (
        <DecisionPanel
          category={selectedCategory}
          points={selectedPoints}
          evaluation={targetEvaluation}
          remainingRolls={Math.max(0, 3 - rollNumber)}
          isCalculating={isCalculating}
          calculationError={calculationError}
          disabled={isRolling || isCalculating}
          onScore={onScore}
        />
      ) : null}

      <DiceTray
        dice={dice}
        held={held}
        rollNumber={rollNumber}
        rolling={isRolling}
        disabled={isRolling}
        label="Tes cinq dés"
        onToggle={onToggleDie}
      />

      <div className="roll-controls">
        <span className="roll-indicator" role="img" aria-label={rollStatus}>
          {[0, 1, 2].map((rollIndex) => (
            <i key={rollIndex} data-used={rollIndex < usedRolls} aria-hidden="true" />
          ))}
        </span>
        {mustScore ? (
          <div className="roll-complete" role="status">Choisis une case</div>
        ) : (
          <button className={selectedCategory ? "secondary-action" : "primary-action"} type="button" disabled={!canRoll} onClick={onRoll}>
            {isRolling ? "Les dés roulent…" : isCalculating ? "Calcul…" : actionLabel}
          </button>
        )}
      </div>
    </section>
  );
}

type BotTurnPanelProps = {
  game: GameState;
  onSkip: () => void;
};

export function BotTurnPanel({ game, onSkip }: BotTurnPanelProps) {
  const isAnimating = game.botTurn.status !== "idle";
  const botStatus = game.botTurn.status === "choosing" ? "Le bot choisit…" : "Le bot lance…";

  return (
    <section className="bot-turn-panel" aria-labelledby="bot-turn-title" aria-live="polite">
      <p className="bot-status" id="bot-turn-title">{botStatus}</p>
      <DiceTray
        dice={game.bot.dice}
        held={game.bot.held}
        rollNumber={game.bot.rollNumber}
        rolling={game.botTurn.status === "rolling" || game.botTurn.status === "waiting"}
        disabled
        finalResult={game.bot.rollNumber >= 3}
        label="Les dés du bot"
      />
      {isAnimating ? <button className="secondary-action" type="button" onClick={onSkip}>Passer</button> : null}
    </section>
  );
}
