import type {
  AdeptPowerSelection, ArchetypeId, AttributeKey, Character, CharacterIntent,
  CyberwareItem, GearItem, MagicDisposition, MetatypeId,
  PriorityAssignment, PriorityCategory, PriorityLevel,
  SkillRating, SpellSelection,
} from '../engine/types';
import type { AttributeBlock, Loadout } from '../engine/types';
import type { AxisScores } from '../quiz/types';
import { AXIS_ORDER } from '../quiz/mapping';
import metatypesData from '../../../data/sr2/metatypes.json';

// ── Short-code tables ─────────────────────────────────────────────────────

const ARCHETYPE_TO_CODE: Record<ArchetypeId, string> = {
  bodyguard:          'bg',
  combat_mage:        'cm',
  decker:             'd',
  detective:          'det',
  former_company_man: 'fcm',
  former_wage_mage:   'fwm',
  gang_member:        'gm',
  mercenary:          'merc',
  physical_adept:     'pa',
  rigger:             'r',
  shaman:             'sh',
  street_mage:        'sm',
  street_samurai:     'ss',
  street_shaman:      'ssh',
  tribesman:          'tri',
};

const CODE_TO_ARCHETYPE: Record<string, ArchetypeId> = Object.fromEntries(
  (Object.entries(ARCHETYPE_TO_CODE) as [ArchetypeId, string][]).map(([k, v]) => [v, k]),
);

const MAGIC_TO_CODE: Record<MagicDisposition, string> = {
  full_magic: 'fm', mundane: 'mu', adept: 'ad',
};

const CODE_TO_MAGIC: Record<string, MagicDisposition> = Object.fromEntries(
  (Object.entries(MAGIC_TO_CODE) as [MagicDisposition, string][]).map(([k, v]) => [v, k]),
);

// ── Axis encoding ─────────────────────────────────────────────────────────
// Each axis value (-5..5) encoded as a single char: '0'-'9' or 'a' (=10).

function encodeAxisVal(v: number): string {
  const n = v + 5; // 0-10
  return n === 10 ? 'a' : String(n);
}

function decodeAxisVal(c: string): number {
  return (c === 'a' ? 10 : parseInt(c, 10)) - 5;
}

export function encodeAxes(scores: AxisScores): string {
  return AXIS_ORDER.map(id => encodeAxisVal(scores[id])).join('');
}

export function decodeAxes(code: string): AxisScores {
  return Object.fromEntries(
    AXIS_ORDER.map((id, i) => [id, decodeAxisVal(code[i])]),
  ) as AxisScores;
}

// ── Public types ──────────────────────────────────────────────────────────

export interface CharacterCode {
  archetype:        ArchetypeId;
  magicDisposition: MagicDisposition;
  seed:             number;
  axisScores?:      AxisScores;
}

// ── Serialize ─────────────────────────────────────────────────────────────
// Format (no axes):  archetype:magic:HEXSEED
// Format (with axes): archetype:magic:AXISBITS:HEXSEED

export function serializeCode(c: CharacterCode): string {
  const hex      = c.seed.toString(16).toUpperCase().padStart(8, '0');
  const prefix   = `${ARCHETYPE_TO_CODE[c.archetype]}:${MAGIC_TO_CODE[c.magicDisposition]}`;
  const axisPart = c.axisScores ? `:${encodeAxes(c.axisScores)}` : '';
  return `${prefix}${axisPart}:${hex}`;
}

// ── Parse ─────────────────────────────────────────────────────────────────

const LONG_ARCHETYPES = new Set<string>([
  'bodyguard', 'combat_mage', 'decker', 'detective',
  'former_company_man', 'former_wage_mage', 'gang_member', 'mercenary',
  'rigger', 'shaman', 'street_mage', 'street_samurai',
  'street_shaman', 'tribesman',
]);
const LONG_MAGIC = new Set<string>(['mundane', 'full_magic', 'adept']);

