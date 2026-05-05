import { useState } from 'react';
import { useApp } from './store';
import { generate } from '../engine/generate';
import type { ArchetypeId, MagicDisposition } from '../engine/types';
import { parseCode, encodeAxes } from './characterCode';

const ARCHETYPES: { id: ArchetypeId; magic: MagicDisposition }[] = [
  { id: 'bodyguard',          magic: 'mundane'    },
  { id: 'combat_mage',        magic: 'full_magic' },
  { id: 'decker',             magic: 'mundane'    },
  { id: 'detective',          magic: 'mundane'    },
  { id: 'former_company_man', magic: 'mundane'    },
  { id: 'former_wage_mage',   magic: 'full_magic' },
  { id: 'gang_member',        magic: 'mundane'    },
  { id: 'mercenary',          magic: 'mundane'    },
  { id: 'rigger',             magic: 'mundane'    },
  { id: 'shaman',             magic: 'full_magic' },
  { id: 'street_mage',        magic: 'full_magic' },
  { id: 'street_samurai',     magic: 'mundane'    },
  { id: 'street_shaman',      magic: 'full_magic' },
  { id: 'tribesman',          magic: 'mundane'    },
];

export function LandingScreen() {
  const { dispatch } = useApp();
  const [seedInput, setSeedInput] = useState('');
  const [seedError, setSeedError] = useState(false);

  function handleRandom() {
    const seed = Math.floor(Math.random() * 0xffffffff);
    const pick = ARCHETYPES[Math.floor(Math.random() * ARCHETYPES.length)];
    const character = generate({ edition: 'sr2', archetype: pick.id, magicDisposition: pick.magic, seed });
    dispatch({ type: 'SHOW_CHARACTER', character });
  }

  function handleLoad() {
    const parsed = parseCode(seedInput);
    if (!parsed) { setSeedError(true); return; }
    const character = generate({
      edition:          'sr2',
      archetype:        parsed.archetype,
      magicDisposition: parsed.magicDisposition,
      seed:             parsed.seed,
      ...(parsed.axisScores ? { axisCode: encodeAxes(parsed.axisScores) } : {}),
    });
    dispatch({ type: 'SHOW_CHARACTER', character });
  }

  function handleSeedChange(value: string) {
    setSeedInput(value);
    if (seedError) setSeedError(false);
  }

  return (
    <div className="screen landing">
      <div className="landing-header">
        <h1 className="title">SHADOWRUN</h1>
        <p className="subtitle">CHARACTER GENERATOR // SR2</p>
      </div>

      <div className="landing-body">
        <p className="flavour">
          The sprawl doesn't wait for you to figure yourself out.<br />
          Pick a path and run.
        </p>

        <div className="landing-actions">
          <button className="btn btn-primary" onClick={() => dispatch({ type: 'GO_QUIZ' })}>
            <span className="btn-label">TAKE THE QUIZ</span>
            <span className="btn-sub">30 questions · personality-driven build</span>
          </button>

          <button className="btn btn-secondary" onClick={handleRandom}>
            <span className="btn-label">RANDOM RUNNER</span>
            <span className="btn-sub">instant · random archetype · re-rollable</span>
          </button>

          <form
            className={`seed-load${seedError ? ' seed-load-error' : ''}`}
            onSubmit={e => { e.preventDefault(); handleLoad(); }}
          >
            <input
              className="seed-load-input"
              type="text"
              placeholder="slot a runner ID (e.g. d:mu:1A2B3C4D)"
              value={seedInput}
              onChange={e => handleSeedChange(e.target.value)}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
            />
            <button type="submit" className="seed-load-btn" disabled={!seedInput.trim()}>
              LOAD
            </button>
          </form>
          {seedError && <span className="seed-load-error-text">Invalid seed format.</span>}
        </div>
      </div>

      <div className="landing-footer">
        <span className="version">Shadowrun 2nd Edition rules</span>
      </div>
    </div>
  );
}
