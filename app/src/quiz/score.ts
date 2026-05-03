import type { QuizQuestion } from './types';
import type { AxisScores } from './types';

// An answer is the index into question.choices (0 or 1).
export type QuizAnswers = Record<string, 0 | 1>;

export function scoreAnswers(questions: QuizQuestion[], answers: QuizAnswers): AxisScores {
  const totals: Record<string, number> = {
    wired_wild: 0,
    streetwise_cerebral: 0,
    iron_empath: 0,
    runner_operator: 0,
    awakened_mundane: 0,
    human_metahuman: 0,
  };

  for (const q of questions) {
    const answerIdx = answers[q.id];
    if (answerIdx === undefined) continue; // unanswered
    const choice = q.choices[answerIdx];
    totals[q.axis] += choice.delta;
  }

  return totals as AxisScores;
}
