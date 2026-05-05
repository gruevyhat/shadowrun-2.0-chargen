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
  bodyguard: [
    'Personal protection is {name}\'s whole résumé. {flavor_cap} — quick enough to matter, professional enough to stay hired.',
    '{name} stands between clients and whatever they are afraid of. {flavor_cap}. Reputation is the only currency that counts.',
    'Former security, probably corp. {name} is {flavor} now, freelance and very selective about who gets the benefit of their reflexes.',
  ],
  combat_mage: [
    'Magic and violence — {name} sees no contradiction. {flavor_cap}, trained by institutions that wanted a weapon and got something smarter.',
    '{name} hits harder than any samurai and farther than any sniper. {flavor_cap}. The mana flows like ammunition.',
    'Military hermetics: an experiment in making Awakened talent lethal. {name} is {flavor}, and the experiment succeeded.',
  ],
  decker: [
    'The Matrix is {name}\'s street. Meat-side is just the commute. {flavor_cap} with a deck and the conviction every lock has a key.',
    '{name} burns through ICE for breakfast and corporate secrets for dinner. {flavor_cap} — code runs in the blood.',
    'They say {name} can crack a host before the sysop finishes their soykaf. {flavor_cap}, self-taught in systems the corps keep locked.',
  ],
  detective: [
    'Everyone in the sprawl is hiding something. {name} finds it. {flavor_cap} — and the truth is usually worse than the lie.',
    '{name} follows threads through the sprawl\'s worst tangles. {flavor_cap}, reading people like datachips.',
    'The megacorps employ analysts. The syndicates employ fixers. {name} is the one the rest call when it gets complicated. {flavor_cap}.',
  ],
  former_company_man: [
    '{name} did good work for the corp. Now the corp is in the rearview mirror, and the skills travel. {flavor_cap}.',
    'Burned by the company, walking with its tools. {name} is {flavor} and building a new life from the wreckage.',
    'The corp saw an asset. The street sees a professional. {flavor_cap}. {name} stopped correcting people on the difference.',
  ],
  former_wage_mage: [
    '{name} left the corporate lab with the formulas intact and the illusions gone. {flavor_cap}, casting for hire — better clients, fewer NDAs.',
    'Magic used in a corp\'s service is magic bent out of shape. {name} is {flavor}, trying to use it for something that matters.',
    'The hermetic tradition survives without the corporate salary. {flavor_cap}. {name} is proof.',
  ],
  gang_member: [
    '{name} grew up on the street and learned its rules early. {flavor_cap} — old enough to run, young enough to still have something to prove.',
    'The gang is family. The turf is home. {name} is {flavor}, defending both with everything available.',
    'Corporate security calls them a threat. The block calls them protection. {flavor_cap}. {name} knows which opinion matters.',
  ],
  mercenary: [
    'Three tours, a clean record, and a credstick number for inquiries. {name} is {flavor} — professional, portable, priced accordingly.',
    '{name} works for the corp, the polyclubs, or the revolution, as long as the contract is honoured. {flavor_cap}.',
    'Combat experience across a dozen hot spots, none officially acknowledged. {flavor_cap}. {name} has the scars to prove it.',
  ],
  rigger: [
    'If it has an engine, {name} has driven it, crashed it, and rebuilt it better. {flavor_cap} with a control rig and nothing to lose.',
    '{name} sees through sensors and thinks in throttle curves. {flavor_cap} — half pilot, half machine, all professional.',
    'Rigging is not a skill for {name}, it is an identity. {flavor_cap}, jacked in and running hotter than the engines.',
  ],
  shaman: [
    'The spirits talk to {name} — and unlike most people in the sprawl, {name} actually listens. {flavor_cap}, following paths older than concrete.',
    '{name} carries something the megacorps cannot buy or patent. {flavor_cap}, Awakened with a bond to powers hermetics never understood.',
    'Where the mage calculates, {name} negotiates — with spirits, with nature, with forces that predate the UCAS. {flavor_cap}.',
  ],
  street_mage: [
    'The streets are where the life is, and life is the stuff of magic. {name} is {flavor}, and the formulas work fine outside the academy.',
    'Walked away from the corporate lab before it could finish the job. {flavor_cap}, self-taught in the half that actually matters.',
    'Magic without a corporate salary is still magic. {flavor_cap}. {name} has been proving that since before it was fashionable.',
  ],
  street_samurai: [
    'Chrome and reflexes — that is the whole résumé. {flavor} and fast enough to matter, {name} takes the work nobody else will.',
    '{name} runs muscle for whoever has the nuyen. {flavor_cap}. No questions, no mess, guaranteed results.',
    'Former military, probably corp, definitely burned. {name} is {flavor} now, and the street has its own discipline.',
  ],
  street_shaman: [
    'The city has spirits too — {name} found them, and they answered. {flavor_cap}, walking urban paths others cannot see.',
    '{name} follows the spirits of the sprawl through alleyways the maps do not include. {flavor_cap} and still finding new ones.',
    'The old shamans went to the wilderness. {name} went deeper into the city. {flavor_cap}, and the city spirits are paying attention.',
  ],
  tribesman: [
    '{name} walks paths between the old ways and the new world. {flavor_cap} — a hunter in urban shadows as easily as wilderness.',
    'The tribe taught {name} to read land, sky, and people. {flavor_cap}, carrying those skills wherever the shadows lead.',
    'Corporate security is not built for someone who moves like {name} does. {flavor_cap}. The streets are just different terrain.',
  ],
};

