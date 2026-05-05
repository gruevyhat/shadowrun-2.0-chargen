import type { ArchetypeId, CharacterIntent, MagicDisposition, MetatypeId } from '../engine/types';
import type { AxisScores } from './types';

// Each archetype is represented as a vector of axis affinities in [-5, +5].
// The mapping picks the archetype whose vector has the highest dot product with
// the player's axis scores (cosine-style scoring without normalisation —
// magnitude matters here since extreme answers should map to extreme archetypes).
//
// Axis sign convention (from types.ts):
//   wired_wild:           wired = negative,  wild = positive
//   streetwise_cerebral:  streetwise = neg,  cerebral = positive
//   iron_empath:          iron = negative,   empath = positive
//   runner_operator:      runner = negative,  operator = positive
//   awakened_mundane:     awakened = negative, mundane = positive
//   human_metahuman:      human = negative,  metahuman = positive

type AxisVector = [
  wired_wild: number,
  streetwise_cerebral: number,
  iron_empath: number,
  runner_operator: number,
  awakened_mundane: number,
  human_metahuman: number,
];

export const AXIS_ORDER: (keyof AxisScores)[] = [
  'wired_wild',
  'streetwise_cerebral',
  'iron_empath',
  'runner_operator',
  'awakened_mundane',
  'human_metahuman',
];

// Archetype profiles.  Values chosen to create clear separations while allowing
// overlap — e.g. mage and combat_mage both go awakened but differ on iron/empath.
const ARCHETYPE_VECTORS: Record<ArchetypeId, AxisVector> = {
  //                          W/W   S/C   I/E   R/O   A/M   H/M
  street_samurai:            [ -4,  -2,   -4,   -1,    4,   -1 ],
  combat_mage:               [ -3,   2,   -4,    0,   -4,    0 ],
  mage:                      [  0,   4,    2,    1,   -5,    0 ],
  shaman:                    [  2,  -2,    3,   -1,   -5,    1 ],
  physical_adept:            [ -3,  -3,   -2,   -2,   -4,    0 ],
  decker:                    [ -3,   5,    1,    2,    4,    0 ],
  rigger:                    [ -2,   3,   -1,    3,    5,   -1 ],
  face:                      [  4,  -1,    4,    2,    4,    1 ],
  // Investigator: intuition-led (slight streetwise), people-reader (empath), long-game (operator)
  // Deliberately less cerebral than decker to create separation in axis space.
  investigator:              [ -2,  -1,    4,    5,    4,    2 ],
};

// Magic disposition: driven almost entirely by awakened_mundane score.
function deriveMagicDisposition(scores: AxisScores, archetype: ArchetypeId): MagicDisposition {
  const am = scores.awakened_mundane;
  // physical_adept uses adept disposition when leaning awakened
  if (archetype === 'physical_adept') {
    return am < 0 ? 'adept' : 'mundane';
  }
  if (archetype === 'mage' || archetype === 'shaman' || archetype === 'combat_mage') {
    return 'full_magic';
  }
  return 'mundane';
}

// Metatype hint: driven by human_metahuman score and archetype preference.
function deriveMetatypeHint(scores: AxisScores, archetype: ArchetypeId): MetatypeId | undefined {
  const hm = scores.human_metahuman;
  if (hm <= -2) return undefined; // human
  if (hm >= 2) {
    // Strong metahuman lean — pick from archetype-appropriate metatypes
    const preferences: Partial<Record<ArchetypeId, MetatypeId>> = {
      street_samurai: 'ork',
      shaman:         'elf',
      physical_adept: 'elf',
      face:           'elf',
      investigator:   'elf',
      rigger:         'dwarf',
      decker:         'elf',
    };
    return preferences[archetype]; // undefined for mage/combat_mage → stays human
  }
  return undefined; // middle range: no hint, let engine decide
}

// Score all archetypes and return the best match.
function bestArchetype(scores: AxisScores): ArchetypeId {
  const scoreVec = AXIS_ORDER.map(k => scores[k]);

  let best: ArchetypeId = 'street_samurai';
  let bestScore = -Infinity;

  for (const [id, vec] of Object.entries(ARCHETYPE_VECTORS) as [ArchetypeId, AxisVector][]) {
    const dot = scoreVec.reduce((sum, s, i) => sum + s * vec[i], 0);
    if (dot > bestScore) {
      bestScore = dot;
      best = id;
    }
  }
  return best;
}

export function axisScoresToIntent(scores: AxisScores, seed: number): CharacterIntent {
  const archetype = bestArchetype(scores);
  const magicDisposition = deriveMagicDisposition(scores, archetype);
  const metatypeHint = deriveMetatypeHint(scores, archetype);

  return {
    edition: 'sr2',
    archetype,
    magicDisposition,
    ...(metatypeHint ? { metatypeHint } : {}),
    seed,
  };
}
