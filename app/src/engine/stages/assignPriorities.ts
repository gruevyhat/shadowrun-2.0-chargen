import type { CharacterIntent, PriorityAssignment, PriorityCategory, PriorityLevel } from '../types';
import { childSeed, makeRng, weightedPick } from '../rng';
import archetypesData from '../../../../data/sr2/archetypes.json';

const LEVELS: PriorityLevel[] = ['A', 'B', 'C', 'D', 'E'];
const CATEGORIES: PriorityCategory[] = ['race', 'magic', 'attributes', 'skills', 'resources'];

// Magic priority constraints by disposition + metatype
function magicConstraints(
  disposition: CharacterIntent['magicDisposition'],
  metatypeId: string,
): PriorityLevel[] {
  const isMeta = metatypeId !== 'human';
  if (disposition === 'full_magic') return isMeta ? ['B'] : ['A'];
  if (disposition === 'adept')      return isMeta ? ['C'] : ['B'];
  return ['C', 'D', 'E']; // mundane: magic priority wasted on A or B
}

// Race priority constraints
// SR2: humans take E (the lowest), metahumans take A. Higher Race for a
// human gives nothing back — it just burns a slot that could buy attributes,
// skills, or resources.
function raceConstraints(metatypeId: string): PriorityLevel[] {
  return metatypeId !== 'human' ? ['A'] : ['E'];
}

export function assignPriorities(
  intent: CharacterIntent,
  resolvedMetatype: string,
): PriorityAssignment {
  const rng = makeRng(childSeed(intent.seed, 'priorities'));

  const archetype = archetypesData.archetypes.find(a => a.id === intent.archetype)!;
  const biasMap   = archetype.priorityBias as Record<PriorityCategory, number>;

  // Hard constraints first
  const raceLevels  = raceConstraints(resolvedMetatype);
  const magicLevels = magicConstraints(intent.magicDisposition, resolvedMetatype);

  // Assign categories one at a time, tracking which levels are still available.
  // Order: race → magic → remaining three by priority bias (highest bias first)
  const result = {} as PriorityAssignment;
  const available = new Set<PriorityLevel>(LEVELS);

  function assign(cat: PriorityCategory, allowed: PriorityLevel[]) {
    const candidates = allowed.filter(l => available.has(l));
    if (candidates.length === 0) {
      // Fallback: pick any available
      const fallback = [...available];
      result[cat] = fallback[0];
      available.delete(fallback[0]);
    } else if (candidates.length === 1) {
      result[cat] = candidates[0];
      available.delete(candidates[0]);
    } else {
      // Weight by bias value: higher bias = prefer higher priority level (A=4 pts, E=0)
      const levelScore: Record<PriorityLevel, number> = { A: 4, B: 3, C: 2, D: 1, E: 0 };
      const bias = biasMap[cat];
      const weights = candidates.map(l => {
        const proximity = 5 - Math.abs(levelScore[l] - bias);
        return Math.max(0.1, proximity);
      });
      const chosen = weightedPick(rng, candidates, weights);
      result[cat] = chosen;
      available.delete(chosen);
    }
  }

  // Assign most-constrained first to avoid collision (e.g. human adept needs magic=B,
  // race must not grab B before magic gets its turn).
  const constrained = [
    { cat: 'magic' as PriorityCategory, allowed: magicLevels },
    { cat: 'race'  as PriorityCategory, allowed: raceLevels  },
  ].sort((a, b) => a.allowed.length - b.allowed.length);
  for (const { cat, allowed } of constrained) assign(cat, allowed);

  // Remaining three in order of descending bias
  const remaining: PriorityCategory[] = ['attributes', 'skills', 'resources'];
  remaining.sort((a, b) => biasMap[b] - biasMap[a]);
  for (const cat of remaining) {
    assign(cat, [...available]);
  }

  // Sanity: ensure all categories assigned
  for (const cat of CATEGORIES) {
    if (!result[cat]) throw new Error(`Priority not assigned for ${cat}`);
  }

  return result;
}
