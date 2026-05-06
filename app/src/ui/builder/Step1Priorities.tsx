import type { MagicDisposition, PriorityAssignment, PriorityCategory, PriorityLevel } from '../../engine/types';
import type { BuilderDraft } from './types';
import priorityData from '../../../../data/sr2/priority_table.json';

const LEVELS: PriorityLevel[]    = ['A', 'B', 'C', 'D', 'E'];
const CATEGORIES: PriorityCategory[] = ['race', 'magic', 'attributes', 'skills', 'resources'];

const LABELS: Record<PriorityCategory, string> = {
  race:       'METATYPE',
  magic:      'MAGIC',
  attributes: 'ATTRIBUTES',
  skills:     'SKILLS',
  resources:  'RESOURCES',
};

function priDesc(cat: PriorityCategory, level: PriorityLevel): string {
  const row = priorityData.priorities.find(p => p.level === level)!;
  switch (cat) {
    case 'race':       return row.race.allowsMetahuman ? 'Metahuman' : 'Human only';
    case 'magic':      return magicDesc(level);
    case 'attributes': return `${row.attributes.points} pts`;
    case 'skills':     return `${row.skills.points} pts`;
    case 'resources':  return nuyen(row.resources.nuyen);
  }
}

function magicDesc(level: PriorityLevel): string {
  const row = priorityData.priorities.find(p => p.level === level)!;
  const m   = row.magic;
  if (m.fullMagicianHuman) return 'Full mage (Human)';
  if (m.fullMagicianMeta)  return 'Full mage (Meta)';
  if (m.adeptHuman)        return 'Adept (Human)';
  if (m.adeptMeta)         return 'Adept (Meta)';
  return 'No magic';
}

function nuyen(n: number): string {
  return n >= 1_000_000 ? `${n / 1_000_000}M¥`
       : n >= 1_000     ? `${n / 1_000}K¥`
       : `${n}¥`;
}

function magicWarning(magic: MagicDisposition, level: PriorityLevel): string | null {
  const row = priorityData.priorities.find(p => p.level === level)!.magic;
  if (magic === 'full_magic') {
    if (!row.fullMagicianHuman && !row.fullMagicianMeta)
      return 'Full magic requires Priority A (human) or B (meta)';
  }
  if (magic === 'adept') {
    if (!row.adeptHuman && !row.adeptMeta)
      return 'Physical adept requires Priority B (human) or C (meta)';
  }
  return null;
}

interface Props {
  draft:    BuilderDraft;
  onUpdate: (partial: Partial<BuilderDraft>) => void;
  onNext:   () => void;
  onBack:   () => void;
}

export function Step1Priorities({ draft, onUpdate, onNext, onBack }: Props) {
  const pri = draft.priorities ?? {} as Partial<PriorityAssignment>;

  function handleClick(cat: PriorityCategory, level: PriorityLevel) {
    const current = { ...pri } as Partial<PriorityAssignment>;
    // If another category already has this level, swap
    const displaced = (Object.entries(current) as [PriorityCategory, PriorityLevel][])
      .find(([k, v]) => k !== cat && v === level);
    if (displaced) {
      current[displaced[0]] = current[cat];
    }
    current[cat] = level;
    onUpdate({ priorities: current as PriorityAssignment });
  }

  const allAssigned = CATEGORIES.every(c => pri[c]);
  const magicWarn = allAssigned && pri.magic
    ? magicWarning(draft.magicDisposition, pri.magic)
    : null;
  const canNext = allAssigned && !magicWarn;

  return (
    <div className="builder-step">
      <h2 className="builder-step-title">PRIORITY TABLE</h2>
      <p className="builder-step-hint">
        Assign each priority (A–E) to exactly one category. A is highest, E is lowest.
        {draft.magicDisposition !== 'mundane' && (
          <span> Magic priority must be compatible with your magic type.</span>
        )}
      </p>

      <div className="pri-grid">
        <div className="pri-header-row">
          <span className="pri-cat-label" />
          {LEVELS.map(l => (
            <span key={l} className="pri-level-header">{l}</span>
          ))}
        </div>

        {CATEGORIES.map(cat => (
          <div key={cat} className="pri-row">
            <span className="pri-cat-label">{LABELS[cat]}</span>
            {LEVELS.map(level => {
              const selected  = pri[cat] === level;
              const usedByOther = !selected && (Object.entries(pri) as [PriorityCategory, PriorityLevel][])
                .some(([k, v]) => k !== cat && v === level);
              return (
                <button
                  key={level}
                  className={`pri-cell${selected ? ' selected' : ''}${usedByOther ? ' dim' : ''}`}
                  onClick={() => handleClick(cat, level)}
                  title={priDesc(cat, level)}
                >
                  <span className="pri-cell-level">{level}</span>
                  <span className="pri-cell-desc">{priDesc(cat, level)}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {magicWarn && <p className="builder-warning">⚠ {magicWarn}</p>}

      <div className="builder-nav">
        <button className="btn-ghost" onClick={onBack}>← BACK</button>
        <button className="btn btn-primary btn-sm" onClick={onNext} disabled={!canNext}>
          NEXT →
        </button>
      </div>
    </div>
  );
}
