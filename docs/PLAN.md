# Shadowrun Character Generator — Development Plan

## Goals (v1)
A static web app that produces playable, rules-valid Shadowrun 2nd Edition characters via a personality quiz or random generation, with section re-rolls and themed PDF export. Deployable to GitHub Pages with no backend.

## Non-goals (v1)
- Shadowrun 1st Edition support (backlogged)
- Manual / fully user-driven builder (backlogged)
- Supplements beyond the SR2 core rulebook (backlogged)
- Account / save-to-cloud features

---

## Goals (v2)
Two parallel tracks:

1. **Manual character builder** — a third entry point ("BUILD YOUR OWN") where the user drives every allocation decision: priorities A–E, metatype, attribute points, skills, gear. Engine pipeline remains the same; the UI becomes the allocator instead of the generator.
2. **Supplement data** — expand gear, spells, and adept power accuracy from key SR2 sourcebooks (Grimoire 2e, Street Samurai Catalog completion).

## Non-goals (v2)
- SR1 support (v3)
- localStorage saves / character gallery (v3)
- Share-link encoding (v3)
- Quiz axis radar chart (v3)
- Additional sourcebooks beyond Grimoire 2e and Street Samurai Catalog

### Phase 7 — Supplement data (v2, track A)

**Goal:** expand and correct rulebook data from two SR2 sourcebooks.

#### 7a — Grimoire 2e (`docs/SR2/supplements/Shadowrun 2e - Grimoire 2nd edition {FASA7903}.pdf`)
- OCR targeted pages: adept powers table, expanded spell list, revised conjuring rules.
- Replace `data/sr2/adept_powers.json` costs/effects with rulebook-verified values (current file sourced from training knowledge — flagged for review).
- Add any spells in Grimoire not present in core `spells.json`.
- Update `data/schemas/adept_powers.schema.json` if structure changes.

**Exit criteria:** adept power magic costs match Grimoire 2e page references; all spells validate against schema; 1000-character adept smoke test still passes.

#### 7b — Street Samurai Catalog (`docs/SR2/supplements/Shadowrun 2e - Street Samurai Catalog {FASA7104}.pdf`)
- Targeted pages: weapons tables, cyberware tables (already partially extracted).
- Fill gaps in `gear.json` (weapons, armor) and `cyberware.json` against catalog pages.
- No engine changes expected — data only.

**Exit criteria:** gear and cyberware counts meaningfully increase; all items validate against schema; no regressions in resource-spend smoke test.

### Phase 8 — Manual character builder (v2, track B)

**Goal:** third entry point on the landing screen: "BUILD YOUR OWN" — a step-by-step wizard where the user makes every allocation decision. Fully rules-valid output feeds the same Character Sheet and PDF export.

**Wizard steps (each a discrete screen):**

1. **Priority assignment** — user drags or clicks to assign A–E across the five categories (Metatype, Attributes, Magic, Skills, Resources). Live preview of what each rank grants.
2. **Metatype selection** — filtered to metatypes available at the chosen Metatype priority. Racial attribute modifiers and special abilities shown.
3. **Attribute allocation** — point-buy within the priority-determined pool; sliders or +/− controls; racial min/max caps enforced live. Combat/Magic/Task pools update in real time.
4. **Magic resolution** — shown only for Awakened builds (Full Magic, Adept). Full Magic: pick spell categories. Adept: spend magic points on powers from `adept_powers.json`.
5. **Skill allocation** — point-buy within skill pool; active + knowledge skills; concentration picker for eligible skills.
6. **Resource spend** — budget display; user browses gear/cyberware/spells catalogs and adds items; Essence tracker for cyberware; remaining nuyen shown.
7. **Identity** — name, background, contacts (can auto-generate each section or type manually).
8. **Review & confirm** — full summary, validation errors surfaced inline, confirm → Character Sheet.

**Engine integration:**
- Each step calls the same pure stage functions the generator uses, but with user-supplied values instead of RNG choices.
- Validation runs continuously (no invalid state allowed past each step).
- The resulting `Character` is identical in shape to a generated one — same sheet, same PDF export, same character code.

**Character code for manual builds:** encode as `m:<archetype>:<priority-string>:<seed>` where seed is a timestamp hash; round-trips through Load on the landing screen.

**Exit criteria:** all five metatypes and all 14 archetypes are reachable; completed builds pass `validate()`; character code round-trips; PDF export works.

### Phase 9 — QoL (v3 candidate, park here for now)
- localStorage character gallery (save/name/load multiple runners)
- Share link (URL fragment encoding of character code)
- Quiz axis radar chart (dodecagon, six axes, was in v1 plan)
- SR1 support

### Phase 10 — Character portraits (Grok image generation)

**Goal:** generate a thematic character portrait on the sheet screen and optionally embed it in the PDF export.

**Approach:**
- Call the [xAI image generation API](https://docs.x.ai/docs/guides/image-understanding) (`grok-2-image` or successor) client-side with a dynamically constructed prompt derived from the character's metatype, archetype, demographics, and appearance description.
- Portrait prompt template: `"Shadowrun 2050 cyberpunk portrait, [metatype] [sex] [archetype], [appearance excerpt], dark neon aesthetic, detailed illustration"` — constructed from `PdfData` fields already available on the sheet.
- User supplies their own xAI API key (entered once, stored in `localStorage`; never sent anywhere except xAI). No backend required.
- Generated image displayed on the sheet screen in a portrait slot; re-generate button allows cycling.
- PDF export: if a portrait has been generated, embed it on page 1 via `@react-pdf/renderer`'s `<Image>` component (base64 data URL).

**Implementation steps:**
1. Add an API key input field to the landing screen (or a settings drawer); persist to `localStorage`.
2. On the sheet screen: "GENERATE PORTRAIT" button triggers a `fetch` to `https://api.x.ai/v1/images/generations` with the constructed prompt, model `grok-2-image`, and the stored key as Bearer token.
3. Display the returned image URL (or base64) in a portrait frame on the sheet.
4. Wire the image into `PdfData` and update `CharacterPdf.tsx` to render it in the top-right corner of page 1.
5. Handle errors gracefully: missing key → prompt to add one; API error → show message, allow retry.

**Constraints:**
- API key is the user's responsibility; the app makes no server-side calls.
- Generation is optional — the sheet and PDF work identically without a portrait.
- Rate limiting / cost is on the user's xAI account.

**Exit criteria:** entering a valid xAI API key and clicking GENERATE PORTRAIT produces a portrait on the sheet; the PDF export includes the portrait when one has been generated; no portrait = no regression in existing PDF output.

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
_(v1 backlog cleared 2026-05-05)_

## Status

**Phase 9 done** (2026-05-06). Share links (URL hash → auto-load character), localStorage gallery (save/load/delete up to 20 runners). Radar chart was already live. Next: Phase 10 (portraits).

**Phase 7 done** (2026-05-06). Grimoire 2e spells added: 35 → 106 spells (combat 32, detection 15, health 12, illusion 16, manipulation 31).

**Phase 8 done** (2026-05-06). Manual character builder wizard live.

**v1 complete + v2 plan drafted** (2026-05-05). All v1 milestones done plus:
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

**Next:** Phase 7a (Grimoire 2e adept power verification) or Phase 8 (manual builder wizard).

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
