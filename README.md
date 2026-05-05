# shadowrun-2.0-chargen

A static web app that builds playable, rules-valid **Shadowrun 2nd Edition** characters in two clicks.

**Live:** https://gruevyhat.github.io/shadowrun-2.0-chargen/

Pick a path:

- **Take the quiz** — 30 forced-choice questions across six in-fiction dichotomies (Wired ↔ Wild, Streetwise ↔ Cerebral, Iron ↔ Empath, Runner ↔ Operator, Awakened ↔ Mundane, Human ↔ Metahuman) produce a `CharacterIntent` that drives the same engine as the random path. Game mechanics stay opaque to the player.
- **Random runner** — instant build, random archetype, fully re-rollable.
- **Load a runner ID** — paste a character code (e.g. `ss:mu:1A2B3C4D` or `d:mu:385617:DEADBEEF`) to reproduce a specific build.

Once you have a sheet, every section has its own reroll button — change attributes/priorities without touching the runner's name and contacts, swap weapons without disturbing skills, and so on. The character code at the top of the sheet round-trips through the Load box, so any state you like can be saved with a copy-paste.

## Why

Most chargen tools either (a) ask you to know the rules already, or (b) hand you a generic random character with no thematic coherence. This one runs every build through a deterministic, archetype-aware pipeline so the output reads like a *character*, not just a stat block — a face from Aztlán who likes neon and bargains hard, a decker from Hong Kong with a chipjack and a Fairlight Excalibur, a troll street samurai from Salish-Shidhe with a grudge.

## Stack

- **App** (`app/`): Vite + React 19 + TypeScript, built as a single static bundle, no backend
- **Rules data** (`data/sr2/`): hand-validated JSON normalised from OCR'd SR2 core rulebook pages
- **Tooling** (`scripts/`): Python (Tesseract + poppler) for one-off PDF extraction; never shipped to users
- **Deploy**: GitHub Actions → GitHub Pages

## Architecture at a glance

```
   ┌──────────────────┐                   ┌──────────────────┐
   │  Quiz answers    │                   │  Random / loaded │
   │  → AxisScores    │                   │  CharacterIntent │
   └────────┬─────────┘                   └────────┬─────────┘
            │                                      │
            └────────── CharacterIntent ───────────┘
                              │
                              ▼
   ┌──────────────────────────────────────────────────────────┐
   │ engine/generate.ts — deterministic pipeline              │
   │                                                          │
   │  pickMetatype → assignPriorities → spendAttributes       │
   │     → spendSkills → spendResources → fixConcentrations   │
   │                                                          │
   │  every stage is pure; sub-seeds derived per stage so     │
   │  individual sections can be rerolled in isolation        │
   └──────────────────────────────────────────────────────────┘
                              │
                              ▼
                       Validated Character
```

### Seeded determinism + section rerolls

Every generation flows through a master seed. Each stage uses a child seed (`childSeed(masterSeed, 'skills')` etc.) so its randomness is independent.

Partial rerolls (skills, resources) set a `seedOverrides[<section>]` on the intent — that section uses the override; everything else continues to read from the master seed. This is what lets you reroll the gear loadout without changing the character's *name*, since the name generator is also master-seed-derived.

Full rerolls (priorities/attributes/all) replace the master seed entirely.

### Engine outputs are rules-valid

`validate(character)` enforces SR2 RAW: priority distribution (one each of A–E), attribute caps by metatype, Essence ≥ Magic, total resource spend within the priority's nuyen ceiling, magic disposition consistency. The engine is run against 9000 seeds (1000 per archetype) in CI; all pass.

### Concentrations & specializations match owned gear

If a character has a `firearms` concentration in *Rifles*, they own a rifle. If `armed_combat` → *Edged Weapons*, they own a knife. A post-process pass after `spendResources` strips any weapon-locked concentration whose required gear category isn't in the loadout.

### Identity layer

Beyond the rules, every character gets:

- **Name** — culturally-flavoured (Yuki Wraith, Carlos Blade, Klaus Mueller) drawn from regional pools keyed off the character's randomly-assigned origin city; female pools are distinct from male
- **Demographics** — age, sex, origin, appearance description tuned by metatype + archetype
- **Contacts** — number capped by archetype (Face=4, Investigator=3, Decker=2, magic archetypes=0)
- **Background** — past profession, personality, moral code, goals, languages — all seeded from the master seed so they survive partial rerolls

