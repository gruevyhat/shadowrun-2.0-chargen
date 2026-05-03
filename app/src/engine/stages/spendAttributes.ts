import type { AttributeBlock, AttributeKey, CharacterIntent, MetatypeId, PriorityAssignment } from '../types';
import { childSeed, makeRng } from '../rng';
import archetypesData  from '../../../../data/sr2/archetypes.json';
import metatypesData   from '../../../../data/sr2/metatypes.json';
import priorityData    from '../../../../data/sr2/priority_table.json';

const PHYSICAL_MENTAL: AttributeKey[] = [
  'body', 'quickness', 'strength', 'charisma', 'intelligence', 'willpower',
];

export function spendAttributes(
  intent: CharacterIntent,
  metatype: MetatypeId,
  priorities: PriorityAssignment,
): AttributeBlock {
  const rng = makeRng(childSeed(intent.seed, 'attributes'));

  const meta      = metatypesData.metatypes.find(m => m.id === metatype)!;
  const priRow    = priorityData.priorities.find(p => p.level === priorities.attributes)!;
  const archetype = archetypesData.archetypes.find(a => a.id === intent.archetype)!;

  let pool = priRow.attributes.points;

  // Racial maximums
  const racialMax = meta.racialMaximums as Record<AttributeKey, number>;

  // Start all attributes at 1 (minimum)
  const attrs = Object.fromEntries(PHYSICAL_MENTAL.map(k => [k, 1])) as Record<AttributeKey, number>;
  pool -= PHYSICAL_MENTAL.length; // 6 points used for minimums

  // Archetype attribute weights
  const rawWeights = archetype.attributeWeights as Record<AttributeKey, number>;

  // Distribute pool weighted by archetype, respecting racial maximums
  // Use a greedy approach with jitter: sort by weight desc, assign points
  // proportionally, then distribute remainder randomly weighted.
  const targets: Record<AttributeKey, number> = {} as Record<AttributeKey, number>;
  const totalWeight = PHYSICAL_MENTAL.reduce((s, k) => s + rawWeights[k], 0);

  // Calculate target allocations (above the minimum of 1)
  let allocated = 0;
  for (const key of PHYSICAL_MENTAL) {
    const ideal = Math.floor((rawWeights[key] / totalWeight) * pool);
    const max   = racialMax[key] - 1; // already have 1
    targets[key] = Math.min(ideal, max);
    allocated += targets[key];
  }

  // Distribute leftover points randomly, weighted by remaining capacity
  let leftover = pool - allocated;
  const maxAttempts = leftover * 10;
  let attempts = 0;
  while (leftover > 0 && attempts++ < maxAttempts) {
    const capacities = PHYSICAL_MENTAL.map(k => Math.max(0, racialMax[k] - 1 - targets[k]));
    const totalCap = capacities.reduce((a, b) => a + b, 0);
    if (totalCap === 0) break;
    // Weight remaining capacity × archetype weight
    const weights = PHYSICAL_MENTAL.map((k, i) => capacities[i] * rawWeights[k]);
    const r = rng() * weights.reduce((a, b) => a + b, 0);
    let cum = 0;
    for (let i = 0; i < PHYSICAL_MENTAL.length; i++) {
      cum += weights[i];
      if (r <= cum) {
        targets[PHYSICAL_MENTAL[i]]++;
        leftover--;
        break;
      }
    }
  }

  // Apply to base + racial mods
  const mods = meta.attributeMods as Partial<Record<AttributeKey, number>>;
  for (const key of PHYSICAL_MENTAL) {
    attrs[key] = Math.min(
      racialMax[key],
      Math.max(1, 1 + targets[key] + (mods[key] ?? 0)),
    );
  }

  // Derive special attributes
  const essence = 6.0; // reduced later by cyberware
  const magic   = intent.magicDisposition !== 'mundane' ? Math.floor(essence) : 0;
  const reaction = Math.floor((attrs.quickness + attrs.intelligence) / 2);

  return { ...attrs, essence, magic, reaction };
}
