import type { AttributeBlock, CharacterIntent, Loadout, PriorityAssignment } from '../types';
import { childSeed, makeRng, weightedPick } from '../rng';
import archetypesData  from '../../../../data/sr2/archetypes.json';
import priorityData    from '../../../../data/sr2/priority_table.json';
import gearData        from '../../../../data/sr2/gear.json';
import cyberwareData   from '../../../../data/sr2/cyberware.json';
import spellsData      from '../../../../data/sr2/spells.json';

const MAX_ESSENCE = 6.0;
const MIN_ESSENCE = 0.1; // never actually reach 0

export function spendResources(
  intent: CharacterIntent,
  priorities: PriorityAssignment,
  attributes: AttributeBlock,
): Loadout {
  const rng = makeRng(childSeed(intent.seed, 'resources'));

  const archetype = archetypesData.archetypes.find(a => a.id === intent.archetype)!;
  const priRow    = priorityData.priorities.find(p => p.level === priorities.resources)!;
  const gearTags  = archetype.gearTags as string[];

  let nuyen       = priRow.resources.nuyen;
  let forcePoints = priRow.resources.forcePoints;
  let essenceLeft = MAX_ESSENCE;

  const cyberware: Loadout['cyberware'] = [];
  const gear:      Loadout['gear']      = [];
  const spells:    Loadout['spells']    = [];

  // ── Spells (full magicians only — adepts use magic for physical powers, not spells) ──
  if (intent.magicDisposition === 'full_magic') {
    const magicCategory = intent.archetype === 'shaman' ? 'mana' : null; // shamans prefer mana
    const combatSpells  = spellsData.spells.filter(s => s.category === 'combat');
    const detectSpells  = spellsData.spells.filter(s => s.category === 'detection');
    const otherSpells   = spellsData.spells.filter(s => !['combat', 'detection'].includes(s.category));

    // Pick 4–6 spells depending on Force Points available
    const picks: typeof spellsData.spells = [];
    // Always get 2 combat spells
    for (let i = 0; i < 2 && combatSpells.length > 0; i++) {
      const candidates = combatSpells.filter(s => !picks.includes(s));
      if (candidates.length === 0) break;
      // Shamans prefer mana spells
      const weights = candidates.map(s =>
        magicCategory === null ? 1 : s.type === magicCategory ? 3 : 1,
      );
      picks.push(weightedPick(rng, candidates, weights));
    }
    // 1–2 detection spells
    for (let i = 0; i < 2 && detectSpells.length > 0; i++) {
      const candidates = detectSpells.filter(s => !picks.includes(s));
      if (candidates.length === 0) break;
      picks.push(candidates[randIdx(rng, candidates.length)]);
    }
    // Fill to 5 with other spells
    while (picks.length < 5 && otherSpells.length > 0) {
      const candidates = otherSpells.filter(s => !picks.includes(s));
      if (candidates.length === 0) break;
      picks.push(candidates[randIdx(rng, candidates.length)]);
    }

    // Assign force ratings: spread Force Points, max 6 per spell
    let fp = forcePoints;
    const perSpell = Math.min(6, Math.floor(fp / picks.length));
    for (const spell of picks) {
      const force = Math.min(6, Math.max(1, perSpell));
      spells.push({ spellId: spell.id, force });
      fp -= force;
    }
    forcePoints = Math.max(0, fp);

    // Full magicians skip cyberware — buy lifestyle, armor, sidearm and return
    const lifestyle = gearData.gear.find(g => g.id === 'lifestyle_middle');
    if (lifestyle && nuyen >= lifestyle.costNuyen) {
      gear.push({ gearId: lifestyle.id, costNuyen: lifestyle.costNuyen, quantity: 1 });
      nuyen -= lifestyle.costNuyen;
    }
    const armor = gearData.gear.find(g => g.id === 'armor_clothing');
    if (armor && nuyen >= armor.costNuyen) {
      gear.push({ gearId: armor.id, costNuyen: armor.costNuyen, quantity: 1 });
      nuyen -= armor.costNuyen;
    }
    const pistol = gearData.gear.find(g => g.id === 'ruger_super_warhawk');
    if (pistol && nuyen >= pistol.costNuyen) {
      gear.push({ gearId: pistol.id, costNuyen: pistol.costNuyen, quantity: 1 });
      nuyen -= pistol.costNuyen;
    }
    return { cyberware, gear, spells, remainingNuyen: nuyen, remainingForcePoints: forcePoints };
  }

  // ── Cyberware (mundane / adept archetypes) ────────────────────────────────
  const cyberPool = cyberwareData.cyberware;

  // Archetype-specific priority cyberware
  const cyberPriority: Record<string, string[]> = {
    street_samurai: ['wired_reflexes_2', 'smartlink', 'cybereyes'],
    physical_adept: ['cybereyes'],  // adepts avoid heavy cyberware
    decker:         ['datajack'],
    rigger:         ['vehicle_control_rig_2', 'datajack', 'cybereyes'],
    face:           [],
    combat_mage:    [],
    investigator:   [],
    mage:           [],
    shaman:         [],
  };

  const priorityCyber = cyberPriority[intent.archetype] ?? [];

  for (const id of priorityCyber) {
    const item = cyberPool.find(c => c.id === id);
    if (!item) continue;
    if (nuyen < item.costNuyen) continue;
    const newEssence = essenceLeft - item.essenceCost;
    if (newEssence < MIN_ESSENCE) continue;
    // Adepts: keep essence ≥ magic attribute
    if (intent.magicDisposition === 'adept' && newEssence < attributes.magic) continue;
    cyberware.push({ cyberwareId: item.id, essenceCost: item.essenceCost, costNuyen: item.costNuyen });
    nuyen -= item.costNuyen;
    essenceLeft = newEssence;
  }

  // ── Gear ──────────────────────────────────────────────────────────────────
  // Must-have: lifestyle + armor + sidearm
  const mustHave = ['lifestyle_low', 'armor_jacket'];
  if (intent.archetype === 'face' || intent.archetype === 'investigator') {
    mustHave[0] = 'lifestyle_middle';
  }

  for (const id of mustHave) {
    const item = gearData.gear.find(g => g.id === id);
    if (item && nuyen >= item.costNuyen) {
      gear.push({ gearId: item.id, costNuyen: item.costNuyen, quantity: 1 });
      nuyen -= item.costNuyen;
    }
  }

  // Tagged gear: pick items matching archetype gear tags
  const tagged = gearData.gear.filter(g =>
    gearTags.includes(g.category) &&
    !gear.find(existing => existing.gearId === g.id),
  );

  // Sort by cost descending, buy what we can afford (up to 5 items)
  tagged.sort((a, b) => b.costNuyen - a.costNuyen);
  let gearCount = 0;
  for (const item of tagged) {
    if (gearCount >= 5) break;
    if (nuyen < item.costNuyen) continue;
    gear.push({ gearId: item.id, costNuyen: item.costNuyen, quantity: 1 });
    nuyen -= item.costNuyen;
    gearCount++;
  }

  return { cyberware, gear, spells, remainingNuyen: nuyen, remainingForcePoints: forcePoints };
}

function randIdx(rng: () => number, len: number): number {
  return Math.floor(rng() * len);
}
