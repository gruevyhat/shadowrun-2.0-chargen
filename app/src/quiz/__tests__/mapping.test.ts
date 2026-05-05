import { describe, it, expect } from 'vitest';
import { QUESTIONS } from '../questions';
import { scoreAnswers } from '../score';
import { axisScoresToIntent } from '../mapping';
import type { QuizAnswers } from '../score';
import type { AxisScores } from '../types';

// Build a complete answer set by picking the choice with a given delta for each axis.
// delta=-1 means "pick the negative-pole answer", +1 means "pick positive-pole".
function buildAnswers(axisPoles: Partial<Record<string, -1 | 1>>): QuizAnswers {
  const answers: QuizAnswers = {};
  for (const q of QUESTIONS) {
    const pole = axisPoles[q.axis] ?? -1; // default negative
    const idx = q.choices[0].delta === pole ? 0 : 1;
    answers[q.id] = idx as 0 | 1;
  }
  return answers;
}

// Shorthand: all axes at the same pole
function allPole(delta: -1 | 1): QuizAnswers {
  return buildAnswers({
    wired_wild: delta,
    streetwise_cerebral: delta,
    iron_empath: delta,
    runner_operator: delta,
    awakened_mundane: delta,
    human_metahuman: delta,
  });
}

describe('scoreAnswers', () => {
  it('all-negative-pole answers give -5 on every axis', () => {
    const scores = scoreAnswers(QUESTIONS, allPole(-1));
    for (const v of Object.values(scores)) expect(v).toBe(-5);
  });

  it('all-positive-pole answers give +5 on every axis', () => {
    const scores = scoreAnswers(QUESTIONS, allPole(1));
    for (const v of Object.values(scores)) expect(v).toBe(5);
  });

  it('mixed answers sum correctly', () => {
    const answers = buildAnswers({ wired_wild: -1, streetwise_cerebral: 1 });
    const scores = scoreAnswers(QUESTIONS, answers);
    expect(scores.wired_wild).toBe(-5);
    expect(scores.streetwise_cerebral).toBe(5);
  });
});

describe('axisScoresToIntent — canonical archetype profiles', () => {
  function intentFor(poles: Partial<Record<string, -1 | 1>>) {
    const answers = buildAnswers(poles);
    const scores = scoreAnswers(QUESTIONS, answers);
    return axisScoresToIntent(scores, 1);
  }

  it('wired + iron + mundane + streetwise → street_samurai', () => {
    const intent = intentFor({
      wired_wild: -1,
      iron_empath: -1,
      awakened_mundane: 1,
      streetwise_cerebral: -1,
    });
    expect(intent.archetype).toBe('street_samurai');
    expect(intent.magicDisposition).toBe('mundane');
  });

  it('cerebral + iron + awakened → combat_mage', () => {
    const intent = intentFor({
      streetwise_cerebral: 1,
      iron_empath: -1,
      awakened_mundane: -1,
    });
    expect(intent.archetype).toBe('combat_mage');
    expect(intent.magicDisposition).toBe('full_magic');
  });

  it('wild + awakened + empath + meta → shaman', () => {
    const intent = intentFor({
      wired_wild: 1,
      awakened_mundane: -1,
      iron_empath: 1,
      human_metahuman: 1,
    });
    expect(intent.archetype).toBe('shaman');
    expect(intent.magicDisposition).toBe('full_magic');
  });

  it('wired + cerebral + mundane + operator + meta → decker', () => {
    const intent = intentFor({
      wired_wild: -1,
      streetwise_cerebral: 1,
      iron_empath: 1,   // empath (vs rigger's iron) separates decker
      awakened_mundane: 1,
      runner_operator: 1,
      human_metahuman: 1,
    });
    expect(intent.archetype).toBe('decker');
    expect(intent.magicDisposition).toBe('mundane');
  });

  it('wired + cerebral + operator + mundane → rigger', () => {
    const intent = intentFor({
      wired_wild: -1,
      streetwise_cerebral: 1,
      iron_empath: -1,
      runner_operator: 1,
      awakened_mundane: 1,
    });
    expect(intent.archetype).toBe('rigger');
    expect(intent.magicDisposition).toBe('mundane');
  });

  it('cerebral + empath + operator + awakened → former_wage_mage', () => {
    const intent = intentFor({
      streetwise_cerebral: 1,
      iron_empath: 1,
      runner_operator: 1,
      awakened_mundane: -1,
      wired_wild: 1,
    });
    expect(intent.archetype).toBe('former_wage_mage');
    expect(intent.magicDisposition).toBe('full_magic');
  });

  it('wild + awakened + empath + street → street_shaman', () => {
    const intent = intentFor({
      wired_wild: 1,
      awakened_mundane: -1,
      iron_empath: 1,
      runner_operator: -1,
      human_metahuman: -1,
    });
    expect(intent.archetype).toBe('street_shaman');
    expect(intent.magicDisposition).toBe('full_magic');
  });

  it('intent always has edition sr2', () => {
    const intent = intentFor({});
    expect(intent.edition).toBe('sr2');
  });
});

describe('axisScoresToIntent — metatype hints', () => {
  it('strong metahuman lean on decker gives elf hint', () => {
    const scores: AxisScores = {
      wired_wild: -4, streetwise_cerebral: 5, iron_empath: 1,
      runner_operator: 3, awakened_mundane: 4, human_metahuman: 4,
    };
    const intent = axisScoresToIntent(scores, 1);
    expect(intent.archetype).toBe('decker');
    expect(intent.metatypeHint).toBe('elf');
  });

  it('strong human lean gives no metatype hint', () => {
    const scores: AxisScores = {
      wired_wild: -4, streetwise_cerebral: -2, iron_empath: -4,
      runner_operator: -1, awakened_mundane: 4, human_metahuman: -4,
    };
    const intent = axisScoresToIntent(scores, 1);
    expect(intent.metatypeHint).toBeUndefined();
  });
});
