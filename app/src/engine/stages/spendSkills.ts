import type { CharacterIntent, PriorityAssignment, SkillRating } from '../types';
import { childSeed, makeRng, weightedPick } from '../rng';
import archetypesData from '../../../../data/sr2/archetypes.json';
import skillsData     from '../../../../data/sr2/skills.json';
import priorityData   from '../../../../data/sr2/priority_table.json';

const MAX_SKILL_RATING = 6;

export function spendSkills(
  intent: CharacterIntent,
  priorities: PriorityAssignment,
): SkillRating[] {
  const rng = makeRng(childSeed(intent.seed, 'skills'));

  const archetype = archetypesData.archetypes.find(a => a.id === intent.archetype)!;
  const priRow    = priorityData.priorities.find(p => p.level === priorities.skills)!;
  const coreSkills = archetype.coreSkills as string[];

  // Filter to active skills only (exclude knowledge/language for now)
  const activeSkills = skillsData.skills.filter(
    s => !['knowledge', 'language', 'special'].includes(s.category),
  );

  // Only magicians can use sorcery/conjuring
  const isMagician = intent.magicDisposition !== 'mundane';
  const available = activeSkills.filter(
    s => !s.magicianOnly || isMagician,
  );

  let pool = priRow.skills.points;
  const ratings: Record<string, number> = {};

  // Phase 1: fill core skills to meaningful ratings
  // Distribute roughly 70% of pool across core skills
  const corePool = Math.floor(pool * 0.70);
  const coreAvail = coreSkills.filter(id => available.find(s => s.id === id));

  if (coreAvail.length > 0) {
    const basePerCore = Math.floor(corePool / coreAvail.length);
    for (const id of coreAvail) {
      ratings[id] = Math.min(MAX_SKILL_RATING, Math.max(1, basePerCore));
    }
    // Top up first two core skills toward 6 with remaining core pool
    let coreSpent = coreAvail.reduce((s, id) => s + ratings[id], 0);
    let coreLeft  = corePool - coreSpent;
    for (const id of coreAvail.slice(0, 2)) {
      const bump = Math.min(MAX_SKILL_RATING - ratings[id], coreLeft);
      ratings[id] += bump;
      coreLeft -= bump;
      if (coreLeft <= 0) break;
    }
    pool -= coreAvail.reduce((s, id) => s + ratings[id], 0);
  }

  // Phase 2: scatter remaining points across non-core active skills, rated 1–3
  const secondary = available.filter(s => !coreAvail.includes(s.id));
  while (pool > 0 && secondary.length > 0) {
    const pick = weightedPick(rng, secondary, secondary.map(() => 1));
    const current = ratings[pick.id] ?? 0;
    if (current < 3) {
      ratings[pick.id] = current + 1;
      pool--;
    } else {
      // Remove fully-allocated secondary skills to avoid infinite loop
      secondary.splice(secondary.indexOf(pick), 1);
    }
  }

  return Object.entries(ratings).map(([skillId, rating]) => ({ skillId, rating }));
}
