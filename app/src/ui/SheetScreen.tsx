import { useState } from 'react';
import { useApp } from './store';
import { generate } from '../engine/generate';
import { generateName } from './nameGenerator';
import { generateContacts } from './contactsGenerator';
import { generateDemographics } from './demographicsGenerator';
import { generateAdditionalDetails } from './additionalDetailsGenerator';
import { generatePrograms } from './programsGenerator';
import { serializeCode, decodeAxes } from './characterCode';
import { CharacterPdf, buildPdfData, pdf } from './CharacterPdf';
import type { ArchetypeId, MagicDisposition } from '../engine/types';
import skillsData    from '../../../data/sr2/skills.json';
import gearData      from '../../../data/sr2/gear.json';
import cyberwareData from '../../../data/sr2/cyberware.json';
import spellsData    from '../../../data/sr2/spells.json';
import archetypesData from '../../../data/sr2/archetypes.json';
import metatypesData  from '../../../data/sr2/metatypes.json';

// ── Lookup maps ───────────────────────────────────────────────────────────

const skillMap    = Object.fromEntries(skillsData.skills.map(s => [s.id, s.name]));
const gearMap     = Object.fromEntries(gearData.gear.map(g => [g.id, g]));
const cyberMap    = Object.fromEntries(cyberwareData.cyberware.map(c => [c.id, c]));
const spellMap    = Object.fromEntries(spellsData.spells.map(s => [s.id, s]));
const archetypeMap = Object.fromEntries(archetypesData.archetypes.map(a => [a.id, a.name]));
const metatypeMap  = Object.fromEntries(metatypesData.metatypes.map(m => [m.id, m]));

const WEAPON_CATEGORIES = new Set([
  'pistol', 'smg', 'rifle', 'lmg', 'shotgun', 'meleeWeapon', 'projectileWeapon', 'explosive',
]);

const ALL_ARCHETYPES: { id: ArchetypeId; magic: MagicDisposition }[] = [
  { id: 'street_samurai', magic: 'mundane'    },
  { id: 'mage',           magic: 'full_magic' },
  { id: 'shaman',         magic: 'full_magic' },
  { id: 'physical_adept', magic: 'adept'      },
  { id: 'decker',         magic: 'mundane'    },
  { id: 'rigger',         magic: 'mundane'    },
  { id: 'face',           magic: 'mundane'    },
  { id: 'combat_mage',    magic: 'full_magic' },
  { id: 'investigator',   magic: 'mundane'    },
];

// ── Static tables ─────────────────────────────────────────────────────────

const SKILL_DESC: Record<string, string> = {
  armed_combat:        'Melee with swords, clubs, and staffs',
  unarmed_combat:      'Punches, kicks, and martial arts',
  demolitions:         'Placing and disarming explosives',
  firearms:            'Pistols, rifles, SMGs, and ranged guns',
  gunnery:             'Vehicle-mounted and heavy weapons',
  projectile_weapons:  'Bows and crossbows',
  throwing_weapons:    'Grenades, knives, and thrown attacks',
  athletics:           'Running, jumping, climbing, swimming',
  stealth:             'Moving silently and staying unseen',
  conjuring:           'Summoning and controlling spirits',
  sorcery:             'Casting and sustaining spells',
  biotech:             'First aid, surgery, cyberware maintenance',
  computer:            'Hacking, decking, and system intrusion',
  electronics:         'Hardware, sensors, and security gear',
  etiquette:           'Navigating social norms and subcultures',
  interrogation:       'Extracting information under pressure',
  leadership:          'Directing others in high-stress situations',
  negotiation:         'Persuasion, bargaining, and deal-making',
  bike:                'Motorcycles and two-wheeled vehicles',
  car:                 'Ground cars and wheeled vehicles',
  hovercraft:          'Air-cushion vehicles',
  motorboat:           'Powered watercraft',
  rotor_craft:         'Helicopters and rotary-wing aircraft',
  sailboat:            'Wind-powered watercraft',
  vectored_thrust:     'VTOL and thrust-vectored aircraft',
  winged_aircraft:     'Fixed-wing planes and gliders',
  biology:             'Life sciences and medicine',
  computer_theory:     'Programming and system design',
  cybertechnology:     'Cyberware specs and integration',
  magical_theory:      'Magic theory and astral phenomena',
  military_theory:     'Tactics and military operations',
  physical_sciences:   'Physics, chemistry, engineering',
  psychology:          'Human behaviour and motivation',
  sociology:           'Social structures and culture',
};

