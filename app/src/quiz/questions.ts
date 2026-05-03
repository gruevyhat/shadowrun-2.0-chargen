import type { QuizQuestion } from './types';

// 30 forced-choice questions, 5 per axis.
// Display order interleaves axes so consecutive questions don't probe the same dimension.
// All prompts are diegetic Sixth World fiction — no out-of-fiction framing, no mechanics jargon.
export const QUESTIONS: QuizQuestion[] = [

  // ─── 1. WIRED ↔ WILD ──────────────────────────────────────────────────────
  // wired (-): controlled, plugged-in, prefers signal over noise, drains alone
  // wild (+): improvisational, social-fueled, thrives in crowds, runs on adrenaline
  {
    id: 'q_wired_01',
    axis: 'wired_wild',
    prompt: "Mr. Johnson's set the meet at Dante's Inferno on a Friday night. Strobing lights, eight hundred people on the dance floor, the Hellish Drinks menu hammering on your shades. He's smiling. How do you feel?",
    choices: [
      { text: "Wired tight. Too many bodies, too many sightlines. You want this over with.", delta: -1 },
      { text: "In your element. The noise hides everything. You order a drink and let the room move.", delta: 1 },
    ],
  },
  {
    id: 'q_wired_02',
    axis: 'wired_wild',
    prompt: "The team wraps a job at 0400. Loot's split, smoke's clearing. Someone says they're hitting the all-night joygirl bar in Touristville. You—",
    choices: [
      { text: "Beg off. Your doss is closer and your skull's already buzzing.", delta: -1 },
      { text: "Ride along. The job's not done until you've watched someone else pay for the drinks.", delta: 1 },
    ],
  },
  {
    id: 'q_wired_03',
    axis: 'wired_wild',
    prompt: "Stakeout. Twelve hours in a parked Westwind across from the target's flop. Your partner's snoring. You—",
    choices: [
      { text: "Settle in. Quiet is when you do your best thinking.", delta: -1 },
      { text: "Are climbing the walls by hour three. You'd take a bar fight over this.", delta: 1 },
    ],
  },
  {
    id: 'q_wired_04',
    axis: 'wired_wild',
    prompt: "A fixer you've never met buys you a beer at a Redmond dive and starts asking your opinion on a job. The room's half-full. He's friendly.",
    choices: [
      { text: "You answer in clipped sentences and watch the door. Friendly fixers are still fixers.", delta: -1 },
      { text: "You buy the next round. Half the work in this town gets done over beer and lies.", delta: 1 },
    ],
  },
  {
    id: 'q_wired_05',
    axis: 'wired_wild',
    prompt: "Two days off between runs. The weather's clearing. You—",
    choices: [
      { text: "Stay in. Disassemble something. Read. Sleep without the gun in reach for once.", delta: -1 },
      { text: "Find the loudest, dirtiest party in the sprawl and don't surface until Monday.", delta: 1 },
    ],
  },

  // ─── 2. STREETWISE ↔ CEREBRAL ─────────────────────────────────────────────
  // streetwise (-): reads people, trusts gut, intuition + social
  // cerebral (+): reads systems, trusts data, analysis + technical
  {
    id: 'q_street_01',
    axis: 'streetwise_cerebral',
    prompt: "The mark walks into the noodle shop. Something's off — you can feel it before you can name it. You—",
    choices: [
      { text: "Trust the prickle on your neck. Abort the snatch, regroup, ask questions later.", delta: -1 },
      { text: "Pull up the surveillance feed and the last three hours of his comm metadata. Find the cause.", delta: 1 },
    ],
  },
  {
    id: 'q_street_02',
    axis: 'streetwise_cerebral',
    prompt: "Someone's selling you a story. Half of it's true. How do you find which half?",
    choices: [
      { text: "Watch their hands, their eyes, where they pause. The truth leaks out at the seams.", delta: -1 },
      { text: "Cross-reference. Public records, Matrix breadcrumbs, the gaps between what they said and what they didn't.", delta: 1 },
    ],
  },
  {
    id: 'q_street_03',
    axis: 'streetwise_cerebral',
    prompt: "A new piece of street tech hits the market. Knockoff Renraku spec, half the price.",
    choices: [
      { text: "You ask around. Who's running it. Who got burned. Who's still walking.", delta: -1 },
      { text: "You pull the spec sheet apart, find the corners they cut, decide if those corners get you killed.", delta: 1 },
    ],
  },
  {
    id: 'q_street_04',
    axis: 'streetwise_cerebral',
    prompt: "The job's in a part of the sprawl you don't know. Twelve hours to prep.",
    choices: [
      { text: "Walk it. Buy a beer at the local bar. Find out who runs which corner before you commit.", delta: -1 },
      { text: "Pull the maps, the patrol patterns, the sensor sweeps. Build the model before you set foot.", delta: 1 },
    ],
  },
  {
    id: 'q_street_05',
    axis: 'streetwise_cerebral',
    prompt: "Someone screwed up on the last run. You know who. You don't have proof.",
    choices: [
      { text: "You already know. You've watched them twitch when their name comes up. Confront them.", delta: -1 },
      { text: "Build the case first. Comm logs, transit records, who was where when. Then confront them.", delta: 1 },
    ],
  },

  // ─── 3. IRON ↔ EMPATH ─────────────────────────────────────────────────────
  // iron (-): combat-first, decisive force, willing to break things and people
  // empath (+): people-first, talks first, costs of violence land heavy
  {
    id: 'q_iron_01',
    axis: 'iron_empath',
    prompt: "The mark's daughter is in the room. Eight years old. The job said no witnesses.",
    choices: [
      { text: "The job said no witnesses. You do the job.", delta: -1 },
      { text: "You walk her out, blindfold on, before anything else happens. The job pays less. You don't care.", delta: 1 },
    ],
  },
  {
    id: 'q_iron_02',
    axis: 'iron_empath',
    prompt: "The Lone Star patrol's two minutes out. The hostage is a corp suit with a face full of tears.",
    choices: [
      { text: "Tape his mouth, drag him to the van. You'll sort him out at the bolthole.", delta: -1 },
      { text: "Slow down. Look him in the eye. Tell him you're not Lone Star and he'll see his kids again. Then move.", delta: 1 },
    ],
  },
  {
    id: 'q_iron_03',
    axis: 'iron_empath',
    prompt: "A street kid clocks your team in the alley. Twelve, maybe thirteen. Skinny.",
    choices: [
      { text: "You don't shoot kids. But she's getting tied up and locked in a closet for six hours, no exceptions.", delta: -1 },
      { text: "You crouch down. You give her two hundred nuyen and a story. You trust she'll keep it.", delta: 1 },
    ],
  },
  {
    id: 'q_iron_04',
    axis: 'iron_empath',
    prompt: "The runner across the table cheated you. Not badly. A few thousand nuyen on the last split.",
    choices: [
      { text: "You make sure they know you know. Loud enough that everyone at the table hears it.", delta: -1 },
      { text: "You note it. You don't work with them again. You don't make a scene.", delta: 1 },
    ],
  },
  {
    id: 'q_iron_05',
    axis: 'iron_empath',
    prompt: "A guard's bleeding out on the floor. He's got maybe a minute. Stim patch in your pocket would cost you nothing.",
    choices: [
      { text: "He chose the badge. You step over him and keep moving.", delta: -1 },
      { text: "You slap the patch on. He'll live or he won't, but it won't be because you watched.", delta: 1 },
    ],
  },

  // ─── 4. RUNNER ↔ OPERATOR ─────────────────────────────────────────────────
  // runner (-): live in the moment, blow the cash, low burn-rate planning
  // operator (+): long game, build infrastructure, hoard cash and contacts
  {
    id: 'q_runner_01',
    axis: 'runner_operator',
    prompt: "Big payday. Two hundred thousand nuyen, clean.",
    choices: [
      { text: "A weekend at the Eye of the Needle, top-shelf chrome, and a new bike. You earned it. Spend it.", delta: -1 },
      { text: "Rent the safehouse for a year up front. Half into untraceable accounts. The rest stays liquid.", delta: 1 },
    ],
  },
  {
    id: 'q_runner_02',
    axis: 'runner_operator',
    prompt: "A fixer offers you a steady gig. Lower pay, lower risk, six months guaranteed work.",
    choices: [
      { text: "You don't sign for six months of anything. You take what walks in the door and leave the rest.", delta: -1 },
      { text: "You take it. Predictable cash flow is rarer than a good payday. You sign.", delta: 1 },
    ],
  },
  {
    id: 'q_runner_03',
    axis: 'runner_operator',
    prompt: "You meet someone useful. Decker, doc, a fixer with reach.",
    choices: [
      { text: "You'll call when you need them. That's what contacts are for.", delta: -1 },
      { text: "You call once a month. A drink, a favor, a check-in. Keep the line warm before you need to use it.", delta: 1 },
    ],
  },
  {
    id: 'q_runner_04',
    axis: 'runner_operator',
    prompt: "The job's a milk run. Easy thirty thousand. But the prep takes a week.",
    choices: [
      { text: "A week of prep for thirty? You've already mentally moved on. Find something fatter.", delta: -1 },
      { text: "A week of prep for thirty K guaranteed is a week well spent. You start the legwork tonight.", delta: 1 },
    ],
  },
  {
    id: 'q_runner_05',
    axis: 'runner_operator',
    prompt: "Your gear list. Be honest.",
    choices: [
      { text: "Whatever was on hand last time the cash hit. You replace what breaks. You don't keep inventory.", delta: -1 },
      { text: "Catalogued. Maintained. Backups for the backups. You know where every clip is at all times.", delta: 1 },
    ],
  },

  // ─── 5. AWAKENED ↔ MUNDANE ────────────────────────────────────────────────
  // awakened (-): drawn to magic, comfortable with the impossible, mana-fluent
  // mundane (+): trusts steel and silicon, magic is other people's problem
  {
    id: 'q_awak_01',
    axis: 'awakened_mundane',
    prompt: "A shaman in a Council Island lodge offers to read your aura. Free. No strings she'll admit to.",
    choices: [
      { text: "You sit. You close your eyes. You want to know what she sees.", delta: -1 },
      { text: "You decline politely and leave. There's nothing in your aura you want a stranger handling.", delta: 1 },
    ],
  },
  {
    id: 'q_awak_02',
    axis: 'awakened_mundane',
    prompt: "Something passes through the wall of your safehouse at 0300. You can feel it before you see it. Not metal. Not light.",
    choices: [
      { text: "You're already reaching for it — not the gun, the awareness. You want to know what it is.", delta: -1 },
      { text: "Gun first, questions never. If it can pass through walls, you don't want it deciding to pass through you.", delta: 1 },
    ],
  },
  {
    id: 'q_awak_03',
    axis: 'awakened_mundane',
    prompt: "A drunk talismonger in Pioneer Square presses a small bone fetish into your palm. \"You'll know when.\"",
    choices: [
      { text: "You keep it. In the inside pocket. You don't ask why you trust it, but you do.", delta: -1 },
      { text: "You drop it in the next dumpster. You don't carry things you don't understand.", delta: 1 },
    ],
  },
  {
    id: 'q_awak_04',
    axis: 'awakened_mundane',
    prompt: "The team needs a ritual circle drawn for the magical extraction. The mage is busy holding the wards. Someone has to do the chalk work.",
    choices: [
      { text: "You'll do it. Show you the pattern once and you can copy it clean. The geometry feels right.", delta: -1 },
      { text: "Hard pass. You're not putting your hand to anything that ends in someone chanting in Sperethiel.", delta: 1 },
    ],
  },
  {
    id: 'q_awak_05',
    axis: 'awakened_mundane',
    prompt: "Your chrome's acting up. The street doc offers a clean bioware swap — vat-grown, no Essence cost worth mentioning.",
    choices: [
      { text: "No swap. You'd rather have the chrome humming than something grown in a tank running through your veins.", delta: -1 },
      { text: "Do it. Less interference with… whatever you'd rather not interfere with. Bioware all the way down.", delta: 1 },
    ],
  },

  // ─── 6. HUMAN ↔ METAHUMAN ─────────────────────────────────────────────────
  // human (-): identifies with humanity, prefers the familiar, uneasy with goblinization
  // metahuman (+): comfortable in metahuman skin, drawn to the Awakened bloodlines
  {
    id: 'q_meta_01',
    axis: 'human_metahuman',
    prompt: "A trog bar in the Ork Underground. Cheap synthahol, loud music, low ceilings. Your team meets there sometimes.",
    choices: [
      { text: "You drink fast and leave fast. The crowd's not your crowd. You don't pretend it is.", delta: -1 },
      { text: "You've got a regular stool. The bartender knows your order. You're more at home there than topside.", delta: 1 },
    ],
  },
  {
    id: 'q_meta_02',
    axis: 'human_metahuman',
    prompt: "Humanis flyers are up on every pole in your block. \"Pure\" this, \"natural\" that.",
    choices: [
      { text: "You don't agree with them, but you don't take the flyers down either. It's not your fight.", delta: -1 },
      { text: "You're tearing them down on the way to the car. Every single one.", delta: 1 },
    ],
  },
  {
    id: 'q_meta_03',
    axis: 'human_metahuman',
    prompt: "The corp recruiter on the other side of the table is human-only by policy. They don't say it. You know.",
    choices: [
      { text: "You take the meeting. You're not joining anyway. Money's money.", delta: -1 },
      { text: "You walk out. You don't sit at tables that wouldn't seat your team.", delta: 1 },
    ],
  },
  {
    id: 'q_meta_04',
    axis: 'human_metahuman',
    prompt: "You're at a clinic. The doc asks about your ancestry. UGE, goblinization in the family, anything?",
    choices: [
      { text: "Nothing. As far as you know, the family's been the same shape since before the Awakening.", delta: -1 },
      { text: "Yeah. There's metatype in the bloodline. You don't know which way you might still drift.", delta: 1 },
    ],
  },
  {
    id: 'q_meta_05',
    axis: 'human_metahuman',
    prompt: "Halloweener tags on the wall outside your doss. \"NO HORNS.\" Not aimed at you. Aimed at someone.",
    choices: [
      { text: "It's ugly, but it's not new. You've got bigger problems than a wall.", delta: -1 },
      { text: "You're back tonight with paint and a steady hand. The wall's getting fixed before sunrise.", delta: 1 },
    ],
  },
];

// Sanity check at module load — fail fast if the question set is malformed.
if (QUESTIONS.length !== 30) {
  throw new Error(`Quiz must have exactly 30 questions, found ${QUESTIONS.length}`);
}
const counts = QUESTIONS.reduce<Record<string, number>>((acc, q) => {
  acc[q.axis] = (acc[q.axis] ?? 0) + 1;
  return acc;
}, {});
for (const [axis, n] of Object.entries(counts)) {
  if (n !== 5) throw new Error(`Axis ${axis} has ${n} questions, expected 5`);
}
