import { useState } from 'react';
import type { CyberwareItem, GearItem } from '../../engine/types';
import type { BuilderDraft } from './types';
import gearData      from '../../../../data/sr2/gear.json';
import cyberwareData from '../../../../data/sr2/cyberware.json';
import priorityData  from '../../../../data/sr2/priority_table.json';

function nuyen(n: number): string {
  return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M¥`
       : n >= 1_000     ? `${(n / 1_000).toFixed(0)}K¥`
       : `${n}¥`;
}

// ── Gear catalog ─────────────────────────────────────────────────────────

type GearEntry = typeof gearData.gear[0] & {
  costNuyen?: number;
  damageCode?: string;
  armorBallistic?: number;
  armorImpact?: number;
};

const GEAR_CAT_LABELS: Record<string, string> = {
  pistol: 'PISTOLS', smg: 'SMG', rifle: 'RIFLES', lmg: 'LMG',
  shotgun: 'SHOTGUNS', meleeWeapon: 'MELEE', projectileWeapon: 'PROJECTILE',
  explosive: 'EXPLOSIVES', armor: 'ARMOR', cyberdeck: 'CYBERDECKS',
  electronics: 'ELECTRONICS', vehicle: 'VEHICLES', misc: 'MISC', other: 'OTHER',
};

const GEAR_TABS = ['pistol','smg','rifle','lmg','shotgun','meleeWeapon','armor','cyberdeck','electronics','vehicle','misc'];

function GearPanel({
  budget, gear, onChange,
}: {
  budget: number;
  gear: GearItem[];
  onChange: (g: GearItem[]) => void;
}) {
  const [activeTab, setActiveTab] = useState('pistol');
  const spent     = gear.reduce((s, g) => s + g.costNuyen * g.quantity, 0);
  const remaining = budget - spent;

  const tabItems = gearData.gear.filter(g => g.category === activeTab) as GearEntry[];

  function addItem(item: GearEntry) {
    const cost = item.costNuyen ?? 0;
    if (remaining < cost) return;
    const existing = gear.find(g => g.gearId === item.id);
    if (existing) {
      onChange(gear.map(g => g.gearId === item.id ? { ...g, quantity: g.quantity + 1 } : g));
    } else {
      onChange([...gear, { gearId: item.id, costNuyen: cost, quantity: 1 }]);
    }
  }

  function removeItem(gearId: string) {
    onChange(gear.filter(g => g.gearId !== gearId));
  }

  return (
    <div>
      <div className="attr-pool-bar">
        <span className="attr-pool-label">NUYEN</span>
        <span className={`attr-pool-remaining${remaining < 0 ? ' over' : ''}`}>
          {nuyen(remaining)} / {nuyen(budget)}
        </span>
        <span className="attr-pool-hint">remaining</span>
      </div>

      <div className="builder-tabs" style={{ flexWrap: 'wrap' }}>
        {GEAR_TABS.map(cat => (
          <button
            key={cat}
            className={`builder-tab${activeTab === cat ? ' active' : ''}`}
            onClick={() => setActiveTab(cat)}
          >
            {GEAR_CAT_LABELS[cat] ?? cat.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="resource-list">
        {tabItems.map(item => {
          const cost    = item.costNuyen ?? 0;
          const inCart  = gear.find(g => g.gearId === item.id);
          const canAdd  = remaining >= cost;
          return (
            <div key={item.id} className={`resource-item${inCart ? ' selected' : ''}`}>
              <div className="resource-item-info">
                <span className="resource-item-name">{item.name}</span>
                <span className="resource-item-detail">
                  {nuyen(cost)}
                  {(item as GearEntry).damageCode ? ` · ${(item as GearEntry).damageCode}` : ''}
                  {(item as GearEntry).armorBallistic != null
                    ? ` · ${(item as GearEntry).armorBallistic}/${(item as GearEntry).armorImpact}`
                    : ''}
                </span>
              </div>
              {inCart ? (
                <div className="resource-item-actions">
                  <span className="resource-item-cost">×{inCart.quantity}</span>
                  <button className="btn-ghost" style={{ color: 'var(--damage)' }} onClick={() => removeItem(item.id)}>✕</button>
                </div>
              ) : (
                <button
                  className="btn-sm btn"
                  onClick={() => addItem(item)}
                  disabled={!canAdd}
                  style={{ minWidth: '4rem' }}
                >
                  {nuyen(cost)}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Cyberware catalog ──────────────────────────────────────────────────────

type CyberEntry = typeof cyberwareData.cyberware[0];

const CYBER_CAT_LABELS: Record<string, string> = {
  headware: 'HEADWARE', senseware: 'SENSEWARE', bodyware: 'BODYWARE',
  cyberweapon: 'CYBER WEAPONS', cyberlimp: 'CYBER LIMBS',
};
const CYBER_TABS = ['headware', 'senseware', 'bodyware', 'cyberweapon', 'cyberlimp'];

function CyberPanel({
  budget, cyberware, onChange,
}: {
  budget: number;
  cyberware: CyberwareItem[];
  onChange: (cw: CyberwareItem[]) => void;
}) {
  const [activeTab, setActiveTab] = useState('headware');

  const essenceUsed = parseFloat(cyberware.reduce((s, cw) => s + cw.essenceCost, 0).toFixed(2));
  const essenceLeft = parseFloat((6 - essenceUsed).toFixed(2));
  const nuyenSpent  = cyberware.reduce((s, cw) => s + cw.costNuyen, 0);
  const nuyenLeft   = budget - nuyenSpent;

  const tabItems = cyberwareData.cyberware.filter(c => c.category === activeTab) as CyberEntry[];

  function addItem(item: CyberEntry) {
    if (essenceLeft < item.essenceCost) return;
    if (nuyenLeft < item.costNuyen) return;
    if (cyberware.find(c => c.cyberwareId === item.id)) return;
    onChange([...cyberware, { cyberwareId: item.id, essenceCost: item.essenceCost, costNuyen: item.costNuyen }]);
  }

  function removeItem(id: string) {
    onChange(cyberware.filter(c => c.cyberwareId !== id));
  }

  return (
    <div>
      <div className="attr-pool-bar" style={{ gap: '1rem' }}>
        <span className="attr-pool-label">ESSENCE</span>
        <span className={`attr-pool-remaining${essenceLeft < 0 ? ' over' : ''}`}>
          {essenceLeft.toFixed(2)} / 6.00
        </span>
        <span className="attr-pool-label" style={{ marginLeft: '1rem' }}>NUYEN</span>
        <span className={`attr-pool-remaining${nuyenLeft < 0 ? ' over' : ''}`}>
          {nuyen(nuyenLeft)}
        </span>
      </div>

      <div className="builder-tabs">
        {CYBER_TABS.map(cat => (
          <button
            key={cat}
            className={`builder-tab${activeTab === cat ? ' active' : ''}`}
            onClick={() => setActiveTab(cat)}
          >
            {CYBER_CAT_LABELS[cat] ?? cat.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="resource-list">
        {tabItems.map(item => {
          const owned  = cyberware.find(c => c.cyberwareId === item.id);
          const canAdd = !owned && essenceLeft >= item.essenceCost && nuyenLeft >= item.costNuyen;
          return (
            <div key={item.id} className={`resource-item${owned ? ' selected' : ''}`}>
              <div className="resource-item-info">
                <span className="resource-item-name">{item.name}</span>
                <span className="resource-item-detail">
                  {item.essenceCost}✦ · {nuyen(item.costNuyen)}
                </span>
                <span className="resource-item-detail" style={{ opacity: 0.7 }}>{item.effect}</span>
              </div>
              {owned ? (
                <button className="btn-ghost" style={{ color: 'var(--damage)' }} onClick={() => removeItem(item.id)}>✕ REMOVE</button>
              ) : (
                <button
                  className="btn-sm btn"
                  onClick={() => addItem(item)}
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

// ── Step wrapper ────────────────────────────────────────────────────────────

interface Props {
  draft:    BuilderDraft;
  onUpdate: (partial: Partial<BuilderDraft>) => void;
  onNext:   () => void;
  onBack:   () => void;
}

export function Step6Resources({ draft, onUpdate, onNext, onBack }: Props) {
  const [mode, setMode] = useState<'gear' | 'cyber'>('gear');
  const priRow  = priorityData.priorities.find(p => p.level === draft.priorities!.resources)!;
  const budget  = priRow.resources.nuyen;

  const gear      = draft.gear ?? [];
  const cyberware = draft.cyberware ?? [];

  const gearSpent  = gear.reduce((s, g) => s + g.costNuyen * g.quantity, 0);
  const cyberSpent = cyberware.reduce((s, c) => s + c.costNuyen, 0);
  const remaining  = budget - gearSpent - cyberSpent;

  // Share remaining nuyen budget between gear and cyberware
  // Pass the full budget minus what the other side spent
  const gearBudget  = budget - cyberSpent;
  const cyberBudget = budget - gearSpent;

  return (
    <div className="builder-step">
      <h2 className="builder-step-title">RESOURCES</h2>
      <p className="builder-step-hint">
        Budget: {nuyen(budget)} · Spent: {nuyen(gearSpent + cyberSpent)} · Remaining: {nuyen(Math.max(0, remaining))}
      </p>

      <div className="builder-tabs" style={{ marginBottom: '1rem' }}>
        <button className={`builder-tab${mode === 'gear' ? ' active' : ''}`} onClick={() => setMode('gear')}>
          GEAR & WEAPONS
        </button>
        <button className={`builder-tab${mode === 'cyber' ? ' active' : ''}`} onClick={() => setMode('cyber')}>
          CYBERWARE
        </button>
      </div>

      {mode === 'gear' ? (
        <GearPanel
          budget={gearBudget}
          gear={gear}
          onChange={g => onUpdate({ gear: g })}
        />
      ) : (
        <CyberPanel
          budget={cyberBudget}
          cyberware={cyberware}
          onChange={cw => onUpdate({ cyberware: cw })}
        />
      )}

      <div className="builder-nav">
        <button className="btn-ghost" onClick={onBack}>← BACK</button>
        <button className="btn btn-primary btn-sm" onClick={onNext}>NEXT →</button>
      </div>
    </div>
  );
}
