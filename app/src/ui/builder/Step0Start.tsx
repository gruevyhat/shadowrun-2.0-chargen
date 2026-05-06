import type { ArchetypeId, MagicDisposition } from '../../engine/types';
import type { BuilderDraft } from './types';

const ARCHETYPES: { id: ArchetypeId; label: string; magic: MagicDisposition; desc: string }[] = [
  { id: 'street_samurai',    label: 'Street Samurai',     magic: 'mundane',    desc: 'Maximum chrome. Combat machine.' },
  { id: 'bodyguard',         label: 'Bodyguard',          magic: 'mundane',    desc: 'Close-protection specialist.' },
  { id: 'mercenary',         label: 'Mercenary',          magic: 'mundane',    desc: 'Heavy weapons and field tactics.' },
  { id: 'gang_member',       label: 'Gang Member',        magic: 'mundane',    desc: 'Street tough with a crew.' },
  { id: 'decker',            label: 'Decker',             magic: 'mundane',    desc: 'Matrix intrusion specialist.' },
  { id: 'rigger',            label: 'Rigger',             magic: 'mundane',    desc: 'Vehicle and drone operator.' },
  { id: 'detective',         label: 'Detective',          magic: 'mundane',    desc: 'Investigation and social skills.' },
  { id: 'former_company_man',label: 'Former Company Man', magic: 'mundane',    desc: 'Corporate-trained runner.' },
  { id: 'tribesman',         label: 'Tribesman',          magic: 'mundane',    desc: 'NAN wilderness fighter.' },
  { id: 'physical_adept',    label: 'Physical Adept',     magic: 'adept',      desc: 'Magic-powered melee combatant.' },
  { id: 'combat_mage',       label: 'Combat Mage',        magic: 'full_magic', desc: 'Hermetic mage, offensive spells.' },
  { id: 'street_mage',       label: 'Street Mage',        magic: 'full_magic', desc: 'Hermetic mage gone to the streets.' },
  { id: 'shaman',            label: 'Shaman',             magic: 'full_magic', desc: 'Wilderness totem shaman.' },
  { id: 'street_shaman',     label: 'Street Shaman',      magic: 'full_magic', desc: 'Urban totem shaman.' },
  { id: 'former_wage_mage',  label: 'Former Wage Mage',   magic: 'full_magic', desc: 'Ex-corporate hermetic mage.' },
];

const MAGIC_LABELS: Record<MagicDisposition, string> = {
  mundane:    'MUNDANE',
  adept:      'PHYSICAL ADEPT',
  full_magic: 'AWAKENED MAGE',
};

interface Props {
  draft: BuilderDraft;
  onUpdate: (partial: Partial<BuilderDraft>) => void;
  onNext: () => void;
}

export function Step0Start({ draft, onUpdate, onNext }: Props) {
  const canNext = !!draft.archetype && !!draft.magicDisposition;

  function pickArchetype(a: typeof ARCHETYPES[0]) {
    onUpdate({ archetype: a.id, magicDisposition: a.magic });
  }

  return (
    <div className="builder-step">
      <h2 className="builder-step-title">WHO ARE YOU?</h2>
      <p className="builder-step-hint">
        Choose a runner archetype — this becomes your character label and sets your magic type.
        You control every mechanical choice in the steps ahead.
      </p>

      <div className="builder-archetype-grid">
        {ARCHETYPES.map(a => (
          <button
            key={a.id}
            className={`builder-archetype-card${draft.archetype === a.id ? ' selected' : ''}`}
            onClick={() => pickArchetype(a)}
          >
            <span className="builder-archetype-name">{a.label}</span>
            <span className="builder-archetype-magic">{MAGIC_LABELS[a.magic]}</span>
            <span className="builder-archetype-desc">{a.desc}</span>
          </button>
        ))}
      </div>

      <div className="builder-nav">
        <span />
        <button className="btn btn-primary btn-sm" onClick={onNext} disabled={!canNext}>
          NEXT →
        </button>
      </div>
    </div>
  );
}
