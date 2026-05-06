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
  bodyguard:          ['Fixer',  'Arms Dealer',       'Street Doc',        'Corp Security Chief', 'Fence',              'Loyal Client'],
  combat_mage:        ['Fixer',  'Talismonger',       'Military Contact',  'Battle Mage',         'Awakened Armourer',  'Black Site Contact'],
  decker:             ['Fixer',  'System Operator',   'Tech Fence',        'Corporate Insider',   'Black Market Coder', 'Ghost in the Shell'],
  detective:          ['Fixer',  'Police Contact',    'Info Broker',       'Street Informant',    'Corp Whistleblower', 'Underworld Ear'],
  former_company_man: ['Fixer',  'Corporate Insider', 'Arms Dealer',       'Street Doc',          'Old Squad Contact',  'Loyal Fixer'],
  former_wage_mage:   ['Fixer',  'Talismonger',       'Hermetic Scholar',  'Corp Mage Contact',   'Awakened Fence',     'Library Archivist'],
  gang_member:        ['Fixer',  'Gang Leader',       'Street Doc',        'Fence',               'Rival Gang Contact', 'Turf Informant'],
  mercenary:          ['Fixer',  'Arms Dealer',       'Military Contact',  'Merc Broker',         'Street Doc',         'Logistics Specialist'],
  physical_adept:     ['Fixer',  'Street Sensei',     'Healer',            'Awakened Community',  'Arms Dealer',        'Underground Fighter'],
  rigger:             ['Fixer',  'Chop Shop Owner',   'Parts Dealer',      'Driver Network',      'Drone Supplier',     'Garage Hermit'],
  shaman:             ['Fixer',  'Tribal Elder',      'Healer',            'Nature Guide',        'Spirit Talker',      'Wilderness Contact'],
  street_mage:        ['Fixer',  'Talismonger',       'Street Mage',       'Awakened Community',  'Hermetic Scholar',   'Spirit Talker'],
  street_samurai:     ['Fixer',  'Arms Dealer',       'Street Doc',        'Mercenary',           'Fence',              'Corporate Insider'],
  street_shaman:      ['Fixer',  'Urban Shaman',      'Healer',            'City Spirit Guide',   'Talismonger',        'Gang Contact'],
  tribesman:          ['Fixer',  'Tribal Elder',      'Nature Guide',      'Arms Contact',        'Healer',             'Wilderness Scout'],
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