export function parseCode(input: string): CharacterCode | null {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return null;

  const parts = trimmed.split(':');
  if (parts.length < 3 || parts.length > 4) return null;

  const [archetypePart, magicPart] = parts;

  // Resolve archetype
  let archetype: ArchetypeId | undefined;
  if (CODE_TO_ARCHETYPE[archetypePart]) archetype = CODE_TO_ARCHETYPE[archetypePart];
  else if (LONG_ARCHETYPES.has(archetypePart)) archetype = archetypePart as ArchetypeId;
  if (!archetype) return null;

  // Resolve magic
  let magicDisposition: MagicDisposition | undefined;
  if (CODE_TO_MAGIC[magicPart]) magicDisposition = CODE_TO_MAGIC[magicPart];
  else if (LONG_MAGIC.has(magicPart)) magicDisposition = magicPart as MagicDisposition;
  if (!magicDisposition) return null;

  let axisPart: string | undefined;
  let seedPart: string;

  if (parts.length === 4) {
    // 4-part: archetype:magic:AXISBITS:SEED
    // AXISBITS is exactly 6 chars, each 0-9 or 'a'
    const candidate = parts[2];
    if (!/^[0-9a]{6}$/.test(candidate)) return null;
    axisPart = candidate;
    seedPart = parts[3];
  } else {
    seedPart = parts[2];
  }

  if (!/^[0-9a-f]{1,8}$/.test(seedPart)) return null;
  const seed = parseInt(seedPart, 16);
  if (!Number.isFinite(seed) || seed < 0 || seed > 0xffffffff) return null;

  const axisScores = axisPart ? decodeAxes(axisPart) : undefined;
  return { archetype, magicDisposition, seed, ...(axisScores ? { axisScores } : {}) };
}

// ── Manual build encode/decode ─────────────────────────────────────────────
// Format: "m:<base64url(compact-json)>"
// Compact JSON encodes all mechanical choices so the character can be fully
// reconstructed from the code without re-running the wizard.

interface ManualCompact {
  v:   1;
  a:   string;   // archetype short code
  mg:  string;   // magic disposition code
  mt:  MetatypeId;
  p:   [PriorityLevel, PriorityLevel, PriorityLevel, PriorityLevel, PriorityLevel]; // race,magic,attrs,skills,resources
  at:  [number, number, number, number, number, number]; // body,quick,str,cha,int,wil
  sk:  Array<[string, number] | [string, number, string]>; // [id,rating] or [id,rating,conc]
  cw:  Array<[string, number, number]>; // [id, essenceCost, costNuyen]
  gr:  Array<[string, number, number]>; // [id, costNuyen, qty]
  sp:  Array<[string, number]>;         // [id, force]
  pw:  Array<[string, number]>;         // [id, magicCost]
  s:   number;
}

const ATTR_ORDER: AttributeKey[] = ['body', 'quickness', 'strength', 'charisma', 'intelligence', 'willpower'];
const PRI_ORDER:  PriorityCategory[] = ['race', 'magic', 'attributes', 'skills', 'resources'];

export function encodeManualBuild(params: {
  archetype:        ArchetypeId;
  magicDisposition: MagicDisposition;
  metatype:         MetatypeId;
  priorities:       PriorityAssignment;
  attributes:       Record<AttributeKey, number>;
  skills:           SkillRating[];
  cyberware:        CyberwareItem[];
  gear:             GearItem[];
  spells:           SpellSelection[];
  adeptPowers:      AdeptPowerSelection[];
  seed:             number;
}): string {
  const compact: ManualCompact = {
    v:  1,
    a:  ARCHETYPE_TO_CODE[params.archetype],
    mg: MAGIC_TO_CODE[params.magicDisposition],
    mt: params.metatype,
    p:  PRI_ORDER.map(k => params.priorities[k]) as ManualCompact['p'],
    at: ATTR_ORDER.map(k => params.attributes[k]) as ManualCompact['at'],
    sk: params.skills.map(s =>
      s.concentration
        ? [s.skillId, s.rating, s.concentration]
        : [s.skillId, s.rating]
    ) as ManualCompact['sk'],
    cw: params.cyberware.map(c => [c.cyberwareId, c.essenceCost, c.costNuyen]),
    gr: params.gear.map(g => [g.gearId, g.costNuyen, g.quantity]),
    sp: params.spells.map(s => [s.spellId, s.force]),
    pw: params.adeptPowers.map(p => [p.powerId, p.magicCost]),
    s:  params.seed,
  };
  const json = JSON.stringify(compact);
  const b64  = btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  return `m:${b64}`;
}

