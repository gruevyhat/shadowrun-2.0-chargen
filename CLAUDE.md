# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
A character generator for the Shadowrun tabletop RPG. **v1 scope: Shadowrun 2nd Edition only.** SR1 support is backlogged.

Two user entry points: a 30-question personality quiz (six thematic dichotomies) that produces a balanced character via opaque mechanics, and a "random character" mode that generates a synergistic build for one of nine archetypes. Generated characters can be re-rolled section-by-section and exported to a thematically formatted PDF.

**See [`docs/PLAN.md`](docs/PLAN.md) for the phased development plan, exit criteria, and current status.** Always read it before picking up new work — it's the source of truth for what's done, what's next, and what's intentionally out of scope.

## Workflow — how every phase is done

All work in this repo follows this loop. Don't skip steps; the order is load-bearing. Where a step doesn't apply (e.g. nothing to OCR-review on a pure-engine phase), say so explicitly in the retro rather than silently dropping it.

**0. Define exit criteria & test plan.** Translate the phase's exit criteria from `PLAN.md` into concrete, checkable assertions. For data phases: which counts/values must match the rulebook. For code phases: which test cases must pass. Write them down before coding.

**0b. Pre-flight check.** Confirm directory state, dependencies installed, branch clean, no drift since last phase. Re-read the relevant `PLAN.md` section. Cheap; saves real time when the env isn't where you expect.

**1. Implement.** Build the smallest thing that hits the exit criteria. No scope creep into adjacent phases.

**1b. Human-in-the-loop review** for anything a computer can't grade: OCR output, archetype templates, quiz tone, PDF aesthetics. Surface the artifact to the user and wait for sign-off before treating it as "done."

**2. Run tests and fix bugs.** All automated checks: `npm run lint`, `npm run build`, Vitest, Python schema validation. Fix until green.

**2b. Validate against source truth.** Code-correct ≠ rules-correct. Diff generated characters against canonical sample characters in the SR2 rulebook. Spot-check extracted JSON against the source pages. This catches the bugs tests can't.

**2c. End-to-end smoke test.** Run the full pipeline you have so far, even mid-project. Catches integration drift before Phase 4 forces a reckoning.

**3. Retrospective.** What went well, what was harder than expected, what surprised us. Be specific — vague retros produce vague improvements.

**3b. Update backlog & open questions.** Anything discovered mid-phase that's not in scope: move it to `PLAN.md`'s backlog or open-questions section. Don't let context leak.

**4. Revise plan.** Update `PLAN.md` to reflect what we actually learned. If exit criteria for upcoming phases changed, change them now.

**4b. Update CLAUDE.md** if architecture or constraints shifted. Stale architecture notes are worse than no notes.

**4c. Document non-obvious decisions.** Why we picked X over Y. Either in the commit message body or in a short note under `docs/decisions/`. Code alone doesn't preserve "why."

**5. Commit to repo.** Stage only the files the phase touched. Conventional commit style; reference the phase number.

**6. Tag the phase boundary.** Lightweight git tag like `phase-1-data-extraction` so phase-over-phase diffs and reverts are clean.

**7. Hand-off note for next session.** Append a two-sentence "what's loaded, what's next" to `PLAN.md` under a `## Status` heading (overwrite the previous note). Future sessions start cold otherwise.

## Directory Layout
- `app/` — User-facing app: Vite + React + TypeScript, built as a static bundle for GitHub Pages
- `scripts/` — Python tooling for one-off jobs (PDF OCR, data extraction, schema validation). Never shipped to users.
- `data/sr2/` — Normalized JSON consumed by the app at build time
- `data/raw/sr2/` — OCR output, intermediate. Regenerable; not committed.
- `data/schemas/` — JSON Schemas shared by Python tooling and the web app
- `docs/core_books/` — Source PDFs (e.g. `547785268-7901-Shadowrun-Second.pdf`)
- `docs/supplements/`, `docs/adventures/` — Reference PDFs (not used in v1)

## Commands

### Web app (run from `app/`)
```bash
npm run dev       # dev server
npm run build     # type-check + production build
npm run lint      # ESLint
npm run preview   # preview production build
```

### Python tooling (run from `scripts/`)
```bash
python extract_pdf.py <pdf> <out_dir>   # OCR a PDF into per-page Markdown
```
System dependencies for OCR: `tesseract`, `poppler` (for `pdf2image`). Install with `brew install tesseract poppler`.

## Architecture

### Data pipeline
PDF → Python OCR → raw markdown in `data/raw/sr2/` → hand/tooled normalization → JSON in `data/sr2/` validated against `data/schemas/` → bundled into the app at build time.

Required SR2 datasets: `priority_table.json`, `metatypes.json`, `skills.json`, `spells.json`, `gear.json`, `cyberware.json`, `archetypes.json`.

### Generator engine (`app/src/engine/`)
A pure, deterministic, seedable core. Input: a `CharacterIntent` (edition, archetype, magic disposition, axis weights, seed). Output: a validated `Character`.

Pipeline runs as discrete stages — priority assignment → metatype + attribute spend → magic resolution → skill spend → resource spend → validation. Each stage is a pure function so re-rolls only re-run the affected stages with a new sub-seed.

### Quiz
30 forced-choice questions across six dichotomies. The first four are SR-themed renames of MBTI axes; the last two are SR-specific:
1. **Wired ↔ Wild** (analogue of I/E) → Charisma weight, social skills
2. **Streetwise ↔ Cerebral** (analogue of S/N) → intuition skills, decking, knowledge skills
3. **Iron ↔ Empath** (analogue of T/F) → combat vs social loadout
4. **Runner ↔ Operator** (analogue of J/P) → resource depth vs cash reserve
5. **Awakened ↔ Mundane** → magic disposition + magic priority
6. **Human ↔ Metahuman** → metatype selection bias

The quiz's output vector becomes a `CharacterIntent`; from there the same engine pipeline runs. Game mechanics stay opaque to the user.

### Archetypes (v1)
Street Samurai, Mage, Shaman, Physical Adept, Decker, Rigger, Face, Combat Mage, Investigator. Each has an archetype template that biases priority assignment, attribute weights, skill focus, and gear loadout.

### PDF export
Client-side via `@react-pdf/renderer` so the entire app can ship as a static GitHub Pages bundle. SR2 layout only in v1.

## Constraints
- Final user artifact must be a single static HTML/JS bundle, no backend.
- Python is for tooling only — never imported, called, or relied upon at runtime.
- All generated characters must validate against SR2 core rulebook constraints (priority distribution, attribute caps, Essence ≥ Magic, Resource caps, etc.).

## Backlog
- SR1 rules support (data extraction + engine branching)
- Manual character builder (third entry point, fully user-driven)
- Additional sourcebooks (`docs/supplements/`, future)
