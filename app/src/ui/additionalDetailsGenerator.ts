import { makeRng, childSeed, randInt } from '../engine/rng';
import type { ArchetypeId, MetatypeId, MagicDisposition } from '../engine/types';
import type { Demographics } from './demographicsGenerator';

export interface AdditionalDetails {
  realName:       string;
  background:     string;
  pastProfession: string;
  personality:    string;
  moralCode:      string;
  goals:          string;
  lovesHates:     string;
  languages:      string[];
}

// ── Real names by origin region ────────────────────────────────────────────

const ORIGIN_REGION: Record<string, string> = {
  Seattle: 'ucas', 'New York': 'ucas', Chicago: 'ucas', Detroit: 'ucas',
  'Los Angeles': 'ucas', Denver: 'ucas', Portland: 'ucas', 'San Francisco': 'ucas', Boston: 'ucas',
  Tokyo: 'asian', 'Hong Kong': 'asian', Shanghai: 'asian',
  Berlin: 'european', London: 'european',
  Caracas: 'latin', Aztlán: 'latin',
  'Cape Town': 'african', Mumbai: 'african',
  'Tír Tairngire': 'tribal', 'Salish-Shidhe': 'tribal',
};

const REAL_NAMES: Record<string, { M: string[]; F: string[]; last: string[] }> = {
  ucas: {
    M:    ['James', 'Marcus', 'Tyler', 'Kevin', 'Derek', 'Nathan', 'Cole', 'Dante', 'Ryan', 'Aaron', 'Jared', 'Craig'],
    F:    ['Sarah', 'Amber', 'Casey', 'Morgan', 'Taylor', 'Jade', 'Lauren', 'Skye', 'Bri', 'Ash', 'Dana', 'Kylie'],
    last: ['Walker', 'Torres', 'Chen', 'Kim', 'Okafor', 'Petrov', 'Nguyen', 'Harris', 'Reyes', 'West', 'Scott', 'Diaz'],
  },
  asian: {
    M:    ['Kenji', 'Taro', 'Wei', 'Hiro', 'Shin', 'Jun', 'Ryo', 'Takeshi', 'Min', 'Bo', 'Daiki', 'Yuta'],
    F:    ['Yuki', 'Mei', 'Saki', 'Rin', 'Hana', 'Yua', 'Aoi', 'Nana', 'Rei', 'Miu', 'Sora', 'Yuna'],
    last: ['Nakamura', 'Tanaka', 'Yamamoto', 'Li', 'Wang', 'Zhang', 'Sato', 'Chen', 'Park', 'Kim', 'Suzuki', 'Ito'],
  },
  european: {
    M:    ['Klaus', 'Erik', 'Stefan', 'Mikael', 'Luca', 'Christoph', 'Andrei', 'Felix', 'Dmitri', 'Pascal', 'Tobias', 'Lars'],
    F:    ['Anya', 'Katrin', 'Petra', 'Svea', 'Lena', 'Marta', 'Ilse', 'Vera', 'Nadine', 'Brigitte', 'Sigrid', 'Hilde'],
    last: ['Wolff', 'Fischer', 'Schmidt', 'Braun', 'Kovacs', 'Novak', 'Müller', 'Kowalski', 'Petersen', 'Bergmann', 'Richter', 'Weber'],
  },
  latin: {
    M:    ['Miguel', 'Carlos', 'Diego', 'Javier', 'Marco', 'Ramón', 'Tomas', 'Sergio', 'Luis', 'Alejandro', 'Felipe', 'Mateo'],
    F:    ['Sofia', 'Isabel', 'Carmen', 'Rosa', 'Valentina', 'Camila', 'Lucia', 'Marisol', 'Elena', 'Natalia', 'Gabriela', 'Pilar'],
    last: ['Reyes', 'Mendez', 'Cruz', 'Rivera', 'Torres', 'Gomez', 'Ramirez', 'Diaz', 'Vega', 'Morales', 'Fuentes', 'Castillo'],
  },
  african: {
    M:    ['Kwame', 'Tunde', 'Kofi', 'Jabari', 'Chidi', 'Aziz', 'Nouri', 'Vikram', 'Ravi', 'Amaru', 'Seun', 'Obinna'],
    F:    ['Amara', 'Nadia', 'Fatima', 'Zara', 'Aisha', 'Priya', 'Nkechi', 'Adaeze', 'Nia', 'Sena', 'Bisi', 'Folake'],
    last: ['Okafor', 'Diallo', 'Hassan', 'Singh', 'Patel', 'Obi', 'Mensah', 'Abubakar', 'Krishnan', 'Adeyemi', 'Nwosu', 'Eze'],
  },
  tribal: {
    M:    ['Cormac', 'Brennan', 'Talon', 'Cedar', 'Stone', 'River', 'Ashwin', 'Lir', 'Conor', 'Ronan', 'Hawk', 'Birch'],
    F:    ['Niamh', 'Saoirse', 'Willow', 'Fern', 'Dawn', 'Rowan', 'Brenna', 'Isolde', 'Sierra', 'Meadow', 'Rain', 'Wren'],
    last: ['MacReady', 'Thundercloud', 'Greensong', 'Windwalker', 'Stormcrow', 'Ironfoot', 'Swiftwater', 'Darkwood', 'Firethorn', 'Ashford'],
  },
};

