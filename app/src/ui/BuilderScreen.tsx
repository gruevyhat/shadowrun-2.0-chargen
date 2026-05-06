import { useState }       from 'react';
import { useApp }          from './store';
import { encodeManualBuild } from './characterCode';
import type { AttributeBlock, Character, CharacterIntent, Loadout } from '../engine/types';
import type { BuilderDraft, BuilderStep } from './builder/types';
import { Step0Start }      from './builder/Step0Start';
import { Step1Priorities } from './builder/Step1Priorities';
import { Step2Metatype }   from './builder/Step2Metatype';
import { Step3Attributes } from './builder/Step3Attributes';
import { Step4Magic }      from './builder/Step4Magic';
import { Step5Skills }     from './builder/Step5Skills';
import { Step6Resources }  from './builder/Step6Resources';
import { Step7Identity }   from './builder/Step7Identity';
import { Step8Review }     from './builder/Step8Review';
import priorityData from '../../../data/sr2/priority_table.json';
import metatypesData from '../../../data/sr2/metatypes.json';

const STEP_LABELS = [
  'ARCHETYPE',
  'PRIORITIES',
  'METATYPE',
  'ATTRIBUTES',
  'MAGIC',
  'SKILLS',
  'RESOURCES',
  'IDENTITY',
  'REVIEW',
];

const INITIAL_DRAFT: BuilderDraft = {
  archetype:        'street_samurai',
  magicDisposition: 'mundane',
};

function assembleCharacter(draft: Required<BuilderDraft>): Character {
  const meta = metatypesData.metatypes.find(m => m.id === draft.metatype)!;
  const mods = meta.attributeMods as Partial<Record<string, number>>;

  const essenceCost = (draft.cyberware ?? []).reduce((s, c) => s + c.essenceCost, 0);
  const essence     = Math.max(0, parseFloat((6 - essenceCost).toFixed(2)));
  const magic       = draft.magicDisposition !== 'mundane' ? Math.floor(essence) : 0;
  const reaction    = Math.floor((draft.attributes.quickness + draft.attributes.intelligence) / 2);

  const attributes: AttributeBlock = {
    ...draft.attributes,
    essence,
    magic,
    reaction,
  };

  const priRow     = priorityData.priorities.find(p => p.level === draft.priorities.resources)!;
  const gearSpent  = (draft.gear ?? []).reduce((s, g) => s + g.costNuyen * g.quantity, 0);
  const cyberSpent = (draft.cyberware ?? []).reduce((s, c) => s + c.costNuyen, 0);
  const remaining  = Math.max(0, priRow.resources.nuyen - gearSpent - cyberSpent);

  const loadout: Loadout = {
    cyberware:            draft.cyberware ?? [],
    gear:                 draft.gear ?? [],
    spells:               draft.spells ?? [],
    adeptPowers:          draft.adeptPowers ?? [],
    remainingNuyen:       remaining,
    remainingForcePoints: 0,
    remainingMagicPoints: 0,
    purchasedContactCount: 3,
  };

  const seed      = Math.floor(Date.now() / 1000) & 0xffffffff;
  const karmaPool = meta.isMetahuman ? 2 : 1;

  const manualCode = encodeManualBuild({
    archetype:        draft.archetype,
    magicDisposition: draft.magicDisposition,
    metatype:         draft.metatype,
    priorities:       draft.priorities,
    attributes:       draft.attributes,
    skills:           draft.skills ?? [],
    cyberware:        draft.cyberware ?? [],
    gear:             draft.gear ?? [],
    spells:           draft.spells ?? [],
    adeptPowers:      draft.adeptPowers ?? [],
    seed,
  });

  void mods; // racial mods already reflected in user-set attribute values

  const intent: CharacterIntent = {
    edition:          'sr2',
    archetype:        draft.archetype,
    magicDisposition: draft.magicDisposition,
    metatypeHint:     draft.metatype,
    seed,
    manualCode,
  };

  return {
    intent,
    priorities: draft.priorities,
    metatype:   draft.metatype,
    attributes,
    skills:     draft.skills ?? [],
    loadout,
    karmaPool,
    startingCash: Math.floor(remaining / 10),
  };
}