const GEAR_DESC: Record<string, string> = {
  streetline_special:    'Cheap hold-out, highly concealable',
  walther_palm:          'Tiny 2-shot palm pistol',
  colt_l36:              'Lightweight polymer semi-auto',
  beretta_101t:          'Compact double-action semi-auto',
  fichetti_500:          'Security-issue semi-auto',
  ares_predator:         'Military-grade heavy pistol',
  browning_max_power:    'High-caliber semi-auto pistol',
  ruger_super_warhawk:   'Large-caliber heavy revolver',
  ares_viper:            'Flechette pistol, anti-personnel',
  remington_roomsweeper: 'Compact shotgun for close quarters',
  uzi_iii:               'Compact SMG, high rate of fire',
  hk227:                 'Precision select-fire SMG',
  hk227s:                'Silenced variant of the HK227',
  ingram_valiant:        'Squad support light machine gun',
  fn_har:                'Versatile bullpup assault rifle',
  ak97:                  'Rugged, reliable full-auto rifle',
  remington_950:         'Bolt-action hunting rifle',
  ranger_sm3:            'Long-range precision sniper rifle',
  knife:                 'Balanced fighting knife',
  throwing_knife:        'Weighted for accurate throws',
  shuriken:              'Thrown disk, extreme concealability',
  grenade_defensive:     'Fragmentation, 5m lethal radius',
  grenade_offensive:     'Concussion blast, wider area',
  armor_clothing:        'Street-wear with ballistic weave',
  armor_jacket:          'Balanced ballistic protection',
  armor_vest:            'Concealed ballistic vest',
  armor_vest_plates:     'Vest with hardened plate inserts',
  lined_coat:            'Long coat with ballistic lining',
  heavy_armor_partial:   'Heavy combat armor, partial body',
  heavy_armor_full:      'Full-body combat armor suit',
  datajack_external:     'Smartgun-linked targeting goggles',
  pocket_secretary:      'Encrypted personal data organizer',
  micro_recorder:        'Concealed audio/video recorder',
  medkit:                'Field medicine and trauma supplies',
  docwagon_basic:        'Emergency trauma extraction, basic tier',
  docwagon_gold:         'Priority trauma extraction, gold tier',
  lifestyle_street:      'Sleeping rough, minimal shelter',
  lifestyle_squatter:    'Abandoned building, bare survival',
  lifestyle_low:         'Coffin hotel or shared flop',
  lifestyle_middle:      'Secure apartment, modest comforts',
  lifestyle_high:        'Upscale apartment, full amenities',
  lifestyle_luxury:      'Corporate penthouse, every luxury',
  micro_transceiver:     'Short-range encrypted comm link',
  respirator:            'Filters gases and chemical smoke',
  binoculars:            'Long-range passive optics',
  autopicker:            'Electronic lockpick, Rating 3',
  jammer_personal:       'Disrupts nearby wireless signals',
  grapple_gun:           'Launches hook and line for vertical movement',
  gas_mask:              'Full-face chemical filter',
  night_goggles:         'Low-light amplification headgear',
  maglite:               'High-intensity tactical flashlight',
  lockpick_kit:          'Manual locksmith tools',
  stun_baton:            'Electrical melee, non-lethal 9S(e)',
  jazz_dose:             '+2 QCK/REA for one scene, crash after',
  restraints_pl:         'Disposable plastic zip ties',
  bug_scanner:           'Detects surveillance devices, Rating 3',
  survival_kit:          'Field rations, fire-start, compass, first aid',
  fake_sin_r4:           'Falsified System Identification Number',
  stimulant_patch:       'Resist fatigue modifiers, Rating 4',
  trauma_patch:          'Stabilises Deadly damage for extraction',
  det_cord:              'Detonation cord for shaped charges',
  rope_10m:              'Static rope for rappelling or restraint',
};

const ABILITY_NAMES: Record<string, string> = {
  low_light_vision:  'Low-Light Vision',
  thermographic_vision: 'Thermographic Vision',
  disease_resistance: 'Disease Resistance +2',
  reach_1:           'Reach +1 (melee)',
  dermal_armor_1:    'Dermal Armour 1/1',
};

// ── Helpers ──────────────────────────────────────────────────────────────

function newSeed() { return Math.floor(Math.random() * 0xffffffff); }

const CONDITION_BOXES = 10;
const SEVERITY = ['L', 'M', 'S', 'D'] as const;
const SEVERITY_PENALTY = ['−1 die', '−2 dice', '−3 dice', 'Incapacitated'] as const;
function severityOf(i: number) { return i < 3 ? 0 : i < 6 ? 1 : i < 9 ? 2 : 3; }

const WIRED_BONUS: Record<string, [number, number]> = {
  wired_reflexes_1: [2, 1],
  wired_reflexes_2: [4, 2],
  wired_reflexes_3: [6, 3],
};