// ── Languages by origin region ─────────────────────────────────────────────

const ORIGIN_LANGUAGES: Record<string, string[]> = {
  ucas:     ['English'],
  asian:    ['Japanese', 'Cantonese', 'Mandarin'],
  european: ['German', 'French', 'Russian', 'Polish'],
  latin:    ['Spanish', 'Portuguese'],
  african:  ['Swahili', 'Arabic', 'Hindi', 'French'],
  tribal:   ['Sperethiel', 'Salish', 'Irish Gaelic'],
};

// ── Metatype flavor ────────────────────────────────────────────────────────

const METATYPE_FLAVOR: Record<MetatypeId, string[]> = {
  human:  ['street-born', 'SINless from birth', 'a ghost in the system', 'corp-raised gone wrong'],
  elf:    ['elven grace hiding steel', 'too pretty for the gutter', 'a century ahead of the game', 'ageless and calculating'],
  dwarf:  ['built like a bunker', 'stubborn as ferrocrete', 'short on patience and long on grudges', 'compact and unstoppable'],
  ork:    ['tusked and underestimated', 'carved from the sprawl', 'muscle and instinct', 'harder than the street'],
  troll:  ['a wall that learned to think', 'two meters of bad decision', 'bulletproof by accident of birth', 'the kind of problem that ends problems'],
};

// ── Background templates ───────────────────────────────────────────────────

const ARCHETYPE_BACKGROUNDS: Record<ArchetypeId, string[]> = {
  street_samurai: [
    'Chrome and reflexes — that is the whole résumé. {flavor} and fast enough to matter, {name} takes the work nobody else will.',
    '{name} runs muscle for whoever has the nuyen. {flavor_cap}. No questions, no mess, guaranteed results.',
    'Former military, probably corp, definitely burned. {name} is {flavor} now, and the street has its own discipline.',
  ],
  mage: [
    '{name} walks both worlds — mana and concrete. {flavor_cap}, trained in hermetics, educated by the sprawl.',
    'The Awakening gave {name} an edge most runners never get. {flavor_cap} now, casting spells between corporate towers and alley debts.',
    'Magic is a tool. {name} treats it like one — precise, cold, effective. {flavor_cap} with enough talent to make megacorps nervous.',
  ],
  shaman: [
    'The spirits talk to {name} — and unlike most people in the sprawl, {name} actually listens. {flavor_cap}, following paths older than concrete.',
    '{name} carries something the megacorps cannot buy or patent. {flavor_cap}, Awakened with a bond to powers hermetics never understood.',
    'Where the mage calculates, {name} negotiates — with spirits, with nature, with forces that predate the UCAS. {flavor_cap}.',
  ],
  physical_adept: [
    'No chrome, no wires — just will channelled into flesh. {name} is {flavor}, and every reflex is earned, not installed.',
    'The Awakening made {name} a weapon. Not a mage, not a samurai — something rarer. {flavor_cap}, and faster than your threat assessment.',
    '{name} meditated in rooms people sleep rough in and trained in gyms that double as clinics. {flavor_cap}.',
  ],
  decker: [
    'The Matrix is {name}\'s street. Meat-side is just the commute. {flavor_cap} with a deck and the conviction every lock has a key.',
    '{name} burns through ICE for breakfast and corporate secrets for dinner. {flavor_cap} — code runs in the blood.',
    'They say {name} can crack a host before the sysop finishes their soykaf. {flavor_cap}, self-taught in systems the corps keep locked.',
  ],
  rigger: [
    'If it has an engine, {name} has driven it, crashed it, and rebuilt it better. {flavor_cap} with a control rig and nothing to lose.',
    '{name} sees through sensors and thinks in throttle curves. {flavor_cap} — half pilot, half machine, all professional.',
    'Rigging is not a skill for {name}, it is an identity. {flavor_cap}, jacked in and running hotter than the engines.',
  ],
  face: [
    '{name} sells people things they did not know they needed. {flavor_cap} — charm is infrastructure.',
    'In a world of guns and code, {name} brings something more dangerous: words. {flavor_cap}, and every room is already half-won on arrival.',
    'The corps negotiate. The gangs threaten. {name} does both better. {flavor_cap} — the sharpest weapon is the right sentence.',
  ],
  combat_mage: [
    'Magic and violence — {name} sees no contradiction. {flavor_cap}, trained by institutions that wanted a weapon and got something smarter.',
    '{name} hits harder than any samurai and farther than any sniper. {flavor_cap}. The mana flows like ammunition.',
    'Military hermetics: an experiment in making Awakened talent lethal. {name} is {flavor}, and the experiment succeeded.',
  ],
  investigator: [
    'Everyone in the sprawl is hiding something. {name} finds it. {flavor_cap} — and the truth is usually worse than the lie.',
    '{name} follows threads through the sprawl\'s worst tangles. {flavor_cap}, reading people like datachips.',
    'The megacorps employ analysts. The syndicates employ fixers. {name} is the one the rest call when it gets complicated. {flavor_cap}.',
  ],
};

