// ── Primitives ────────────────────────────────────────────────────────────────

export type Edition          = 'sr2';
export type MagicDisposition = 'full_magic' | 'adept' | 'mundane';
export type PriorityLevel    = 'A' | 'B' | 'C' | 'D' | 'E';

export type ArchetypeId =
  | 'street_samurai' | 'mage' | 'shaman' | 'physical_adept'
  | 'decker' | 'rigger' | 'face' | 'combat_mage' | 'investigator';

export type MetatypeId = 'human' | 'elf' | 'dwarf' | 'ork' | 'troll';

export type AttributeKey =
  | 'body' | 'quickness' | 'strength'
  | 'charisma' | 'intelligence' | 'willpower';

export type PriorityCategory = 'race' | 'magic' | 'attributes' | 'skills' | 'resources';

// ── Intent (engine input) ──────────────────────────────────────────────────────

export interface CharacterIntent {
  edition:          Edition;
  archetype:        ArchetypeId;
  magicDisposition: MagicDisposition;
  metatypeHint?:    MetatypeId;
  seed:             number; // uint32 — master seed; derives every section unless overridden
  axisCode?:        string; // 6-char encoding of quiz axis scores, e.g. "385617"
  // Per-section seed overrides set by partial rerolls. Each stage uses
  // seedOverrides[stage] when present, else falls back to childSeed(seed, stage).
  seedOverrides?:   Partial<Record<'attributes' | 'skills' | 'resources', number>>;
}

// ── Pipeline intermediates ────────────────────────────────────────────────────

export type PriorityAssignment = Record<PriorityCategory, PriorityLevel>;

export type AttributeBlock = Record<AttributeKey, number> & {
  essence:  number; // always 6.0 minus cyberware costs
  magic:    number; // 0 if mundane; = floor(essence) if awakened
  reaction: number; // derived: floor((quickness + intelligence) / 2)
};

export interface SkillRating {
  skillId:         string;
  rating:          number;
  concentration?:  string; // full rating inside; rating-1 outside
  specialization?: string; // +2 dice within concentration
}

export interface CyberwareItem {
  cyberwareId:  string;
  essenceCost:  number;
  costNuyen:    number;
}

export interface GearItem {
  gearId:    string;
  costNuyen: number;
  quantity:  number;
}

export interface SpellSelection {
  spellId: string;
  force:   number;
}

export interface Loadout {
  cyberware:   CyberwareItem[];
  gear:        GearItem[];
  spells:      SpellSelection[];
  remainingNuyen: number;
  remainingForcePoints: number;
  purchasedContactCount: number;
}

// ── Character (engine output) ─────────────────────────────────────────────────

export interface Character {
  intent:     CharacterIntent;
  priorities: PriorityAssignment;
  metatype:   MetatypeId;
  attributes: AttributeBlock;
  skills:     SkillRating[];
  loadout:    Loadout;
  karmaPool:  number;
  startingCash: number; // residual nuyen × 0.1
}

// ── Validation ────────────────────────────────────────────────────────────────

export interface ValidationError {
  field:   string;
  message: string;
}

export interface ValidationReport {
  valid:  boolean;
  errors: ValidationError[];
}
