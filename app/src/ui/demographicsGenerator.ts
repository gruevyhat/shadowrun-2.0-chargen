import { makeRng, childSeed, randInt } from '../engine/rng';
import type { ArchetypeId, MetatypeId } from '../engine/types';

export interface Demographics {
  age:        number;
  sex:        string;
  origin:     string;
  appearance: string;
}

const AGE_RANGES: Record<MetatypeId, [number, number]> = {
  human: [22, 50],
  elf:   [25, 90],
  dwarf: [28, 80],
  ork:   [18, 32],
  troll: [18, 40],
};

const SEXES = ['M', 'F'];

export const ORIGINS = [
  'Seattle', 'Tokyo', 'Hong Kong', 'Berlin', 'New York',
  'Chicago', 'Detroit', 'Los Angeles', 'Denver', 'Portland',
  'London', 'San Francisco', 'Boston', 'Caracas', 'Mumbai',
  'Shanghai', 'Cape Town', 'Aztlán', 'Tír Tairngire', 'Salish-Shidhe',
];

const BASE_APPEARANCE: Record<MetatypeId, { M: string[]; F: string[] }> = {
  human: {
    M: ['lean and sharp-featured', 'broad-shouldered with a street-worn face', 'nondescript — the face the cameras miss', 'compact, quick-eyed, forgettable'],
    F: ['wiry and watchful', 'sharp-jawed with a runner\'s economy of movement', 'forgettable face, memorable presence', 'slight frame, eyes that log everything'],
  },
  elf: {
    M: ['angular features and unnerving stillness', 'silver-haired with centuries behind the eyes', 'fine-boned and eerily graceful'],
    F: ['razor-cheekboned, eyes like cut glass', 'impossibly graceful, with an edge underneath', 'tall, pale, predator-still'],
  },
  dwarf: {
    M: ['barrel-chested and immovable', 'compact and gnarled like old cable', 'stocky, scarred, and built for staying'],
    F: ['solid as ferrocrete, half the height', 'sharp-eyed and built like a clenched fist', 'dense muscle under a deceptively small frame'],
  },
  ork: {
    M: ['tusked, broad, and visibly dangerous', 'scarred and heavy-browed, carries weight well', 'greenish-grey skin, close-cropped hair, eyes like flint'],
    F: ['lean with prominent tusks and eyes that cut', 'athletic and tattooed — dares you to stare', 'wiry, fast, with a tusk-bared smile that ends conversations'],
  },
  troll: {
    M: ['two meters of horned threat', 'grey-plated skin, dead eyes, absolute presence', 'massive and horned, wears it like armour'],
    F: ['horned and taller than most doorframes', 'massive, plated by nature, moves with surprising precision', 'towering, dermal ridges visible at collar and wrists'],
  },
};

const ARCHETYPE_STYLE: Record<ArchetypeId, string[]> = {
  bodyguard:          ['professional stance, eyes always working the room',                  'gear worn functionally — nothing decorative, nothing loose'],
  combat_mage:        ['military frame, runic tattoos on the forearms',                      'controlled aggression in every movement, mana-focus at the hip'],
  decker:             ['datajack glinting behind the ear, deck slung low on the hip',        'hoodie and fingerless gloves, eyes always scanning'],
  detective:          ['coat that has seen better decades, pockets perpetually full',        'watching everything, remembering more'],
  former_company_man: ['corp-issue posture they\'ve never fully shed',                       'quality gear worn carefully — someone who knows what things cost'],
  former_wage_mage:   ['formal but frayed, hermetic seals stitched into the lapels',         'carries a focus like other people carry weapons'],
  gang_member:        ['gang colours, street ink, posture that owns the block',              'lean and fast-looking, everything about them says local'],
  mercenary:          ['military bearing worn loose, gear chosen for function over flash',   'eyes that read terrain before people — a professional habit'],
  physical_adept:     ['moves like something predatory even standing still',                 'no chrome, no visible augmentation — all of it is inside'],
  rigger:             ['grease-stained and wired, tools on the belt',                        'goggle marks around the eyes, smells faintly of engine'],
  shaman:             ['bone fetishes and hand-stitched leathers, paint on the cheekbones', 'spirit-touched calm, eyes focused somewhere else'],
  street_mage:        ['street clothes layered over ritual kit',                             'focus hidden in plain sight, mana-sight gives the eyes a distant quality'],
  street_samurai:     ['chrome visible at the wrists, scars arranged like a biography',     'military posture, gear worn like a second skin'],
  street_shaman:      ['urban fetishes worked into jacket and belt, city-worn',              'calm amid noise, reads the block like a spirit map'],
  tribesman:          ['natural materials, practical and precise',                           'stillness that reads as patience — or threat, depending on context'],
};

export function generateDemographics(seed: number, metatype: MetatypeId, archetype?: ArchetypeId): Demographics {
  const rng = makeRng(childSeed(seed, 'demographics'));
  const [minAge, maxAge] = AGE_RANGES[metatype];
  const sex    = SEXES[randInt(rng, SEXES.length)];
  const origin = ORIGINS[randInt(rng, ORIGINS.length)];

  const basePool  = BASE_APPEARANCE[metatype][sex as 'M' | 'F'];
  const base      = basePool[randInt(rng, basePool.length)];
  const stylePool = archetype ? ARCHETYPE_STYLE[archetype] : null;
  const style     = stylePool ? stylePool[randInt(rng, stylePool.length)] : null;
  const appearance = style ? `${base[0].toUpperCase()}${base.slice(1)}. ${style[0].toUpperCase()}${style.slice(1)}.` : `${base[0].toUpperCase()}${base.slice(1)}.`;

  return {
    age: minAge + randInt(rng, maxAge - minAge + 1),
    sex,
    origin,
    appearance,
  };
}
