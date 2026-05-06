# Shadowrun Character Generator — Development Plan

## Goals (v1)
A static web app that produces playable, rules-valid Shadowrun 2nd Edition characters via a personality quiz or random generation, with section re-rolls and themed PDF export. Deployable to GitHub Pages with no backend.

## Non-goals (v1)
- Shadowrun 1st Edition support (backlogged)
- Manual / fully user-driven builder (backlogged)
- Supplements beyond the SR2 core rulebook (backlogged)
- Account / save-to-cloud features

## Phases

### Phase 0 — Scaffolding (DONE)
- Project skeleton (`app/`, `scripts/`, `data/`, `docs/`)
- Vite + React + TS app initialized in `app/`
- Python tooling skeleton (`scripts/pyproject.toml`, `extract_pdf.py`)
- `.gitignore`, `CLAUDE.md`, this plan

### Phase 1 — Data extraction (DONE)
**Goal:** produce validated SR2 JSON files in `data/sr2/`.

1. **System deps**: install `tesseract`, `poppler` via Homebrew. Set up Python `.venv` in `scripts/` and install deps from `pyproject.toml`.
2. **OCR pass** at 400 DPI on `docs/SR2/core_books/547785268-7901-Shadowrun-Second.pdf` → `data/raw/sr2/pages/page_NNNN.md`. Spot-check ~10 pages for quality before doing all 326.
3. **Page index**: hand-build `data/raw/sr2/index.md` mapping rule sections (Priority Table, Metatype tables, Skills list, Spells, Gear chapters, Cyberware, etc.) to page ranges. Extraction targets these ranges only.
4. **Schemas**: write JSON Schemas in `data/schemas/` for each dataset (priority_table, metatypes, skills, spells, gear, cyberware, archetypes). Schemas are the contract between Python tooling and the web app.
5. **Targeted extractors** (one Python script per dataset under `scripts/extract/`). Each reads OCR output for a specific page range, normalizes, validates against schema, writes to `data/sr2/<name>.json`. Manual review of every output file before committing.
6. **Archetype templates** (`data/sr2/archetypes.json`): hand-authored from canonical sample-character pages. Each entry encodes priority bias, attribute weights, skill focus, gear loadout, magic disposition.

**Exit criteria:** all seven JSON files exist, validate against schemas, and round-trip through a smoke-test loader in the app.

### Phase 2 — Generator engine (DONE)
**Goal:** pure-TypeScript engine in `app/src/engine/` that turns a `CharacterIntent` into a validated `Character`.

1. **Types**: `CharacterIntent`, `Character`, `Metatype`, `Skill`, `Spell`, `GearItem`, `Priority` (A–E), etc. Mirror the JSON Schemas.
2. **Seedable RNG**: small PRNG (mulberry32 or sfc32). All randomness flows through it; sub-seeds derived per-stage so individual re-rolls are reproducible.
3. **Pipeline stages** (each a pure function, each independently re-rollable):
   - `assignPriorities(intent) → PriorityAssignment`
   - `pickMetatype(intent, priorities) → Metatype`
   - `spendAttributes(intent, metatype, priorities) → AttributeBlock`
   - `resolveMagic(intent, priorities, attributes) → MagicProfile`
   - `spendSkills(intent, archetype, priorities) → SkillBlock`
   - `spendResources(intent, archetype, priorities, magic) → Loadout`
   - `validate(character) → ValidationReport`
4. **Re-roll API**: `reroll(character, section, newSeed) → Character` — re-runs the affected stage and any downstream stages whose inputs changed.
5. **Test harness** (Vitest): generate N=1000 characters per archetype with random seeds, assert all validate; assert priority distributions and attribute means match expected biases.

**Exit criteria:** 100% of generated characters validate; archetype builds visibly differ in attribute/skill/gear distributions.

### Phase 3 — Quiz → Intent mapping (DONE)
**Goal:** convert quiz answers into a `CharacterIntent`.

1. **Question authoring**: 30 in-fiction forced-choice items, 5 per axis. Each answer shifts one axis by ±1.
2. **Mapping function**: six axis scores → `CharacterIntent` (archetype selection, magic disposition, weight vector, metatype bias). The mapping is the only place quiz logic touches the engine.
3. **Tuning pass**: generate sample characters from canonical answer profiles ("a totally Wired/Iron/Operator/Mundane/Human runner" → should reliably yield Street Samurai). Iterate weights until the mapping feels right.

**Exit criteria:** answer profiles produce thematically appropriate archetypes ≥ ~80% of the time without locking the user out of variety.

### Phase 4 — UI (DONE)
**Goal:** wire the engine and quiz to the web app.

