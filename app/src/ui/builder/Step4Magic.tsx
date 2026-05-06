import { useState } from 'react';
import type { AdeptPowerSelection, SpellSelection } from '../../engine/types';
import type { BuilderDraft } from './types';
import spellsData      from '../../../../data/sr2/spells.json';
import adeptPowersData from '../../../../data/sr2/adept_powers.json';
import priorityData    from '../../../../data/sr2/priority_table.json';

// ── Spells (full_magic) ────────────────────────────────────────────────────

const SPELL_CATS = ['combat', 'detection', 'health', 'illusion', 'manipulation'] as const;
const SPELL_CAT_LABELS: Record<string, string> = {
  combat: 'COMBAT', detection: 'DETECTION', health: 'HEALTH',
  illusion: 'ILLUSION', manipulation: 'MANIPULATION',
};

function SpellsPanel({
  budget, spells, onChange,
}: {
  budget: number;
  spells: SpellSelection[];
  onChange: (s: SpellSelection[]) => void;
}) {
  const [activeCat, setActiveCat] = useState<string>('combat');
  const used = spells.reduce((s, sp) => s + sp.force, 0);
  const remaining = budget - used;

  function toggleSpell(spellId: string) {
    const idx = spells.findIndex(s => s.spellId === spellId);
    if (idx >= 0) {
      onChange(spells.filter((_, i) => i !== idx));
    } else {
      if (remaining < 1) return;
      onChange([...spells, { spellId, force: 1 }]);
    }
  }

  function setForce(spellId: string, force: number) {
    const next = spells.map(s => s.spellId === spellId ? { ...s, force } : s);
    onChange(next);
  }

  const catSpells = spellsData.spells.filter(s => s.category === activeCat);

  return (
    <div>
      <div className="attr-pool-bar">
        <span className="attr-pool-label">FORCE POOL</span>
        <span className={`attr-pool-remaining${remaining < 0 ? ' over' : ''}`}>
          {remaining} / {budget}
        </span>
        <span className="attr-pool-hint">force points remaining</span>
      </div>

      <div className="builder-tabs">
        {SPELL_CATS.map(cat => (
          <button
            key={cat}
            className={`builder-tab${activeCat === cat ? ' active' : ''}`}
            onClick={() => setActiveCat(cat)}
          >
            {SPELL_CAT_LABELS[cat]}
          </button>
        ))}
      </div>

      <div className="resource-list">
        {catSpells.map(sp => {
          const sel = spells.find(s => s.spellId === sp.id);
          const canAdd = !sel && remaining >= 1;
          return (
            <div key={sp.id} className={`resource-item${sel ? ' selected' : ''}`}>
              <div className="resource-item-info">
                <span className="resource-item-name">{sp.name}</span>
                <span className="resource-item-detail">
                  {sp.type} · {sp.target} · Drain {sp.drainCode}
                </span>
              </div>
              {sel ? (
                <div className="resource-item-actions">
                  <span className="resource-item-cost">Force</span>
                  <button className="attr-btn" onClick={() => setForce(sp.id, Math.max(1, sel.force - 1))}>−</button>
                  <span className="attr-value">{sel.force}</span>
                  <button className="attr-btn" onClick={() => {
                    if (remaining >= 1) setForce(sp.id, sel.force + 1);
                  }} disabled={remaining < 1}>+</button>
                  <button className="btn-ghost" style={{ color: 'var(--damage)' }} onClick={() => toggleSpell(sp.id)}>✕</button>
                </div>
              ) : (
                <button
                  className="btn-sm btn"
                  onClick={() => toggleSpell(sp.id)}
                  disabled={!canAdd}
                  style={{ minWidth: '4rem' }}
                >
                  ADD
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Adept Powers ───────────────────────────────────────────────────────────

const POWER_CATS = ['combat', 'physical', 'perception'] as const;
const POWER_CAT_LABELS: Record<string, string> = {
  combat: 'COMBAT', physical: 'PHYSICAL', perception: 'PERCEPTION',
};

function AdeptPanel({
  magicPool, powers, onChange,
}: {
  magicPool: number;
  powers: AdeptPowerSelection[];
  onChange: (p: AdeptPowerSelection[]) => void;
}) {
  const [activeCat, setActiveCat] = useState<string>('combat');
  const used = powers.reduce((s, p) => s + p.magicCost, 0);
  const remaining = parseFloat((magicPool - used).toFixed(2));

  function togglePower(powerId: string, cost: number) {
    const idx = powers.findIndex(p => p.powerId === powerId);
    if (idx >= 0) {
      onChange(powers.filter((_, i) => i !== idx));
    } else {
      if (remaining < cost) return;
      onChange([...powers, { powerId, magicCost: cost }]);
    }
  }

  const catPowers = adeptPowersData.adeptPowers.filter(p => p.category === activeCat);

  return (
    <div>
      <div className="attr-pool-bar">
        <span className="attr-pool-label">MAGIC POOL</span>
        <span className={`attr-pool-remaining${remaining < 0 ? ' over' : ''}`}>
          {remaining.toFixed(2)} / {magicPool}
        </span>
        <span className="attr-pool-hint">points remaining (assumes Essence 6)</span>
      </div>

      <div className="builder-tabs">
        {POWER_CATS.map(cat => (
          <button
            key={cat}
            className={`builder-tab${activeCat === cat ? ' active' : ''}`}
            onClick={() => setActiveCat(cat)}
          >
            {POWER_CAT_LABELS[cat] ?? cat.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="resource-list">
        {catPowers.map(pw => {
          const sel = powers.find(p => p.powerId === pw.id);
          const canAdd = !sel && remaining >= pw.magicCost;
          return (
            <div key={pw.id} className={`resource-item${sel ? ' selected' : ''}`}>
              <div className="resource-item-info">
                <span className="resource-item-name">{pw.name}</span>
                <span className="resource-item-detail">Cost {pw.magicCost} · {pw.effect}</span>
              </div>
              {sel ? (
                <button className="btn-ghost" style={{ color: 'var(--damage)' }} onClick={() => togglePower(pw.id, pw.magicCost)}>✕ REMOVE</button>
              ) : (
                <button
                  className="btn-sm btn"
                  onClick={() => togglePower(pw.id, pw.magicCost)}
                  disabled={!canAdd}
                  style={{ minWidth: '4rem' }}
                >
                  ADD
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Step wrapper ───────────────────────────────────────────────────────────

interface Props {
  draft:    BuilderDraft;
  onUpdate: (partial: Partial<BuilderDraft>) => void;
  onNext:   () => void;
  onBack:   () => void;
}

export function Step4Magic({ draft, onUpdate, onNext, onBack }: Props) {
  const magic = draft.magicDisposition;
  const priRow = priorityData.priorities.find(p => p.level === draft.priorities!.resources)!;

  if (magic === 'mundane') {
    return (
      <div className="builder-step">
        <h2 className="builder-step-title">MAGIC</h2>
        <p className="builder-step-hint">Your runner is mundane — no magic to allocate.</p>
        <div className="builder-nav">
          <button className="btn-ghost" onClick={onBack}>← BACK</button>
          <button className="btn btn-primary btn-sm" onClick={onNext}>NEXT →</button>
        </div>
      </div>
    );
  }

  if (magic === 'full_magic') {
    const budget = priRow.resources.forcePoints;
    return (
      <div className="builder-step">
        <h2 className="builder-step-title">SPELLS</h2>
        <p className="builder-step-hint">
          Select spells and set their force (1+ each). Force pool from your Resources priority.
        </p>
        <SpellsPanel
          budget={budget}
          spells={draft.spells ?? []}
          onChange={spells => onUpdate({ spells })}
        />
        <div className="builder-nav">
          <button className="btn-ghost" onClick={onBack}>← BACK</button>
          <button className="btn btn-primary btn-sm" onClick={onNext}>NEXT →</button>
        </div>
      </div>
    );
  }

  // adept
  const magicPool = 6; // Essence 6 assumed; reduced if cyberware added in Step 6
  return (
    <div className="builder-step">
      <h2 className="builder-step-title">ADEPT POWERS</h2>
      <p className="builder-step-hint">
        Spend Magic Points on adept powers. Magic = floor(Essence) — currently 6 assuming no cyberware.
        Any cyberware in Step 6 will reduce your available magic.
      </p>
      <AdeptPanel
        magicPool={magicPool}
        powers={draft.adeptPowers ?? []}
        onChange={adeptPowers => onUpdate({ adeptPowers })}
      />
      <div className="builder-nav">
        <button className="btn-ghost" onClick={onBack}>← BACK</button>
        <button className="btn btn-primary btn-sm" onClick={onNext}>NEXT →</button>
      </div>
    </div>
  );
}
