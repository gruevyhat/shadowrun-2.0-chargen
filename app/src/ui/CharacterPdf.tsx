import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';
import type { Character, SkillRating } from '../engine/types';
import type { Demographics } from './demographicsGenerator';
import type { AdditionalDetails } from './additionalDetailsGenerator';
import type { Contact } from './contactsGenerator';
import skillsData    from '../../../data/sr2/skills.json';
import gearData      from '../../../data/sr2/gear.json';
import cyberwareData from '../../../data/sr2/cyberware.json';
import spellsData    from '../../../data/sr2/spells.json';

export { pdf };

// ── Data contract ─────────────────────────────────────────────────────────────

export interface PdfData {
  runnerName:      string;
  archetypeName:   string;
  metatypeName:    string;
  magicLabel:      string;
  sex:             string;
  age:             number;
  origin:          string;
  characterCode:   string;
  attrs:           Array<{ abbr: string; val: number; isDim: boolean }>;
  initLabel:       string;
  startingCash:    number;
  karmaPool:       number;
  priorityDisplay: string;
  combatPool:      number;
  taskPool:        number;
  spellPool:       number | null;
  skills:          Array<{
    name: string; generalRating: number;
    concentration?: string; concRating?: number;
    specialization?: string; specRating?: number;
  }>;
  weapons:   Array<{ name: string; damageCode?: string; fireMode?: string; ammoCapacity?: number; concealability?: number; ranges?: number[] }>;
  armors:    Array<{ name: string; armorBallistic?: number; armorImpact?: number }>;
  cyberware: Array<{ name: string; essenceCost: number; effect?: string }>;
  spells:    Array<{ name: string; category: string; typePhy: boolean; force: number; drainCode?: string; target?: string }>;
  gear:      Array<{ name: string; costNuyen: number }>;
  lifestyle: string | null;
  decks:     Array<{ name: string; mpcp?: number; hardening?: number; activeMb?: number; storageMb?: number; ioSpeed?: number; responseIncrease?: number }>;
  vehicles:  Array<{ name: string; vehHandling?: number; vehSpeed?: number; vehAccel?: number; vehBody?: number; vehArmor?: number; vehSignature?: number; vehPilot?: number; vehSeats?: number }>;
  contacts:       Contact[];
  realName:       string;
  pastProfession: string;
  personality:    string;
  moralCode:      string;
  goals:          string;
  lovesHates:     string;
  languages:      string;
  appearance:     string;
  background:     string;
  metatypeTraits: string | null;
}

// ── Builder ───────────────────────────────────────────────────────────────────

const _skillMap    = Object.fromEntries(skillsData.skills.map(s => [s.id, s.name]));
const _gearMap     = Object.fromEntries(gearData.gear.map(g => [g.id, g]));
const _cyberMap    = Object.fromEntries(cyberwareData.cyberware.map(c => [c.id, c]));
const _spellMap    = Object.fromEntries(spellsData.spells.map(s => [s.id, s]));

const WEAPON_CATS = new Set(['pistol','smg','rifle','lmg','shotgun','meleeWeapon','projectileWeapon','explosive']);
const WIRED_BONUS: Record<string, [number, number]> = {
  wired_reflexes_1: [2, 1],
  wired_reflexes_2: [4, 2],
  wired_reflexes_3: [6, 3],
};
const PRI_LABELS: Record<string, string> = {
  race: 'Race', magic: 'Magic', attributes: 'Attr', skills: 'Skills', resources: 'Res',
};

