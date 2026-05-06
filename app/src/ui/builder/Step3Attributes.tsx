import type { AttributeKey } from '../../engine/types';
import type { BuilderDraft } from './types';
import metatypesData from '../../../../data/sr2/metatypes.json';
import priorityData  from '../../../../data/sr2/priority_table.json';

const ATTRS: AttributeKey[] = ['body', 'quickness', 'strength', 'charisma', 'intelligence', 'willpower'];
const ABBR: Record<AttributeKey, string> = {
  body: 'BOD', quickness: 'QCK', strength: 'STR',
  charisma: 'CHA', intelligence: 'INT', willpower: 'WIL',
};
const LINKED: Record<AttributeKey, string> = {
  body: 'Physical resist', quickness: 'Ranged / init', strength: 'Melee / damage',
  charisma: 'Social', intelligence: 'Detection / matrix', willpower: 'Drain / mental',
};

// Compute pool cost = sum of max(0, final[k] - 1 - mod[k])
// This mirrors how the engine works: targets[k] = points above base 1
function poolCost(finals: Record<AttributeKey, number>, mods: Partial<Record<string, number>>): number {
  return ATTRS.reduce((sum, k) => sum + Math.max(0, finals[k] - 1 - (mods[k] ?? 0)), 0);
}

interface Props {
  draft:    BuilderDraft;
  onUpdate: (partial: Partial<BuilderDraft>) => void;
  onNext:   () => void;
  onBack:   () => void;
}

export function Step3Attributes({ draft, onUpdate, onNext, onBack }: Props) {
  const meta     = metatypesData.metatypes.find(m => m.id === draft.metatype)!;
  const mods     = meta.attributeMods as Partial<Record<string, number>>;
  const racialMax = meta.racialMaximums as Record<string, number>;
  const priRow   = priorityData.priorities.find(p => p.level === draft.priorities!.attributes)!;
  const totalPool = priRow.attributes.points;

  // Initial attributes: start at racial minimum (max(1, 1 + mod))
  const initialAttrs = (): Record<AttributeKey, number> =>
    Object.fromEntries(ATTRS.map(k => [k, Math.max(1, 1 + (mods[k] ?? 0))])) as Record<AttributeKey, number>;

  const attrs = draft.attributes ?? initialAttrs();

  const spent     = poolCost(attrs, mods) + 6; // +6 for base minimums
  const remaining = totalPool - spent;

  // Derived stats for preview
  const reaction  = Math.floor((attrs.quickness + attrs.intelligence) / 2);
  const combatPool = Math.floor((attrs.quickness + attrs.intelligence + attrs.willpower) / 2);

  function adjust(k: AttributeKey, delta: number) {
    const current   = attrs[k];
    const next      = current + delta;
    const maxVal    = racialMax[k] ?? 6;
    const minVal    = Math.max(1, 1 + (mods[k] ?? 0));
    if (next < minVal || next > maxVal) return;

    const updated = { ...attrs, [k]: next };
    const newCost = poolCost(updated, mods) + 6;
    if (newCost > totalPool) return;
    onUpdate({ attributes: updated });
  }

  const canNext = remaining >= 0;

  return (
    <div className="builder-step">
      <h2 className="builder-step-title">ATTRIBUTES</h2>

      <div className="attr-pool-bar">
        <span className="attr-pool-label">POOL</span>
        <span className={`attr-pool-remaining${remaining < 0 ? ' over' : ''}`}>
          {remaining} / {totalPool - 6}
        </span>
        <span className="attr-pool-hint">pts remaining (6 reserved for base)</span>
      </div>

      <div className="attr-grid">
        {ATTRS.map(k => {
          const val     = attrs[k];
          const maxVal  = racialMax[k] ?? 6;
          const minVal  = Math.max(1, 1 + (mods[k] ?? 0));
          const canUp   = val < maxVal && remaining > 0;
          const canDown = val > minVal;

          return (
            <div key={k} className="attr-row">
              <div className="attr-info">
                <span className="attr-abbr">{ABBR[k]}</span>
                <span className="attr-linked">{LINKED[k]}</span>
                <span className="attr-range">max {maxVal}</span>
              </div>
              <div className="attr-control">
                <button className="attr-btn" onClick={() => adjust(k, -1)} disabled={!canDown}>−</button>
                <span className="attr-value">{val}</span>
                <button className="attr-btn" onClick={() => adjust(k, 1)} disabled={!canUp}>+</button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="attr-derived">
        <span>REA {reaction}</span>
        <span>Combat Pool {combatPool}D6</span>
        <span>ESS 6.0 (before cyberware)</span>
      </div>

      <div className="builder-nav">
        <button className="btn-ghost" onClick={onBack}>← BACK</button>
        <button className="btn btn-primary btn-sm" onClick={onNext} disabled={!canNext}>
          NEXT →
        </button>
      </div>
    </div>
  );
}