// ── Archetype-specific detail pools ───────────────────────────────────────

const PAST_PROFESSIONS: Record<ArchetypeId, string[]> = {
  bodyguard:          ['Corporate Security', 'VIP Protection', 'Lone Star Officer', 'Bouncer'],
  combat_mage:        ['Military Hermetic', 'Ares Firewatch', 'Corp Battle Mage', 'Awakened Soldier'],
  decker:             ['Corp IT Security', 'Freelance Programmer', 'System Administrator', 'Black-Hat Coder'],
  detective:          ['Lone Star Detective', 'Corp Internal Audit', 'Private Investigator', 'Journalist'],
  former_company_man: ['Corp Special Ops', 'Corporate Intelligence', 'Internal Security', 'Covert Courier'],
  former_wage_mage:   ['Hermetic Scholar', 'Corp Research Mage', 'University Faculty', 'Awakened Courier'],
  gang_member:        ['Street Gang', 'Petty Criminal', 'Sprawl Runner', 'Turf Enforcer'],
  mercenary:          ['UCAS Army', 'Aztlan Legion', 'Corporate Mercenary', 'Private Military'],
  rigger:             ['Delivery Driver', 'Corp Pilot', 'Racing Circuit', 'Military Drone Operator'],
  shaman:             ['Tribal Healer', 'Nature Reserve Warden', 'Awakened Guide', 'Spirit Binder'],
  street_mage:        ['Awakened Street Kid', 'Independent Scholar', 'Ritual Worker', 'Awakened Courier'],
  street_samurai:     ['UCAS Army', 'Corporate Security', 'Lone Star Officer', 'Bouncer'],
  street_shaman:      ['Urban Healer', 'Community Shaman', 'Spirit Guide', 'Street Ritualist'],
  tribesman:          ['NAN Warrior', 'Tribal Scout', 'Wilderness Guide', 'Tribal Enforcer'],
};

const PERSONALITIES: Record<ArchetypeId, string[]> = {
  bodyguard:          ['professional to the point of personality suppression', 'reads threat vectors before faces', 'laconic and reliable', 'loyal to the client — period'],
  combat_mage:        ['intense, high-functioning', 'believes violence solves more than it does', 'competent to the point of arrogance', 'loyal but never admits it'],
  decker:             ['sharp and impatient with slow thinkers', 'black humour, dry observations', 'distractible when something interesting is in reach', 'paranoid in useful ways'],
  detective:          ['observant to the point of paranoia', 'asks questions that make people uncomfortable', 'persistent past the point of reason', 'morally grey, not indifferent'],
  former_company_man: ['professional with a guilty conscience', 'keeps their cards close and their exits clear', 'disciplined, occasionally haunted', 'works hard to separate the skills from the context they came from'],
  former_wage_mage:   ['precise and detached', 'intellectually arrogant but self-aware', 'focused to the point of social blindness', 'methodical, cold, occasionally kind'],
  gang_member:        ['loud, loyal, and territorial', 'reads respect as currency', 'direct to the point of bluntness', "protective of people who've earned it"],
  mercenary:          ["nothing personal — it's a contract", 'reads terrain before people', 'professional to a fault, flexible on ethics', 'respects the chain of command and hates amateurs'],
  rigger:             ['tactically clear-headed', 'happiest when jacked in', 'blunt, reads machinery better than people', 'protective of the van'],
  shaman:             ['intuitive and patient', 'reads people like weather', 'warm at surface, unmovable underneath', 'slow to anger, impossible to push past their limits'],
  street_mage:        ['restless and principled in ways that complicate things', 'passionate about the wrong things at the wrong times', 'genuine, occasionally insufferable', 'certain the world is fixable'],
  street_samurai:     ['laconic and reliable', 'aggressive but professional', 'quiet until it matters', 'loyal to whoever\'s paying — and beyond that to their team'],
  street_shaman:      ['attuned to things others miss', 'calm where the city is loud', 'unhurried in ways that unsettle people', 'reads the spirit of a place before its geography'],
  tribesman:          ['patient and precise', 'speaks only when it matters', 'honours obligations without needing to discuss them', 'reads terrain and people the same way'],
};