export function buildPdfData(
  character: Character,
  identity: { runnerName: string; archetypeName: string; demographics: Demographics; contacts: Contact[]; details: AdditionalDetails; characterCode: string },
): PdfData {
  const { attributes: a, skills, loadout, priorities, metatype, intent } = character;
  const { runnerName, archetypeName, demographics, contacts, details, characterCode } = identity;

  const metatypeName = metatype.charAt(0).toUpperCase() + metatype.slice(1);
  const magicLabel   = intent.magicDisposition === 'full_magic' ? 'Awakened'
                     : intent.magicDisposition === 'adept'      ? 'Physical Adept' : 'Mundane';

  // Attributes
  const isMundane = intent.magicDisposition === 'mundane';
  const attrs: PdfData['attrs'] = [
    { abbr: 'BOD', val: a.body,         isDim: false },
    { abbr: 'QCK', val: a.quickness,    isDim: false },
    { abbr: 'STR', val: a.strength,     isDim: false },
    { abbr: 'CHA', val: a.charisma,     isDim: false },
    { abbr: 'INT', val: a.intelligence, isDim: false },
    { abbr: 'WIL', val: a.willpower,    isDim: false },
    { abbr: 'ESS', val: a.essence,      isDim: false },
    { abbr: 'MAG', val: a.magic,        isDim: isMundane },
    { abbr: 'REA', val: a.reaction,     isDim: false },
  ];

  // Initiative
  let initReactionBonus = 0, initExtraDice = 0;
  for (const cw of loadout.cyberware) {
    const bonus = WIRED_BONUS[cw.cyberwareId];
    if (bonus) { initReactionBonus += bonus[0]; initExtraDice += bonus[1]; }
  }
  const initBase  = a.reaction + initReactionBonus;
  const initLabel = `${initBase} + ${1 + initExtraDice}D6`;

  // Dice pools
  const combatPool = Math.floor((a.quickness + a.intelligence + a.willpower) / 2);
  const taskPool   = Math.floor(a.intelligence / 2);
  const spellPool  = intent.magicDisposition === 'full_magic' ? Math.floor(a.magic / 2) : null;

  // Priority display
  const sortedPri = (Object.keys(priorities) as (keyof typeof priorities)[])
    .sort((x, y) => priorities[x].localeCompare(priorities[y]));
  const priorityDisplay = sortedPri
    .map(cat => `${PRI_LABELS[cat]}·${priorities[cat]}`)
    .join('  ');

  // Skills
  const sortedSkills = [...skills].sort((x, y) => y.rating - x.rating);
  const pdfSkills: PdfData['skills'] = sortedSkills.map((s: SkillRating) => {
    const hasSpec = !!s.specialization;
    const hasConc = !!s.concentration;
    const generalRating = hasSpec ? s.rating - 2 : hasConc ? s.rating - 1 : s.rating;
    const concRating    = hasSpec ? s.rating     : hasConc ? s.rating + 1 : undefined;
    const specRating    = hasSpec ? s.rating + 2 : undefined;
    return {
      name: _skillMap[s.skillId] ?? s.skillId,
      generalRating,
      ...(hasConc ? { concentration: s.concentration, concRating } : {}),
      ...(hasSpec ? { specialization: s.specialization, specRating } : {}),
    };
  });

  // Weapons
  type WeaponData = { name: string; damageCode?: string; fireMode?: string; ammoCapacity?: number; concealability?: number; ranges?: number[]; category: string };
  const weapons = loadout.gear
    .map(g => _gearMap[g.gearId] as WeaponData | undefined)
    .filter((d): d is WeaponData => !!d && WEAPON_CATS.has(d.category))
    .map(d => ({ name: d.name, damageCode: d.damageCode, fireMode: d.fireMode, ammoCapacity: d.ammoCapacity, concealability: d.concealability, ranges: d.ranges }));

  // Armor
  type ArmorData = { name: string; armorBallistic?: number; armorImpact?: number; category: string };
  const armors = loadout.gear
    .map(g => _gearMap[g.gearId] as ArmorData | undefined)
    .filter((d): d is ArmorData => d?.category === 'armor')
    .map(d => ({ name: d.name, armorBallistic: d.armorBallistic, armorImpact: d.armorImpact }));

  // Cyberware
  const cyberware = loadout.cyberware.map(cw => {
    const data = _cyberMap[cw.cyberwareId] as { name: string; effect?: string } | undefined;
    return { name: data?.name ?? cw.cyberwareId, essenceCost: cw.essenceCost, effect: data?.effect };
  });

  // Spells
  type SpellData = { name: string; type?: string; drainCode?: string; target?: string; category: string };
  const spells = loadout.spells
    .map(sp => {
      const d = _spellMap[sp.spellId] as SpellData | undefined;
      if (!d) return null;
      return { name: d.name, category: d.category, typePhy: d.type === 'physical', force: sp.force, drainCode: d.drainCode, target: d.target };
    })
    .filter((s): s is NonNullable<typeof s> => s != null);

  // Gear (non-weapon, non-armor, non-lifestyle, non-cyberdeck, non-vehicle)
  type GearData = { name: string; category: string; costNuyen?: number };
  const gear = loadout.gear
    .filter(g => {
      const d = _gearMap[g.gearId] as GearData | undefined;
      return d && !WEAPON_CATS.has(d.category)
          && d.category !== 'armor' && d.category !== 'lifestyle'
          && d.category !== 'cyberdeck' && d.category !== 'vehicle';
    })
    .map(g => {
      const d = _gearMap[g.gearId] as GearData;
      return { name: d.name, costNuyen: g.costNuyen };
    });

  // Lifestyle
  const lifestyleItem = loadout.gear
    .map(g => _gearMap[g.gearId] as (GearData & { name: string }) | undefined)
    .find(d => d?.category === 'lifestyle');
  const lifestyle = lifestyleItem
    ? `${lifestyleItem.name.replace('Lifestyle: ', '')} (¥${(lifestyleItem.costNuyen ?? 0).toLocaleString()}/mo)`
    : null;

  // Cyberdecks
  type DeckData = { name: string; category: string; deckMpcp?: number; deckHardening?: number; deckActiveMb?: number; deckStorageMb?: number; deckIoSpeed?: number; deckResponseIncrease?: number };
  const decks = loadout.gear
    .map(g => _gearMap[g.gearId] as DeckData | undefined)
    .filter((d): d is DeckData => d?.category === 'cyberdeck')
    .map(d => ({ name: d.name, mpcp: d.deckMpcp, hardening: d.deckHardening, activeMb: d.deckActiveMb, storageMb: d.deckStorageMb, ioSpeed: d.deckIoSpeed, responseIncrease: d.deckResponseIncrease }));

  // Vehicles
  type VehicleData = { name: string; category: string; vehHandling?: number; vehSpeed?: number; vehAccel?: number; vehBody?: number; vehArmor?: number; vehSignature?: number; vehPilot?: number; vehSeats?: number };
  const vehicles = loadout.gear
    .map(g => _gearMap[g.gearId] as VehicleData | undefined)
    .filter((d): d is VehicleData => d?.category === 'vehicle')
    .map(d => ({ name: d.name, vehHandling: d.vehHandling, vehSpeed: d.vehSpeed, vehAccel: d.vehAccel, vehBody: d.vehBody, vehArmor: d.vehArmor, vehSignature: d.vehSignature, vehPilot: d.vehPilot, vehSeats: d.vehSeats }));

  // Metatype traits
  let metatypeTraits: string | null = null;
  if (metatype !== 'human') {
    const parts: string[] = [];
    // We don't have metatypeData here, but we can look it up
    // For brevity, encode traits as a readable string
    const METATYPE_TRAITS: Record<string, string> = {
      elf:   'Low-Light Vision  ·  CHA +2  ·  WIL +1',
      dwarf: 'Thermographic Vision  ·  STR +2  ·  BOD +2  ·  Disease Resistance +2',
      ork:   'Low-Light Vision  ·  BOD +3  ·  STR +3  ·  INT −1  ·  CHA −1',
      troll: 'Thermographic Vision  ·  BOD +5  ·  STR +4  ·  Reach +1  ·  Dermal Armour 1/1  ·  INT −2  ·  CHA −2',
    };
    parts.push(METATYPE_TRAITS[metatype] ?? metatype);
    metatypeTraits = parts.join('\n');
  }

  return {
    runnerName, archetypeName, metatypeName, magicLabel,
    sex: demographics.sex, age: demographics.age, origin: demographics.origin,
    characterCode,
    attrs, initLabel,
    startingCash: character.startingCash,
    karmaPool: character.karmaPool,
    priorityDisplay,
    combatPool, taskPool, spellPool,
    skills: pdfSkills,
    weapons, armors, cyberware, spells, gear, lifestyle, decks, vehicles,
    contacts,
    realName:       details.realName,
    pastProfession: details.pastProfession,
    personality:    details.personality,
    moralCode:      details.moralCode,
    goals:          details.goals,
    lovesHates:     details.lovesHates,
    languages:      details.languages.join(', '),
    appearance:     demographics.appearance,
    background:     details.background,
    metatypeTraits,
  };
}

