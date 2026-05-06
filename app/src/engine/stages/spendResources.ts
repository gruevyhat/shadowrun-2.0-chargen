import type { AttributeBlock, CharacterIntent, Loadout, PriorityAssignment, SkillRating } from '../types';
import { childSeed, makeRng, weightedPick } from '../rng';
import archetypesData  from '../../../../data/sr2/archetypes.json';
import priorityData    from '../../../../data/sr2/priority_table.json';
import gearData        from '../../../../data/sr2/gear.json';
import cyberwareData   from '../../../../data/sr2/cyberware.json';
import spellsData      from '../../../../data/sr2/spells.json';
import adeptPowersData from '../../../../data/sr2/adept_powers.json';

const MAX_ESSENCE = 6.0;
const MIN_ESSENCE = 0.1; // never actually reach 0

// Maps a firearms/armed_combat concentration name to a gear category
const CONC_TO_WEAPON_CAT: Record<string, string> = {
  'Pistols':           'pistol',
  'Rifles':            'rifle',
  'Submachine Guns':   'smg',
  'Light Machine Guns':'lmg',
  'Edged Weapons':     'meleeWeapon',
  'Clubs':             'meleeWeapon',
  'Pole Arms/Staff':   'meleeWeapon',
  'Whips/Flails':      'meleeWeapon',
};