// ── Archetype-specific detail pools ───────────────────────────────────────

const PAST_PROFESSIONS: Record<ArchetypeId, string[]> = {
  street_samurai: ['Corporate Security', 'UCAS Army', 'Lone Star Officer', 'Mercenary', 'Bouncer'],
  mage:           ['Hermetic Scholar', 'Ares Research', 'University Faculty', 'Awakened Courier'],
  shaman:         ['Tribal Healer', 'Nature Reserve Warden', 'Street Shaman', 'Awakened Guide'],
  physical_adept: ['Martial Arts Instructor', 'Corp Bodyguard', 'Competitive Athlete', 'Street Fighter'],
  decker:         ['Corp IT Security', 'Freelance Programmer', 'System Administrator', 'Black-Hat Coder'],
  rigger:         ['Delivery Driver', 'Corp Pilot', 'Racing Circuit', 'Military Drone Operator'],
  face:           ['Corp PR', 'Club Promoter', 'Fixer\'s Assistant', 'Corporate Negotiator'],
  combat_mage:    ['Military Hermetic', 'Ares Firewatch', 'Corp Battle Mage', 'Awakened Soldier'],
  investigator:   ['Lone Star Detective', 'Corp Internal Audit', 'Private Investigator', 'Journalist'],
};

const PERSONALITIES: Record<ArchetypeId, string[]> = {
  street_samurai: ['laconic and reliable', 'aggressive but professional', 'quiet until it matters', 'loyal to whoever\'s paying — and beyond that to their team'],
  mage:           ['precise and detached', 'intellectually arrogant but self-aware', 'focused to the point of social blindness', 'methodical, cold, occasionally kind'],
  shaman:         ['intuitive and patient', 'reads people like weather', 'warm at surface, unmovable underneath', 'slow to anger, impossible to push past their limits'],
  physical_adept: ['calm under pressure', 'economical — no wasted words or motion', 'self-contained to the point of opacity', 'competitive but inward about it'],
  decker:         ['sharp and impatient with slow thinkers', 'black humour, dry observations', 'distractible when something interesting is in reach', 'paranoid in useful ways'],
  rigger:         ['tactically clear-headed', 'happiest when jacked in', 'blunt, reads machinery better than people', 'protective of the van'],
  face:           ['warm and attentive, always watching', 'adaptable — mirrors whoever they\'re with', 'genuinely likeable, strategically so', 'collects people like assets'],
  combat_mage:    ['intense, high-functioning', 'believes violence solves more than it does', 'competent to the point of arrogance', 'loyal but never admits it'],
  investigator:   ['observant to the point of paranoia', 'asks questions that make people uncomfortable', 'persistent past the point of reason', 'morally grey, not indifferent'],
};

