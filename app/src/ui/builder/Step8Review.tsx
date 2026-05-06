import type { AttributeKey } from '../../engine/types';
import type { BuilderDraft } from './types';
import metatypesData from '../../../../data/sr2/metatypes.json';
import skillsData    from '../../../../data/sr2/skills.json';
import gearData      from '../../../../data/sr2/gear.json';
import cyberwareData from '../../../../data/sr2/cyberware.json';
import spellsData    from '../../../../data/sr2/spells.json';
import adeptPowersData from '../../../../data/sr2/adept_powers.json';
import priorityData  from '../../../../data/sr2/priority_table.json';

const ATTR_LABELS: Record<AttributeKey, string> = {
  body: 'BOD', quickness: 'QCK', strength: 'STR',
  charisma: 'CHA', intelligence: 'INT', willpower: 'WIL',
};

const ATTRS: AttributeKey[] = ['body', 'quickness', 'strength', 'charisma', 'intelligence', 'willpower'];
const PRI_LABELS: Record<string, string> = {
  race: 'Race', magic: 'Magic', attributes: 'Attr', skills: 'Skills', resources: 'Res',
};

function nuyen(n: number): string {
  return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M¥`
       : n >= 1_000     ? `${(n / 1_000).toFixed(0)}K¥`
       : `${n}¥`;
}

interface ValidationError { field: string; message: string }

function validate(draft: BuilderDraft): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!draft.priorities) { errors.push({ field: 'priorities', message: 'Priorities not assigned' }); return errors; }
  if (!draft.metatype)   { errors.push({ field: 'metatype',   message: 'Metatype not selected'  }); return errors; }
  if (!draft.attributes) { errors.push({ field: 'attributes', message: 'Attributes not set'     }); return errors; }

  // Magic validation
  const magicPriRow = priorityData.priorities.find(p => p.level === draft.priorities!.magic)!.magic;
  if (draft.magicDisposition === 'full_magic') {
    if (!magicPriRow.fullMagicianHuman && !magicPriRow.fullMagicianMeta)
      errors.push({ field: 'magic', message: 'Magic priority incompatible with full mage' });
  }
  if (draft.magicDisposition === 'adept') {
    if (!magicPriRow.adeptHuman && !magicPriRow.adeptMeta)
      errors.push({ field: 'magic', message: 'Magic priority incompatible with physical adept' });
  }

  // Race validation
  const racePriRow = priorityData.priorities.find(p => p.level === draft.priorities!.race)!;
  const meta = metatypesData.metatypes.find(m => m.id === draft.metatype)!;
  if (meta.isMetahuman && !racePriRow.race.allowsMetahuman)
    errors.push({ field: 'race', message: 'Race priority must be A for metahumans' });

  // Attribute pool
  const attrPriRow = priorityData.priorities.find(p => p.level === draft.priorities!.attributes)!;
  const mods = meta.attributeMods as Partial<Record<string, number>>;
  const attrCost = ATTRS.reduce((s, k) => s + Math.max(0, (draft.attributes?.[k] ?? 1) - 1 - (mods[k] ?? 0)), 0) + 6;
  if (attrCost > attrPriRow.attributes.points)
    errors.push({ field: 'attributes', message: `Attributes over budget (${attrCost} > ${attrPriRow.attributes.points})` });

  // Skill pool
  const skillPriRow = priorityData.priorities.find(p => p.level === draft.priorities!.skills)!;
  const skillCost = (draft.skills ?? []).reduce((s, sk) => s + sk.rating, 0);
  if (skillCost > skillPriRow.skills.points)
    errors.push({ field: 'skills', message: `Skills over budget (${skillCost} > ${skillPriRow.skills.points})` });

  // Nuyen budget
  const nuyenBudget = priorityData.priorities.find(p => p.level === draft.priorities!.resources)!.resources.nuyen;
  const nuyenSpent = (draft.gear ?? []).reduce((s, g) => s + g.costNuyen * g.quantity, 0)
                   + (draft.cyberware ?? []).reduce((s, c) => s + c.costNuyen, 0);
  if (nuyenSpent > nuyenBudget)
    errors.push({ field: 'resources', message: `Nuyen over budget (${nuyen(nuyenSpent)} > ${nuyen(nuyenBudget)})` });

  // Essence check for adepts
  if (draft.magicDisposition === 'adept') {
    const essenceCost = (draft.cyberware ?? []).reduce((s, c) => s + c.essenceCost, 0);
    const essence = Math.max(0, 6 - essenceCost);
    const powerCost = (draft.adeptPowers ?? []).reduce((s, p) => s + p.magicCost, 0);
    if (powerCost > Math.floor(essence))
      errors.push({ field: 'adeptPowers', message: `Adept power cost (${powerCost}) exceeds Magic ${Math.floor(essence)} after cyberware` });
  }

  return errors;
}

interface Props {
  draft:    BuilderDraft;
  onConfirm: () => void;
  onBack:   () => void;
}

export function Step8Review({ draft, onConfirm, onBack }: Props) {
  const errors   = validate(draft);
  const canConfirm = errors.length === 0;
  const attrs    = draft.attributes;
  const pri      = draft.priorities!;

  const essenceCost = (draft.cyberware ?? []).reduce((s, c) => s + c.essenceCost, 0);
  const essence     = Math.max(0, parseFloat((6 - essenceCost).toFixed(2)));
  const reaction    = attrs ? Math.floor((attrs.quickness + attrs.intelligence) / 2) : 0;
  const magic       = draft.magicDisposition !== 'mundane' ? Math.floor(essence) : 0;

  const nuyenBudget = priorityData.priorities.find(p => p.level === pri.resources)!.resources.nuyen;
  const nuyenSpent  = (draft.gear ?? []).reduce((s, g) => s + g.costNuyen * g.quantity, 0)
                    + (draft.cyberware ?? []).reduce((s, c) => s + c.costNuyen, 0);

  return (
    <div className="builder-step">
      <h2 className="builder-step-title">REVIEW & CONFIRM</h2>

      {errors.length > 0 && (
        <div className="builder-errors">
          {errors.map(e => (
            <p key={e.field} className="builder-warning">⚠ {e.message}</p>
          ))}
        </div>
      )}

      <div className="review-section">
        <h3 className="review-header">PRIORITIES</h3>
        <div className="review-row">
          {(['race','magic','attributes','skills','resources'] as const).map(k => (
            <span key={k} className="review-badge">
              {PRI_LABELS[k]}·{pri[k]}
            </span>
          ))}
        </div>
      </div>

      {attrs && (
        <div className="review-section">
          <h3 className="review-header">ATTRIBUTES — {draft.metatype?.toUpperCase()}</h3>
          <div className="review-attr-row">
            {ATTRS.map(k => (
              <div key={k} className="review-attr">
                <span className="review-attr-abbr">{ATTR_LABELS[k]}</span>
                <span className="review-attr-val">{attrs[k]}</span>
              </div>
            ))}
            <div className="review-attr">
              <span className="review-attr-abbr">REA</span>
              <span className="review-attr-val">{reaction}</span>
            </div>
            <div className="review-attr">
              <span className="review-attr-abbr">ESS</span>
              <span className="review-attr-val">{essence.toFixed(1)}</span>
            </div>
            {draft.magicDisposition !== 'mundane' && (
              <div className="review-attr">
                <span className="review-attr-abbr">MAG</span>
                <span className="review-attr-val">{magic}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {(draft.skills ?? []).length > 0 && (
        <div className="review-section">
          <h3 className="review-header">SKILLS</h3>
          <div className="review-tags">
            {(draft.skills ?? []).sort((a, b) => b.rating - a.rating).map(sk => {
              const name = skillsData.skills.find(s => s.id === sk.skillId)?.name ?? sk.skillId;
              return (
                <span key={sk.skillId} className="review-tag">
                  {name} {sk.rating}{sk.concentration ? ` (${sk.concentration})` : ''}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {(draft.cyberware ?? []).length > 0 && (
        <div className="review-section">
          <h3 className="review-header">CYBERWARE</h3>
          <div className="review-tags">
            {(draft.cyberware ?? []).map(cw => {
              const data = cyberwareData.cyberware.find(c => c.id === cw.cyberwareId);
              return <span key={cw.cyberwareId} className="review-tag">{data?.name ?? cw.cyberwareId} ({cw.essenceCost}✦)</span>;
            })}
          </div>
        </div>
      )}

      {(draft.gear ?? []).length > 0 && (
        <div className="review-section">
          <h3 className="review-header">GEAR</h3>
          <div className="review-tags">
            {(draft.gear ?? []).map(g => {
              const data = gearData.gear.find(i => i.id === g.gearId);
              return <span key={g.gearId} className="review-tag">{data?.name ?? g.gearId}{g.quantity > 1 ? ` ×${g.quantity}` : ''}</span>;
            })}
          </div>
          <p className="review-nuyen">{nuyen(nuyenSpent)} / {nuyen(nuyenBudget)}</p>
        </div>
      )}

      {(draft.spells ?? []).length > 0 && (
        <div className="review-section">
          <h3 className="review-header">SPELLS</h3>
          <div className="review-tags">
            {(draft.spells ?? []).map(sp => {
              const data = spellsData.spells.find(s => s.id === sp.spellId);
              return <span key={sp.spellId} className="review-tag">{data?.name ?? sp.spellId} F{sp.force}</span>;
            })}
          </div>
        </div>
      )}

      {(draft.adeptPowers ?? []).length > 0 && (
        <div className="review-section">
          <h3 className="review-header">ADEPT POWERS</h3>
          <div className="review-tags">
            {(draft.adeptPowers ?? []).map(pw => {
              const data = adeptPowersData.adeptPowers.find(p => p.id === pw.powerId);
              return <span key={pw.powerId} className="review-tag">{data?.name ?? pw.powerId}</span>;
            })}
          </div>
        </div>
      )}

      <div className="builder-nav">
        <button className="btn-ghost" onClick={onBack}>← BACK</button>
        <button
          className="btn btn-primary btn-sm"
          onClick={onConfirm}
          disabled={!canConfirm}
        >
          CONFIRM → SHEET
        </button>
      </div>
    </div>
  );
}