// ── Markdown export ───────────────────────────────────────────────────────────

export function buildMarkdown(data: PdfData): string {
  const L: string[] = [];
  const push = (...lines: string[]) => L.push(...lines);
  const hr = () => push('', '---', '');

  push(
    `# ${data.runnerName} — ${data.archetypeName}`,
    '',
    `**${data.metatypeName} ${data.sex === 'M' ? 'Male' : 'Female'} · Age ${data.age} · ${data.magicLabel} · ${data.origin}**  `,
    `Runner ID: \`${data.characterCode}\``,
  );
  hr();

  // Attributes
  push('## Attributes', '');
  push('| ' + data.attrs.map(a => a.abbr).join(' | ') + ' |');
  push('|' + data.attrs.map(() => ':---:').join('|') + '|');
  push('| ' + data.attrs.map(a => {
    if (a.isDim) return '—';
    return Number.isInteger(a.val) ? String(a.val) : a.val.toFixed(1);
  }).join(' | ') + ' |');
  push('');
  push(`**Initiative:** ${data.initLabel}  ·  **Cash:** ¥${data.startingCash.toLocaleString()}  ·  **Karma Pool:** ${data.karmaPool}  `);
  push(`**Priorities:** ${data.priorityDisplay}`);
  hr();

  // Condition monitors
  push('## Condition Monitor', '');
  const boxes = (n: number) => Array.from({ length: n }, () => '☐').join(' ');
  push(`**Physical:** ${boxes(3)}  L  ${boxes(3)}  M  ${boxes(3)}  S  ${boxes(1)}  D  `);
  push(`**Stun:**     ${boxes(3)}  L  ${boxes(3)}  M  ${boxes(3)}  S  ${boxes(1)}  D  `);
  hr();

  // Dice pools
  push('## Dice Pools', '');
  push('| Pool | Dice |');
  push('|------|:----:|');
  push(`| Combat | ${data.combatPool} |`);
  push(`| Task | ${data.taskPool} |`);
  if (data.spellPool !== null) push(`| Spell | ${data.spellPool} |`);
  push(`| Karma | ${data.karmaPool} |`);
  hr();

  // Protection
  if (data.armors.length > 0) {
    push('## Protection', '');
    push('| Armor | B | I |');
    push('|-------|:---:|:---:|');
    for (const a of data.armors)
      push(`| ${a.name} | ${a.armorBallistic ?? '—'} | ${a.armorImpact ?? '—'} |`);
    hr();
  }

  // Weapons
  if (data.weapons.length > 0) {
    push('## Weapons', '');
    push('| Weapon | Dmg | Mode | Ammo | Conc | Range (S/M/L/E) |');
    push('|--------|:---:|:----:|:----:|:----:|:---------------:|');
    for (const w of data.weapons)
      push(`| ${w.name} | ${w.damageCode ?? '—'} | ${w.fireMode ?? '—'} | ${w.ammoCapacity ?? '—'} | ${w.concealability ?? '—'} | ${w.ranges ? w.ranges.join('/') : '—'} |`);
    hr();
  }

  // Skills
  push('## Skills', '');
  push('| Skill | Rating | Concentration | Specialization |');
  push('|-------|:------:|---------------|----------------|');
  for (const sk of data.skills) {
    const conc = sk.concentration ? `${sk.concentration} (${sk.concRating})` : '—';
    const spec = sk.specialization ? `${sk.specialization} (${sk.specRating})` : '—';
    push(`| ${sk.name} | ${sk.generalRating} | ${conc} | ${spec} |`);
  }
  hr();

  // Cyberware
  if (data.cyberware.length > 0) {
    push('## Cyberware', '');
    push('| Implant | Essence | Effect |');
    push('|---------|:-------:|--------|');
    for (const cw of data.cyberware)
      push(`| ${cw.name} | ${cw.essenceCost.toFixed(1)}E | ${cw.effect ?? '—'} |`);
    hr();
  }

  // Spells
  if (data.spells.length > 0) {
    push('## Spells', '');
    push('| Spell | Category | Type | Force | Drain | Target |');
    push('|-------|----------|------|:-----:|:-----:|--------|');
    for (const sp of data.spells) {
      const cat = sp.category.charAt(0).toUpperCase() + sp.category.slice(1);
      push(`| ${sp.name} | ${cat} | ${sp.typePhy ? 'Physical' : 'Mana'} | ${sp.force} | ${sp.drainCode ?? '—'} | ${sp.target ?? '—'} |`);
    }
    hr();
  }

  // Cyberdeck
  if (data.decks.length > 0) {
    push('## Cyberdeck', '');
    push('| Deck | MPCP | Hardening | Active | Storage | I/O | +Response |');
    push('|------|:----:|:---------:|:------:|:-------:|:---:|:---------:|');
    for (const d of data.decks)
      push(`| ${d.name} | ${d.mpcp ?? '—'} | ${d.hardening ?? '—'} | ${d.activeMb != null ? `${d.activeMb}Mb` : '—'} | ${d.storageMb != null ? `${d.storageMb}Mb` : '—'} | ${d.ioSpeed ?? '—'} | +${d.responseIncrease ?? 0} |`);
    hr();
  }

  // Equipment
  if (data.gear.length > 0 || data.lifestyle) {
    push('## Equipment', '');
    for (const g of data.gear)
      push(`- ${g.name}${g.costNuyen > 0 ? ` (¥${g.costNuyen.toLocaleString()})` : ''}`);
    if (data.lifestyle)
      push(`- **Lifestyle:** ${data.lifestyle}`);
    hr();
  }

  // Vehicles
  if (data.vehicles.length > 0) {
    push('## Vehicles', '');
    push('| Vehicle | Hand | Speed | Accel | Body | Armor | Sig | Pilot | Seats |');
    push('|---------|:----:|:-----:|:-----:|:----:|:-----:|:---:|:-----:|:-----:|');
    for (const v of data.vehicles)
      push(`| ${v.name} | ${v.vehHandling ?? '—'} | ${v.vehSpeed ?? '—'} | ${v.vehAccel ?? '—'} | ${v.vehBody ?? '—'} | ${v.vehArmor ?? '—'} | ${v.vehSignature ?? '—'} | ${v.vehPilot ?? '—'} | ${v.vehSeats ?? '—'} |`);
    hr();
  }

  // Contacts
  if (data.contacts.length > 0) {
    push('## Contacts', '');
    push('| Name | Role | Loyalty | Connection |');
    push('|------|------|:-------:|:----------:|');
    for (const c of data.contacts)
      push(`| ${c.name} | ${c.role} | ${c.loyalty} | ${c.connection} |`);
    hr();
  }

  // Racial traits
  if (data.metatypeTraits) {
    push('## Racial Traits', '');
    push(data.metatypeTraits.replace(/  ·  /g, '  \n'));
    hr();
  }

  // Details
  push('## Additional Details', '');
  for (const [label, value] of [
    ['Legal Name',    data.realName],
    ['Past',          data.pastProfession],
    ['Personality',   data.personality],
    ['Moral Code',    data.moralCode],
    ['Goals',         data.goals],
    ['Loves / Hates', data.lovesHates],
    ['Languages',     data.languages],
    ['Appearance',    data.appearance],
  ] as [string, string][])
    push(`**${label}:** ${value}  `);
  push('', '### Background', '', data.background, '');

  push('---', '');
  push(`*Shadowrun 2nd Edition · Runner ID: \`${data.characterCode}\`*`);

  return L.join('\n');
}

