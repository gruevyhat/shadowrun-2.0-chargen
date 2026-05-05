import type { ArchetypeId, CharacterIntent, PriorityAssignment, SkillRating } from '../types';
import { childSeed, makeRng, randInt, weightedPick } from '../rng';
import archetypesData from '../../../../data/sr2/archetypes.json';
import skillsData     from '../../../../data/sr2/skills.json';
import priorityData   from '../../../../data/sr2/priority_table.json';

const MAX_SKILL_RATING = 6;

// Valid concentrations per skill, sourced from skills.json
const SKILL_CONCS: Record<string, string[]> = Object.fromEntries(
  skillsData.skills
    .filter(s => Array.isArray((s as { concentrations?: string[] }).concentrations))
    .map(s => [s.id, (s as { id: string; concentrations: string[] }).concentrations]),
);

// Per archetype: which skills receive a concentration, in priority order
const ARCHETYPE_CONC_SKILLS: Partial<Record<ArchetypeId, string[]>> = {
  street_samurai: ['firearms', 'armed_combat', 'athletics'],
  mage:           ['sorcery', 'conjuring'],
  shaman:         ['conjuring', 'sorcery'],
  physical_adept: ['unarmed_combat', 'athletics', 'stealth'],
  decker:         ['computer', 'electronics'],
  rigger:         ['car', 'rotor_craft', 'electronics'],
  face:           ['negotiation', 'etiquette', 'leadership'],
  combat_mage:    ['sorcery', 'firearms', 'athletics'],
  investigator:   ['interrogation', 'etiquette', 'stealth'],
};

// Per archetype: which skill also receives a specialization
const ARCHETYPE_SPEC_SKILL: Partial<Record<ArchetypeId, string>> = {
  street_samurai: 'firearms',
  mage:           'sorcery',
  shaman:         'conjuring',
  physical_adept: 'unarmed_combat',
  decker:         'computer',
  rigger:         'car',
  face:           'negotiation',
  combat_mage:    'sorcery',
  investigator:   'interrogation',
};

// Possible specialization labels per concentration name
const SPEC_OPTIONS: Record<string, string[]> = {
  'Pistols':               ['Semi-Auto', 'Heavy Pistol', 'Hold-Out', 'Ares Predator'],
  'Rifles':                ['Assault Rifle', 'Sniper', 'AK-97'],
  'Submachine Guns':       ['HK227', 'Ingram', 'Close-Quarters'],
  'Light Machine Guns':    ['Squad Support', 'Ingram Valiant'],
  'Grenade Launchers':     ['Under-Barrel', 'Standalone'],
  'Tasers':                ['Stun Setting', 'Lethal Setting'],
  'Edged Weapons':         ['Short Sword', 'Combat Knife', 'Monofilament'],
  'Clubs':                 ['Stun Baton', 'Sap', 'Reinforced'],
  'Pole Arms/Staff':       ['Bo Staff', 'Two-Handed'],
  'Whips/Flails':          ['Monofilament Whip', 'Chain'],
  'Subduing Combat':       ['Arm Locks', 'Choke Holds'],
  'Cyber Implant Weaponry':['Hand Blades', 'Bone Lacing'],
  'Martial Arts Style':    ['Striking', 'Grappling', 'Throws', 'Muay Thai'],
  'Running':               ['Sprint', 'Long Distance', 'Parkour'],
  'Climbing':              ['Rock Face', 'Urban Surfaces'],
  'Jumping':               ['Broad Jump', 'High Jump'],
  'Swimming':              ['Open Water', 'Underwater'],
  'Urban':                 ['Building Interiors', 'Rooftops', 'Crowds'],
  'Wilderness':            ['Forest', 'Arctic', 'Desert'],
  'Farmland':              ['Open Fields', 'Irrigation Systems'],
  'Elemental':             ['Fire Elemental', 'Earth Elemental', 'Air Elemental'],
  'Nature Spirit':         ['Lake Spirit', 'Forest Spirit', 'Wind Spirit', 'Mountain Spirit'],
  'Spellcasting':          ['Direct Combat', 'Indirect Combat', 'Detection', 'Manipulation'],
  'Ritual Sorcery':        ['Watcher', 'Mana Barrier', 'Ritual Ward'],
  'Software':              ['Intrusion Programs', 'IC Design', 'System Analysis'],
  'Hardware':              ['Circuit Design', 'Sensor Mods'],
  'Electronic Warfare':    ['Signal Jamming', 'Sensor Spoofing'],
  'Control Systems':       ['Vehicle Rigs', 'Security Systems', 'Remote Drones'],
  'Maglocks':              ['Rating 3', 'Rating 4'],
  'Remote Operation':      ['Ground Vehicles', 'Rotorcraft', 'Combat Maneuvering'],
  'Racing':                ['Street Circuit', 'Offroad', 'Pursuit'],
  'Passenger Vehicle':     ['Sedan', 'Van', 'Pursuit'],
  'Fixed-Rotor':           ['Transport', 'Combat'],
  'Tilt-Rotor':            ['VTOL Assault', 'Transport'],
  'Bargain':               ['Corporate Contracts', 'Black Market', 'Street Rates'],
  'Bribe':                 ['Low-Level Officials', 'Corporate Security'],
  'Fast Talk':             ['Quick Exits', 'Street Credibility'],
  'Corporate':             ['Executive Level', 'Security Protocols'],
  'Street':                ['Gang Relations', 'Fixer Networks'],
  'Matrix':                ['Host Navigation', 'IC Protocols'],
  'Verbal':                ['Psychological Pressure', 'Good Cop', 'Emotional Leverage'],
  'Machine-Aided':         ['Neural Interface', 'Drug-Assisted'],
  'Commercial':            ['Crisis Management', 'Startup Leadership'],
  'Military':              ['Small Unit Tactics', 'Fire Team Command'],
};

