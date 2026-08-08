import type { CategoryEvaluation } from "@/domain/probability";
import { CATEGORY_BY_ID, type CategoryId, type DieValue } from "@/domain/yatzy";
import type { GameState } from "@/domain/game";
import { getBotPolicy } from "@/domain/bots";
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

  return (
    <section className="game-table" aria-label="Zone de lancer">
      <div className="table-instruction" aria-live="polite">
        <strong>{isRolling ? "Les dés roulent…" : rollNumber === 0 ? "À toi de lancer" : rollNumber >= 3 ? "Résultat final" : `${heldCount} dé${heldCount > 1 ? "s" : ""} gardé${heldCount > 1 ? "s" : ""}`}</strong>
        <span>{rollNumber === 0 ? "Jusqu’à trois lancers." : rollNumber >= 3 ? "Choisis une case dans ta feuille." : "Chaque dé indique son état."}</span>
      </div>

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
        <span className="roll-count">{rollNumber === 0 ? "Prêt à lancer" : `Lancer ${Math.min(rollNumber, 3)}/3`}</span>
        {rollNumber >= 3 ? (
          <div className="roll-complete" role="status">Résultat final · choisis une case</div>
        ) : heldCount === 5 && rollNumber > 0 ? (
          <div className="roll-complete" role="status">Tous les dés sont gardés</div>
        ) : (
          <button className={selectedCategory ? "secondary-action" : "primary-action"} type="button" disabled={!canRoll} onClick={onRoll}>
            {isRolling ? "Les dés roulent…" : actionLabel}
          </button>
        )}
      </div>
      <p className="keyboard-help">⌥1 à ⌥5 pour garder un dé · ⌥R pour lancer · ⌥S pour inscrire</p>
    </section>
  );
}

type BotTurnPanelProps = {
  game: GameState;
  onSkip: () => void;
};

export function BotTurnPanel({ game, onSkip }: BotTurnPanelProps) {
  const policy = getBotPolicy(game.botLevel);
  const currentRoll = Math.min(game.bot.rollNumber, 3);
  const isAnimating = game.botTurn.status !== "idle";

  return (
    <section className="bot-turn-panel" aria-labelledby="bot-turn-title" aria-live="polite">
      <div>
        <p className="eyebrow">LE BOT JOUE</p>
        <h2 id="bot-turn-title">{policy.label}</h2>
        <p>{game.botTurn.status === "choosing" ? "Il choisit une case…" : currentRoll === 0 ? "Prépare son premier lancer" : `Lancer ${currentRoll} sur 3`}</p>
      </div>
      <DiceTray
        dice={game.bot.dice}
        held={game.bot.held}
        rollNumber={game.bot.rollNumber}
        rolling={game.botTurn.status === "rolling" || game.botTurn.status === "waiting"}
        disabled
        finalResult={game.bot.rollNumber >= 3}
        label="Les dés du bot"
      />
      <p className="bot-turn-note">Ses dés restent équitables. Son niveau change uniquement ses décisions.</p>
      {isAnimating ? <button className="secondary-action" type="button" onClick={onSkip}>Passer l’animation</button> : null}
      {game.botTurn.targetCategory ? <p className="bot-target">Case visée : {CATEGORY_BY_ID[game.botTurn.targetCategory].label}</p> : null}
    </section>
  );
}