export function decodeManualBuild(input: string): Character | null {
  if (!input.startsWith('m:')) return null;
  try {
    const b64  = input.slice(2).replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(b64);
    const c    = JSON.parse(json) as ManualCompact;
    if (c.v !== 1) return null;

    const archetype        = CODE_TO_ARCHETYPE[c.a];
    const magicDisposition = CODE_TO_MAGIC[c.mg];
    if (!archetype || !magicDisposition) return null;

    const priorities: PriorityAssignment = Object.fromEntries(
      PRI_ORDER.map((k, i) => [k, c.p[i]])
    ) as PriorityAssignment;

    const baseAttrs = Object.fromEntries(
      ATTR_ORDER.map((k, i) => [k, c.at[i]])
    ) as Record<AttributeKey, number>;

    const essenceCost = c.cw.reduce((s, cw) => s + cw[1], 0);
    const essence     = Math.max(0, parseFloat((6 - essenceCost).toFixed(2)));
    const magic       = magicDisposition !== 'mundane' ? Math.floor(essence) : 0;
    const reaction    = Math.floor((baseAttrs.quickness + baseAttrs.intelligence) / 2);

    const attributes: AttributeBlock = { ...baseAttrs, essence, magic, reaction };

    const skills: SkillRating[] = c.sk.map(entry => ({
      skillId:       entry[0],
      rating:        entry[1],
      ...(entry[2] ? { concentration: entry[2] as string } : {}),
    }));

    const cyberware: CyberwareItem[] = c.cw.map(([cyberwareId, essenceCost, costNuyen]) => ({
      cyberwareId, essenceCost, costNuyen,
    }));
    const gear: GearItem[] = c.gr.map(([gearId, costNuyen, quantity]) => ({
      gearId, costNuyen, quantity,
    }));
    const spells: SpellSelection[]     = c.sp.map(([spellId, force])   => ({ spellId, force }));
    const adeptPowers: AdeptPowerSelection[] = c.pw.map(([powerId, magicCost]) => ({ powerId, magicCost }));

    const nuyen = (() => {
      const priData = [1000000, 400000, 90000, 5000, 500]; // A-E
      const idx = (['A','B','C','D','E'] as PriorityLevel[]).indexOf(priorities.resources);
      return priData[idx] ?? 0;
    })();
    const spent = [...gear.map(g => g.costNuyen * g.quantity), ...cyberware.map(cw => cw.costNuyen)].reduce((a,b) => a+b, 0);

    const loadout: Loadout = {
      cyberware,
      gear,
      spells,
      adeptPowers,
      remainingNuyen:        Math.max(0, nuyen - spent),
      remainingForcePoints:  0,
      remainingMagicPoints:  0,
      purchasedContactCount: 0,
    };

    const metatype = c.mt;
    const meta = metatypesData.metatypes.find(m => m.id === metatype);
    const karmaPool   = meta?.isMetahuman ? 2 : 1;
    const startingCash = Math.floor(loadout.remainingNuyen / 10);

    const intent: CharacterIntent = {
      edition:          'sr2',
      archetype,
      magicDisposition,
      metatypeHint:     metatype,
      seed:             c.s,
      manualCode:       input, // preserve so SheetScreen displays the m: code
    };

    return { intent, priorities, metatype, attributes, skills, loadout, karmaPool, startingCash };
  } catch {
    return null;
  }
}
