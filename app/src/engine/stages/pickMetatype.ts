import type { CharacterIntent, MetatypeId } from '../types';
import { childSeed, makeRng, weightedPick } from '../rng';
import archetypesData from '../../../../data/sr2/archetypes.json';

export function pickMetatype(intent: CharacterIntent): MetatypeId {
  if (intent.metatypeHint) return intent.metatypeHint;

  const rng = makeRng(childSeed(intent.seed, 'metatype'));
  const archetype = archetypesData.archetypes.find(a => a.id === intent.archetype)!;
  const preferred = (archetype.preferredMetatypes ?? ['human']) as MetatypeId[];

  // Non-human preferred metatypes drive the roll
  const nonHuman = preferred.filter(id => id !== 'human');
  if (nonHuman.length === 0) return 'human';

  // Roll against META_ROLL_CHANCE; human has implicit weight 3× each non-human
  const humanWeight    = nonHuman.length * 3;
  const nonHumanWeight = nonHuman.length;
  const total = humanWeight + nonHumanWeight;
  if (rng() * total < humanWeight) return 'human';

  // Pick which non-human — all preferred non-humans equally weighted
  return weightedPick(rng, nonHuman, nonHuman.map(() => 1));
}
