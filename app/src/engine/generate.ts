import type { Character, CharacterIntent, SkillRating } from './types';
import { pickMetatype }     from './stages/pickMetatype';
import { assignPriorities } from './stages/assignPriorities';
import { spendAttributes }  from './stages/spendAttributes';
import { spendSkills }      from './stages/spendSkills';
import { spendResources }   from './stages/spendResources';
import type { Loadout }     from './types';
import gearData             from '../../../data/sr2/gear.json';

// ── Weapon concentration validation ──────────────────────────────────────
// Maps concentration names that require a specific weapon type to the gear
// categories that satisfy that requirement.
const WEAPON_CONC_CATS: Record<string, string[]> = {
  'Pistols':           ['pistol'],
  'Rifles':            ['rifle'],
  'Submachine Guns':   ['smg'],
  'Light Machine Guns':['lmg'],
  'Edged Weapons':     ['meleeWeapon'],
  'Clubs':             ['meleeWeapon'],
  'Pole Arms/Staff':   ['meleeWeapon'],
  'Whips/Flails':      ['meleeWeapon'],
};

function ownedGearCategories(loadout: Loadout): Set<string> {
  return new Set(
    loadout.gear
      .map(g => gearData.gear.find(d => d.id === g.gearId)?.category)
      .filter((c): c is string => c !== undefined),
  );
}

function fixConcentrations(skills: SkillRating[], ownedCats: Set<string>): SkillRating[] {
  return skills.map(s => {
    if (!s.concentration) return s;
    const needed = WEAPON_CONC_CATS[s.concentration];
    if (!needed) return s;                          // no weapon requirement
    if (needed.some(c => ownedCats.has(c))) return s; // requirement met
    return { skillId: s.skillId, rating: s.rating }; // strip concentration + specialization
  });
}

// ── Generate ──────────────────────────────────────────────────────────────

export function generate(intent: CharacterIntent): Character {
  const metatype   = pickMetatype(intent);
  const priorities = assignPriorities(intent, metatype);
  const attributes = spendAttributes(intent, metatype, priorities);
  const rawSkills  = spendSkills(intent, priorities);
  const loadout    = spendResources(intent, priorities, attributes);

  const essenceCost = loadout.cyberware.reduce((s, cw) => s + cw.essenceCost, 0);
  attributes.essence = Math.max(0, parseFloat((6 - essenceCost).toFixed(2)));
  attributes.magic   = intent.magicDisposition !== 'mundane'
    ? Math.floor(attributes.essence)
    : 0;

  const skills    = fixConcentrations(rawSkills, ownedGearCategories(loadout));
  const startingCash = Math.floor(loadout.remainingNuyen / 10);
  const karmaPool    = metatype === 'human' ? 1 : 2;

  return { intent, priorities, metatype, attributes, skills, loadout, karmaPool, startingCash };
}

// ── Reroll ────────────────────────────────────────────────────────────────

export type RerollSection = 'metatype' | 'priorities' | 'attributes' | 'skills' | 'resources' | 'all';

export function reroll(character: Character, section: RerollSection, newSeed: number): Character {
  // 'all' / metatype / priorities / attributes: full regen with a fresh master seed.
  // (Attribute scores can't be rerolled in isolation — priority assignment determines
  // the attribute pool, so rerolling attributes implies rerolling priorities.)
  if (section === 'all' || section === 'metatype' || section === 'priorities' || section === 'attributes') {
    return generate({ ...character.intent, seed: newSeed, seedOverrides: undefined });
  }

  // Partial rerolls: keep the master seed (so name/demographics/contacts/etc. stay
  // stable) and only override the sub-seed for the section being rerolled.
  const overrides = { ...(character.intent.seedOverrides ?? {}), [section]: newSeed };
  const newIntent: CharacterIntent = { ...character.intent, seedOverrides: overrides };

  switch (section) {
    case 'skills': {
      const rawSkills = spendSkills(newIntent, character.priorities);
      const skills    = fixConcentrations(rawSkills, ownedGearCategories(character.loadout));
      return { ...character, intent: newIntent, skills };
    }

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
