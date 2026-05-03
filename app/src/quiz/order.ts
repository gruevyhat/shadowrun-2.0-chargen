import type { QuizQuestion } from './types';
import { QUESTIONS } from './questions';

// Round-robin interleaving: take the Nth question from each axis in turn.
// Stable, deterministic, no two consecutive questions probe the same axis.
export function presentationOrder(): QuizQuestion[] {
  const byAxis = new Map<string, QuizQuestion[]>();
  for (const q of QUESTIONS) {
    const list = byAxis.get(q.axis) ?? [];
    list.push(q);
    byAxis.set(q.axis, list);
  }
  const axes = [...byAxis.keys()];
  const out: QuizQuestion[] = [];
  for (let i = 0; i < 5; i++) {
    for (const axis of axes) {
      const q = byAxis.get(axis)![i];
      if (q) out.push(q);
    }
  }
  return out;
}
