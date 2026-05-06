import { makeRng, childSeed, randInt } from '../engine/rng';
import type { ArchetypeId, MetatypeId } from '../engine/types';

// ── Archetype-themed handles ──────────────────────────────────────────────

const HANDLES: Record<'combat' | 'magic' | 'tech' | 'social', { M: string[]; F: string[] }> = {
  combat: {
    M: ['Razor', 'Ghost', 'Blade', 'Scar', 'Steel', 'Wraith', 'Trigger', 'Smoke', 'Cutter', 'Frag',
        'Burner', 'Grimm', 'Splinter', 'Rivet', 'Hatch', 'Jackknife', 'Bore', 'Slug', 'Buckshot', 'Barrage'],
    F: ['Viper', 'Lash', 'Fang', 'Toxin', 'Pierce', 'Stiletto', 'Shiv', 'Barb', 'Rend', 'Crimson',
        'Flare', 'Strike', 'Wraith', 'Sever', 'Notch', 'Trigger', 'Ghost', 'Edge', 'Vex', 'Fuse'],
  },
  magic: {
    M: ['Hex', 'Rune', 'Wyrd', 'Omen', 'Flux', 'Nox', 'Ash', 'Ember', 'Rift', 'Specter',
        'Thorn', 'Murk', 'Vesper', 'Cipher', 'Veil', 'Shroud', 'Haunt', 'Sage', 'Oracle', 'Elegy'],
    F: ['Vesper', 'Elegy', 'Oracle', 'Sigil', 'Haunt', 'Shroud', 'Spectra', 'Veil', 'Reverie', 'Cipher',
        'Rune', 'Hex', 'Ember', 'Sable', 'Wren', 'Dusk', 'Myst', 'Wraith', 'Rift', 'Shade'],
  },
  tech: {
    M: ['Wire', 'Static', 'Glitch', 'Trace', 'Socket', 'Node', 'Jammer', 'Splice', 'Null', 'Zero',
        'Crash', 'Loop', 'Patch', 'Short', 'Bridge', 'Daemon', 'Kernel', 'Vector', 'Ping', 'Leech'],
    F: ['Proxy', 'Static', 'Glitch', 'Trace', 'Splice', 'Null', 'Loop', 'Daemon', 'Kernel', 'Vector',
        'Flux', 'Cipher', 'Wire', 'Zero', 'Byte', 'Patch', 'Node', 'Ping', 'Echo', 'Shard'],
  },
  social: {
    M: ['Silk', 'Silver', 'Chrome', 'Flash', 'Mirror', 'Slick', 'Ace', 'Jazz', 'Neon', 'Dice',
        'Drift', 'Charm', 'Gilt', 'Spin', 'Riff', 'Gloss', 'Tab', 'Coil', 'Shine', 'Flicker'],
    F: ['Silk', 'Sable', 'Prism', 'Lace', 'Mirror', 'Velvet', 'Neon', 'Charm', 'Lacquer', 'Jazz',
        'Shimmer', 'Gilt', 'Gloss', 'Sheen', 'Luster', 'Silver', 'Flash', 'Satin', 'Veil', 'Ace'],
  },
};

const ARCHETYPE_THEME: Record<ArchetypeId, 'combat' | 'magic' | 'tech' | 'social'> = {
  bodyguard:          'combat',
  combat_mage:        'magic',
  decker:             'tech',
  detective:          'social',
  former_company_man: 'combat',
  former_wage_mage:   'magic',
  gang_member:        'combat',
  mercenary:          'combat',
  physical_adept:     'combat',
  rigger:             'tech',
  shaman:             'magic',
  street_mage:        'magic',
  street_samurai:     'combat',
  street_shaman:      'magic',
  tribesman:          'combat',
};

// ── Cultural first names by region ────────────────────────────────────────