### Axis profile chart

The quiz's results screen shows a 12-sided dodecagon with six color-coded diameter axes (one per dichotomy) and a single dot per axis at the signed score position. The `axisCode` (six-character encoding of the axis values) gets folded into the character code so the profile round-trips alongside the build.

## Repo layout

```
app/             Vite + React app (the only thing that ships to users)
  src/
    engine/      Pure deterministic generator (no React)
      stages/    Pipeline stages (one file each)
      generate.ts, reroll(), validate(), rng.ts, types.ts
    quiz/        Question set, scoring, axis-→intent mapping
    ui/          Screens, character code, identity generators, store
    index.css    Theming (chrome / neon / monospace SR aesthetic)
  vite.config.ts base path for GitHub Pages
data/
  sr2/           Normalised JSON consumed by the app at build time
  schemas/       JSON Schemas shared by Python tooling and the web app
  raw/           OCR output (regenerable, not committed)
scripts/         Python tooling for PDF OCR / extraction (never shipped)
docs/
  PLAN.md        Phased development plan + status
  SR2/, SR1/     Source PDFs (not used at runtime)
.github/workflows/deploy.yml   GitHub Pages deploy
CLAUDE.md        Instructions for AI pair work in this repo
```

## Running locally

```bash
cd app
npm install
npm run dev        # http://localhost:5173 (or as printed)
```

Other commands (run from `app/`):

```bash
npm run build      # type-check (tsc -b) + production bundle to app/dist
npm run preview    # serve the production bundle locally
npm run lint       # ESLint
npm test           # Vitest
```

The app has zero runtime fetches — every JSON file in `data/sr2/` is bundled at build time via Vite imports.

### Python tooling (only needed for re-extracting rules data)

System deps: `brew install tesseract poppler`. Then from `scripts/`:

```bash
python -m venv .venv && source .venv/bin/activate
pip install -e .
python extract_pdf.py <pdf-path> <out-dir>
```

The web app does **not** import or call Python at runtime.

## Character codes

A character is fully reproducible from its code. Two formats:

```
<archetype>:<magic>:<seed>                 e.g.  ss:mu:1A2B3C4D
<archetype>:<magic>:<axisCode>:<seed>      e.g.  d:mu:385617:DEADBEEF
```

Archetypes use short codes (`ss`, `m`, `sh`, `pa`, `d`, `r`, `f`, `cm`, `inv`); long names also parse. Magic disposition is `mu` / `fm` / `ad`. The optional `axisCode` is six characters (`0-9` or `a` for 10) encoding the six quiz-axis scores.

## Archetypes

Street Samurai · Mage · Shaman · Physical Adept · Decker · Rigger · Face · Combat Mage · Investigator

Each has a hand-authored template (`data/sr2/archetypes.json`) that biases priority assignment, attribute weights, skill focus, gear tags, preferred metatypes, and magic disposition.

## Constraints (intentional)

- **Static bundle, no backend** — the entire app is one HTML/JS/CSS payload deployable to GitHub Pages
- **SR2 only in v1** — SR1 data extraction and engine branching is in the backlog
- **No manual builder in v1** — the entry points are quiz and random; a fully user-driven builder is backlogged
- **No supplements in v1** — core rulebook only

## Status

Phases 1–4 + 6 done; Phase 5 (themed PDF export via `@react-pdf/renderer`) is the remaining v1 milestone. See [`docs/PLAN.md`](docs/PLAN.md) for the full phased plan, exit criteria, and current backlog.

## Contributing

This is a personal project but PRs are welcome. The development loop is documented at the top of [`CLAUDE.md`](CLAUDE.md) — every phase ends with tests passing, rulebook validation, a retro, and a `phase-N` git tag. If you're touching engine output, please verify against canonical SR2 sample characters before claiming a fix.

## Credits

- Shadowrun is a trademark of The Topps Company, Inc. (formerly FASA Corporation). This is a fan tool; no commercial use intended.
- SR2 core rules data extracted from publicly-circulating scans of the second-edition rulebook (FASA 7901).
- Built with Claude Code as pair-programmer; see commit history for what was hand-written vs. assisted.
