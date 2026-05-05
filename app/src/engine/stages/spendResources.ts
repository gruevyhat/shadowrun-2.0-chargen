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
  const rng = makeRng(intent.seedOverrides?.resources ?? childSeed(intent.seed, 'resources'));

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

    // Fall through to shared gear path — cyberCore/cyberExtras are empty for mage archetypes
  }

  // ── Cyberware (mundane / adept / full-magic archetypes) ───────────────────
  const cyberPool = cyberwareData.cyberware;

  // Archetype core picks (always considered first) and an extras pool (randomized)
  const cyberCore: Record<string, string[][]> = {
    // Each inner array is a tier of alternatives — one is randomly chosen per tier
    street_samurai: [
      ['wired_reflexes_1', 'wired_reflexes_2'],
      ['smartlink'],
      ['cybereyes'],
    ],
    physical_adept: [['cybereyes']],
    decker:         [['datajack'], ['chipjack', 'cybereyes']],
    rigger:         [['vehicle_control_rig_1', 'vehicle_control_rig_2'], ['datajack'], ['cybereyes']],
    face:           [], combat_mage: [], investigator: [], mage: [], shaman: [],
  };

  const cyberExtras: Record<string, string[]> = {
    street_samurai: ['cyberears', 'low_light_vision', 'thermographic_vision', 'dermal_plating_1', 'dermal_plating_2', 'muscle_replacement_1', 'muscle_replacement_2', 'hand_razors', 'spur'],
    physical_adept: ['low_light_vision', 'thermographic_vision'],
    decker:         ['cybereyes', 'cyberears', 'radio_receive', 'low_light_vision'],
    rigger:         ['cyberears', 'low_light_vision', 'radio_twoway'],
    face:           ['cybereyes', 'low_light_vision'],
    combat_mage:    [], investigator: ['cybereyes', 'low_light_vision'], mage: [], shaman: [],
  };

  const tryBuy = (id: string): boolean => {
    const item = cyberPool.find(c => c.id === id);
    if (!item) return false;
    if (cyberware.find(cw => cw.cyberwareId === id)) return false;
    if (nuyen < item.costNuyen) return false;
    const newEssence = essenceLeft - item.essenceCost;
    if (newEssence < MIN_ESSENCE) return false;
    if (intent.magicDisposition === 'adept' && newEssence < attributes.magic) return false;
    cyberware.push({ cyberwareId: item.id, essenceCost: item.essenceCost, costNuyen: item.costNuyen });
    nuyen -= item.costNuyen;
    essenceLeft = newEssence;
    return true;
  };

  // Core picks: one random alternative per tier
  for (const tier of cyberCore[intent.archetype] ?? []) {
    if (tier.length === 0) continue;
    const pick = tier[randIdx(rng, tier.length)];
    tryBuy(pick);
  }

  // Extras: shuffle and try to buy a random subset (0–3 picks)
  const extras = [...(cyberExtras[intent.archetype] ?? [])];
  for (let i = extras.length - 1; i > 0; i--) {
    const j = randIdx(rng, i + 1);
    [extras[i], extras[j]] = [extras[j], extras[i]];
  }
  const extraTarget = randIdx(rng, 4); // 0–3 extras
  let extrasBought = 0;
  for (const id of extras) {
    if (extrasBought >= extraTarget) break;
    if (tryBuy(id)) extrasBought++;
  }

  // ── Gear ──────────────────────────────────────────────────────────────────
  // Must-have lifestyle (fixed by archetype)
  const MIDDLE_LIFESTYLE = new Set(['face', 'investigator', 'mage', 'shaman', 'combat_mage']);
  const lifestyleId = MIDDLE_LIFESTYLE.has(intent.archetype) ? 'lifestyle_middle' : 'lifestyle_low';
  const lifestyle = gearData.gear.find(g => g.id === lifestyleId);
  if (lifestyle && nuyen >= lifestyle.costNuyen) {
    gear.push({ gearId: lifestyle.id, costNuyen: lifestyle.costNuyen, quantity: 1 });
    nuyen -= lifestyle.costNuyen;
  }

  // Must-have armor: random pick from affordable street-grade armor so rerolls vary.
  // Heavy armor is excluded (purchased as tagged gear when affordable).
  const armorPool = gearData.gear.filter(g =>
    g.category === 'armor' &&
    !g.id.startsWith('heavy_armor') &&
    nuyen >= g.costNuyen,
  );
  if (armorPool.length > 0) {
    const armor = armorPool[randIdx(rng, armorPool.length)];
    gear.push({ gearId: armor.id, costNuyen: armor.costNuyen, quantity: 1 });
    nuyen -= armor.costNuyen;
  }

  // Tagged gear: pick items matching archetype gear tags.
  // Multiple armor pieces are fine; duplicate ballistic ratings are not.
  const ownedBallistic = new Set<number>(
    gear
      .map(g => gearData.gear.find(d => d.id === g.gearId))
      .filter((d): d is (typeof gearData.gear)[0] => d?.category === 'armor' && d.armorBallistic != null)
      .map(d => d.armorBallistic as number),
  );

  // Group affordable tagged gear by category so each reroll can vary the pick
  // within each category (different vehicle, different SMG, etc.).
  const byCat: Record<string, typeof gearData.gear> = {};
  for (const g of gearData.gear) {
    if (!gearTags.includes(g.category)) continue;
    if (gear.find(existing => existing.gearId === g.id)) continue;
    (byCat[g.category] ??= []).push(g);
  }

  let gearCount = 0;
  // Iterate categories in a randomized order so budget allocation also varies
  const cats = Object.keys(byCat);
  for (let i = cats.length - 1; i > 0; i--) {
    const j = randIdx(rng, i + 1);
    [cats[i], cats[j]] = [cats[j], cats[i]];
  }

  for (const cat of cats) {
    if (gearCount >= 5) break;
    // Up to 2 picks per category (e.g. two firearms), with weighted random toward
    // costlier items so big-ticket categories aren't dominated by cheap fillers.
    const maxPerCat = cat === 'vehicle' ? 1 : 2;
    let perCatBought = 0;
    while (perCatBought < maxPerCat && gearCount < 5) {
      const pool = byCat[cat].filter(item => {
        if (nuyen < item.costNuyen) return false;
        if (gear.find(g => g.gearId === item.id)) return false;
        const bal = (item as { armorBallistic?: number }).armorBallistic;
        if (item.category === 'armor' && bal != null && ownedBallistic.has(bal)) return false;
        return true;
      });
      if (pool.length === 0) break;
      const weights = pool.map(p => Math.max(1, p.costNuyen));
      const pick = weightedPick(rng, pool, weights);
      gear.push({ gearId: pick.id, costNuyen: pick.costNuyen, quantity: 1 });
      nuyen -= pick.costNuyen;
      gearCount++;
      perCatBought++;
      const bal = (pick as { armorBallistic?: number }).armorBallistic;
      if (pick.category === 'armor' && bal != null) ownedBallistic.add(bal);
    }
  }

  // ── Random misc items (1d6) ─────────────────────────────────────────────
  const miscPool = gearData.gear.filter(g => g.category === 'misc');
  if (miscPool.length > 0) {
    const count = randIdx(rng, 6) + 1;
    const available = [...miscPool];
    for (let i = 0; i < count && available.length > 0; i++) {
      const idx = randIdx(rng, available.length);
      const item = available.splice(idx, 1)[0];
      if (nuyen >= item.costNuyen && !gear.find(g => g.gearId === item.id)) {
        gear.push({ gearId: item.id, costNuyen: item.costNuyen, quantity: 1 });
        nuyen -= item.costNuyen;
      }
    }
  }

  // ── Guaranteed weapon ────────────────────────────────────────────────────
  // Every character must carry at least one weapon. Deckers/riggers have no
  // weapon gearTags, and adepts can run out of budget before meleeWeapon is
  // reached, so we enforce it here after all other spending.
  const WEAPON_CATS_SET = new Set(['pistol','smg','rifle','lmg','shotgun','meleeWeapon','projectileWeapon','explosive']);
  const hasWeapon = gear.some(g => {
    const d = gearData.gear.find(item => item.id === g.gearId);
    return d != null && WEAPON_CATS_SET.has(d.category);
  });
  if (!hasWeapon) {
    const pistolPool = gearData.gear.filter(g => g.category === 'pistol' && nuyen >= g.costNuyen);
    const pool = pistolPool.length > 0
      ? pistolPool
      : gearData.gear.filter(g => WEAPON_CATS_SET.has(g.category) && nuyen >= g.costNuyen);
    if (pool.length > 0) {
      const weights = pool.map(p => Math.max(1, p.costNuyen));
      const pick = weightedPick(rng, pool, weights);
      gear.push({ gearId: pick.id, costNuyen: pick.costNuyen, quantity: 1 });
      nuyen -= pick.costNuyen;
    }
  }

  // ── Extra contacts (2500¥ each, archetype-capped) ────────────────────────
  const ARCHETYPE_MAX_CONTACTS: Record<string, number> = {
    face:           4,
    investigator:   3,
    decker:         2,
    mage:           0,
    shaman:         0,
    street_samurai: 1,
    physical_adept: 1,
    rigger:         1,
    combat_mage:    0,
  };
  const CONTACT_COST   = 2500;
  const maxContacts    = ARCHETYPE_MAX_CONTACTS[intent.archetype] ?? 1;
  let purchasedContactCount = 0;
  while (nuyen >= CONTACT_COST && purchasedContactCount < maxContacts) {
    nuyen -= CONTACT_COST;
    purchasedContactCount++;
  }

  return { cyberware, gear, spells, remainingNuyen: nuyen, remainingForcePoints: forcePoints, purchasedContactCount };
}

function randIdx(rng: () => number, len: number): number {
  return Math.floor(rng() * len);
}
