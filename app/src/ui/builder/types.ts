import type {
  AdeptPowerSelection,
  ArchetypeId,
  AttributeKey,
  CyberwareItem,
  GearItem,
  MagicDisposition,
  MetatypeId,
  PriorityAssignment,
  SkillRating,
  SpellSelection,
} from '../../engine/types';
import type { IdentityOverrides } from '../store';

export type BuilderStep = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface BuilderDraft {
  archetype:           ArchetypeId;
  magicDisposition:    MagicDisposition;
  priorities?:         PriorityAssignment;
  metatype?:           MetatypeId;
  attributes?:         Record<AttributeKey, number>;
  spells?:             SpellSelection[];
  adeptPowers?:        AdeptPowerSelection[];
  skills?:             SkillRating[];
  cyberware?:          CyberwareItem[];
  gear?:               GearItem[];
  identityOverrides?:  IdentityOverrides;
}