function hexColorClass(val: number): string {
  if (val <= 2) return ' attr-hex-val-low';
  if (val <= 4) return ' attr-hex-val-mid';
  if (val <= 6) return ' attr-hex-val-high';
  return ' attr-hex-val-max';
}

// ── Sub-components ────────────────────────────────────────────────────────

function Pips({ rating }: { rating: number }) {
  const capped = Math.min(rating, 8);
  const over   = rating - capped;
  return (
    <span className="skill-dots">
      {Array.from({ length: 8 }, (_, i) => (
        <span key={i} className={`dot ${i < capped ? 'filled' : ''}`} />
      ))}
      {over > 0 && <span className="dot-overflow">+{over}</span>}
    </span>
  );
}

interface SectionProps {
  label: string;
  children: React.ReactNode;
}

function Section({ label, children }: SectionProps) {
  return (
    <div className="sheet-section">
      <div className="section-header">
        <span className="section-label">{label}</span>
      </div>
      <div className="section-body">{children}</div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────

export function SheetScreen() {
  const { state, dispatch } = useApp();
  const [copied, setCopied] = useState(false);
  const activeSeed = state.screen.tag === 'sheet' ? state.screen.character.intent.seed : -1;
  const [trackedSeed, setTrackedSeed]   = useState(activeSeed);
  const [physHit,     setPhysHit]       = useState<Set<number>>(new Set());
  const [stunHit,     setStunHit]       = useState<Set<number>>(new Set());
  const [deckHit,     setDeckHit]       = useState<Record<string, Set<number>>>({});
  const [vehicleHit,  setVehicleHit]    = useState<Record<string, Set<number>>>({});

  if (trackedSeed !== activeSeed) {
    setTrackedSeed(activeSeed);
    setPhysHit(new Set());
    setStunHit(new Set());
    setDeckHit({});
    setVehicleHit({});
  }

  if (state.screen.tag !== 'sheet') return null;
  const { character } = state.screen;
  const { attributes: a, skills, loadout, priorities, metatype, intent } = character;

  // ── Derived values ────────────────────────────────────────────────────

  const demographics  = generateDemographics(intent.seed, metatype, intent.archetype);
  const runnerName    = generateName(intent.seed, intent.archetype, metatype, demographics.sex, demographics.origin);
  const totalContacts = 2 + (loadout.purchasedContactCount ?? 0);
  const contacts      = generateContacts(intent.seed, intent.archetype, totalContacts);
  const details       = generateAdditionalDetails(intent.seed, intent.archetype, metatype, intent.magicDisposition, demographics, runnerName);

  // Programs: generated per-deck for deckers
  type DeckData = {
    name: string; category: string;
    deckMpcp?: number; deckHardening?: number; deckActiveMb?: number;
    deckStorageMb?: number; deckIoSpeed?: number; deckResponseIncrease?: number;
  };
  const cyberdeckItems = loadout.gear
    .map(g => ({ item: g, data: gearMap[g.gearId] as DeckData | undefined }))
    .filter(({ data }) => data?.category === 'cyberdeck');
  const deckProgramMap = Object.fromEntries(
    cyberdeckItems.map(({ item, data }) => [
      item.gearId,
      generatePrograms(intent.seed, data?.deckMpcp ?? 4, data?.deckActiveMb ?? 100),
    ]),
  );
  const archetypeName = archetypeMap[intent.archetype] ?? intent.archetype;
  const metatypeName  = metatype.charAt(0).toUpperCase() + metatype.slice(1);
  const magicLabel    = intent.magicDisposition === 'full_magic' ? 'Awakened'
                      : intent.magicDisposition === 'adept'      ? 'Physical Adept' : 'Mundane';

  // Metatype data for racial traits
  const metatypeData  = metatypeMap[metatype] as {
    attributeMods: Record<string, number>;
    specialAbilities: string[];
    isMetahuman: boolean;
  } | undefined;

  // Initiative
  let initReactionBonus = 0;
  let initExtraDice     = 0;
  for (const cw of loadout.cyberware) {
    const bonus = WIRED_BONUS[cw.cyberwareId];
    if (bonus) { initReactionBonus += bonus[0]; initExtraDice += bonus[1]; }
  }
  const initBase  = a.reaction + initReactionBonus;
  const initDice  = `${1 + initExtraDice}D6`;
  const initLabel = `${initBase} + ${initDice}`;

  // Dice pools
  const combatPool = Math.floor((a.quickness + a.intelligence + a.willpower) / 2);
  const taskPool   = Math.floor(a.intelligence / 2);
  const spellPool  = intent.magicDisposition === 'full_magic' ? Math.floor(a.magic / 2) : null;

  // Sorted skills
  const topSkills = [...skills].sort((a, b) => b.rating - a.rating);


  // Priority word display (sorted A→E)
  const PRI_LABELS: Record<string, string> = {
    race: 'Race', magic: 'Magic', attributes: 'Attr', skills: 'Skills', resources: 'Res',
  };
  const sortedPriCats = (Object.keys(priorities) as (keyof typeof priorities)[])
    .sort((x, y) => priorities[x].localeCompare(priorities[y]));

  // Weapons
  type WeaponData = {
    name: string; damageCode?: string; concealability?: number; ammoCapacity?: number;
    category: string; fireMode?: string; ranges?: number[]; weightKg?: number;
  };
  const weapons = loadout.gear
    .map(g => ({ item: g, data: gearMap[g.gearId] as WeaponData | undefined }))
    .filter(({ data }) => data && WEAPON_CATEGORIES.has(data.category));

  // Spells
  type SpellData = { name: string; type?: string; drainCode?: string; target?: string; category: string };
  const allSpells = loadout.spells
    .map(sp => ({ item: sp, data: spellMap[sp.spellId] as SpellData | undefined }))
    .filter(({ data }) => data != null);

  // Armor
  type ArmorData = { name: string; category: string; armorBallistic?: number; armorImpact?: number };
  const armors = loadout.gear
    .map(g => ({ item: g, data: gearMap[g.gearId] as ArmorData | undefined }))
    .filter(({ data }) => data?.category === 'armor');

  // Cyberdecks (already computed above as cyberdeckItems)
  const cyberdecks = cyberdeckItems;

  // Vehicles
  type VehicleData = {
    name: string; category: string;
    vehHandling?: number; vehSpeed?: number; vehAccel?: number; vehBody?: number;
    vehArmor?: number; vehSignature?: number; vehAutonav?: number; vehPilot?: number;
    vehSensor?: number; vehSeats?: number;
  };
  const vehicleList = loadout.gear
    .map(g => ({ item: g, data: gearMap[g.gearId] as VehicleData | undefined }))
    .filter(({ data }) => data?.category === 'vehicle');

  // Non-weapon, non-armor, non-lifestyle, non-cyberdeck, non-vehicle gear
  type GearData = { name: string; category: string; damageCode?: string; concealability?: number; armorBallistic?: number; armorImpact?: number; weightKg?: number };
  const otherGear = loadout.gear.filter(g => {
    const d = gearMap[g.gearId] as GearData | undefined;
    return d
        && !WEAPON_CATEGORIES.has(d.category)
        && d.category !== 'armor'
        && d.category !== 'lifestyle'
        && d.category !== 'cyberdeck'
        && d.category !== 'vehicle';
  });

  // Lifestyle items
  const lifestyleGear = loadout.gear
    .filter(g => (gearMap[g.gearId] as { category: string } | undefined)?.category === 'lifestyle');

  // ── Handlers ────────────────────────────────────────────────────────────

  function handleRerollAll() {
    const pick = ALL_ARCHETYPES[Math.floor(Math.random() * ALL_ARCHETYPES.length)];
    dispatch({ type: 'REROLL_CHARACTER', character: generate({
      edition: 'sr2', archetype: pick.id, magicDisposition: pick.magic, seed: newSeed(),
    }) });
  }

  async function handleExportPdf() {
    const data = buildPdfData(character, { runnerName, archetypeName, demographics, contacts, details, characterCode });
    const blob  = await pdf(<CharacterPdf data={data} />).toBlob();
    const url   = URL.createObjectURL(blob);
    const a     = document.createElement('a');
    a.href     = url;
    a.download = `${runnerName.replace(/\s+/g, '_')}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function toggleDeckBox(gearId: string, i: number) {
    const cur = deckHit[gearId] ?? new Set<number>();
    const next = new Set(cur);
    if (next.has(i)) next.delete(i); else next.add(i);
    setDeckHit({ ...deckHit, [gearId]: next });
  }

  function toggleVehicleBox(gearId: string, i: number) {
    const cur = vehicleHit[gearId] ?? new Set<number>();
    const next = new Set(cur);
    if (next.has(i)) next.delete(i); else next.add(i);
    setVehicleHit({ ...vehicleHit, [gearId]: next });
  }

  const characterCode = serializeCode({
    archetype:        intent.archetype,
    magicDisposition: intent.magicDisposition,
    seed:             intent.seed,
    ...(intent.axisCode ? { axisScores: decodeAxes(intent.axisCode) } : {}),
  });

  function handleCopySeed() {
    navigator.clipboard.writeText(characterCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function toggleBox(set: Set<number>, setFn: React.Dispatch<React.SetStateAction<Set<number>>>, i: number) {
    const next = new Set(set);
    if (next.has(i)) next.delete(i); else next.add(i);
    setFn(next);
  }

  // ── Render ──────────────────────────────────────────────────────────────

  const ATTRS: [string, string, number][] = [
    ['BOD', 'Body',         a.body],
    ['QCK', 'Quickness',    a.quickness],
    ['STR', 'Strength',     a.strength],
    ['CHA', 'Charisma',     a.charisma],
    ['INT', 'Intelligence', a.intelligence],
    ['WIL', 'Willpower',    a.willpower],
    ['ESS', 'Essence',      a.essence],
    ['MAG', 'Magic',        a.magic],
    ['REA', 'Reaction',     a.reaction],
  ];

  return (
    <div className="screen sheet">

      {/* ── Header ── */}
      <div className="sheet-header">
        <div className="sheet-identity">
          <button className="btn-ghost" onClick={() => dispatch({ type: 'GO_LANDING' })}>← NEW RUNNER</button>
          <div className="sheet-archetype">
            <span className="runner-name">{runnerName}</span>
            <span className="archetype-name">{archetypeName.toUpperCase()}</span>
            <span className="archetype-meta">
              {metatypeName} {demographics.sex} · age {demographics.age} · {magicLabel} · {demographics.origin}
            </span>
          </div>
        </div>
        <div className="sheet-header-right">
          <button className="seed-display" onClick={handleCopySeed} title="Click to copy character seed">
            <span className="seed-label">SEED</span>
            <span className="seed-value">{copied ? 'COPIED' : characterCode}</span>
          </button>
          <div className="header-reroll-row">
            <button className="btn btn-secondary btn-sm" onClick={handleRerollAll}>REROLL ALL</button>
            <button className="btn btn-secondary btn-sm" onClick={handleExportPdf}>EXPORT PDF</button>
          </div>
        </div>
      </div>

      {/* ── Hex Attribute Row ── */}
      <div className="attr-hex-bar">
        <div className="attr-hex-row">
          {ATTRS.map(([abbr, , val]) => {
            const display    = !Number.isInteger(val) ? val.toFixed(1) : String(val);
            const dim        = abbr === 'MAG' && intent.magicDisposition === 'mundane';
            const colorClass = dim ? '' : hexColorClass(val);
            return (
              <div key={abbr} className={`attr-hex${dim ? ' attr-hex-dim' : ''}${colorClass}`}>
                <div className="hex-outer">
                  <div className="hex-inner">
                    <span className="hex-value">{display}</span>
                  </div>
                </div>
                <span className="hex-label">{abbr}</span>
              </div>
            );
          })}
        </div>
        <div className="attr-hex-meta">
          <span>¥{character.startingCash.toLocaleString()}</span>
          <span>Init {initLabel}</span>
          <span className="attr-hex-priorities" title="Priorities sorted highest → lowest">
            {sortedPriCats.map((cat, i) => (
              <span key={cat}>
                {i > 0 && <span className="pri-sep"> › </span>}
                <span className="pri-cat">{PRI_LABELS[cat]}</span>
                <span className="pri-lvl">·{priorities[cat]}</span>
              </span>
            ))}
          </span>
        </div>
      </div>

      {/* ── Stats strip: Condition Monitor | Dice Pools | Protection ── */}
      <div className="stats-strip">
        <Section label="CONDITION MONITOR">
          <div className="condition-body">
            {([
              ['PHYSICAL', physHit, (i: number) => toggleBox(physHit, setPhysHit, i)],
              ['STUN',     stunHit, (i: number) => toggleBox(stunHit, setStunHit, i)],
            ] as [string, Set<number>, (i: number) => void][]).map(([label, hit, toggle]) => (
              <div key={label} className="condition-track">
                <span className="condition-track-label">{label}</span>
                <div className="condition-boxes">
                  {Array.from({ length: CONDITION_BOXES }, (_, i) => {
                    const sev     = severityOf(i);
                    const isFirst = i === 0 || severityOf(i - 1) !== sev;
                    return (
                      <span key={i} className="condition-cell">
                        {isFirst && (
                          <span className="condition-sev" title={SEVERITY_PENALTY[sev]}>
                            {SEVERITY[sev]}
                          </span>
                        )}
                        <button
                          className={`condition-box${hit.has(i) ? ' hit' : ''}`}
                          onClick={() => toggle(i)}
                          title={`${SEVERITY[sev]}: ${SEVERITY_PENALTY[sev]}`}
                        />
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section label="DICE POOLS">
          <div className="pool-list">
            {([
              ['Combat',  combatPool],
              ['Task',    taskPool],
              ...(spellPool !== null ? [['Spell', spellPool]] : []),
              ['Karma',   character.karmaPool],
            ] as [string, number][]).map(([label, val]) => (
              <div key={label} className="pool-row">
                <span className="pool-name">{label}</span>
                <span className="pool-value">{val}</span>
                <div className="pool-boxes">
                  {Array.from({ length: Math.min(val, 12) }, (_, i) => (
                    <span key={i} className="pool-box" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>

        {armors.length > 0 ? (
          <Section label="PROTECTION">
            <table className="combat-table">
              <thead>
                <tr><th>Armor</th><th>B</th><th>I</th></tr>
              </thead>
              <tbody>
                {armors.map(({ item, data }) => {
                  const d = data!;
                  return (
                    <tr key={item.gearId}>
                      <td>{d.name}</td>
                      <td className="combat-stat">{d.armorBallistic ?? '—'}</td>
                      <td className="combat-stat">{d.armorImpact ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Section>
        ) : (
          <Section label="PROTECTION">
            <p className="background-text">No armor.</p>
          </Section>
        )}
      </div>

      {/* ── Racial Traits (non-humans only) ── */}
      {metatypeData?.isMetahuman && (
        <Section label="RACIAL TRAITS">
          <div className="racial-traits">
            {Object.entries(metatypeData.attributeMods).length > 0 && (
              <div className="racial-mods">
                {Object.entries(metatypeData.attributeMods).map(([attr, mod]) => (
                  <span key={attr} className="racial-mod">
                    {attr.slice(0, 3).toUpperCase()} {mod > 0 ? `+${mod}` : mod}
                  </span>
                ))}
              </div>
            )}
            {metatypeData.specialAbilities.map(ab => (
              <span key={ab} className="racial-ability">{ABILITY_NAMES[ab] ?? ab}</span>
            ))}
          </div>
        </Section>
      )}

      {/* ── Weapons (full width, gated) ── */}
      {weapons.length > 0 && (
        <Section label="WEAPONS">
          <table className="combat-table">
            <thead>
              <tr>
                <th>Weapon</th><th>Dmg</th><th>Mode</th><th>Ammo</th><th>Conc</th><th>Range (S/M/L/E)</th>
              </tr>
            </thead>
            <tbody>
              {weapons.map(({ item, data }) => {
                const d = data!;
                const ranges = d.ranges ? d.ranges.join('/') : '—';
                return (
                  <tr key={item.gearId}>
                    <td>{d.name}</td>
                    <td className="combat-stat">{d.damageCode ?? '—'}</td>
                    <td className="combat-stat">{d.fireMode ?? '—'}</td>
                    <td className="combat-stat">{d.ammoCapacity ?? '—'}</td>
                    <td className="combat-stat">{d.concealability ?? '—'}</td>
                    <td className="combat-stat combat-ranges">{ranges}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Section>
      )}

      {/* ── Spells (full width, gated) ── */}
      {allSpells.length > 0 && (
        <Section label="SPELLS">
          <table className="combat-table">
            <thead>
              <tr>
                <th>Spell</th><th>Category</th><th>Type</th><th>Force</th><th>Drain</th><th>Target</th>
              </tr>
            </thead>
            <tbody>
              {allSpells.map(({ item, data }) => {
                const d = data!;
                const cat = d.category.charAt(0).toUpperCase() + d.category.slice(1);
                return (
                  <tr key={item.spellId}>
                    <td>{d.name}</td>
                    <td className="combat-stat">{cat}</td>
                    <td className="combat-stat">{d.type === 'physical' ? 'Phys' : 'Mana'}</td>
                    <td className="combat-stat">{item.force}</td>
                    <td className="combat-stat">{d.drainCode ?? '—'}</td>
                    <td className="combat-stat combat-target">{d.target ?? '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Section>
      )}

      {/* ── Skills | Gear (tall pair) ── */}
      <div className="sheet-columns">
        <Section label="SKILLS">
          <ul className="skill-list">
            {topSkills.map(s => {
              // SR2 concentration/specialization math (p.47-48)
              // Specialization: general drops by 2, conc stays at original, spec = original + 2
              // Concentration only: general drops by 1, conc = original + 1
              const hasSpec = !!s.specialization;
              const hasConc = !!s.concentration;
              const generalRating = hasSpec ? s.rating - 2 : hasConc ? s.rating - 1 : s.rating;
              const concRating    = hasSpec ? s.rating     : hasConc ? s.rating + 1 : null;
              const specRating    = hasSpec ? s.rating + 2 : null;
              return (
                <li key={s.skillId} className="skill-item">
                  <div className="skill-row">
                    <span className="skill-name">{skillMap[s.skillId] ?? s.skillId}</span>
                    <span className="skill-rating">{generalRating}</span>
                    <Pips rating={generalRating} />
                  </div>
                  {hasConc && (
                    <div className="skill-row skill-conc-row">
                      <span className="skill-name skill-conc-name">› {s.concentration}</span>
                      <span className="skill-rating skill-conc-rating">{concRating}</span>
                      <Pips rating={concRating ?? 0} />
                    </div>
                  )}
                  {hasSpec && (
                    <div className="skill-row skill-spec-row">
                      <span className="skill-name skill-spec-name">»» {s.specialization}</span>
                      <span className="skill-rating skill-spec-rating">{specRating}</span>
                      <Pips rating={specRating ?? 0} />
                    </div>
                  )}
                  {SKILL_DESC[s.skillId] && <p className="skill-desc">{SKILL_DESC[s.skillId]}</p>}
                </li>
              );
            })}
          </ul>
        </Section>

        <div className="sheet-col">
          {/* Cyberware in own section */}
          {loadout.cyberware.length > 0 && (
            <Section label="CYBERWARE">
              <ul className="loadout-list">
                {loadout.cyberware.map(cw => {
                  const data = cyberMap[cw.cyberwareId] as { name: string; effect?: string } | undefined;
                  return (
                    <li key={cw.cyberwareId} className="loadout-item">
                      <div className="loadout-row">
                        <span className="loadout-name">{data?.name ?? cw.cyberwareId}</span>
                        <span className="loadout-meta">{cw.essenceCost}E</span>
                      </div>
                      {data?.effect && <p className="loadout-detail">{data.effect}</p>}
                    </li>
                  );
                })}
              </ul>
            </Section>
          )}

          <Section label="GEAR">
            {otherGear.length > 0 && (
              <div className="loadout-group">
                <ul className="loadout-list">
                  {otherGear.map(g => {
                    const data = gearMap[g.gearId] as { name: string; weightKg?: number } | undefined;
                    const wt   = data?.weightKg != null ? `${data.weightKg}kg` : null;
                    const desc = GEAR_DESC[g.gearId];
                    return (
                      <li key={g.gearId} className="loadout-item">
                        <div className="loadout-row">
                          <span className="loadout-name">{data?.name ?? g.gearId}</span>
                          <span className="loadout-meta">{g.costNuyen.toLocaleString()}¥</span>
                        </div>
                        {(wt || desc) && (
                          <p className="loadout-detail">{[wt, desc].filter(Boolean).join(' · ')}</p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            {lifestyleGear.length > 0 && (
              <div className="loadout-group">
                <h4 className="loadout-group-label">LIFESTYLE</h4>
                {lifestyleGear.map(g => {
                  const data = gearMap[g.gearId] as { name: string; costNuyen: number } | undefined;
                  const label = (data?.name ?? g.gearId).replace('Lifestyle: ', '');
                  const cost  = data?.costNuyen ?? g.costNuyen;
                  return (
                    <div key={g.gearId} className="lifestyle-row">
                      <span className="lifestyle-name">{label}</span>
                      <span className="lifestyle-cost">{cost === 0 ? 'Free' : `¥${cost.toLocaleString()}/mo`}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </Section>
        </div>
      </div>

      {/* ── Cyberdeck (full width, gated) ── */}
      {cyberdecks.length > 0 && (
        <Section label="CYBERDECK">
          {/* Decks table */}
          <table className="combat-table">
            <thead>
              <tr><th>Deck</th><th>MPCP</th><th>Hard</th><th>Active</th><th>Storage</th><th>I/O</th><th>+Resp</th></tr>
            </thead>
            <tbody>
              {cyberdecks.map(({ item, data }) => {
                const d = data!;
                return (
                  <tr key={item.gearId}>
                    <td>{d.name}</td>
                    <td className="combat-stat">{d.deckMpcp ?? '—'}</td>
                    <td className="combat-stat">{d.deckHardening ?? '—'}</td>
                    <td className="combat-stat">{d.deckActiveMb ?? '—'}Mb</td>
                    <td className="combat-stat">{d.deckStorageMb ?? '—'}Mb</td>
                    <td className="combat-stat">{d.deckIoSpeed ?? '—'}</td>
                    <td className="combat-stat">+{d.deckResponseIncrease ?? 0}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Condition monitor per deck */}
          {cyberdecks.map(({ item, data }) => {
            const d       = data!;
            const cmBoxes = d.deckMpcp ?? 4;
            const hit     = deckHit[item.gearId] ?? new Set<number>();
            return (
              <div key={item.gearId} className="deck-cm">
                <span className="deck-cm-label">
                  MATRIX CM{cyberdecks.length > 1 ? ` · ${d.name}` : ''}
                </span>
                <div className="deck-cm-boxes">
                  {Array.from({ length: cmBoxes }, (_, i) => (
                    <button
                      key={i}
                      className={`condition-box${hit.has(i) ? ' hit' : ''}`}
                      onClick={() => toggleDeckBox(item.gearId, i)}
                      title={`Box ${i + 1}`}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {/* Programs table — all decks combined */}
          {cyberdecks.some(({ item }) => (deckProgramMap[item.gearId] ?? []).length > 0) && (
            <div className="programs-block">
              <h4 className="loadout-group-label">PROGRAMS</h4>
              <table className="combat-table">
                <thead>
                  <tr><th>Program</th><th>Cat</th><th>Rating</th><th>Size</th></tr>
                </thead>
                <tbody>
                  {cyberdecks.flatMap(({ item }) =>
                    (deckProgramMap[item.gearId] ?? []).map((p, pi) => (
                      <tr key={`${item.gearId}-${pi}`}>
                        <td>{p.name}</td>
                        <td className="combat-stat prog-cat" data-cat={p.category}>{p.category.slice(0, 3).toUpperCase()}</td>
                        <td className="combat-stat">{p.rating}</td>
                        <td className="combat-stat">{p.sizeMb}Mb</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      )}

      {/* ── Vehicles (full width, gated) ── */}
      {vehicleList.length > 0 && (
        <Section label="VEHICLES">
          {vehicleList.map(({ item, data }) => {
            const d       = data!;
            const cmBoxes = (d.vehBody ?? 3) * 2;
            const hit     = vehicleHit[item.gearId] ?? new Set<number>();
            return (
              <div key={item.gearId} className="vehicle-block">
                <table className="combat-table">
                  <thead>
                    <tr><th>Vehicle</th><th>Hand</th><th>Speed</th><th>Accel</th><th>Body</th><th>Armor</th><th>Sig</th><th>Pilot</th><th>Seats</th></tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{d.name}</td>
                      <td className="combat-stat">{d.vehHandling ?? '—'}</td>
                      <td className="combat-stat">{d.vehSpeed ?? '—'}</td>
                      <td className="combat-stat">{d.vehAccel ?? '—'}</td>
                      <td className="combat-stat">{d.vehBody ?? '—'}</td>
                      <td className="combat-stat">{d.vehArmor ?? '—'}</td>
                      <td className="combat-stat">{d.vehSignature ?? '—'}</td>
                      <td className="combat-stat">{d.vehPilot ?? '—'}</td>
                      <td className="combat-stat">{d.vehSeats ?? '—'}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Vehicle condition monitor */}
                <div className="deck-cm">
                  <span className="deck-cm-label">VEHICLE CM</span>
                  <div className="deck-cm-boxes">
                    {Array.from({ length: cmBoxes }, (_, i) => (
                      <button
                        key={i}
                        className={`condition-box${hit.has(i) ? ' hit' : ''}`}
                        onClick={() => toggleVehicleBox(item.gearId, i)}
                        title={`Box ${i + 1}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </Section>
      )}

      {/* ── Contacts (full width) ── */}
      <Section label="CONTACTS">
        <div className="contacts-grid">
          {contacts.map((c, i) => (
            <div key={i} className="contact-card">
              <span className="contact-name">{c.name}</span>
              <span className="contact-role">{c.role}</span>
              <div className="contact-ratings">
                <span className="contact-rating-label">L</span>
                <span className="contact-rating-val">{c.loyalty}</span>
                <span className="contact-rating-label">C</span>
                <span className="contact-rating-val">{c.connection}</span>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Additional Details (always last) ── */}
      <Section label="ADDITIONAL DETAILS">
        <div className="details-grid">
          <div className="detail-row">
            <span className="detail-label">Legal Name</span>
            <span className="detail-value">{details.realName}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Past</span>
            <span className="detail-value">{details.pastProfession}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Personality</span>
            <span className="detail-value">{details.personality}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Moral Code</span>
            <span className="detail-value">{details.moralCode}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Goals</span>
            <span className="detail-value">{details.goals}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Loves / Hates</span>
            <span className="detail-value">{details.lovesHates}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Languages</span>
            <span className="detail-value">{details.languages.join(', ')}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Appearance</span>
            <span className="detail-value">{demographics.appearance}</span>
          </div>
          <div className="detail-row detail-row-wide">
            <span className="detail-label">Background</span>
            <span className="detail-value background-text">{details.background}</span>
          </div>
        </div>
      </Section>

    </div>
  );
}
