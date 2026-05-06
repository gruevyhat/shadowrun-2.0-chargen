import { useState } from 'react';
import type { BuilderDraft } from './types';
import type { IdentityOverrides } from '../store';
import { generateName } from '../nameGenerator';
import { generateDemographics } from '../demographicsGenerator';
import { generateBackground } from '../backgroundGenerator';
import { generateContacts } from '../contactsGenerator';
import { generateAdditionalDetails } from '../additionalDetailsGenerator';

function freshSeed(): number {
  return Math.floor(Math.random() * 0xffffffff);
}

interface Props {
  draft:    BuilderDraft;
  onUpdate: (partial: Partial<BuilderDraft>) => void;
  onNext:   () => void;
  onBack:   () => void;
}

export function Step7Identity({ draft, onUpdate, onNext, onBack }: Props) {
  const archetype = draft.archetype;
  const metatype  = draft.metatype ?? 'human';
  const magic     = draft.magicDisposition;

  const [seed, setSeed]         = useState(() => freshSeed());
  const [overrides, setOverrides] = useState<IdentityOverrides>(draft.identityOverrides ?? {});

  // Generate auto values from seed
  const demographics = generateDemographics(seed, metatype, archetype);
  const runnerName   = generateName(seed, archetype, metatype, demographics.sex, demographics.origin);
  const background   = generateBackground(seed, archetype, metatype, magic, runnerName);
  const details      = generateAdditionalDetails(seed, archetype, metatype, magic, demographics, runnerName);
  const contacts     = generateContacts(seed, archetype, 3);

  function regenAll() {
    setSeed(freshSeed());
    const cleared: IdentityOverrides = {};
    setOverrides(cleared);
    onUpdate({ identityOverrides: cleared });
  }

  function set(key: keyof IdentityOverrides, value: string) {
    const updated: IdentityOverrides = { ...overrides, [key]: value || undefined };
    setOverrides(updated);
    onUpdate({ identityOverrides: updated });
  }

  const display = (key: keyof IdentityOverrides, fallback: string) =>
    (overrides[key] as string | undefined) ?? fallback;

  return (
    <div className="builder-step">
      <h2 className="builder-step-title">IDENTITY</h2>
      <p className="builder-step-hint">
        Auto-generated — edit any field or regenerate all.
        <button className="btn-ghost" style={{ marginLeft: '1rem' }} onClick={regenAll}>↻ REGENERATE</button>
      </p>

      <div className="identity-grid">
        <label className="identity-row">
          <span className="identity-label">RUNNER NAME</span>
          <input
            className="identity-input"
            value={display('runnerName', runnerName)}
            onChange={e => set('runnerName', e.target.value)}
            placeholder={runnerName}
          />
        </label>

        <div className="identity-row identity-static">
          <span className="identity-label">DEMOGRAPHICS</span>
          <span className="identity-value">
            {demographics.sex === 'M' ? 'Male' : 'Female'} · Age {demographics.age} · {demographics.origin}
          </span>
        </div>

        <label className="identity-row">
          <span className="identity-label">APPEARANCE</span>
          <textarea
            className="identity-input"
            rows={2}
            value={display('appearance', demographics.appearance)}
            onChange={e => set('appearance', e.target.value)}
          />
        </label>

        <label className="identity-row">
          <span className="identity-label">PERSONALITY</span>
          <input
            className="identity-input"
            value={display('personality', details.personality)}
            onChange={e => set('personality', e.target.value)}
          />
        </label>

        <label className="identity-row">
          <span className="identity-label">MORAL CODE</span>
          <input
            className="identity-input"
            value={display('moralCode', details.moralCode)}
            onChange={e => set('moralCode', e.target.value)}
          />
        </label>

        <label className="identity-row">
          <span className="identity-label">GOALS</span>
          <input
            className="identity-input"
            value={display('goals', details.goals)}
            onChange={e => set('goals', e.target.value)}
          />
        </label>

        <label className="identity-row">
          <span className="identity-label">BACKGROUND</span>
          <textarea
            className="identity-input"
            rows={3}
            value={display('background', background)}
            onChange={e => set('background', e.target.value)}
          />
        </label>

        <div className="identity-row identity-static">
          <span className="identity-label">CONTACTS</span>
          <span className="identity-value">
            {contacts.map(c => `${c.name} (${c.role})`).join(' · ')}
          </span>
        </div>
      </div>

      <div className="builder-nav">
        <button className="btn-ghost" onClick={onBack}>← BACK</button>
        <button className="btn btn-primary btn-sm" onClick={onNext}>NEXT →</button>
      </div>
    </div>
  );
}