export function BuilderScreen() {
  const { dispatch }         = useApp();
  const [step, setStep]      = useState<BuilderStep>(0);
  const [draft, setDraft]    = useState<BuilderDraft>(INITIAL_DRAFT);

  function update(partial: Partial<BuilderDraft>) {
    setDraft(prev => ({ ...prev, ...partial }));
  }

  function next() { setStep(s => Math.min(s + 1, 8) as BuilderStep); }
  function back() {
    if (step === 0) {
      dispatch({ type: 'GO_LANDING' });
    } else {
      setStep(s => Math.max(s - 1, 0) as BuilderStep);
    }
  }

  // Skip step 4 (Magic) for mundane characters
  function advanceFromStep(s: BuilderStep) {
    if (s === 3 && draft.magicDisposition === 'mundane') {
      setStep(5);
    } else if (s === 4 && draft.magicDisposition === 'mundane') {
      setStep(5); // shouldn't render but guard
    } else {
      setStep((s + 1) as BuilderStep);
    }
  }

  function retreatFromStep(s: BuilderStep) {
    if (s === 5 && draft.magicDisposition === 'mundane') {
      setStep(3);
    } else {
      setStep((s - 1) as BuilderStep);
    }
  }

  function confirm() {
    const character = assembleCharacter(draft as Required<BuilderDraft>);
    dispatch({ type: 'SHOW_CHARACTER', character, identityOverrides: draft.identityOverrides });
  }

  const displayStep = step === 0 ? 0
    : draft.magicDisposition === 'mundane' && step >= 5 ? step - 1
    : step;
  const totalSteps = draft.magicDisposition === 'mundane' ? 8 : 9;

  return (
    <div className="screen builder">
      <div className="builder-header">
        <button className="btn-ghost" onClick={() => dispatch({ type: 'GO_LANDING' })}>← BACK</button>
        <div className="builder-progress">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${(displayStep / (totalSteps - 1)) * 100}%` }} />
          </div>
          <span className="builder-step-counter">
            {STEP_LABELS[step]} · {displayStep + 1}/{totalSteps}
          </span>
        </div>
      </div>

      <div className="builder-body">
        {step === 0 && (
          <Step0Start draft={draft} onUpdate={update} onNext={() => next()} />
        )}
        {step === 1 && (
          <Step1Priorities draft={draft} onUpdate={update} onNext={() => advanceFromStep(1)} onBack={() => back()} />
        )}
        {step === 2 && (
          <Step2Metatype draft={draft} onUpdate={update} onNext={() => advanceFromStep(2)} onBack={() => retreatFromStep(2)} />
        )}
        {step === 3 && (
          <Step3Attributes draft={draft} onUpdate={update} onNext={() => advanceFromStep(3)} onBack={() => retreatFromStep(3)} />
        )}
        {step === 4 && (
          <Step4Magic draft={draft} onUpdate={update} onNext={() => advanceFromStep(4)} onBack={() => retreatFromStep(4)} />
        )}
        {step === 5 && (
          <Step5Skills draft={draft} onUpdate={update} onNext={() => advanceFromStep(5)} onBack={() => retreatFromStep(5)} />
        )}
        {step === 6 && (
          <Step6Resources draft={draft} onUpdate={update} onNext={() => advanceFromStep(6)} onBack={() => retreatFromStep(6)} />
        )}
        {step === 7 && (
          <Step7Identity draft={draft} onUpdate={update} onNext={() => advanceFromStep(7)} onBack={() => retreatFromStep(7)} />
        )}
        {step === 8 && (
          <Step8Review draft={draft} onConfirm={confirm} onBack={() => retreatFromStep(8)} />
        )}
      </div>
    </div>
  );
}
