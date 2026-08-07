"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CategoryEvaluation } from "@/domain/probability";
import type { CategoryId, DieValue } from "@/domain/yatzy";

export type HoldAnalysis = {
  category: CategoryId;
  chosenExpectedScore: number;
  bestExpectedScore: number;
  bestHoldLabel: string;
};

const CALCULATION_ERROR = "Le calcul probabiliste est indisponible dans cet onglet. La partie reste jouable et les scores restent exacts. Recharge la page pour réessayer.";

type WorkerResponse =
  | { type: "evaluations"; requestId: number; evaluations: CategoryEvaluation[] }
  | { type: "hold-analysis"; requestId: number; analysis: HoldAnalysis };

export function useProbabilityEngine(
  categories: CategoryId[],
  dice: DieValue[],
  remainingRolls: number,
) {
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);
  const analysisResolvers = useRef(new Map<number, (analysis: HoldAnalysis | null) => void>());
  const [evaluations, setEvaluations] = useState<CategoryEvaluation[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationError, setCalculationError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let worker: Worker;
    try {
      worker = new Worker(new URL("../workers/probability.worker.ts", import.meta.url));
    } catch {
      window.queueMicrotask(() => {
        if (!cancelled) setCalculationError(CALCULATION_ERROR);
      });
      return () => {
        cancelled = true;
      };
    }
    const resolvers = analysisResolvers.current;
    workerRef.current = worker;
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const response = event.data;
      if (response.type === "evaluations") {
        if (response.requestId === requestIdRef.current) {
          setEvaluations(response.evaluations);
          setIsCalculating(false);
          setCalculationError(null);
        }
        return;
      }

      const resolve = analysisResolvers.current.get(response.requestId);
      if (resolve) {
        resolve(response.analysis);
        analysisResolvers.current.delete(response.requestId);
      }
    };
    worker.onerror = (event) => {
      event.preventDefault();
      if (cancelled) return;
      setEvaluations([]);
      setIsCalculating(false);
      setCalculationError(CALCULATION_ERROR);
      for (const resolve of resolvers.values()) resolve(null);
      resolvers.clear();
      worker.terminate();
      if (workerRef.current === worker) workerRef.current = null;
    };

    return () => {
      cancelled = true;
      worker.onmessage = null;
      worker.onerror = null;
      worker.terminate();
      workerRef.current = null;
      resolvers.clear();
    };
  }, []);

  const categoryKey = categories.join(",");
  const diceKey = dice.join(",");

  useEffect(() => {
    if (!workerRef.current || dice.length !== 5) {
      setEvaluations([]);
      setIsCalculating(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    setIsCalculating(true);
    setCalculationError(null);
    try {
      workerRef.current.postMessage({
        type: "evaluate",
        requestId,
        categories,
        dice,
        remainingRolls,
      });
    } catch {
      workerRef.current.terminate();
      workerRef.current = null;
      for (const resolve of analysisResolvers.current.values()) resolve(null);
      analysisResolvers.current.clear();
      const failedRequest = requestId;
      window.queueMicrotask(() => {
        if (failedRequest !== requestIdRef.current) return;
        setEvaluations([]);
        setIsCalculating(false);
        setCalculationError(CALCULATION_ERROR);
      });
    }
    // Keys make the request depend on values, not array identities.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryKey, diceKey, remainingRolls]);

  const analyzeHold = useCallback(
    (category: CategoryId, heldIndexes: number[]) => {
      if (!workerRef.current) return Promise.resolve<HoldAnalysis | null>(null);
      const requestId = ++requestIdRef.current;
      return new Promise<HoldAnalysis | null>((resolve) => {
        analysisResolvers.current.set(requestId, resolve);
        try {
          workerRef.current?.postMessage({
            type: "analyze-hold",
            requestId,
            category,
            dice,
            heldIndexes,
            remainingRolls,
          });
        } catch {
          workerRef.current?.terminate();
          workerRef.current = null;
          setEvaluations([]);
          setIsCalculating(false);
          setCalculationError(CALCULATION_ERROR);
          for (const pendingResolve of analysisResolvers.current.values()) pendingResolve(null);
          analysisResolvers.current.clear();
        }
      });
    },
    [dice, remainingRolls],
  );

  return { evaluations, isCalculating, calculationError, analyzeHold };
}