// ── Color palette ─────────────────────────────────────────────────────────────

const C = {
  bg:      '#060c09',
  panel:   '#0c1510',
  border:  '#1a4028',
  neon:    '#00ffcc',
  neonDim: '#00885a',
  red:     '#ff2255',
  amber:   '#c8a000',
  text:    '#9ab8a4',
  white:   '#ddeee4',
  dim:     '#2a3c30',
  label:   '#4a6050',
};

// ── StyleSheet ────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  page: {
    backgroundColor: C.bg,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 28,
    fontFamily: 'Courier',
    color: C.text,
    fontSize: 8,
  },
  banner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 7,
  },
  bannerL: { color: C.label, fontSize: 6, letterSpacing: 1.5 },
  bannerR: { color: C.neonDim, fontSize: 6, letterSpacing: 1 },

  // Identity
  identityBlock: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: C.neon,
    paddingBottom: 7,
    marginBottom: 8,
  },
  runnerName:   { color: C.neon, fontSize: 22, fontFamily: 'Courier-Bold', letterSpacing: 0.5 },
  archetypeLine:{ color: C.white, fontSize: 9, fontFamily: 'Courier-Bold', letterSpacing: 0.5, marginTop: 2 },
  metaLine:     { color: C.text, fontSize: 7, marginTop: 2 },
  identityRight:{ alignItems: 'flex-end' },
  codeBadge:    { backgroundColor: C.panel, borderWidth: 0.5, borderColor: C.neonDim, paddingHorizontal: 7, paddingVertical: 4 },
  codeLabel:    { color: C.label, fontSize: 5.5, letterSpacing: 1.5, marginBottom: 2 },
  codeValue:    { color: C.neonDim, fontSize: 8, fontFamily: 'Courier-Bold', letterSpacing: 0.5 },

  // Attributes
  attrRow:      { flexDirection: 'row', gap: 3, marginBottom: 6 },
  attrBox:      { flex: 1, borderWidth: 1, borderColor: C.border, backgroundColor: C.panel, alignItems: 'center', paddingVertical: 5, paddingHorizontal: 2 },
  attrBoxDim:   { borderColor: C.dim, opacity: 0.45 },
  attrLabel:    { color: C.label, fontSize: 5.5, letterSpacing: 0.5, marginBottom: 3 },
  attrValue:    { color: C.neon, fontSize: 12, fontFamily: 'Courier-Bold' },
  attrValueDim: { color: C.dim },

  // Stats bar
  statsBar:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: C.panel, borderLeftWidth: 2, borderLeftColor: C.neon, paddingHorizontal: 8, paddingVertical: 4, marginBottom: 8 },
  statsBarItem:  { flexDirection: 'row', gap: 3, alignItems: 'center' },
  statsBarLabel: { color: C.label, fontSize: 6.5 },
  statsBarValue: { color: C.white, fontSize: 7, fontFamily: 'Courier-Bold' },
  priStr:        { color: C.amber, fontSize: 6.5, fontFamily: 'Courier-Bold' },

  // Stats strip
  statsStrip:  { flexDirection: 'row', gap: 5, marginBottom: 8 },
  stripPanel:  { flex: 1 },

  // Section
  secHeader: { backgroundColor: C.panel, borderLeftWidth: 2, borderLeftColor: C.neon, paddingHorizontal: 6, paddingVertical: 2, marginBottom: 4 },
  secLabel:  { color: C.neon, fontSize: 6.5, fontFamily: 'Courier-Bold', letterSpacing: 2 },
  secBody:   { paddingHorizontal: 2 },

  // Condition
  condTrack:       { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  condTrackLabel:  { color: C.label, fontSize: 6, width: 38 },
  condSevGroup:    { flexDirection: 'row', alignItems: 'center', marginRight: 3 },
  condSevLabel:    { color: C.label, fontSize: 5.5, marginRight: 1 },
  condBoxRow:      { flexDirection: 'row', gap: 1.5 },
  condBox:         { width: 7, height: 7, borderWidth: 0.75, borderColor: C.border, backgroundColor: C.bg },
  condBoxDeadly:   { borderColor: C.red },

  // Dice pools
  poolRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  poolName:   { color: C.text, fontSize: 7, width: 42 },
  poolVal:    { color: C.neon, fontSize: 10, fontFamily: 'Courier-Bold', width: 16, textAlign: 'right' },
  poolBoxRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 1.5, marginLeft: 4 },
  poolBox:    { width: 5, height: 5, borderWidth: 0.5, borderColor: C.neonDim },

  // Table
  tableHead:  { flexDirection: 'row', borderBottomWidth: 0.75, borderBottomColor: C.border, paddingBottom: 2, marginBottom: 2 },
  tableRow:   { flexDirection: 'row', paddingVertical: 2, borderBottomWidth: 0.5, borderBottomColor: C.dim },
  th:         { color: C.label, fontSize: 6, fontFamily: 'Courier-Bold', letterSpacing: 0.5 },
  td:         { color: C.text, fontSize: 7 },
  tdName:     { color: C.white, fontSize: 7 },
  tdStat:     { color: C.white, fontSize: 7, textAlign: 'center' },

  // Two-col
  twoCol:     { flexDirection: 'row', gap: 8, marginBottom: 8 },
  colSkills:  { flex: 3 },
  colRight:   { flex: 2 },

  // Skills
  skillItem:      { marginBottom: 4 },
  skillMainRow:   { flexDirection: 'row', alignItems: 'center' },
  skillName:      { color: C.text, fontSize: 7.5, flex: 1 },
  skillRating:    { color: C.neon, fontSize: 8, fontFamily: 'Courier-Bold', width: 14, textAlign: 'right', marginRight: 5 },
  pipRow:         { flexDirection: 'row', gap: 1.5 },
  pip:            { width: 5, height: 5, borderRadius: 3, borderWidth: 0.5, borderColor: C.neonDim, backgroundColor: C.bg },
  pipFilled:      { backgroundColor: C.neon, borderColor: C.neon },
  skillConcRow:   { flexDirection: 'row', alignItems: 'center', paddingLeft: 8, marginTop: 1.5 },
  skillConcName:  { color: C.label, fontSize: 6.5, flex: 1 },
  skillConcRat:   { color: C.text, fontSize: 7, fontFamily: 'Courier-Bold', width: 14, textAlign: 'right', marginRight: 5 },
  skillSpecRow:   { flexDirection: 'row', alignItems: 'center', paddingLeft: 16, marginTop: 1 },
  skillSpecName:  { color: C.neonDim, fontSize: 6, flex: 1 },
  skillSpecRat:   { color: C.neonDim, fontSize: 6.5, fontFamily: 'Courier-Bold', width: 14, textAlign: 'right', marginRight: 5 },

  // Cyberware
  cwRow:    { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 2 },
  cwName:   { color: C.text, fontSize: 7, flex: 1 },
  cwEss:    { color: C.red, fontSize: 6.5, marginLeft: 4, minWidth: 24, textAlign: 'right' },
  cwEffect: { color: C.label, fontSize: 6, paddingLeft: 6, marginTop: 0.5, marginBottom: 2 },

  // Gear
  gearRow:  { flexDirection: 'row', paddingVertical: 2, borderBottomWidth: 0.5, borderBottomColor: C.dim },
  gearName: { color: C.text, fontSize: 7, flex: 1 },
  gearCost: { color: C.label, fontSize: 6.5, marginLeft: 4 },

  // Lifestyle
  lifestyleRow:   { flexDirection: 'row', marginTop: 5, paddingTop: 4, borderTopWidth: 0.5, borderTopColor: C.dim },
  lifestyleLabel: { color: C.label, fontSize: 7, flex: 1 },
  lifestyleValue: { color: C.text, fontSize: 7 },

  // Contacts
  contactsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  contactCard:  { width: '22%', borderWidth: 0.5, borderColor: C.border, backgroundColor: C.panel, padding: 5 },
  contactName:  { color: C.white, fontSize: 7, fontFamily: 'Courier-Bold', marginBottom: 1 },
  contactRole:  { color: C.label, fontSize: 6, marginBottom: 3 },
  contactRats:  { flexDirection: 'row', gap: 4 },
  contactRL:    { color: C.neonDim, fontSize: 6 },
  contactRV:    { color: C.white, fontSize: 6, fontFamily: 'Courier-Bold' },

  // Details
  detailRow:   { flexDirection: 'row', marginBottom: 3, gap: 8 },
  detailLabel: { color: C.neonDim, fontSize: 6.5, fontFamily: 'Courier-Bold', width: 64, letterSpacing: 0.5 },
  detailValue: { color: C.text, fontSize: 7, flex: 1 },
  bgText:      { color: C.text, fontSize: 7, lineHeight: 1.5, flex: 1 },

  // Footer
  footer:     { position: 'absolute', bottom: 10, left: 24, right: 24, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 0.5, borderTopColor: C.dim, paddingTop: 4 },
  footerText: { color: C.label, fontSize: 5.5, letterSpacing: 0.8 },
});

