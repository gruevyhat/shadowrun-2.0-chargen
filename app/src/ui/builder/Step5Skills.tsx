import { useState } from 'react';
import type { SkillRating } from '../../engine/types';
import type { BuilderDraft } from './types';
import skillsData    from '../../../../data/sr2/skills.json';
import priorityData  from '../../../../data/sr2/priority_table.json';

type SkillEntry = typeof skillsData.skills[0] & { concentrations?: string[] };

const CATEGORIES = ['combat', 'physical', 'technical', 'social', 'vehicle', 'magical', 'knowledge', 'language'] as const;
const CAT_LABELS: Record<string, string> = {
  combat: 'COMBAT', physical: 'PHYSICAL', technical: 'TECHNICAL',
  social: 'SOCIAL', vehicle: 'VEHICLE', magical: 'MAGICAL',
  knowledge: 'KNOWLEDGE', language: 'LANGUAGE',
};

const MAX_RATING = 6;

interface Props {
  draft:    BuilderDraft;
  onUpdate: (partial: Partial<BuilderDraft>) => void;
  onNext:   () => void;
  onBack:   () => void;
}

export function Step5Skills({ draft, onUpdate, onNext, onBack }: Props) {
  const [activeCat, setActiveCat] = useState<string>('combat');
  const [concEdit, setConcEdit]   = useState<string | null>(null);

  const priRow = priorityData.priorities.find(p => p.level === draft.priorities!.skills)!;
  const pool   = priRow.skills.points;
  const skills = draft.skills ?? [];
  const used   = skills.reduce((s, sk) => s + sk.rating, 0);
  const remaining = pool - used;
  const isMagic = draft.magicDisposition !== 'mundane';

  const catSkills = (skillsData.skills as SkillEntry[]).filter(s => {
    if (s.category !== activeCat) return false;
    if ((s as { magicianOnly?: boolean }).magicianOnly && !isMagic) return false;
    return true;
  });

  function getSkill(skillId: string): SkillRating | undefined {
    return skills.find(s => s.skillId === skillId);
  }

  function addSkill(skillId: string) {
    if (remaining < 1) return;
    if (getSkill(skillId)) return;
    onUpdate({ skills: [...skills, { skillId, rating: 1 }] });
  }

  function removeSkill(skillId: string) {
    onUpdate({ skills: skills.filter(s => s.skillId !== skillId) });
    if (concEdit === skillId) setConcEdit(null);
  }

  function adjustRating(skillId: string, delta: number) {
    const sk = getSkill(skillId);
    if (!sk) return;
    const next = sk.rating + delta;
    if (next < 1 || next > MAX_RATING) return;
    if (delta > 0 && remaining < 1) return;
    onUpdate({ skills: skills.map(s => s.skillId === skillId ? { ...s, rating: next } : s) });
  }

  function setConcentration(skillId: string, conc: string) {
    onUpdate({ skills: skills.map(s => s.skillId === skillId ? { ...s, concentration: conc || undefined } : s) });
  }

  return (
    <div className="builder-step">
      <h2 className="builder-step-title">SKILLS</h2>

      <div className="attr-pool-bar">
        <span className="attr-pool-label">SKILL POOL</span>
        <span className={`attr-pool-remaining${remaining < 0 ? ' over' : ''}`}>
          {remaining} / {pool}
        </span>
        <span className="attr-pool-hint">points remaining · max rating {MAX_RATING}</span>
      </div>

      <div className="builder-tabs">
        {CATEGORIES.filter(c => {
          if (c === 'magical' && !isMagic) return false;
          return true;
        }).map(cat => (
          <button
            key={cat}
            className={`builder-tab${activeCat === cat ? ' active' : ''}`}
            onClick={() => setActiveCat(cat)}
          >
            {CAT_LABELS[cat]}
          </button>
        ))}
      </div>

      <div className="resource-list">
        {catSkills.map(sk => {
          const owned = getSkill(sk.id);
          const concs = (sk as SkillEntry).concentrations ?? [];
          const showConcPicker = concEdit === sk.id;

          return (
            <div key={sk.id} className={`resource-item skill-item${owned ? ' selected' : ''}`}>
              <div className="resource-item-info">
                <span className="resource-item-name">{sk.name}</span>
                <span className="resource-item-detail">{sk.linkedAttribute?.toUpperCase()}</span>
              </div>

              {owned ? (
                <div className="skill-owned-controls">
                  <div className="attr-control">
                    <button className="attr-btn" onClick={() => adjustRating(sk.id, -1)} disabled={owned.rating <= 1}>−</button>
                    <span className="attr-value">{owned.rating}</span>
                    <button className="attr-btn" onClick={() => adjustRating(sk.id, 1)} disabled={owned.rating >= MAX_RATING || remaining < 1}>+</button>
                  </div>
                  {concs.length > 0 && (
                    <button
                      className={`btn-ghost skill-conc-toggle${owned.concentration ? ' has-conc' : ''}`}
                      onClick={() => setConcEdit(showConcPicker ? null : sk.id)}
                    >
                      {owned.concentration ?? 'conc'}
                    </button>
                  )}
                  <button className="btn-ghost" style={{ color: 'var(--damage)' }} onClick={() => removeSkill(sk.id)}>✕</button>
                </div>
              ) : (
                <button
                  className="btn-sm btn"
                  onClick={() => addSkill(sk.id)}
                  disabled={remaining < 1}
                  style={{ minWidth: '4rem' }}
                >
                  ADD
                </button>
              )}

              {showConcPicker && concs.length > 0 && (
                <div className="skill-conc-picker">
                  <button
                    className={`skill-conc-opt${!owned?.concentration ? ' active' : ''}`}
                    onClick={() => { setConcentration(sk.id, ''); setConcEdit(null); }}
                  >
                    None
                  </button>
                  {concs.map(c => (
                    <button
                      key={c}
                      className={`skill-conc-opt${owned?.concentration === c ? ' active' : ''}`}
                      onClick={() => { setConcentration(sk.id, c); setConcEdit(null); }}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {skills.length > 0 && (
        <div className="skill-summary">
          <span className="builder-step-hint">
            Allocated: {skills.map(s => {
              const name = skillsData.skills.find(sk => sk.id === s.skillId)?.name ?? s.skillId;
              return `${name} ${s.rating}${s.concentration ? ` (${s.concentration})` : ''}`;
            }).join(' · ')}
          </span>
        </div>
      )}

      <div className="builder-nav">
        <button className="btn-ghost" onClick={onBack}>← BACK</button>
        <button
          className="btn btn-primary btn-sm"
          onClick={onNext}
          disabled={skills.length === 0}
        >
          NEXT →
        </button>
      </div>
    </div>
  );
}
