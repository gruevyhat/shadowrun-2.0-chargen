import type { AttributeBlock } from './types';

// SR2 attribute abbreviations used in melee damage codes
const ATTR_KEY: Record<string, keyof AttributeBlock> = {
  str: 'strength',
  bod: 'body',
  qui: 'quickness',
  wil: 'willpower',
  int: 'intelligence',
  cha: 'charisma',
};

// "(Str)L", "(Str+2)M", "(Str-1)S" → resolved power + level
// Flat codes like "9M", "18D", "7S(stun)" are returned unchanged.
export function resolveWeaponDamage(code: string, attrs: AttributeBlock): string {
  const match = code.match(/^\(([A-Za-z]{2,3})([+-]\d+)?\)([LMSD])(.*)$/);
  if (!match) return code;

  const [, abbr, modifier, level, suffix] = match;
  const attrKey = ATTR_KEY[abbr.toLowerCase()];
  if (attrKey == null) return code;

  const base  = attrs[attrKey] as number;
  const mod   = modifier ? parseInt(modifier, 10) : 0;
  const power = Math.max(0, base + mod);
  return `${power}${level}${suffix ?? ''}`;
}
