import type { QuizQuestion } from "@/domain/quiz";
import { QUIZ_QUESTIONS_FR } from "./quizQuestions.fr";
import { QUIZ_SCIENCE_FACILE } from "./quiz/science.facile";
import { QUIZ_SCIENCE_MOYEN } from "./quiz/science.moyen";
import { QUIZ_SCIENCE_DIFFICILE_A } from "./quiz/science.difficile.a";
import { QUIZ_SCIENCE_DIFFICILE_B } from "./quiz/science.difficile.b";
import { QUIZ_SCIENCE_TOPUP } from "./quiz/science.topup";
import { QUIZ_HISTOIRE_FACILE } from "./quiz/histoire.facile";
import { QUIZ_HISTOIRE_MOYEN } from "./quiz/histoire.moyen";
import { QUIZ_HISTOIRE_DIFFICILE } from "./quiz/histoire.difficile";
import { QUIZ_ART_FACILE } from "./quiz/art.facile";
import { QUIZ_ART_MOYEN } from "./quiz/art.moyen";
import { QUIZ_ART_DIFFICILE } from "./quiz/art.difficile";
import { QUIZ_PAYS_FACILE } from "./quiz/pays.facile";
import { QUIZ_PAYS_FACILE_TOPUP_A } from "./quiz/pays.facile.topup.a";
import { QUIZ_PAYS_FACILE_TOPUP_B } from "./quiz/pays.facile.topup.b";
import { QUIZ_PAYS_MOYEN } from "./quiz/pays.moyen";
import { QUIZ_PAYS_MOYEN_TOPUP } from "./quiz/pays.moyen.topup";
import { QUIZ_PAYS_DIFFICILE_A } from "./quiz/pays.difficile.a";
import { QUIZ_PAYS_DIFFICILE_B } from "./quiz/pays.difficile.b";

const RAW_QUIZ_POOL: QuizQuestion[] = [
  ...QUIZ_QUESTIONS_FR,
  ...QUIZ_SCIENCE_FACILE,
  ...QUIZ_SCIENCE_MOYEN,
  ...QUIZ_SCIENCE_DIFFICILE_A,
  ...QUIZ_SCIENCE_DIFFICILE_B,
  ...QUIZ_SCIENCE_TOPUP,
  ...QUIZ_HISTOIRE_FACILE,
  ...QUIZ_HISTOIRE_MOYEN,
  ...QUIZ_HISTOIRE_DIFFICILE,
  ...QUIZ_ART_FACILE,
  ...QUIZ_ART_MOYEN,
  ...QUIZ_ART_DIFFICILE,
  ...QUIZ_PAYS_FACILE,
  ...QUIZ_PAYS_FACILE_TOPUP_A,
  ...QUIZ_PAYS_FACILE_TOPUP_B,
  ...QUIZ_PAYS_MOYEN,
  ...QUIZ_PAYS_MOYEN_TOPUP,
  ...QUIZ_PAYS_DIFFICILE_A,
  ...QUIZ_PAYS_DIFFICILE_B,
];

const DIFFICULTY_RANK: Record<string, number> = {
  difficile: 0,
  moyen: 1,
  facile: 2,
};

function rankDifficulty(question: QuizQuestion): number {
  if (question.difficulty === undefined) return 3;
  return DIFFICULTY_RANK[question.difficulty] ?? 3;
}

// Déduplique par libellé (même thème) en gardant la version la plus dure :
// un même sujet posé en facile et en difficile ne survit qu'en difficile,
// pour ne jamais rejouer deux fois la même question.
function dedupeQuizPool(pool: readonly QuizQuestion[]): QuizQuestion[] {
  const best = new Map<string, QuizQuestion>();
  for (const question of pool) {
    const key = `${question.category}::${question.question.trim().toLowerCase()}`;
    const prev = best.get(key);
    if (!prev || rankDifficulty(question) < rankDifficulty(prev)) {
      best.set(key, question);
    }
  }
  return [...best.values()];
}

// Banque complète : pack historique (sans difficulté, jouable partout)
// + questions curées classées par thème et difficulté, sans doublon.
export const QUIZ_QUESTION_POOL: QuizQuestion[] = dedupeQuizPool(RAW_QUIZ_POOL);
