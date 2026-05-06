import { makeRng, childSeed, randInt } from '../engine/rng';
import type { ArchetypeId, MetatypeId, MagicDisposition } from '../engine/types';

const METATYPE_FLAVOR: Record<MetatypeId, string[]> = {
  human:  ['street-born', 'SINless from birth', 'a ghost in the system', 'corp-raised gone wrong'],
  elf:    ['elven grace hiding steel', 'too pretty for the gutter', 'a century ahead of the game', 'ageless and calculating'],
  dwarf:  ['built like a bunker', 'stubborn as ferrocrete', 'short on patience and long on grudges', 'compact and unstoppable'],
  ork:    ['tusked and underestimated', 'carved from the sprawl', 'muscle and instinct', 'harder than the street'],
  troll:  ['a wall that learned to think', 'two meters of bad decision', 'bulletproof by accident of birth', 'the kind of problem that ends problems'],
};

const ARCHETYPE_BACKGROUNDS: Record<ArchetypeId, string[]> = {
  bodyguard: [
    'Personal protection is {name}\'s whole résumé. {flavor_cap} — quick enough to matter, professional enough to stay hired.',
    '{name} stands between clients and whatever they are afraid of. {flavor_cap}. Reputation is the only currency that counts in this work.',
    'Former security, probably corp. {name} is {flavor} now, freelance and very selective about who gets the benefit of their reflexes.',
  ],
  combat_mage: [
    'Magic and violence — {name} sees no contradiction. {flavor_cap}, trained by institutions that wanted a weapon and got something smarter.',
    '{name} hits harder than any samurai and farther than any sniper. {flavor_cap}. The mana flows like ammunition, and it never runs dry.',
    'Military hermetics: an experiment in making Awakened talent lethal. {name} is {flavor}, and the experiment succeeded.',
  ],
  decker: [
    'The Matrix is {name}\'s street. Meat-side is just the commute. {flavor_cap} with a deck and the conviction that every lock has a key.',
    '{name} burns through ICE for breakfast and corporate secrets for dinner. {flavor_cap} — code runs in the blood as surely as anything biological.',
    'They say {name} can crack a host before the sysop finishes their soykaf. {flavor_cap}, self-taught in systems the corps would rather keep locked.',
  ],
  detective: [
    'Everyone in the sprawl is hiding something. {name} finds it. {flavor_cap} — and the truth is usually worse than the lie.',
    '{name} follows threads through the sprawl\'s worst tangles. {flavor_cap}, reading people like datachips and environments like crime scenes.',
    'The megacorps employ analysts. The syndicates employ fixers. {name} is the one the rest call when it gets complicated. {flavor_cap}.',
  ],
  former_company_man: [
    '{name} did good work for the corp. Now the corp is in the rearview mirror, and the skills travel. {flavor_cap} — useful and not asking questions.',
    'Burned by the company, walking with its tools. {name} is {flavor} and building a new life from the wreckage of the last contract.',
    'The corp saw an asset. The street sees a professional. {flavor_cap}. {name} has stopped correcting people on the difference.',
  ],
  former_wage_mage: [
    '{name} left the corporate lab with the formulas intact and the illusions gone. {flavor_cap}, casting for hire now — better clients, fewer NDAs.',
    'Magic used in a corp\'s service is magic bent out of shape. {name} is {flavor}, trying to use it for something that matters.',
    'The hermetic tradition survives without the corporate salary. {flavor_cap}. {name} is proof — and casts accordingly.',
  ],
  gang_member: [
    '{name} grew up on the street and learned its rules early. {flavor_cap} — old enough to run, young enough to still have something to prove.',
    'The gang is family. The turf is home. {name} is {flavor}, defending both with everything available.',
    'Corporate security calls them a threat. The people on the block call them protection. {flavor_cap}. {name} knows which opinion matters.',
  ],
  physical_adept: [
    '{name} is Awakened without a tradition — no spells, no spirits, just raw magic channelled inward. {flavor_cap}, and the results speak for themselves.',
    'The corp tried to run tests. {name} walked out. {flavor_cap} — a body attuned to magic, trained to a standard the academics have no charts for.',
    'No cyberware, no augmentation. {name} does not need it. {flavor_cap}, moving through threats at a speed that looks like cheating.',
  ],
  mercenary: [
    'Three tours, a clean record, and a credstick number for inquiries. {name} is {flavor} — professional, portable, priced accordingly.',
    '{name} works for the corp, the polyclubs, or the revolution, as long as the contract is honoured. {flavor_cap}. The work is the work.',
    'Combat experience across a dozen hot spots, none of them officially acknowledged. {flavor_cap}. {name} has the scars and the invoices to prove it.',
  ],
  rigger: [
    'If it has an engine, {name} has driven it, crashed it, and rebuilt it better. {flavor_cap} with a control rig and nothing to lose.',
    '{name} sees through sensors and thinks in throttle curves. {flavor_cap} — half pilot, half machine, all professional.',
    'Rigging is not a skill for {name}, it is an identity. {flavor_cap}, jacked in and running hotter than the engines.',
  ],
  shaman: [
    'The spirits talk to {name} — and unlike most people in the sprawl, {name} actually listens. {flavor_cap}, following paths older than the concrete.',
    '{name} carries something the megacorps cannot buy or patent. {flavor_cap}, Awakened with a bond to powers the hermetics never understood.',
    'Where the mage calculates, {name} negotiates — with spirits, with nature, with forces that predate the UCAS. {flavor_cap} and wiser for it.',
  ],
  street_mage: [
    'The streets are where the life is, and life is the stuff of magic. {name} is {flavor}, and the formulas work just fine outside the academy.',
    'Walked away from the corporate lab before it could finish the job. {flavor_cap}, self-taught in the half that actually matters.',
    'Magic without a corporate salary is still magic. {flavor_cap}. {name} has been proving that since before it was fashionable.',
  ],
  street_samurai: [
    'Chrome and reflexes — that is the whole résumé. {flavor} and fast enough to matter, {name} takes the work nobody else will.',
    '{name} runs muscle for whoever has the nuyen. {flavor_cap}. No questions, no mess, guaranteed results.',
    'Former military, probably corp, definitely burned. {name} is {flavor} now, and the street has its own kind of discipline.',
  ],
  street_shaman: [
    'The city has spirits too — {name} found them, and they answered. {flavor_cap}, walking the urban paths others cannot see.',
    '{name} follows the spirits of the sprawl through alleyways the maps do not include. {flavor_cap} and still finding new ones.',
    'The old shamans went to the wilderness. {name} went deeper into the city. {flavor_cap}, and the city spirits are paying attention.',
  ],
  tribesman: [
    '{name} walks paths between the old ways and the new world. {flavor_cap} — a hunter in urban shadows as easily as wilderness.',
    'The tribe taught {name} to read land, sky, and people. {flavor_cap}, carrying those skills wherever the shadows lead.',
    'Corporate security is not built for someone who learned to move like {name} did. {flavor_cap}. The streets are just different terrain.',
  ],
};

export function generateBackground(
  seed: number,
  archetype: ArchetypeId,
  metatype: MetatypeId,
  _magicDisposition: MagicDisposition,
  name: string,
): string {
  const rng = makeRng(childSeed(seed, 'background'));
  const templates = ARCHETYPE_BACKGROUNDS[archetype];
  const template = templates[randInt(rng, templates.length)];
  const flavors = METATYPE_FLAVOR[metatype];
  const flavor = flavors[randInt(rng, flavors.length)];
  const flavor_cap = flavor.charAt(0).toUpperCase() + flavor.slice(1);

  return template
    .replace(/\{name\}/g, name)
    .replace(/\{flavor_cap\}/g, flavor_cap)
    .replace(/\{flavor\}/g, flavor);
}