export function spendSkills(
  intent: CharacterIntent,
  priorities: PriorityAssignment,
): SkillRating[] {
  // Separate RNGs so concentration picks are independent of Phase 2 consumption.
  const skillBase = intent.seedOverrides?.skills ?? childSeed(intent.seed, 'skills');
  const rng       = makeRng(skillBase);
  const concRng   = makeRng(childSeed(skillBase, 'concentrations'));

  const archetype  = archetypesData.archetypes.find(a => a.id === intent.archetype)!;
  const priRow     = priorityData.priorities.find(p => p.level === priorities.skills)!;
  const coreSkills = archetype.coreSkills as string[];

  const activeSkills = skillsData.skills.filter(
    s => !['knowledge', 'language', 'special'].includes(s.category),
  );

  const isMagician = intent.magicDisposition !== 'mundane';
  const available  = activeSkills.filter(s => !(s as { magicianOnly?: boolean }).magicianOnly || isMagician);

  let pool = priRow.skills.points;
  const ratings: Record<string, number> = {};

  // Phase 1: allocate core skills, with ±1 jitter per skill so rerolls feel different
  const corePool  = Math.floor(pool * 0.70);
  const coreAvail = coreSkills.filter(id => available.find(s => s.id === id));

  if (coreAvail.length > 0) {
    const basePerCore = Math.floor(corePool / coreAvail.length);
    for (const id of coreAvail) {
      const jitter   = randInt(rng, 3) - 1; // -1, 0, or +1
      ratings[id]    = Math.min(MAX_SKILL_RATING, Math.max(1, basePerCore + jitter));
    }
    // Spend any leftover points on the top two core skills
    const coreSpent = coreAvail.reduce((s, id) => s + ratings[id], 0);
    let coreLeft    = corePool - coreSpent;
    for (const id of coreAvail.slice(0, 2)) {
      if (coreLeft <= 0) break;
      const bump  = Math.min(MAX_SKILL_RATING - ratings[id], coreLeft);
      ratings[id] += bump;
      coreLeft    -= bump;
    }
    pool -= coreAvail.reduce((s, id) => s + ratings[id], 0);
  }

  // Phase 2: scatter remaining points across non-core active skills, rated 1–3
  const secondary = available.filter(s => !coreAvail.includes(s.id));
  while (pool > 0 && secondary.length > 0) {
    const pick    = weightedPick(rng, secondary, secondary.map(() => 1));
    const current = ratings[pick.id] ?? 0;
    if (current < 3) {
      ratings[pick.id] = current + 1;
      pool--;
    } else {
      secondary.splice(secondary.indexOf(pick), 1);
    }
  }

  // Phase 3: assign concentrations and specializations using the dedicated concRng.
  // Using a separate seed ensures these vary independently on every reroll.
  const concSkills = ARCHETYPE_CONC_SKILLS[intent.archetype as ArchetypeId] ?? [];
  const specSkill  = ARCHETYPE_SPEC_SKILL[intent.archetype as ArchetypeId] ?? null;

  return Object.entries(ratings).map(([skillId, rating]) => {
    if (!concSkills.includes(skillId)) return { skillId, rating };

    const validConcs = SKILL_CONCS[skillId];
    if (!validConcs || validConcs.length === 0) return { skillId, rating };

    const concentration = validConcs[randInt(concRng, validConcs.length)];

    if (skillId !== specSkill) return { skillId, rating, concentration };

    // ~35% chance of having a specialization
    if (randInt(concRng, 100) >= 35) return { skillId, rating, concentration };

    const specOpts = SPEC_OPTIONS[concentration] ?? [];
    if (specOpts.length === 0) return { skillId, rating, concentration };

    const specialization = specOpts[randInt(concRng, specOpts.length)];
    return { skillId, rating, concentration, specialization };
  });
}
