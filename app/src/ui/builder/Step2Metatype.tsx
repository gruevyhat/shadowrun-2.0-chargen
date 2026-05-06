import type { MetatypeId } from '../../engine/types';
import type { BuilderDraft } from './types';
import metatypesData  from '../../../../data/sr2/metatypes.json';
import priorityData   from '../../../../data/sr2/priority_table.json';

const ATTR_LABELS: Record<string, string> = {
  body: 'BOD', quickness: 'QCK', strength: 'STR',
  charisma: 'CHA', intelligence: 'INT', willpower: 'WIL',
};

interface Props {
  draft:    BuilderDraft;
  onUpdate: (partial: Partial<BuilderDraft>) => void;
  onNext:   () => void;
  onBack:   () => void;
}

export function Step2Metatype({ draft, onUpdate, onNext, onBack }: Props) {
  const priorities = draft.priorities!;
  const racePri    = priorityData.priorities.find(p => p.level === priorities.race)!;
  const metahuman  = racePri.race.allowsMetahuman;

  const available = metatypesData.metatypes.filter(m =>
    m.isMetahuman ? metahuman : true
  );

  return (
    <div className="builder-step">
      <h2 className="builder-step-title">METATYPE</h2>
      <p className="builder-step-hint">
        {metahuman
          ? 'Race Priority A — all metatypes available.'
          : 'Race Priority below A — human only. Set Race to A to unlock metahumans.'}
      </p>

      <div className="meta-grid">
        {available.map(m => {
          const mods  = m.attributeMods as Record<string, number>;
          const maxes = m.racialMaximums as Record<string, number>;
          const modLines = Object.entries(mods)
            .filter(([, v]) => v !== 0)
            .map(([k, v]) => `${ATTR_LABELS[k] ?? k} ${v > 0 ? '+' : ''}${v}`)
            .join(' / ');

          return (
            <button
              key={m.id}
              className={`builder-archetype-card${draft.metatype === m.id ? ' selected' : ''}`}
              onClick={() => onUpdate({ metatype: m.id as MetatypeId })}
            >
              <span className="builder-archetype-name">{m.name.toUpperCase()}</span>
              {modLines && <span className="builder-archetype-magic">{modLines}</span>}
              <span className="builder-archetype-desc">
                Max: {Object.entries(maxes)
                  .map(([k, v]) => `${ATTR_LABELS[k] ?? k}·${v}`)
                  .join(' ')}
              </span>
              {m.specialAbilities.length > 0 && (
                <span className="builder-archetype-desc" style={{ marginTop: '0.2rem' }}>
                  + {m.specialAbilities.join(', ').replace(/_/g, ' ')}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="builder-nav">
        <button className="btn-ghost" onClick={onBack}>← BACK</button>
        <button
          className="btn btn-primary btn-sm"
          onClick={onNext}
          disabled={!draft.metatype}
        >
          NEXT →
        </button>
      </div>
    </div>
  );
}
