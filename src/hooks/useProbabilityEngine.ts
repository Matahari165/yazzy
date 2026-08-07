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
  const analysisResolvers = useRef(new Map<number, (analysis: HoldAnalysis) => void>());
  const [evaluations, setEvaluations] = useState<CategoryEvaluation[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);

  useEffect(() => {
    const worker = new Worker(new URL("../workers/probability.worker.ts", import.meta.url));
    const resolvers = analysisResolvers.current;
    workerRef.current = worker;
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const response = event.data;
      if (response.type === "evaluations") {
        if (response.requestId === requestIdRef.current) {
          setEvaluations(response.evaluations);
          setIsCalculating(false);
        }
        return;
      }

      const resolve = analysisResolvers.current.get(response.requestId);
      if (resolve) {
        resolve(response.analysis);
        analysisResolvers.current.delete(response.requestId);
      }
    };

    return () => {
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
    workerRef.current.postMessage({
      type: "evaluate",
      requestId,
      categories,
      dice,
      remainingRolls,
    });
    // Keys make the request depend on values, not array identities.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryKey, diceKey, remainingRolls]);

  const analyzeHold = useCallback(
    (category: CategoryId, heldIndexes: number[]) => {
      if (!workerRef.current) return Promise.resolve<HoldAnalysis | null>(null);
      const requestId = ++requestIdRef.current;
      return new Promise<HoldAnalysis>((resolve) => {
        analysisResolvers.current.set(requestId, resolve);
        workerRef.current?.postMessage({
          type: "analyze-hold",
          requestId,
          category,
          dice,
          heldIndexes,
          remainingRolls,
        });
      });
    },
    [dice, remainingRolls],
  );

  return { evaluations, isCalculating, analyzeHold };
}
