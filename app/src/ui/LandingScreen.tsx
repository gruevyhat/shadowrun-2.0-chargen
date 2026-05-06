import { useState, useRef } from 'react';
import { useApp } from './store';
import type { IdentityOverrides } from './store';
import { generate } from '../engine/generate';
import type { ArchetypeId, MagicDisposition } from '../engine/types';
import { parseCode, encodeAxes, decodeManualBuild } from './characterCode';
import type { Contact } from './contactsGenerator';
import { loadGallery, removeFromGallery } from './gallery';
import type { GalleryEntry } from './gallery';

const ARCHETYPES: { id: ArchetypeId; magic: MagicDisposition }[] = [
  { id: 'bodyguard',          magic: 'mundane'    },
  { id: 'combat_mage',        magic: 'full_magic' },
  { id: 'decker',             magic: 'mundane'    },
  { id: 'detective',          magic: 'mundane'    },
  { id: 'former_company_man', magic: 'mundane'    },
  { id: 'former_wage_mage',   magic: 'full_magic' },
  { id: 'gang_member',        magic: 'mundane'    },
  { id: 'mercenary',          magic: 'mundane'    },
  { id: 'physical_adept',     magic: 'adept'      },
  { id: 'rigger',             magic: 'mundane'    },
  { id: 'shaman',             magic: 'full_magic' },
  { id: 'street_mage',        magic: 'full_magic' },
  { id: 'street_samurai',     magic: 'mundane'    },
  { id: 'street_shaman',      magic: 'full_magic' },
  { id: 'tribesman',          magic: 'mundane'    },
];

// ── Markdown import helpers ───────────────────────────────────────────────

function extractDetail(md: string, key: string): string | undefined {
  const re = new RegExp(`\\*\\*${key.replace('/', '\\/')}:\\*\\*\\s*(.+?)(?:  |\\n|$)`, 'm');
  return md.match(re)?.[1]?.trim() || undefined;
}

function parseMarkdownImport(md: string): { code: ReturnType<typeof parseCode>; overrides: IdentityOverrides } {
  const codeMatch = md.match(/Runner ID: `([^`]+)`/);
  const code = codeMatch ? parseCode(codeMatch[1]) : null;

  const nameMatch = md.match(/^# (.+?) —/m);
  const runnerName = nameMatch?.[1]?.trim();

  const bgMatch = md.match(/### Background\s*\n+([\s\S]+?)(?:\n+---|\n+## |\n+\*Shadowrun|\n*$)/);
  const background = bgMatch?.[1]?.trim();

  const contacts: Contact[] = [];
  const contactSection = md.match(/## Contacts\s*\n([\s\S]+?)(?:\n## |\n---|\n\*Shadowrun|\n*$)/);
  if (contactSection) {
    for (const row of contactSection[1].split('\n')) {
      if (!row.startsWith('|') || row.includes('---') || /name\s*\|/i.test(row)) continue;
      const cells = row.split('|').map(c => c.trim()).filter(Boolean);
      if (cells.length >= 4)
        contacts.push({ name: cells[0], role: cells[1], loyalty: parseInt(cells[2]) || 1, connection: parseInt(cells[3]) || 1 });
    }
  }

  return {
    code,
    overrides: {
      runnerName,
      realName:       extractDetail(md, 'Legal Name'),
      pastProfession: extractDetail(md, 'Past'),
      personality:    extractDetail(md, 'Personality'),
      moralCode:      extractDetail(md, 'Moral Code'),
      goals:          extractDetail(md, 'Goals'),
      lovesHates:     extractDetail(md, 'Loves / Hates'),
      languages:      extractDetail(md, 'Languages'),
      appearance:     extractDetail(md, 'Appearance'),
      background,
      contacts: contacts.length > 0 ? contacts : undefined,
    },
  };
}

export function LandingScreen() {
  const { dispatch } = useApp();
  const [seedInput,   setSeedInput]   = useState('');
  const [seedError,   setSeedError]   = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [gallery,     setGallery]     = useState<GalleryEntry[]>(() => loadGallery());
  const mdInputRef = useRef<HTMLInputElement>(null);

  function handleRandom() {
    const seed = Math.floor(Math.random() * 0xffffffff);
    const pick = ARCHETYPES[Math.floor(Math.random() * ARCHETYPES.length)];
    const character = generate({ edition: 'sr2', archetype: pick.id, magicDisposition: pick.magic, seed });
    dispatch({ type: 'SHOW_CHARACTER', character });
  }

  function handleLoad() {
    // Try manual build first (m: prefix)
    const trimmed = seedInput.trim();
    if (trimmed.startsWith('m:')) {
      const character = decodeManualBuild(trimmed);
      if (!character) { setSeedError(true); return; }
      dispatch({ type: 'SHOW_CHARACTER', character });
      return;
    }
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

  function handleLoadEntry(code: string) {
    if (code.startsWith('m:')) {
      const character = decodeManualBuild(code);
      if (character) dispatch({ type: 'SHOW_CHARACTER', character });
      return;
    }
    const parsed = parseCode(code);
    if (!parsed) return;
    dispatch({ type: 'SHOW_CHARACTER', character: generate({
      edition:          'sr2',
      archetype:        parsed.archetype,
      magicDisposition: parsed.magicDisposition,
      seed:             parsed.seed,
      ...(parsed.axisScores ? { axisCode: encodeAxes(parsed.axisScores) } : {}),
    }) });
  }

  function handleDeleteEntry(code: string) {
    setGallery(removeFromGallery(code));
  }

  function handleImportMd(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const md = ev.target?.result as string;
      if (!md) return;
      const { code, overrides } = parseMarkdownImport(md);
      if (!code) { setImportError('No valid Runner ID found in file.'); return; }
      setImportError(null);
      dispatch({ type: 'SHOW_CHARACTER', character: generate({
        edition: 'sr2',
        archetype: code.archetype,
        magicDisposition: code.magicDisposition,
        seed: code.seed,
        ...(code.axisScores ? { axisCode: encodeAxes(code.axisScores) } : {}),
      }), identityOverrides: overrides });
    };
    reader.readAsText(file);
    e.target.value = '';
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

          <button className="btn btn-secondary" onClick={() => dispatch({ type: 'GO_BUILDER' })}>
            <span className="btn-label">BUILD YOUR OWN</span>
            <span className="btn-sub">step-by-step · full control · rules-valid</span>
          </button>

          <button className="btn btn-secondary" onClick={() => mdInputRef.current?.click()}>
            <span className="btn-label">IMPORT CHARACTER</span>
            <span className="btn-sub">load from exported markdown file</span>
          </button>
          <input ref={mdInputRef} type="file" accept=".md,.txt,text/markdown,text/plain"
            style={{ display: 'none' }} onChange={handleImportMd} />
          {importError && <span className="seed-load-error-text">{importError}</span>}

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

        {gallery.length > 0 && (
          <div className="gallery-section">
            <p className="gallery-heading">// SAVED RUNNERS</p>
            <div className="gallery-list">
              {gallery.map(entry => (
                <div key={entry.code} className="gallery-entry">
                  <div className="gallery-info">
                    <div className="gallery-name">{entry.name}</div>
                    <div className="gallery-meta">
                      {entry.archetype.toUpperCase()} · {new Date(entry.savedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="gallery-actions">
                    <button className="gallery-btn" onClick={() => handleLoadEntry(entry.code)}>LOAD</button>
                    <button className="gallery-btn gallery-btn-del" onClick={() => handleDeleteEntry(entry.code)}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="landing-footer">
        <span className="version">Shadowrun 2nd Edition rules</span>
      </div>
    </div>
  );
}