const MORAL_CODES: Record<ArchetypeId, string[]> = {
  bodyguard:          ['The client is the job. Everything else is a variable.', 'If you blow it once in this line of work, you never work again.', 'No unnecessary risks to the principal. Maximum risk to everything else.'],
  combat_mage:        ['Precision. No collateral.', 'Magic is a responsibility. Also an advantage.', 'Never show the full hand until you have to.'],
  decker:             ['Information wants to be free — sometimes you help it along.', 'Leave no trace. Break what needs breaking. Fix what you break.', 'The system is corrupt. That\'s why I\'m better at it than the system.'],
  detective:          ['The truth is more important than who it hurts.', 'Everybody lies. Everybody has a reason. Find the reason.', 'Don\'t take the job if you can\'t handle the answer.'],
  former_company_man: ['The contract is honoured. Always. That\'s the only thing that travels.', 'Never talk about the corp. Not to anyone. Not ever.', 'Do good work — even when the job is questionable.'],
  former_wage_mage:   ['Knowledge isn\'t neutral but ignorance is worse.', 'Means matter less than whether the formula works.', 'Never bargain with what you don\'t understand.'],
  gang_member:        ['You burn me, the gang burns you. Simple law of the plex.', 'Protect the block. That\'s what it comes down to.', 'Loyalty runs deeper than nuyen. Not infinitely — but deeper.'],
  mercenary:          ['A contract is a contract. Honour it or don\'t take it.', 'No politics. Just the work.', 'Everyone paid gets the same quality. That\'s the reputation.'],
  rigger:             ['Everyone gets home. That\'s non-negotiable.', 'Machines don\'t betray you if you maintain them.', 'Know the exit before you enter.'],
  shaman:             ['Harm the land and you\'ve made an enemy you can\'t negotiate with.', 'Spirits don\'t lie. People do.', 'Balance isn\'t peace — it\'s pressure held equal.'],
  street_mage:        ['Magic belongs to everyone — not to the corps.', 'Use the power for something real, or don\'t use it at all.', 'The system is wrong. That\'s why you have to work outside it.'],
  street_samurai:     ['No civilians. Full stop.', 'The job ends when the job ends — not before.', 'Pay your debts. Collect what\'s owed.'],
  street_shaman:      ['The city spirits deserve the same respect as the wilderness ones.', 'Harm the urban harmony and it comes back around.', 'The spirits guide. You still have to walk.'],
  tribesman:          ['The land is the life. Guard it or you have nothing.', 'Honour your obligations. All of them.', 'Don\'t fight unless you\'re willing to finish it.'],
};

const GOALS: Record<ArchetypeId, string[]> = {
  bodyguard:          ['Build a rep clean enough that the high-end clients come looking.', 'Keep the next principal alive where the last one didn\'t make it.', 'Enough nuyen to go independent — no agency, no cut.'],
  combat_mage:        ['Execute the contract that nobody else took. Prove it can be done.', 'Get clear of the military affiliation that still has strings attached.', 'Find the hermetic tradition that answers the questions the academy refused.'],
  decker:             ['Crack a system that\'s never been cracked.', 'Get out from under the debt that started this whole mess.', 'Build a rep in the shadows that no corp can buy or erase.'],
  detective:          ['Close a case that went cold before they got to it.', 'Build dossiers on every fixer in the plex — information as insurance.', 'Follow the thread that connects three unsolved disappearances.'],
  former_company_man: ['Disappear thoroughly enough that the corp stops looking.', 'Do one job that undoes something they did before.', 'Build a life that doesn\'t require looking over the shoulder every three seconds.'],
  former_wage_mage:   ['Recover a theoretical formula that disappeared into corp black sites.', 'Reach the next threshold of hermetic understanding.', 'Build a practice that answers to no one with a bottom line.'],
  gang_member:        ['Take the turf that\'s been contested for three years and hold it.', 'Get the crew out of the sprawl into something better.', 'Build a reputation that makes the right people leave them alone.'],
  mercenary:          ['Land the contract that nobody else would take and come back clean.', 'Build a record good enough to retire on — selective work only.', 'Get out of the circuit that still has strings attached.'],
  rigger:             ['Own a rig that nobody can touch on open road or in the air.', 'Get paid enough to retire the van — then buy a better one.', 'Finish a custom build that\'s been in pieces for eighteen months.'],
  shaman:             ['Protect a stretch of wilderness nobody else cares about.', 'Track down a spirit that\'s gone wrong and put it right.', 'Find the totem\'s meaning in what the world has become.'],
  street_mage:        ['Prove that street magic is as legitimate as anything out of an academy.', 'Find the mentor who turned them down and show them the work since.', 'Crack a hermetic problem the corps have been sitting on for a decade.'],
  street_samurai:     ['Enough nuyen to disappear somewhere warm.', 'Find the corp that burned them and return the favour.', 'Stay alive long enough to become a legend, not a cautionary tale.'],
  street_shaman:      ['Protect the urban spirits the city is destroying without knowing it.', 'Find the source of the spiritual disruption that\'s been building in the district.', 'Build a community the sprawl can\'t take from them again.'],
  tribesman:          ['Return something important to the tribe that was taken.', 'Walk far enough into the shadows to fix something that matters at home.', 'Find the others who were scattered and bring them back together.'],
};

