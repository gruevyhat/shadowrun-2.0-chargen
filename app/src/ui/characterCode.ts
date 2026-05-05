import type { ArchetypeId, MagicDisposition } from '../engine/types';
import type { AxisScores } from '../quiz/types';
import { AXIS_ORDER } from '../quiz/mapping';

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
