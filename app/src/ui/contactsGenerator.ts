import { makeRng, childSeed, randInt } from '../engine/rng';
import type { ArchetypeId } from '../engine/types';

export interface Contact {
  name: string;
  role: string;
  loyalty: number;
  connection: number;
}

const FIRST_NAMES = [
  'Alex', 'Chen', 'Dana', 'Yuki', 'Marcus', 'Nadia', 'Tomas', 'Zara',
  'Ivan', 'Suki', 'Paco', 'Reza', 'Jo', 'Kai', 'Dom', 'Mira',
  'Vlad', 'Anya', 'Rei', 'Sam', 'Lexa', 'Dex', 'Petra', 'Hamid',
  'Lin', 'Bryn', 'Yash', 'Moe', 'Rina', 'Teo',
];

const LAST_NAMES = [
  'Vanek', 'Cruz', 'Nakamura', 'Okafor', 'Petrov', 'Singh', 'Martinez',
  'Wolff', 'Park', 'Reyes', 'Braun', 'Yamamoto', 'Hassan', 'Rivera',
  'Kowalski', 'Obi', 'Tanaka', 'Mendez', 'Kovar', 'Diallo',
];

// All 6 contact roles per archetype; first 2 are the "free" contacts
const ARCHETYPE_CONTACTS: Record<ArchetypeId, string[]> = {
  street_samurai: ['Fixer',      'Arms Dealer',      'Street Doc',        'Mercenary',          'Fence',                 'Corporate Insider'],
  mage:           ['Fixer',      'Talismonger',       'Hermetic Scholar',  'Fellow Mage',        'Awakened Fence',        'Library Archivist'],
  shaman:         ['Fixer',      'Tribal Elder',      'Healer',            'Nature Guide',       'Street Shaman',         'Spirit Talker'],
  physical_adept: ['Fixer',      'Sensei',            'Street Doc',        'Street Samurai',     'Adept Circle Contact',  'Dojo Supplier'],
  decker:         ['Fixer',      'System Operator',   'Tech Fence',        'Corporate Insider',  'Black Market Coder',    'Ghost in the Shell'],
  rigger:         ['Fixer',      'Chop Shop Owner',   'Parts Dealer',      'Driver Network',     'Drone Supplier',        'Garage Hermit'],
  face:           ['Fixer',      'Mr. Johnson',       'Club Owner',        'Corporate Liaison',  'Info Broker',           'Socialite Contact'],
  combat_mage:    ['Fixer',      'Talismonger',       'Military Contact',  'Battle Mage',        'Awakened Armourer',     'Black Site Contact'],
  investigator:   ['Fixer',      'Info Broker',       'Street Informant',  'Police Contact',     'Corp Whistleblower',    'Underworld Ear'],
};

export function generateContacts(seed: number, archetype: ArchetypeId, count = 2): Contact[] {
  const roles = ARCHETYPE_CONTACTS[archetype];

  return Array.from({ length: count }, (_, i) => {
    const crng = makeRng(childSeed(seed, `contact_${i}`));
    const first = FIRST_NAMES[randInt(crng, FIRST_NAMES.length)];
    const last  = LAST_NAMES[randInt(crng, LAST_NAMES.length)];
    const role  = roles[i % roles.length];
    return {
      name:       `${first} ${last}`,
      role,
      loyalty:    1 + randInt(crng, 4),
      connection: 1 + randInt(crng, 5),
    };
  });
}
