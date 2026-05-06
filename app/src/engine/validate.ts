import type { Character, ValidationReport } from './types';
import metatypesData  from '../../../data/sr2/metatypes.json';
import priorityData   from '../../../data/sr2/priority_table.json';

const PRIORITY_LEVELS = ['A', 'B', 'C', 'D', 'E'] as const;

export function validate(c: Character): ValidationReport {
  const errors: { field: string; message: string }[] = [];

  // ── Priority assignment ───────────────────────────────────────────────────
  const levels = Object.values(c.priorities);
  const uniqueLevels = new Set(levels);
  if (uniqueLevels.size !== 5) {
    errors.push({ field: 'priorities', message: 'Each priority level A–E must appear exactly once.' });
  }
  for (const lvl of PRIORITY_LEVELS) {
    if (!levels.includes(lvl)) {
      errors.push({ field: 'priorities', message: `Priority level ${lvl} is missing.` });
    }
  }

  // ── Race priority ─────────────────────────────────────────────────────────
  const meta = metatypesData.metatypes.find(m => m.id === c.metatype);
  if (!meta) {
    errors.push({ field: 'metatype', message: `Unknown metatype: ${c.metatype}` });
  } else if (meta.isMetahuman && c.priorities.race !== 'A') {
    errors.push({ field: 'priorities.race', message: 'Metahuman characters require Race priority A.' });
  }

  // ── Magic priority ────────────────────────────────────────────────────────
  const disposition = c.intent.magicDisposition;
  const isMeta      = meta?.isMetahuman ?? false;
  const magicPri    = c.priorities.magic;

  if (disposition === 'full_magic') {
    const required = isMeta ? 'B' : 'A';
    if (magicPri !== required) {
      errors.push({ field: 'priorities.magic', message: `Full magician requires Magic priority ${required}.` });
    }
  } else if (disposition === 'adept') {
    const required = isMeta ? 'C' : 'B';
    if (magicPri !== required) {
      errors.push({ field: 'priorities.magic', message: `Adept requires Magic priority ${required}.` });
    }
  }

  // ── Attributes ────────────────────────────────────────────────────────────
  const priRow = priorityData.priorities.find(p => p.level === c.priorities.attributes)!;
  const attrKeys = ['body', 'quickness', 'strength', 'charisma', 'intelligence', 'willpower'] as const;
  const racialMax = (meta?.racialMaximums ?? {}) as Record<string, number>;
  const mods      = (meta?.attributeMods  ?? {}) as Record<string, number>;

  for (const key of attrKeys) {
    const val = c.attributes[key];
    if (val < 1) {
      errors.push({ field: `attributes.${key}`, message: `${key} must be at least 1.` });
    }
    const max = racialMax[key] ?? 6;
    if (val > max) {
      errors.push({ field: `attributes.${key}`, message: `${key} ${val} exceeds racial max ${max}.` });
    }
  }

  // Attribute points check: total spent should not exceed pool + racial mods
  // (racial mods can push above base pool, so we check net of mods)
  const totalBase = attrKeys.reduce((sum, k) => sum + c.attributes[k] - (mods[k] ?? 0), 0);
  if (totalBase > priRow.attributes.points + attrKeys.length) {
    errors.push({ field: 'attributes', message: `Total attribute points ${totalBase} exceeds pool.` });
  }

  // ── Essence & Magic ───────────────────────────────────────────────────────
  const essenceCost = c.loadout.cyberware.reduce((s, cw) => s + cw.essenceCost, 0);
  const expectedEssence = Math.max(0, 6 - essenceCost);
  // Allow floating-point tolerance
  if (Math.abs(c.attributes.essence - expectedEssence) > 0.01) {
    errors.push({ field: 'attributes.essence', message: `Essence mismatch: expected ~${expectedEssence.toFixed(2)}, got ${c.attributes.essence}.` });
  }
  if (c.attributes.essence < 0) {
    errors.push({ field: 'attributes.essence', message: 'Essence cannot be negative.' });
  }
  if (disposition !== 'mundane' && c.attributes.magic > Math.floor(c.attributes.essence)) {
    errors.push({ field: 'attributes.magic', message: 'Magic cannot exceed floor(Essence).' });
  }
  if (disposition === 'mundane' && c.attributes.magic !== 0) {
    errors.push({ field: 'attributes.magic', message: 'Mundane characters must have Magic 0.' });
  }

  // ── Adept powers ─────────────────────────────────────────────────────────
  if (disposition === 'adept' && c.loadout.adeptPowers.length > 0) {
    const totalCost = c.loadout.adeptPowers.reduce((s, p) => s + p.magicCost, 0);
    if (totalCost > c.attributes.magic + 0.01) {
      errors.push({ field: 'loadout.adeptPowers', message: `Adept power cost ${totalCost.toFixed(1)} exceeds Magic attribute ${c.attributes.magic}.` });
    }
  }

  // ── Reaction ─────────────────────────────────────────────────────────────
  const expectedReaction = Math.floor((c.attributes.quickness + c.attributes.intelligence) / 2);
  if (c.attributes.reaction !== expectedReaction) {
    errors.push({ field: 'attributes.reaction', message: `Reaction should be ${expectedReaction}, got ${c.attributes.reaction}.` });
  }

  // ── Skills ────────────────────────────────────────────────────────────────
  for (const s of c.skills) {
    if (s.rating < 1 || s.rating > 6) {
      errors.push({ field: `skills.${s.skillId}`, message: `Skill rating must be 1–6, got ${s.rating}.` });
    }
  }

  return { valid: errors.length === 0, errors };
}