const MORAL_CODES: Record<ArchetypeId, string[]> = {
  street_samurai: ['No civilians. Full stop.', 'The job ends when the job ends — not before.', 'Pay your debts. Collect what\'s owed.'],
  mage:           ['Knowledge isn\'t neutral but ignorance is worse.', 'Means matter less than whether the formula works.', 'Never bargain with what you don\'t understand.'],
  shaman:         ['Harm the land and you\'ve made an enemy you can\'t negotiate with.', 'Spirits don\'t lie. People do.', 'Balance isn\'t peace — it\'s pressure held equal.'],
  physical_adept: ['No unnecessary force. Necessary force without hesitation.', 'Master yourself before you master anything else.', 'The body is the practice.'],
  decker:         ['Information wants to be free — sometimes you help it along.', 'Leave no trace. Break what needs breaking. Fix what you break.', 'The system is corrupt. That\'s why I\'m better at it than the system.'],
  rigger:         ['Everyone gets home. That\'s non-negotiable.', 'Machines don\'t betray you if you maintain them.', 'Know the exit before you enter.'],
  face:           ['A deal you can\'t walk away from isn\'t a deal.', 'Never con someone who can\'t afford the loss.', 'Trust is currency. Spend it carefully.'],
  combat_mage:    ['Precision. No collateral.', 'Magic is a responsibility. Also an advantage.', 'Never show the full hand until you have to.'],
  investigator:   ['The truth is more important than who it hurts.', 'Everybody lies. Everybody has a reason. Find the reason.', 'Don\'t take the job if you can\'t handle the answer.'],
};

const GOALS: Record<ArchetypeId, string[]> = {
  street_samurai: ['Enough nuyen to disappear somewhere warm.', 'Find the corp that burned them and return the favour.', 'Stay alive long enough to become a legend, not a cautionary tale.'],
  mage:           ['Recover a theoretical formula that disappeared into corp black sites.', 'Reach the next threshold of hermetic understanding.', 'Build a team capable of going anywhere the magic leads.'],
  shaman:         ['Protect a stretch of urban wilderness nobody else cares about.', 'Track down a spirit that\'s gone wrong and put it right.', 'Find the totem\'s meaning in what the city has become.'],
  physical_adept: ['Prove the adept tradition is legitimate — not just viable, superior.', 'Find an opponent worth measuring themselves against.', 'Master the final form that\'s been eluding them for two years.'],
  decker:         ['Crack a system that\'s never been cracked.', 'Get out from under the debt that started this whole mess.', 'Build a rep in the shadows that no corp can buy or erase.'],
  rigger:         ['Own a rig that nobody can touch on open road or in the air.', 'Get paid enough to retire the van — then buy a better one.', 'Finish a custom build that\'s been in pieces for eighteen months.'],
  face:           ['Climb high enough in shadow circles that the corps come to them.', 'Build a network of favours across three megaplexes.', 'Find the Mr. Johnson who burned their last team and renegotiate.'],
  combat_mage:    ['Execute the contract that nobody else took. Prove it can be done.', 'Get clear of the military affiliation that still has strings attached.', 'Find the hermetic tradition that answers the questions the academy refused.'],
  investigator:   ['Close a case that went cold before they got to it.', 'Build dossiers on every fixer in the plex — information as insurance.', 'Follow the thread that connects three unsolved disappearances.'],
};

