import type { AdeptPowerSelection, AttributeBlock, CyberwareItem } from './types';

type CyberBonus = {
  body?:          number;
  quickness?:     number;
  strength?:      number;
  reactionDirect?: number; // added straight to Reaction (WR, Boosted Reflexes)
  initiativeDice?: number; // extra D6 for initiative
};

const CYBERWARE_BONUSES: Record<string, CyberBonus> = {
  wired_reflexes_1:    { reactionDirect: 2, initiativeDice: 1 },
  wired_reflexes_2:    { reactionDirect: 4, initiativeDice: 2 },
  wired_reflexes_3:    { reactionDirect: 6, initiativeDice: 3 },
  boosted_reflexes_1:  { initiativeDice: 1 },
  boosted_reflexes_2:  { reactionDirect: 1, initiativeDice: 1 },
  boosted_reflexes_3:  { reactionDirect: 2, initiativeDice: 2 },
  muscle_replacement_1: { quickness: 1, strength: 1 },
  muscle_replacement_2: { quickness: 2, strength: 2 },
  muscle_replacement_3: { quickness: 3, strength: 3 },
  muscle_replacement_4: { quickness: 4, strength: 4 },
  dermal_plating_1:    { body: 1 },
  dermal_plating_2:    { body: 2 },
  dermal_plating_3:    { body: 3 },
  // VCR reaction bonus only applies while rigging — not shown on base attributes
};

export interface AugmentedBlock extends AttributeBlock {
  bodyAug:       number;  // base + dermal plating
  quicknessAug:  number;  // base + muscle replacement
  strengthAug:   number;  // base + muscle replacement
  reactionAug:   number;  // floor((augQuick + int) / 2) + direct reaction bonuses
  initiativeDice: number; // total D6 count (base 1 + extras)
}

// Adept Improved Reflexes grants extra initiative dice (same as Wired Reflexes)
const ADEPT_POWER_BONUSES: Record<string, Partial<{ body: number; quickness: number; strength: number; initiativeDice: number }>> = {
  improved_reflexes_1: { initiativeDice: 1 },
  improved_reflexes_2: { initiativeDice: 2 },
  improved_reflexes_3: { initiativeDice: 3 },
  improved_body_1:     { body: 1 },
  improved_body_2:     { body: 2 },
  improved_quickness_1:{ quickness: 1 },
  improved_quickness_2:{ quickness: 2 },
  improved_strength_1: { strength: 1 },
  improved_strength_2: { strength: 2 },
};

export function augmentAttributes(
  base: AttributeBlock,
  cyberware: CyberwareItem[],
  adeptPowers: AdeptPowerSelection[] = [],
): AugmentedBlock {
  let bodyDelta = 0, quickDelta = 0, strDelta = 0, reaDirect = 0, initDice = 0;

  for (const cw of cyberware) {
    const b = CYBERWARE_BONUSES[cw.cyberwareId];
    if (!b) continue;
    bodyDelta  += b.body          ?? 0;
    quickDelta += b.quickness     ?? 0;
    strDelta   += b.strength      ?? 0;
    reaDirect  += b.reactionDirect ?? 0;
    initDice   += b.initiativeDice ?? 0;
  }

  for (const ap of adeptPowers) {
    const b = ADEPT_POWER_BONUSES[ap.powerId];
    if (!b) continue;
    bodyDelta  += b.body          ?? 0;
    quickDelta += b.quickness     ?? 0;
    strDelta   += b.strength      ?? 0;
    initDice   += b.initiativeDice ?? 0;
  }

  const augQuick    = base.quickness + quickDelta;
  const augReaction = Math.floor((augQuick + base.intelligence) / 2) + reaDirect;

  return {
    ...base,
    bodyAug:       base.body + bodyDelta,
    quicknessAug:  augQuick,
    strengthAug:   base.strength + strDelta,
    reactionAug:   augReaction,
    initiativeDice: 1 + initDice,
  };
}