export function spendResources(
  intent: CharacterIntent,
  priorities: PriorityAssignment,
  attributes: AttributeBlock,
  skills: SkillRating[] = [],
): Loadout {
  const rng = makeRng(intent.seedOverrides?.resources ?? childSeed(intent.seed, 'resources'));

  const archetype = archetypesData.archetypes.find(a => a.id === intent.archetype)!;
  const priRow    = priorityData.priorities.find(p => p.level === priorities.resources)!;
  const gearTags  = archetype.gearTags as string[];

  let nuyen       = priRow.resources.nuyen;
  let forcePoints = priRow.resources.forcePoints;
  let essenceLeft = MAX_ESSENCE;

  const cyberware:   Loadout['cyberware']   = [];
  const gear:        Loadout['gear']        = [];
  const spells:      Loadout['spells']      = [];
  const adeptPowers: Loadout['adeptPowers'] = [];

  // ── Spells (full magicians only — adepts use magic for physical powers, not spells) ──
  if (intent.magicDisposition === 'full_magic') {
    const SHAMAN_ARCHETYPES  = new Set(['shaman', 'street_shaman']);
    const COMBAT_MAGE        = intent.archetype === 'combat_mage';
    const magicCategory      = SHAMAN_ARCHETYPES.has(intent.archetype) ? 'mana' : null; // shamans prefer mana spells
    const combatSpells       = spellsData.spells.filter(s => s.category === 'combat');
    const detectSpells       = spellsData.spells.filter(s => s.category === 'detection');
    const otherSpells        = spellsData.spells.filter(s => !['combat', 'detection'].includes(s.category));

    // Combat mage: 3–4 combat spells, up to 8 total. Other mages: 2, up to 5 total.
    const combatSpellTarget = COMBAT_MAGE ? 3 + randIdx(rng, 2) : 2; // 3 or 4 for CM, 2 otherwise
    const totalSpellTarget  = COMBAT_MAGE ? 7 + randIdx(rng, 2) : 5; // 7 or 8 for CM, 5 otherwise

    const picks: typeof spellsData.spells = [];
    for (let i = 0; i < combatSpellTarget && combatSpells.length > 0; i++) {
      const candidates = combatSpells.filter(s => !picks.includes(s));
      if (candidates.length === 0) break;
      // Shamans prefer mana spells; combat mage uses both types equally
      const weights = candidates.map(s =>
        magicCategory === null ? 1 : s.type === magicCategory ? 3 : 1,
      );
      picks.push(weightedPick(rng, candidates, weights));
    }
    // Combat mage gets more detection spells (3); others get 1–2
    const detectTarget = COMBAT_MAGE ? 3 : 2;
    for (let i = 0; i < detectTarget && detectSpells.length > 0; i++) {
      const candidates = detectSpells.filter(s => !picks.includes(s));
      if (candidates.length === 0) break;
      picks.push(candidates[randIdx(rng, candidates.length)]);
    }
    // Fill to target with other spells
    while (picks.length < totalSpellTarget && otherSpells.length > 0) {
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

  // ── Adept powers (adept disposition only) ────────────────────────────────
  let magicPointsLeft = attributes.magic; // total = Magic attribute rating
  if (intent.magicDisposition === 'adept' && magicPointsLeft > 0) {
    const powersPool = adeptPowersData.adeptPowers;

    // Archetype can declare tiered core picks and an extras pool.
    // Cast via unknown because the JSON type doesn't carry adeptCorePowers.
    const archetypeAny = archetype as unknown as {
      adeptCorePowers?: string[][];
      adeptExtraPowers?: string[];
    };
    const coreTiers   = archetypeAny.adeptCorePowers  ?? [];
    const extraIds    = archetypeAny.adeptExtraPowers  ?? [];

    const tryBuyPower = (id: string): boolean => {
      if (adeptPowers.find(p => p.powerId === id)) return false; // already owned
      const def = powersPool.find(p => p.id === id);
      if (!def) return false;
      if (def.magicCost > magicPointsLeft + 0.001) return false;
      adeptPowers.push({ powerId: id, magicCost: def.magicCost });
      magicPointsLeft = parseFloat((magicPointsLeft - def.magicCost).toFixed(2));
      return true;
    };

    // Core picks: one random alternative per tier
    for (const tier of coreTiers) {
      if (tier.length === 0) continue;
      const pick = tier[randIdx(rng, tier.length)];
      tryBuyPower(pick);
    }

    // Extras: shuffle and buy until magic points run out (up to 4 extra picks)
    const shuffledExtras = [...extraIds];
    for (let i = shuffledExtras.length - 1; i > 0; i--) {
      const j = randIdx(rng, i + 1);
      [shuffledExtras[i], shuffledExtras[j]] = [shuffledExtras[j], shuffledExtras[i]];
    }
    const extraTarget = 2 + randIdx(rng, 3); // 2–4 extras
    let extrasBought  = 0;
    for (const id of shuffledExtras) {
      if (extrasBought >= extraTarget) break;
      if (tryBuyPower(id)) extrasBought++;
    }
  }

  // ── Cyberware (mundane / adept / full-magic archetypes) ───────────────────
  const cyberPool = cyberwareData.cyberware;

  // Archetype core picks (always considered first) and an extras pool (randomized)
  const cyberCore: Record<string, string[][]> = {
    // Each inner array is a tier of alternatives — one is randomly chosen per tier
    bodyguard:          [['wired_reflexes_1', 'wired_reflexes_2'], ['dermal_plating_1', 'dermal_plating_2'], ['smartlink']],
    combat_mage:        [['cybereyes']],
    decker:             [['datajack'], ['chipjack', 'cybereyes']],
    detective:          [],
    former_company_man: [['wired_reflexes_1', 'wired_reflexes_2'], ['datajack'], ['smartlink']],
    former_wage_mage:   [],
    gang_member:        [['hand_razors'], ['cybereyes']],
    mercenary:          [['wired_reflexes_1'], ['cybereyes']],
    physical_adept:     [], // adepts avoid cyberware to preserve Essence = Magic
    rigger:             [['vehicle_control_rig_1', 'vehicle_control_rig_2'], ['datajack'], ['cybereyes']],
    shaman:             [],
    street_mage:        [],
    street_samurai:     [['wired_reflexes_1', 'wired_reflexes_2'], ['smartlink'], ['cybereyes'], ['dermal_plating_1', 'dermal_plating_2']],
    street_shaman:      [],
    tribesman:          [],
  };

  const cyberExtras: Record<string, string[]> = {
    bodyguard:          ['radio_receive', 'cyberears', 'low_light_vision', 'thermographic_vision', 'muscle_replacement_1'],
    combat_mage:        ['low_light_vision', 'thermographic_vision'],
    decker:             ['cybereyes', 'cyberears', 'radio_receive', 'low_light_vision'],
    detective:          [],
    former_company_man: ['cyberears', 'low_light_vision', 'thermographic_vision', 'muscle_replacement_1'],
    former_wage_mage:   [],
    gang_member:        ['low_light_vision', 'thermographic_vision'],
    mercenary:          ['cyberears', 'low_light_vision', 'radio_receive', 'radio_twoway'],
    physical_adept:     [], // no cyberware
    rigger:             ['cyberears', 'low_light_vision', 'radio_twoway'],
    shaman:             [],
    street_mage:        [],
    street_samurai:     ['cyberears', 'low_light_vision', 'thermographic_vision', 'muscle_replacement_1', 'muscle_replacement_2', 'hand_razors', 'spur'],
    street_shaman:      [],
    tribesman:          [],
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
  const MIDDLE_LIFESTYLE = new Set(['bodyguard', 'combat_mage', 'decker', 'rigger', 'street_samurai', 'former_company_man']);
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

  // Reserve a small budget so the weapon guarantee (below) always has something to spend.
  // Without this, the tagged gear loop can exhaust nuyen before the weapon step runs.
  const WEAPON_CATS_SET = new Set(['pistol','smg','rifle','lmg','shotgun','meleeWeapon','projectileWeapon','explosive']);
  const alreadyHasWeapon = gear.some(g => {
    const d = gearData.gear.find(item => item.id === g.gearId);
    return d != null && WEAPON_CATS_SET.has(d.category);
  });
  const WEAPON_RESERVE = 500;
  const weaponReserve  = (!alreadyHasWeapon && nuyen > WEAPON_RESERVE) ? WEAPON_RESERVE : 0;
  nuyen -= weaponReserve;

  // Group affordable tagged gear by category so each reroll can vary the pick
  // within each category (different vehicle, different SMG, etc.).
  const byCat: Record<string, typeof gearData.gear> = {};
  for (const g of gearData.gear) {
    if (!gearTags.includes(g.category)) continue;
    if (gear.find(existing => existing.gearId === g.id)) continue;
    (byCat[g.category] ??= []).push(g);
  }

  // Preferred weapon categories derived from the character's skill concentrations.
  // These are moved to the front of the spending order so the budget reaches them.
  const preferredWeaponCats = new Set<string>();
  for (const sk of skills) {
    if ((sk.skillId === 'firearms' || sk.skillId === 'armed_combat') && sk.concentration) {
      const cat = CONC_TO_WEAPON_CAT[sk.concentration];
      if (cat) preferredWeaponCats.add(cat);
    }
  }

  let gearCount = 0;
  // Shuffle categories for variety, then move preferred weapon cats to front.
  const cats = Object.keys(byCat);
  for (let i = cats.length - 1; i > 0; i--) {
    const j = randIdx(rng, i + 1);
    [cats[i], cats[j]] = [cats[j], cats[i]];
  }
  if (preferredWeaponCats.size > 0) {
    const preferred = cats.filter(c => preferredWeaponCats.has(c));
    const rest      = cats.filter(c => !preferredWeaponCats.has(c));
    cats.splice(0, cats.length, ...preferred, ...rest);
  }

  for (const cat of cats) {
    if (gearCount >= 5) break;
    // Up to 2 picks per category; cyberdeck and vehicles are capped at 1.
    const maxPerCat = (cat === 'vehicle' || cat === 'cyberdeck') ? 1 : 2;
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
  nuyen += weaponReserve; // restore reserve — available only for weapon purchase
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
    bodyguard:          1,
    combat_mage:        0,
    decker:             1,
    detective:          4,
    former_company_man: 1,
    former_wage_mage:   0,
    gang_member:        2,
    mercenary:          1,
    physical_adept:     1,
    rigger:             1,
    shaman:             0,
    street_mage:        0,
    street_samurai:     1,
    street_shaman:      0,
    tribesman:          1,
  };
  const CONTACT_COST   = 2500;
  const maxContacts    = ARCHETYPE_MAX_CONTACTS[intent.archetype] ?? 1;
  let purchasedContactCount = 0;
  while (nuyen >= CONTACT_COST && purchasedContactCount < maxContacts) {
    nuyen -= CONTACT_COST;
    purchasedContactCount++;
  }

  return { cyberware, gear, spells, adeptPowers, remainingNuyen: nuyen, remainingForcePoints: forcePoints, remainingMagicPoints: magicPointsLeft, purchasedContactCount };
}

function randIdx(rng: () => number, len: number): number {
  return Math.floor(rng() * len);
}