const LOVES_HATES: Record<ArchetypeId, string[]> = {
  street_samurai: ['Loves: well-maintained steel. Hates: amateurs with guns.', 'Loves: clean contracts. Hates: surprises that cost lives.', 'Loves: the moment before it starts. Hates: the aftermath.'],
  mage:           ['Loves: rare formulae and older translations. Hates: wasted potential.', 'Loves: a problem that requires actual thought. Hates: corporate hermetics with credentials and no ideas.', 'Loves: the silence in an astral space. Hates: noise that interrupts calculation.'],
  shaman:         ['Loves: rain on hot ferrocrete. Hates: pollution that kills the spirit world.', 'Loves: honest transactions — even violent ones. Hates: manipulation dressed up as courtesy.', 'Loves: old growth anywhere it survived. Hates: anyone who profits from destruction and calls it progress.'],
  physical_adept: ['Loves: a worthy opponent. Hates: fights that were never fair to begin with.', 'Loves: the precision of a form executed perfectly. Hates: technology as a substitute for discipline.', 'Loves: early mornings before the sprawl wakes up. Hates: being underestimated.'],
  decker:         ['Loves: elegant code and ugly loopholes. Hates: black ICE designed by committees.', 'Loves: finding the one thing the sysop missed. Hates: wetwork dressed up as data retrieval.', 'Loves: zero-day exploits. Hates: corps that steal innovations and litigate the inventor.'],
  rigger:         ['Loves: a clean engine and open road. Hates: gridlock at extraction time.', 'Loves: a vehicle that handles exactly as expected. Hates: passengers who give instructions.', 'Loves: the map coming together in real time. Hates: corp road blocks on public infrastructure.'],
  face:           ['Loves: a room that doesn\'t know who has the leverage. Hates: people who confuse bluster for negotiating.', 'Loves: the moment the other side makes the mistake. Hates: broken deals and the fixers who smile through them.', 'Loves: well-cut clothes and the assumptions they create. Hates: violence as a first language.'],
  combat_mage:    ['Loves: a clean kinetic solution. Hates: collateral that was avoidable.', 'Loves: the geometry of a mana bolt well-placed. Hates: corp mages with ranks but no understanding.', 'Loves: efficient violence. Hates: unnecessary suffering.'],
  investigator:   ['Loves: the moment the evidence coheres. Hates: cases that someone powerful needs to stay cold.', 'Loves: people who tell the truth even when it hurts them. Hates: money that makes inconvenient facts disappear.', 'Loves: a city you can read. Hates: anonymity weaponised.'],
};

// ── Helpers ────────────────────────────────────────────────────────────────

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[randInt(rng, arr.length)];
}

function deriveLanguages(origin: string, metatype: MetatypeId, magic: MagicDisposition): string[] {
  const region = ORIGIN_REGION[origin] ?? 'ucas';
  const langs  = [...ORIGIN_LANGUAGES[region]];

  if (!langs.includes('English')) langs.push('English');

  // Mages learn Sperethiel; adepts often do
  if (magic === 'full_magic') langs.push('Sperethiel');

  // Elves / shamans often know Sperethiel
  if (metatype === 'elf' && !langs.includes('Sperethiel')) langs.push('Sperethiel');
  if (metatype === 'ork'   && !langs.includes('Or\'zet'))   langs.push('Or\'zet');
  if (metatype === 'troll' && !langs.includes('Or\'zet'))   langs.push('Or\'zet');

  return [...new Set(langs)];
}

// ── Main export ────────────────────────────────────────────────────────────

export function generateAdditionalDetails(
  seed: number,
  archetype: ArchetypeId,
  metatype: MetatypeId,
  magicDisposition: MagicDisposition,
  demographics: Demographics,
  name: string,
): AdditionalDetails {
  const rng = makeRng(childSeed(seed, 'details'));

  // Real name
  const region   = ORIGIN_REGION[demographics.origin] ?? 'ucas';
  const namePool = REAL_NAMES[region];
  const firstName = pick(rng, namePool[demographics.sex as 'M' | 'F'] ?? namePool.M);
  const lastName  = pick(rng, namePool.last);
  const realName  = `${firstName} ${lastName}`;

  // Background paragraph
  const templates = ARCHETYPE_BACKGROUNDS[archetype];
  const template  = pick(rng, templates);
  const flavors   = METATYPE_FLAVOR[metatype];
  const flavor    = pick(rng, flavors);
  const flavor_cap = flavor.charAt(0).toUpperCase() + flavor.slice(1);
  const background = template
    .replace(/\{name\}/g, name)
    .replace(/\{flavor_cap\}/g, flavor_cap)
    .replace(/\{flavor\}/g, flavor);

  return {
    realName,
    background,
    pastProfession: pick(rng, PAST_PROFESSIONS[archetype]),
    personality:    pick(rng, PERSONALITIES[archetype]),
    moralCode:      pick(rng, MORAL_CODES[archetype]),
    goals:          pick(rng, GOALS[archetype]),
    lovesHates:     pick(rng, LOVES_HATES[archetype]),
    languages:      deriveLanguages(demographics.origin, metatype, magicDisposition),
  };
}