const REGIONAL_FIRST: Record<string, { M: string[]; F: string[] }> = {
  asian: {
    M: ['Kenji', 'Hiro', 'Jin', 'Wei', 'Ryu', 'Shin', 'Yao', 'Kota', 'Jae', 'Min', 'Daiki', 'Taro', 'Bo', 'Sung', 'Ryota'],
    F: ['Yuki', 'Mei', 'Rin', 'Hana', 'Suki', 'Nana', 'Xiu', 'Sora', 'Yuna', 'Lin', 'Rei', 'Aoi', 'Saki', 'Miu', 'Nao'],
  },
  latin: {
    M: ['Carlos', 'Javier', 'Diego', 'Marco', 'Raul', 'Hector', 'Miguel', 'Luis', 'Pedro', 'Felipe', 'Tomas', 'Sergio', 'Mateo', 'Alejandro', 'Ernesto'],
    F: ['Elena', 'Rosa', 'Carmen', 'Sofia', 'Maria', 'Lucia', 'Valentina', 'Gabriela', 'Camila', 'Isabel', 'Marisol', 'Natalia', 'Pilar', 'Catalina', 'Esperanza'],
  },
  european: {
    M: ['Klaus', 'Viktor', 'Stefan', 'Mikhail', 'Dieter', 'Anton', 'Franz', 'Gregor', 'Ivan', 'Luca', 'Lars', 'Pascal', 'Felix', 'Tobias', 'Andrei'],
    F: ['Katarina', 'Nadia', 'Sonja', 'Anya', 'Lena', 'Vera', 'Marta', 'Elsa', 'Ingrid', 'Bianca', 'Ilse', 'Renata', 'Svea', 'Petra', 'Brigitte'],
  },
  tribal: {
    M: ['Raven', 'Hawk', 'Wolf', 'Cedar', 'Stone', 'Flint', 'Thunder', 'Bear', 'Chase', 'Ronan', 'Cormac', 'Talon', 'Brennan', 'Lir', 'Conor'],
    F: ['Dawn', 'Rain', 'Willow', 'Fawn', 'Wren', 'Ember', 'Sage', 'Dusk', 'Robin', 'Rowan', 'Niamh', 'Saoirse', 'Fern', 'Brenna', 'Meadow'],
  },
  african: {
    M: ['Kwame', 'Jabari', 'Kofi', 'Aziz', 'Chidi', 'Seun', 'Tunde', 'Nouri', 'Vikram', 'Ravi', 'Amaru', 'Obinna', 'Yemi', 'Ayo', 'Jide'],
    F: ['Amara', 'Zara', 'Fatima', 'Aisha', 'Priya', 'Nia', 'Nkechi', 'Sena', 'Bisi', 'Adaeze', 'Folake', 'Yetunde', 'Kemi', 'Ngozi', 'Fola'],
  },
};

const ORIGIN_REGION: Record<string, string> = {
  Seattle: 'ucas', 'New York': 'ucas', Chicago: 'ucas', Detroit: 'ucas',
  'Los Angeles': 'ucas', Denver: 'ucas', Portland: 'ucas', 'San Francisco': 'ucas', Boston: 'ucas',
  Tokyo: 'asian', 'Hong Kong': 'asian', Shanghai: 'asian',
  Berlin: 'european', London: 'european',
  Caracas: 'latin', Aztlán: 'latin',
  'Cape Town': 'african', Mumbai: 'african',
  'Tír Tairngire': 'tribal', 'Salish-Shidhe': 'tribal',
};

// ── Metatype handle prefixes ──────────────────────────────────────────────

const METATYPE_PREFIX: Partial<Record<MetatypeId, string[]>> = {
  troll: ['Big', 'Iron', 'Heavy', 'Stone', 'Broken', 'Cracked'],
  ork:   ['Mad', 'Bad', 'Red', 'Mean', 'Snarl', 'Ugly'],
  elf:   ['Swift', 'Pale', 'Sharp', 'True', 'Thin'],
  dwarf: ['Hard', 'Grim', 'Thick', 'Squat', 'Low'],
};

// ── Name builder ──────────────────────────────────────────────────────────

export function generateName(
  seed: number,
  archetype: ArchetypeId,
  metatype: MetatypeId,
  sex?: string,
  origin?: string,
): string {
  const rng     = makeRng(childSeed(seed, 'name'));
  const theme   = ARCHETYPE_THEME[archetype];
  const isFem   = sex === 'F';
  const region  = origin ? (ORIGIN_REGION[origin] ?? 'ucas') : 'ucas';

  const handlePool = HANDLES[theme][isFem ? 'F' : 'M'];
  const handle     = handlePool[randInt(rng, handlePool.length)];

  // Optional metatype prefix on the handle
  const prefixes = METATYPE_PREFIX[metatype];
  const prefix   = (prefixes && rng() < 0.40) ? prefixes[randInt(rng, prefixes.length)] : null;

  // Cultural first name: 60% chance for non-UCAS, 20% for UCAS
  const firstPool = REGIONAL_FIRST[region];
  const useFirst  = firstPool ? rng() < (region === 'ucas' ? 0.20 : 0.60) : false;

  if (useFirst && firstPool) {
    const firstName = firstPool[isFem ? 'F' : 'M'][randInt(rng, firstPool[isFem ? 'F' : 'M'].length)];
    // 50% blend first name with handle, 50% first name alone
    if (rng() < 0.50) {
      return prefix ? `${prefix} ${firstName} ${handle}` : `${firstName} ${handle}`;
    }
    return prefix ? `${prefix} ${firstName}` : firstName;
  }

  // Pure handle (with optional prefix)
  return prefix ? `${prefix} ${handle}` : handle;
}
