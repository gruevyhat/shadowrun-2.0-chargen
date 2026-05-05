import { describe, it, expect } from 'vitest';
import { generate, reroll } from '../generate';
import { validate } from '../validate';
import type { ArchetypeId, CharacterIntent, MagicDisposition } from '../types';

const ARCHETYPES: ArchetypeId[] = [
  'bodyguard', 'combat_mage', 'decker', 'detective',
  'former_company_man', 'former_wage_mage', 'gang_member', 'mercenary',
  'rigger', 'shaman', 'street_mage', 'street_samurai',
  'street_shaman', 'tribesman',
];

const MAGIC_BY_ARCHETYPE: Record<ArchetypeId, MagicDisposition> = {
  bodyguard:          'mundane',
  combat_mage:        'full_magic',
  decker:             'mundane',
  detective:          'mundane',
  former_company_man: 'mundane',
  former_wage_mage:   'full_magic',
  gang_member:        'mundane',
  mercenary:          'mundane',
  rigger:             'mundane',
  shaman:             'full_magic',
  street_mage:        'full_magic',
  street_samurai:     'mundane',
  street_shaman:      'full_magic',
  tribesman:          'mundane',
};

function makeIntent(archetype: ArchetypeId, seed: number): CharacterIntent {
  return {
    edition: 'sr2',
    archetype,
    magicDisposition: MAGIC_BY_ARCHETYPE[archetype],
    seed,
  };
}

describe('generate — all archetypes validate', () => {
  for (const archetype of ARCHETYPES) {
    it(`${archetype}: 1000 characters all pass validate()`, () => {
      const failures: string[] = [];
      for (let seed = 1; seed <= 1000; seed++) {
        const char = generate(makeIntent(archetype, seed));
        const report = validate(char);
        if (!report.valid) {
          failures.push(`seed=${seed}: ${report.errors.map(e => e.message).join(', ')}`);
        }
      }
      if (failures.length > 0) {
        throw new Error(`${failures.length} failures:\n${failures.slice(0, 10).join('\n')}`);
      }
    });
  }
});

describe('generate — determinism', () => {
  it('same intent always produces identical character', () => {
    for (const archetype of ARCHETYPES) {
      const intent = makeIntent(archetype, 42);
      const a = generate(intent);
      const b = generate(intent);
      expect(a).toEqual(b);
    }
  });
});

describe('generate — archetype distributions differ meaningfully', () => {
  function avgAttr(archetype: ArchetypeId, attr: keyof typeof ARCHETYPES, n = 200) {
    let sum = 0;
    for (let i = 1; i <= n; i++) {
      const char = generate(makeIntent(archetype, i));
      sum += (char.attributes as Record<string, number>)[attr as string];
    }
    return sum / n;
  }

  it('street_samurai mean body > street_mage mean body', () => {
    expect(avgAttr('street_samurai', 'body' as never)).toBeGreaterThan(avgAttr('street_mage', 'body' as never));
  });

  it('street_mage mean intelligence > street_samurai mean intelligence', () => {
    expect(avgAttr('street_mage', 'intelligence' as never)).toBeGreaterThan(avgAttr('street_samurai', 'intelligence' as never));
  });

  it('gang_member mean charisma > rigger mean charisma', () => {
    expect(avgAttr('gang_member', 'charisma' as never)).toBeGreaterThan(avgAttr('rigger', 'charisma' as never));
  });
});

describe('reroll — isolation', () => {
  it('rerolling skills does not change attributes', () => {
    const intent = makeIntent('street_samurai', 99);
    const original = generate(intent);
    const rerolled = reroll(original, 'skills', 12345);
    expect(rerolled.attributes).toEqual(original.attributes);
    expect(rerolled.metatype).toEqual(original.metatype);
    expect(rerolled.priorities).toEqual(original.priorities);
  });

  it('rerolling resources does not change skills', () => {
    const intent = makeIntent('decker', 77);
    const original = generate(intent);
    const rerolled = reroll(original, 'resources', 99999);
    expect(rerolled.skills).toEqual(original.skills);
    expect(rerolled.metatype).toEqual(original.metatype);
    expect(rerolled.priorities).toEqual(original.priorities);
  });

  it('reroll all produces a different character with different seed', () => {
    const intent = makeIntent('street_mage', 1);
    const original = generate(intent);
    const rerolled = reroll(original, 'all', 2);
    expect(rerolled.intent.seed).toBe(2);
  });

  it('reroll all with same seed reproduces original', () => {
    const intent = makeIntent('street_mage', 1);
    const original = generate(intent);
    const rerolled = reroll(original, 'all', 1);
    expect(rerolled.attributes).toEqual(original.attributes);
    expect(rerolled.skills).toEqual(original.skills);
  });
});

describe('generate — magic characters have spells', () => {
  it('street_mage always has spells', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const char = generate(makeIntent('street_mage', seed));
      expect(char.loadout.spells.length).toBeGreaterThan(0);
    }
  });

  it('street_samurai never has spells', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const char = generate(makeIntent('street_samurai', seed));
      expect(char.loadout.spells.length).toBe(0);
    }
  });
});

describe('generate — cyberware and essence', () => {
  it('street_samurai usually has cyberware', () => {
    let count = 0;
    for (let seed = 1; seed <= 100; seed++) {
      const char = generate(makeIntent('street_samurai', seed));
      if (char.loadout.cyberware.length > 0) count++;
    }
    expect(count).toBeGreaterThan(60);
  });

  it('essence is always between 0 and 6', () => {
    for (const archetype of ARCHETYPES) {
      for (let seed = 1; seed <= 20; seed++) {
        const char = generate(makeIntent(archetype, seed));
        expect(char.attributes.essence).toBeGreaterThanOrEqual(0);
        expect(char.attributes.essence).toBeLessThanOrEqual(6);
      }
    }
  });
});
