import { memo, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { type CategoryId, type DieValue } from "@/domain/yatzy";
import type { GameState } from "@/domain/game";
import { Dice } from "./Dice";

type DiceTrayProps = {
  dice: DieValue[];
  held: boolean[];
  highlightedDieIndex?: number | null;
  showHeldMarkers?: boolean;
  rollNumber: number;
  animationSeed: number;
  rolling: boolean;
  disabled: boolean;
  finalResult?: boolean;
  label: string;
  /** Ton du cadre : "player" (tes dés) ou "opponent" (dés du bot). */
  tone?: "player" | "opponent";
  onToggle?: (index: number) => void;
};

function DiceTray({
  dice,
  held,
  highlightedDieIndex = null,
  showHeldMarkers = false,
  rollNumber,
  animationSeed,
  rolling,
  disabled,
  finalResult,
  label,
  tone = "player",
  onToggle,
}: DiceTrayProps) {
  const trayStyles = useMemo(() => {
    const makeStyle = (index: number): CSSProperties => {
      const seed = animationSeed * 31 + (index + 1) * 17;
      const pseudoRandom = (salt: number) => {
        const value = Math.sin(seed * 12.9898 + salt * 78.233) * 43758.5453;
        return value - Math.floor(value);
      };
      const between = (min: number, max: number, salt: number) => min + (max - min) * pseudoRandom(salt);

      return {
        "--roll-delay": `${Math.round(between(0, 18, 1))}ms`,
        "--roll-start-y": `${Math.round(between(4, 8, 2))}px`,
        "--roll-start-angle": `${Math.round(between(-14, 14, 3))}deg`,
        "--roll-mid-y": `${Math.round(between(-4, -1, 4))}px`,
        "--roll-mid-angle": `${Math.round(between(-12, 12, 5))}deg`,
        "--roll-end-y": `${Math.round(between(0, 2, 6))}px`,
        "--roll-end-angle": `${Math.round(between(-4, 4, 7))}deg`,
      } as CSSProperties;
    };
    return [makeStyle(0), makeStyle(1), makeStyle(2), makeStyle(3), makeStyle(4)];
  }, [animationSeed]);

  const toggleHandlers = useMemo(
    () => [0, 1, 2, 3, 4].map((dieIndex) => () => onToggle?.(dieIndex)),
    [onToggle],
  );

  return (
    <div className="dice-tray" data-tone={tone} role="group" aria-label={label}>
      {dice.length === 5
        ? dice.map((value, index) => (
            <Dice
              key={`${index}-${rollNumber}`}
              value={value}
              index={index}
              held={rollNumber < 3 && held[index]}
              highlighted={highlightedDieIndex === index}
              showHeldMarker={showHeldMarkers}
              disabled={disabled || rollNumber >= 3}
              finalResult={finalResult ?? rollNumber >= 3}
              rolling={rolling}
              rollAnimationStyle={trayStyles[index]}
              onToggle={toggleHandlers[index]}
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
  animationSeed?: number;
  isRolling: boolean;
  isDisabled?: boolean;
  isRollDisabled?: boolean;
  isObserver?: boolean;
  highlightedDieIndex?: number | null;
  label?: string;
  trailingControl?: ReactNode;
  onToggleDie: (index: number) => void;
  onRoll: () => void;
};

export const GameTable = memo(function GameTable({
  dice,
  held,
  rollNumber,
  selectedCategory,
  animationSeed: animationSeedProp,
  isRolling,
  isDisabled = false,
  isRollDisabled = false,
  isObserver = false,
  highlightedDieIndex = null,
  label = "Tes cinq dés",
  trailingControl,
  onToggleDie,
  onRoll,
}: GameTableProps) {
  const heldCount = useMemo(() => held.filter(Boolean).length, [held]);
  const [localAnimationSeed, setLocalAnimationSeed] = useState(0);
  // Combine la graine serveur (réconciliation duo) et la graine locale du clic :
  // en duo la prop serveur seule ignorait le clic, l'animation rejouait les
  // anciennes faces. Ici chaque clic varie l'animation en <50ms.
  const animationSeed = (animationSeedProp ?? 0) + localAnimationSeed;
  const canRoll = rollNumber < 3 && !(rollNumber > 0 && heldCount === 5) && !isRolling && !isDisabled && !isRollDisabled;
  const actionLabel = rollNumber === 0 ? "Lancer" : "Relancer";
  const usedRolls = Math.min(rollNumber, 3);
  const remainingRolls = 3 - usedRolls;
  const canShowRollButton = (usedRolls < 3 && heldCount < 5) || isRolling;
  const rollStatus = usedRolls === 0
    ? "Trois lancers disponibles"
    : `${usedRolls} lancer${usedRolls > 1 ? "s" : ""} utilisé${usedRolls > 1 ? "s" : ""}, ${remainingRolls} disponible${remainingRolls !== 1 ? "s" : ""}`;

  return (
    <section className="game-table" data-observer={isObserver} aria-label={isObserver ? `${label}, action en cours` : "Zone de lancer"}>

      <DiceTray
        dice={dice}
        held={held}
        highlightedDieIndex={highlightedDieIndex}
        showHeldMarkers={isObserver}
        rollNumber={rollNumber}
        animationSeed={animationSeed}
        rolling={isRolling}
        disabled={isRolling || isDisabled}
        label={label}
        tone={isObserver ? "opponent" : "player"}
        onToggle={onToggleDie}
      />

      <div className="roll-controls" data-has-trailing-control={Boolean(trailingControl)}>
        <span className="roll-indicator" aria-label={rollStatus} aria-live="polite">
          <strong>{usedRolls}</strong><span aria-hidden="true">/</span><span aria-hidden="true">3</span>
        </span>
        {isObserver ? (
          <span className="roll-control-spacer" aria-hidden="true" />
        ) : canShowRollButton ? (
          <button
            className={selectedCategory ? "secondary-action" : "primary-action"}
            type="button"
            disabled={!canRoll}
            onClick={() => {
              setLocalAnimationSeed((seed) => seed + 1);
              onRoll();
            }}
          >
            {actionLabel}
          </button>
        ) : <span className="roll-control-spacer" aria-hidden="true" />}
        {trailingControl}
        {isRolling ? <span className="sr-only" role="status">Les dés roulent…</span> : null}
      </div>
    </section>
  );
});

type BotTurnPanelProps = {
  game: GameState;
  onSkip: () => void;
};

export function BotTurnPanel({ game, onSkip }: BotTurnPanelProps) {
  const isAnimating = game.botTurn.status !== "idle";
  const botStatus = game.botTurn.status === "choosing" ? "Le bot choisit…" : "Le bot lance…";

  return (
    <section className="bot-turn-panel" aria-labelledby="bot-turn-title" aria-live="polite">
      <DiceTray
        dice={game.bot.dice}
        held={game.bot.held}
        rollNumber={game.bot.rollNumber}
        animationSeed={game.turn * 3 + game.bot.rollNumber}
        rolling={game.botTurn.status === "rolling" || game.botTurn.status === "waiting"}
        disabled
        finalResult={game.bot.rollNumber >= 3}
        label="Les dés du bot"
        tone="opponent"
      />
      <div className="roll-controls bot-turn-controls">
        <p className="bot-status" id="bot-turn-title">{botStatus}</p>
        {isAnimating ? (
          <button className="secondary-action bot-skip-action" type="button" onClick={onSkip}>
            Passer
          </button>
        ) : (
          <span className="roll-control-spacer" aria-hidden="true" />
        )}
      </div>
    </section>
  );
}