// ── Sub-components ────────────────────────────────────────────────────────────

function SecHeader({ label }: { label: string }) {
  return (
    <View style={S.secHeader}>
      <Text style={S.secLabel}>{label}</Text>
    </View>
  );
}

function Pips({ rating }: { rating: number }) {
  const capped = Math.min(Math.max(0, rating), 8);
  return (
    <View style={S.pipRow}>
      {Array.from({ length: 8 }, (_, i) => (
        <View key={i} style={[S.pip, i < capped ? S.pipFilled : {}]} />
      ))}
    </View>
  );
}

function ConditionMonitor() {
  const SEV_GROUPS: [string, number, boolean][] = [['L', 3, false], ['M', 3, false], ['S', 3, false], ['D', 1, true]];
  const track = (label: string) => (
    <View style={S.condTrack}>
      <Text style={S.condTrackLabel}>{label}</Text>
      <View style={{ flexDirection: 'row' }}>
        {SEV_GROUPS.map(([sev, count, deadly]) => (
          <View key={sev} style={S.condSevGroup}>
            <Text style={S.condSevLabel}>{sev}</Text>
            <View style={S.condBoxRow}>
              {Array.from({ length: count }, (_, i) => (
                <View key={i} style={[S.condBox, deadly ? S.condBoxDeadly : {}]} />
              ))}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
  return <View>{track('PHYSICAL')}{track('STUN')}</View>;
}

function DicePools({ combat, task, spell, karma }: { combat: number; task: number; spell: number | null; karma: number }) {
  const pools: [string, number][] = [
    ['Combat', combat], ['Task', task],
    ...(spell != null ? [['Spell', spell] as [string, number]] : []),
    ['Karma',  karma],
  ];
  return (
    <View>
      {pools.map(([name, val]) => (
        <View key={name} style={S.poolRow}>
          <Text style={S.poolName}>{name}</Text>
          <Text style={S.poolVal}>{val}</Text>
          <View style={S.poolBoxRow}>
            {Array.from({ length: Math.min(val, 12) }, (_, i) => <View key={i} style={S.poolBox} />)}
          </View>
        </View>
      ))}
    </View>
  );
}

function ProtectionPanel({ armors }: { armors: PdfData['armors'] }) {
  if (!armors.length) return <Text style={{ color: C.label, fontSize: 7, fontStyle: 'italic' }}>None</Text>;
  return (
    <View>
      <View style={S.tableHead}>
        <Text style={[S.th, { flex: 1 }]}>ARMOR</Text>
        <Text style={[S.th, { width: 18, textAlign: 'center' }]}>B</Text>
        <Text style={[S.th, { width: 18, textAlign: 'center' }]}>I</Text>
      </View>
      {armors.map(a => (
        <View key={a.name} style={S.tableRow}>
          <Text style={[S.td, { flex: 1 }]}>{a.name}</Text>
          <Text style={[S.tdStat, { width: 18 }]}>{a.armorBallistic ?? '—'}</Text>
          <Text style={[S.tdStat, { width: 18 }]}>{a.armorImpact ?? '—'}</Text>
        </View>
      ))}
    </View>
  );
}

function WeaponsTable({ weapons }: { weapons: PdfData['weapons'] }) {
  if (!weapons.length) return null;
  return (
    <View style={{ marginBottom: 8 }}>
      <SecHeader label="WEAPONS" />
      <View style={S.secBody}>
        <View style={S.tableHead}>
          <Text style={[S.th, { flex: 1 }]}>WEAPON</Text>
          <Text style={[S.th, { width: 26, textAlign: 'center' }]}>DMG</Text>
          <Text style={[S.th, { width: 22, textAlign: 'center' }]}>MODE</Text>
          <Text style={[S.th, { width: 20, textAlign: 'center' }]}>AMMO</Text>
          <Text style={[S.th, { width: 18, textAlign: 'center' }]}>CONC</Text>
          <Text style={[S.th, { width: 56, textAlign: 'center' }]}>S / M / L / E</Text>
        </View>
        {weapons.map(w => (
          <View key={w.name} style={S.tableRow}>
            <Text style={[S.tdName, { flex: 1 }]}>{w.name}</Text>
            <Text style={[S.tdStat, { width: 26 }]}>{w.damageCode ?? '—'}</Text>
            <Text style={[S.tdStat, { width: 22 }]}>{w.fireMode ?? '—'}</Text>
            <Text style={[S.tdStat, { width: 20 }]}>{w.ammoCapacity ?? '—'}</Text>
            <Text style={[S.tdStat, { width: 18 }]}>{w.concealability ?? '—'}</Text>
            <Text style={[S.tdStat, { width: 56 }]}>{w.ranges ? w.ranges.join(' / ') : '—'}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function SpellsTable({ spells }: { spells: PdfData['spells'] }) {
  if (!spells.length) return null;
  return (
    <View style={{ marginBottom: 8 }}>
      <SecHeader label="SPELLS" />
      <View style={S.secBody}>
        <View style={S.tableHead}>
          <Text style={[S.th, { flex: 1 }]}>SPELL</Text>
          <Text style={[S.th, { width: 38, textAlign: 'center' }]}>CATEGORY</Text>
          <Text style={[S.th, { width: 24, textAlign: 'center' }]}>TYPE</Text>
          <Text style={[S.th, { width: 18, textAlign: 'center' }]}>FORCE</Text>
          <Text style={[S.th, { width: 24, textAlign: 'center' }]}>DRAIN</Text>
          <Text style={[S.th, { width: 40, textAlign: 'center' }]}>TARGET</Text>
        </View>
        {spells.map(sp => (
          <View key={sp.name} style={S.tableRow}>
            <Text style={[S.tdName, { flex: 1 }]}>{sp.name}</Text>
            <Text style={[S.tdStat, { width: 38 }]}>{sp.category.charAt(0).toUpperCase() + sp.category.slice(1)}</Text>
            <Text style={[S.tdStat, { width: 24 }]}>{sp.typePhy ? 'Physical' : 'Mana'}</Text>
            <Text style={[S.tdStat, { width: 18 }]}>{sp.force}</Text>
            <Text style={[S.tdStat, { width: 24 }]}>{sp.drainCode ?? '—'}</Text>
            <Text style={[S.tdStat, { width: 40 }]}>{sp.target ?? '—'}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function SkillsList({ skills }: { skills: PdfData['skills'] }) {
  return (
    <View>
      {skills.map(sk => (
        <View key={sk.name} style={S.skillItem}>
          <View style={S.skillMainRow}>
            <Text style={S.skillName}>{sk.name}</Text>
            <Text style={S.skillRating}>{sk.generalRating}</Text>
            <Pips rating={sk.generalRating} />
          </View>
          {sk.concentration && (
            <View style={S.skillConcRow}>
              <Text style={S.skillConcName}>› {sk.concentration}</Text>
              <Text style={S.skillConcRat}>{sk.concRating}</Text>
              <Pips rating={sk.concRating ?? 0} />
            </View>
          )}
          {sk.specialization && (
            <View style={S.skillSpecRow}>
              <Text style={S.skillSpecName}>»» {sk.specialization}</Text>
              <Text style={S.skillSpecRat}>{sk.specRating}</Text>
              <Pips rating={sk.specRating ?? 0} />
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

function CyberwareList({ cyberware }: { cyberware: PdfData['cyberware'] }) {
  if (!cyberware.length) return null;
  return (
    <View>
      {cyberware.map(cw => (
        <View key={cw.name}>
          <View style={S.cwRow}>
            <Text style={S.cwName}>{cw.name}</Text>
            <Text style={S.cwEss}>{cw.essenceCost.toFixed(1)}E</Text>
          </View>
          {cw.effect && <Text style={S.cwEffect}>{cw.effect}</Text>}
        </View>
      ))}
    </View>
  );
}

// ── Main document ─────────────────────────────────────────────────────────────

export function CharacterPdf({ data }: { data: PdfData }) {
  const {
    runnerName, archetypeName, metatypeName, magicLabel, sex, age, origin,
    characterCode, attrs, initLabel, startingCash, karmaPool, priorityDisplay,
    combatPool, taskPool, spellPool, skills, weapons, armors, cyberware,
    spells, gear, lifestyle, decks, vehicles, contacts,
    realName, pastProfession, personality, moralCode, goals, lovesHates,
    languages, appearance, background, metatypeTraits,
  } = data;

  const sysId = `SYSTEM ID: ${characterCode}`;
  const credit = 'FASA CORP © 2054  ·  UNAUTHORIZED DUPLICATION PUNISHABLE BY DEATH';

  return (
    <Document>

      {/* ═══════════════════════════════════════════════════════════════
          PAGE 1 — COMBAT SHEET
      ═══════════════════════════════════════════════════════════════ */}
      <Page size="LETTER" style={S.page}>

        {/* Banner */}
        <View style={S.banner}>
          <Text style={S.bannerL}>SHADOWRUN 2ND EDITION  ·  CHARACTER RECORD</Text>
          <Text style={S.bannerR}>STATUS: ACTIVE  ·  RUNNER: CLEARED</Text>
        </View>

        {/* Identity */}
        <View style={S.identityBlock}>
          <View>
            <Text style={S.runnerName}>{runnerName}</Text>
            <Text style={S.archetypeLine}>{archetypeName.toUpperCase()}</Text>
            <Text style={S.metaLine}>
              {metatypeName} {sex === 'M' ? 'Male' : 'Female'}  ·  Age {age}  ·  {magicLabel}  ·  {origin}
            </Text>
          </View>
          <View style={S.identityRight}>
            <View style={S.codeBadge}>
              <Text style={S.codeLabel}>RUNNER ID</Text>
              <Text style={S.codeValue}>{characterCode}</Text>
            </View>
          </View>
        </View>

        {/* Attributes */}
        <View style={S.attrRow}>
          {attrs.map(({ abbr, val, isDim }) => (
            <View key={abbr} style={[S.attrBox, isDim ? S.attrBoxDim : {}]}>
              <Text style={S.attrLabel}>{abbr}</Text>
              <Text style={[S.attrValue, isDim ? S.attrValueDim : {}]}>
                {Number.isInteger(val) ? String(val) : val.toFixed(1)}
              </Text>
            </View>
          ))}
        </View>

        {/* Stats bar */}
        <View style={S.statsBar}>
          <View style={S.statsBarItem}>
            <Text style={S.statsBarLabel}>INITIATIVE</Text>
            <Text style={S.statsBarValue}>{initLabel}</Text>
          </View>
          <View style={S.statsBarItem}>
            <Text style={S.statsBarLabel}>CASH</Text>
            <Text style={S.statsBarValue}>¥{startingCash.toLocaleString()}</Text>
          </View>
          <View style={S.statsBarItem}>
            <Text style={S.statsBarLabel}>KARMA POOL</Text>
            <Text style={S.statsBarValue}>{karmaPool}</Text>
          </View>
          <Text style={S.priStr}>{priorityDisplay}</Text>
        </View>

        {/* Stats strip — Condition | Pools | Protection */}
        <View style={S.statsStrip}>
          <View style={S.stripPanel}>
            <SecHeader label="CONDITION MONITOR" />
            <View style={S.secBody}><ConditionMonitor /></View>
          </View>
          <View style={S.stripPanel}>
            <SecHeader label="DICE POOLS" />
            <View style={S.secBody}>
              <DicePools combat={combatPool} task={taskPool} spell={spellPool} karma={karmaPool} />
            </View>
          </View>
          <View style={S.stripPanel}>
            <SecHeader label="PROTECTION" />
            <View style={S.secBody}><ProtectionPanel armors={armors} /></View>
          </View>
        </View>

        {/* Weapons */}
        <WeaponsTable weapons={weapons} />

        {/* Skills + Cyberware */}
        <View style={S.twoCol}>
          <View style={S.colSkills}>
            <SecHeader label="SKILLS" />
            <View style={S.secBody}><SkillsList skills={skills} /></View>
          </View>
          {cyberware.length > 0 && (
            <View style={S.colRight}>
              <SecHeader label="CYBERWARE" />
              <View style={S.secBody}><CyberwareList cyberware={cyberware} /></View>
            </View>
          )}
        </View>

        {/* Racial traits */}
        {metatypeTraits && (
          <View style={{ marginBottom: 8 }}>
            <SecHeader label="RACIAL TRAITS" />
            <View style={S.secBody}>
              <Text style={{ color: C.text, fontSize: 7, lineHeight: 1.4 }}>{metatypeTraits}</Text>
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={S.footer} fixed>
          <Text style={S.footerText}>{sysId}  ·  {credit}</Text>
          <Text style={S.footerText}>1 / 2</Text>
        </View>
      </Page>

      {/* ═══════════════════════════════════════════════════════════════
          PAGE 2 — BACKGROUND & EQUIPMENT
      ═══════════════════════════════════════════════════════════════ */}
      <Page size="LETTER" style={S.page}>

        <View style={S.banner}>
          <Text style={S.bannerL}>SHADOWRUN 2ND EDITION  ·  CHARACTER RECORD</Text>
          <Text style={S.bannerR}>{runnerName.toUpperCase()}  ·  {archetypeName.toUpperCase()}</Text>
        </View>

        {/* Spells */}
        <SpellsTable spells={spells} />

        {/* Cyberdeck */}
        {decks.length > 0 && (
          <View style={{ marginBottom: 8 }}>
            <SecHeader label="CYBERDECK" />
            <View style={S.secBody}>
              <View style={S.tableHead}>
                <Text style={[S.th, { flex: 1 }]}>DECK</Text>
                <Text style={[S.th, { width: 24, textAlign: 'center' }]}>MPCP</Text>
                <Text style={[S.th, { width: 24, textAlign: 'center' }]}>HARD</Text>
                <Text style={[S.th, { width: 36, textAlign: 'center' }]}>ACTIVE</Text>
                <Text style={[S.th, { width: 36, textAlign: 'center' }]}>STORAGE</Text>
                <Text style={[S.th, { width: 24, textAlign: 'center' }]}>I/O</Text>
                <Text style={[S.th, { width: 24, textAlign: 'center' }]}>+RESP</Text>
              </View>
              {decks.map(d => (
                <View key={d.name} style={S.tableRow}>
                  <Text style={[S.tdName, { flex: 1 }]}>{d.name}</Text>
                  <Text style={[S.tdStat, { width: 24 }]}>{d.mpcp ?? '—'}</Text>
                  <Text style={[S.tdStat, { width: 24 }]}>{d.hardening ?? '—'}</Text>
                  <Text style={[S.tdStat, { width: 36 }]}>{d.activeMb != null ? `${d.activeMb}Mb` : '—'}</Text>
                  <Text style={[S.tdStat, { width: 36 }]}>{d.storageMb != null ? `${d.storageMb}Mb` : '—'}</Text>
                  <Text style={[S.tdStat, { width: 24 }]}>{d.ioSpeed ?? '—'}</Text>
                  <Text style={[S.tdStat, { width: 24 }]}>+{d.responseIncrease ?? 0}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Equipment */}
        {(gear.length > 0 || lifestyle) && (
          <View style={{ marginBottom: 8 }}>
            <SecHeader label="EQUIPMENT" />
            <View style={S.secBody}>
              {gear.map(g => (
                <View key={g.name} style={S.gearRow}>
                  <Text style={S.gearName}>{g.name}</Text>
                  {g.costNuyen > 0 && <Text style={S.gearCost}>¥{g.costNuyen.toLocaleString()}</Text>}
                </View>
              ))}
              {lifestyle && (
                <View style={S.lifestyleRow}>
                  <Text style={S.lifestyleLabel}>LIFESTYLE</Text>
                  <Text style={S.lifestyleValue}>{lifestyle}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Vehicles */}
        {vehicles.length > 0 && (
          <View style={{ marginBottom: 8 }}>
            <SecHeader label="VEHICLES" />
            <View style={S.secBody}>
              <View style={S.tableHead}>
                <Text style={[S.th, { flex: 1 }]}>VEHICLE</Text>
                <Text style={[S.th, { width: 20, textAlign: 'center' }]}>HAND</Text>
                <Text style={[S.th, { width: 24, textAlign: 'center' }]}>SPEED</Text>
                <Text style={[S.th, { width: 20, textAlign: 'center' }]}>ACCEL</Text>
                <Text style={[S.th, { width: 20, textAlign: 'center' }]}>BODY</Text>
                <Text style={[S.th, { width: 20, textAlign: 'center' }]}>ARM</Text>
                <Text style={[S.th, { width: 16, textAlign: 'center' }]}>SIG</Text>
                <Text style={[S.th, { width: 22, textAlign: 'center' }]}>PILOT</Text>
                <Text style={[S.th, { width: 22, textAlign: 'center' }]}>SEATS</Text>
              </View>
              {vehicles.map(v => (
                <View key={v.name} style={S.tableRow}>
                  <Text style={[S.tdName, { flex: 1 }]}>{v.name}</Text>
                  <Text style={[S.tdStat, { width: 20 }]}>{v.vehHandling ?? '—'}</Text>
                  <Text style={[S.tdStat, { width: 24 }]}>{v.vehSpeed ?? '—'}</Text>
                  <Text style={[S.tdStat, { width: 20 }]}>{v.vehAccel ?? '—'}</Text>
                  <Text style={[S.tdStat, { width: 20 }]}>{v.vehBody ?? '—'}</Text>
                  <Text style={[S.tdStat, { width: 20 }]}>{v.vehArmor ?? '—'}</Text>
                  <Text style={[S.tdStat, { width: 16 }]}>{v.vehSignature ?? '—'}</Text>
                  <Text style={[S.tdStat, { width: 22 }]}>{v.vehPilot ?? '—'}</Text>
                  <Text style={[S.tdStat, { width: 22 }]}>{v.vehSeats ?? '—'}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Contacts */}
        <View style={{ marginBottom: 8 }}>
          <SecHeader label="CONTACTS" />
          <View style={S.secBody}>
            <View style={S.contactsGrid}>
              {contacts.map(c => (
                <View key={c.name} style={S.contactCard}>
                  <Text style={S.contactName}>{c.name}</Text>
                  <Text style={S.contactRole}>{c.role}</Text>
                  <View style={S.contactRats}>
                    <Text style={S.contactRL}>L </Text>
                    <Text style={S.contactRV}>{c.loyalty}</Text>
                    <Text style={S.contactRL}>  C </Text>
                    <Text style={S.contactRV}>{c.connection}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Additional Details */}
        <View style={{ marginBottom: 8 }}>
          <SecHeader label="ADDITIONAL DETAILS" />
          <View style={S.secBody}>
            {([
              ['LEGAL NAME',    realName],
              ['PAST',          pastProfession],
              ['PERSONALITY',   personality],
              ['MORAL CODE',    moralCode],
              ['GOALS',         goals],
              ['LOVES / HATES', lovesHates],
              ['LANGUAGES',     languages],
              ['APPEARANCE',    appearance],
            ] as [string, string][]).map(([label, value]) => (
              <View key={label} style={S.detailRow}>
                <Text style={S.detailLabel}>{label}</Text>
                <Text style={S.detailValue}>{value}</Text>
              </View>
            ))}
            <View style={S.detailRow}>
              <Text style={S.detailLabel}>BACKGROUND</Text>
              <Text style={S.bgText}>{background}</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={S.footer} fixed>
          <Text style={S.footerText}>{sysId}  ·  {credit}</Text>
          <Text style={S.footerText}>2 / 2</Text>
        </View>
      </Page>

    </Document>
  );
}