1. **State**: React context store holding `Character`, current screen, quiz answers.
2. **Routes/screens**: Landing → (Quiz | Random | Load by code) → Character Sheet → (re-roll buttons per section).
3. **Character sheet**: themed display (chrome / neon / monospace runner-sheet aesthetic). Read-only; section re-roll buttons in-place.
4. **Quiz UI**: progress indicator, question card, forced-choice buttons, axis profile chart (12-sided dodecagon, color-coded diameter axes) on results screen.
5. **Loading**: data JSON bundled at build time via Vite imports — no runtime fetch.
6. **Identity layer**: cultural name/demographics/contacts/background generators feeding the sheet; character code (archetype:magic[:axis]:seed) round-trips through Load.

**Exit criteria met:** end-to-end flow works in the browser; both entry points produce a sheet; every section is independently re-rollable; partial rerolls preserve master-seed-derived identity (name, demographics, contacts) via per-section `seedOverrides`.

### Phase 5 — PDF export (DONE)
**Goal:** themed printable character sheet.

1. **Library**: `@react-pdf/renderer` v4.5.1 (client-side, no backend).
2. **Template**: SR2-styled two-page sheet — attributes, condition monitors, dice pools, weapons, skills with pip ratings, cyberware, spells, cyberdeck stats, gear, vehicles, contacts, background.
3. **Theming**: dark terminal aesthetic (#060c09 bg), neon teal (#00ffcc) accents, Courier monospace, FASA watermark footer.

**Exit criteria met:** EXPORT PDF button on sheet generates a blob client-side and downloads as `<RunnerName>.pdf`. Two-page layout covers all character data.

### Phase 6 — Deploy
1. GitHub Pages workflow (`.github/workflows/deploy.yml`) — `npm run build` then publish `app/dist/`.
2. `vite.config.ts` `base` set to the repo path.
3. Smoke-test the deployed bundle.

## Backlog
- **Physical adept powers**: Adepts have Magic attribute modeled but powers (Improved Reflexes, Killing Hands, etc.) are not purchased from resources — adept resource spend currently mirrors mundane archetypes.

## Status

**Phases 1–6 complete plus backlog tuning pass** (2026-05-05). All v1 milestones done plus:
- Archetype tuning: `former_company_man` body/quickness/strength weights balanced; `rigger` quickness/intelligence weights equalized; `mercenary` and `combat_mage` gearTags corrected against canonical gear (p.55, p.52, p.60).
- Resource budget reserve: 500¥ held back before tagged gear loop so weapon guarantee always has budget.
- Concentration validation: WEAPON_CONC_CATS extended to cover gunnery (Machine Guns, Assault Cannon), projectile_weapons (Bows, Crossbows), and throwing_weapons (Shafted, Non-Aerodynamic, Aerodynamic).
- Combat mage differentiation: picks 3–4 combat spells and 7–8 total (vs 2 combat / 5 total for other mages), matching canonical p.52 loadout.

App live at https://gruevyhat.github.io/shadowrun-2.0-chargen/

**Key decisions (Phase 5):**
- Two-page PDF layout: page 1 = combat sheet (attrs, weapons, skills, cyberware), page 2 = background & equipment (spells, deck, gear, vehicles, contacts, details).
- Client-side generation via `pdf().toBlob()` — no backend, no network request.
- Dark terminal theme (#060c09 bg, #00ffcc neon, Courier) to match the web app's SR aesthetic.
- FASA watermark footer with character code for traceability.

**Next:** physical adept powers, or v2 planning.

## Risks & mitigations
- **OCR quality on a 71MB scanned PDF**: mitigated by 400dpi, `--psm 1`, and per-section manual review. Tables (priority, gear, spells) are highest risk; budget hand-transcription time for those.
- **Archetype synergy "feel"**: hard to test programmatically. Mitigation: keep archetype templates declarative JSON so tuning doesn't require code changes; ship a debug view that exposes the engine's intermediate decisions.
- **PDF rendering inconsistencies**: `@react-pdf/renderer` lacks some CSS features. Mitigation: build a static text-only fallback layout first, layer styling second.
- **Bundle size**: all rules data is in-app. Mitigation: minify JSON, lazy-load the gear catalog if needed.

## Open questions (carried forward)
- ~~How granular should re-rolls be?~~ Resolved: section-level (skills, resources) plus full regen (priorities/attributes/all).
- ~~Quiz tone~~: gritty in-fiction prose, locked in.
- ~~Default metatype distribution~~: archetype `preferredMetatypes` weights drive selection.
- PDF page count: single-page if achievable, two-page fallback. Decide once template is roughed in.
