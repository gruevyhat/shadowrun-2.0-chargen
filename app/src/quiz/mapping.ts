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

// Archetype profiles. Values chosen to create clear separations while allowing
// overlap — e.g. full-magic archetypes all go awakened but differ on other axes.
const ARCHETYPE_VECTORS: Record<ArchetypeId, AxisVector> = {
  //                              W/W   S/C   I/E   R/O   A/M   H/M
  bodyguard:            [ -3,  -2,  -4,   1,   4,  -1 ],
  combat_mage:          [ -2,   3,  -4,   0,  -5,   0 ],
  decker:               [ -4,   5,   2,   3,   4,   1 ],  // empath +2 (solitary/nonviolent)
  detective:            [  0,   2,   3,   4,   4,   0 ],
  former_company_man:   [ -3,   0,  -3,   2,   4,   0 ],
  former_wage_mage:     [  0,   4,   2,   2,  -5,   0 ],
  gang_member:          [  3,  -4,  -1,  -3,   4,   2 ],
  mercenary:            [ -3,  -3,  -4,   0,   4,   1 ],
  rigger:               [ -3,   4,  -2,   3,   4,   1 ],  // iron -2 (tactical, not combat)
  shaman:               [  4,  -3,   3,  -1,  -5,   3 ],  // strong anti-streetwise, strong meta
  street_mage:          [  2,   1,   2,  -2,  -5,   0 ],
  street_samurai:       [ -5,  -2,  -5,  -1,   4,   1 ],
  street_shaman:        [  2,  -3,   2,  -2,  -5,   0 ],  // urban: streetwise -3 (street-smart, not academic)
  tribesman:            [  4,  -4,   0,  -2,   4,   1 ],
};

const FULL_MAGIC_ARCHETYPES = new Set<ArchetypeId>([
  'combat_mage', 'former_wage_mage', 'shaman', 'street_mage', 'street_shaman',
]);

// Magic disposition: full_magic for the five magic archetypes, mundane otherwise.
function deriveMagicDisposition(_scores: AxisScores, archetype: ArchetypeId): MagicDisposition {
  return FULL_MAGIC_ARCHETYPES.has(archetype) ? 'full_magic' : 'mundane';
}

// Metatype hint: driven by human_metahuman score and archetype preference.
function deriveMetatypeHint(scores: AxisScores, archetype: ArchetypeId): MetatypeId | undefined {
  const hm = scores.human_metahuman;
  if (hm <= -2) return undefined; // human
  if (hm >= 2) {
    // Strong metahuman lean — pick from archetype-appropriate metatypes
    const preferences: Partial<Record<ArchetypeId, MetatypeId>> = {
      street_samurai: 'ork',
      bodyguard:      'ork',
      gang_member:    'ork',
      mercenary:      'dwarf',
      rigger:         'dwarf',
      decker:         'elf',
      shaman:         'elf',
      street_shaman:  'elf',
    };
    return preferences[archetype]; // undefined for combat_mage etc → stays human
  }
  return undefined;
}

// Score all archetypes and return the best match.
function bestArchetype(scores: AxisScores): ArchetypeId {
  const scoreVec = AXIS_ORDER.map(k => scores[k]);

  let best: ArchetypeId = 'mercenary';
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