const LOVES_HATES: Record<ArchetypeId, string[]> = {
  bodyguard:          ['Loves: a quiet shift. Hates: clients who don\'t follow the plan.', 'Loves: knowing every exit in the room. Hates: surprises on a job that should have been clean.', 'Loves: a client who listens. Hates: the ones who think they know better until they don\'t.'],
  combat_mage:        ['Loves: a clean kinetic solution. Hates: collateral that was avoidable.', 'Loves: the geometry of a mana bolt well-placed. Hates: corp mages with ranks but no understanding.', 'Loves: efficient violence. Hates: unnecessary suffering.'],
  decker:             ['Loves: elegant code and ugly loopholes. Hates: black ICE designed by committees.', 'Loves: finding the one thing the sysop missed. Hates: wetwork dressed up as data retrieval.', 'Loves: zero-day exploits. Hates: corps that steal innovations and litigate the inventor.'],
  detective:          ['Loves: the moment the evidence coheres. Hates: cases that someone powerful needs to stay cold.', 'Loves: people who tell the truth even when it hurts them. Hates: money that makes inconvenient facts disappear.', 'Loves: a city you can read. Hates: anonymity weaponised.'],
  former_company_man: ['Loves: clean professional work, no questions. Hates: anything that reminds them of the corp.', 'Loves: a team that communicates. Hates: ops that look like the ones they used to run.', 'Loves: distance from the past. Hates: the past finding them anyway.'],
  former_wage_mage:   ['Loves: rare formulae and older translations. Hates: wasted potential.', 'Loves: a problem that requires actual thought. Hates: corporate hermetics with credentials and no ideas.', 'Loves: the silence in an astral space. Hates: noise that interrupts calculation.'],
  gang_member:        ['Loves: the turf in early morning when it\'s quiet. Hates: outsiders who don\'t read the room.', 'Loves: the crew having each other\'s backs. Hates: corps that treat the block like a problem to be managed.', 'Loves: respect earned and given. Hates: authority that was never earned.'],
  mercenary:          ['Loves: a clear contract and a clean extraction. Hates: missions that expand mid-run.', 'Loves: competent teammates. Hates: corp officers who don\'t know what they\'re asking for.', 'Loves: professional courtesy between mercs. Hates: jobs that turn out to have a different brief.'],
  rigger:             ['Loves: a clean engine and open road. Hates: gridlock at extraction time.', 'Loves: a vehicle that handles exactly as expected. Hates: passengers who give instructions.', 'Loves: the map coming together in real time. Hates: corp road blocks on public infrastructure.'],
  shaman:             ['Loves: rain on hot ferrocrete. Hates: pollution that kills the spirit world.', 'Loves: honest transactions — even violent ones. Hates: manipulation dressed up as courtesy.', 'Loves: old growth anywhere it survived. Hates: anyone who profits from destruction and calls it progress.'],
  street_mage:        ['Loves: magic that works outside the textbook. Hates: the academy acting like it owns the Awakening.', 'Loves: a spell that surprises even the caster. Hates: corp hermetics who never left the lab.', 'Loves: open astral space. Hates: mana barriers built by people who didn\'t earn them.'],
  street_samurai:     ['Loves: well-maintained steel. Hates: amateurs with guns.', 'Loves: clean contracts. Hates: surprises that cost lives.', 'Loves: the moment before it starts. Hates: the aftermath.'],
  street_shaman:      ['Loves: the city spirits no one else notices. Hates: development that cuts off spirit paths without understanding what they were.', 'Loves: urban rituals, rooftop totems, the city at 3am. Hates: the wilderness shamans who think urban practice is lesser.', 'Loves: a neighbourhood that still has its spirits intact. Hates: what the megacorps do to the places they take over.'],
  tribesman:          ['Loves: terrain that has not been managed. Hates: the corp surveying something that was fine before.', 'Loves: tools that do what they are supposed to do. Hates: technology that substitutes for understanding.', 'Loves: a hunt that goes cleanly. Hates: waste — of time, of life, of anything that could have mattered.'],
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
