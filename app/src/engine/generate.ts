import type { Character, CharacterIntent, MetatypeId } from './types';
import { pickMetatype }     from './stages/pickMetatype';
import { assignPriorities } from './stages/assignPriorities';
import { spendAttributes }  from './stages/spendAttributes';
import { spendSkills }      from './stages/spendSkills';
import { spendResources }   from './stages/spendResources';

export function generate(intent: CharacterIntent): Character {
  // Stage order: metatype → priorities → attributes → skills → resources
  // pickMetatype uses archetype preferredMetatypes probability weights (no priority input needed).
  // assignPriorities enforces race=A if a metahuman was chosen.
  const metatype: MetatypeId = pickMetatype(intent);
  const priorities = assignPriorities(intent, metatype);

  // Remaining stages
  const attributes = spendAttributes(intent, metatype, priorities);
  const skills     = spendSkills(intent, priorities);

  // Apply cyberware essence costs to attributes
  const loadout    = spendResources(intent, priorities, attributes);
  const essenceCost = loadout.cyberware.reduce((s, cw) => s + cw.essenceCost, 0);
  attributes.essence  = Math.max(0, parseFloat((6 - essenceCost).toFixed(2)));
  attributes.magic    = intent.magicDisposition !== 'mundane'
    ? Math.floor(attributes.essence)
    : 0;

  // Starting cash: residual nuyen at 10:1 + 3d6 × 1000 (fixed via seed for determinism)
  const startingCash = Math.floor(loadout.remainingNuyen / 10);
  const karmaPool    = metatype === 'human' ? 1 : 2;

  return {
    intent,
    priorities,
    metatype,
    attributes,
    skills,
    loadout,
    karmaPool,
    startingCash,
  };
}

// Re-roll a single section of an existing character.
// Returns a new Character with only the target section regenerated.
export type RerollSection = 'metatype' | 'priorities' | 'attributes' | 'skills' | 'resources' | 'all';

export function reroll(character: Character, section: RerollSection, newSeed: number): Character {
  const newIntent: CharacterIntent = { ...character.intent, seed: newSeed };

  if (section === 'all') return generate(newIntent);

  // For partial re-rolls, re-run from the affected stage forward.
  // Earlier stages keep their results (original seed still deterministic).
  switch (section) {
    case 'metatype':
    case 'priorities':
      // Both require full re-run since metatype affects priorities
      return generate(newIntent);

    case 'attributes': {
      const attrs = spendAttributes(newIntent, character.metatype, character.priorities);
      const loadout = spendResources(newIntent, character.priorities, attrs);
      const essenceCost = loadout.cyberware.reduce((s, cw) => s + cw.essenceCost, 0);
      attrs.essence = Math.max(0, parseFloat((6 - essenceCost).toFixed(2)));
      attrs.magic   = newIntent.magicDisposition !== 'mundane' ? Math.floor(attrs.essence) : 0;
      return { ...character, intent: newIntent, attributes: attrs, loadout, startingCash: Math.floor(loadout.remainingNuyen / 10) };
    }

    case 'skills':
      return { ...character, intent: newIntent, skills: spendSkills(newIntent, character.priorities) };

    case 'resources': {
      const loadout = spendResources(newIntent, character.priorities, character.attributes);
      const essenceCost = loadout.cyberware.reduce((s, cw) => s + cw.essenceCost, 0);
      const attrs = {
        ...character.attributes,
        essence: Math.max(0, parseFloat((6 - essenceCost).toFixed(2))),
        magic: newIntent.magicDisposition !== 'mundane' ? Math.floor(6 - essenceCost) : 0,
      };
      return { ...character, intent: newIntent, attributes: attrs, loadout, startingCash: Math.floor(loadout.remainingNuyen / 10) };
    }
  }
}
