import { makeRng, childSeed, randInt } from '../engine/rng';

export interface DeckProgram {
  name:     string;
  category: 'offensive' | 'defensive' | 'stealth' | 'utility';
  rating:   number;
  sizeMb:   number;
}

// ── Master program list ────────────────────────────────────────────────────

interface ProgramDef {
  id:       string;
  name:     string;
  category: DeckProgram['category'];
  // size (Mb) = rating × sizePerRating
  sizePerRating: number;
  desc:     string;
}

const ALL_PROGRAMS: ProgramDef[] = [
  // Offensive
  { id: 'attack',    name: 'Attack',     category: 'offensive', sizePerRating: 2, desc: 'Damage target program or system'           },
  { id: 'crash',     name: 'Crash',      category: 'offensive', sizePerRating: 2, desc: 'Crash target program'                      },
  { id: 'locate',    name: 'Locate',     category: 'offensive', sizePerRating: 2, desc: 'Trace another decker\'s physical location'  },
  // Defensive
  { id: 'armor',     name: 'Armor',      category: 'defensive', sizePerRating: 1, desc: 'Absorbs damage to the deck'                },
  { id: 'smoke',     name: 'Smoke',      category: 'defensive', sizePerRating: 1, desc: 'Screen that absorbs targeting'             },
  // Stealth
  { id: 'cloak',     name: 'Cloak',      category: 'stealth',   sizePerRating: 1, desc: 'Hides decker from sensors and patrols'    },
  { id: 'deception', name: 'Deception',  category: 'stealth',   sizePerRating: 1, desc: 'Masks decker\'s activity as legitimate'   },
  { id: 'relocate',  name: 'Relocate',   category: 'stealth',   sizePerRating: 1, desc: 'Shift apparent Matrix address'             },
  // Utility
  { id: 'browse',    name: 'Browse',     category: 'utility',   sizePerRating: 1, desc: 'Search hosts and files'                   },
  { id: 'decrypt',   name: 'Decrypt',    category: 'utility',   sizePerRating: 1, desc: 'Break encryption on protected data'        },
  { id: 'evaluate',  name: 'Evaluate',   category: 'utility',   sizePerRating: 1, desc: 'Assess value and integrity of data'        },
  { id: 'read_write',name: 'Read/Write', category: 'utility',   sizePerRating: 1, desc: 'Create, copy, and modify files'            },
  { id: 'validate',  name: 'Validate',   category: 'utility',   sizePerRating: 1, desc: 'Verify authenticity of programs and data'  },
  { id: 'trace',     name: 'Trace',      category: 'utility',   sizePerRating: 1, desc: 'Track SAN address back to meat location'   },
];

// Priority load order for a decker
const PRIORITY_IDS = ['attack', 'armor', 'cloak', 'browse', 'decrypt', 'deception', 'smoke', 'read_write', 'crash', 'relocate', 'evaluate', 'validate', 'trace', 'locate'];

// ── Generator ──────────────────────────────────────────────────────────────

export function generatePrograms(seed: number, deckMpcp: number, activeMb: number): DeckProgram[] {
  const rng    = makeRng(childSeed(seed, 'programs'));
  const rating = Math.max(1, Math.floor(deckMpcp / 2));

  const programs: DeckProgram[] = [];
  let usedMb = 0;

  // Load priority programs first
  for (const id of PRIORITY_IDS) {
    if (usedMb >= activeMb) break;
    const def  = ALL_PROGRAMS.find(p => p.id === id)!;
    const size = def.sizePerRating * rating;
    if (usedMb + size > activeMb) continue;

    // Add a small random ±1 to rating (but at least 1, at most deckMpcp)
    const ratingJitter = Math.max(1, Math.min(deckMpcp, rating + randInt(rng, 3) - 1));
    const actualSize   = def.sizePerRating * ratingJitter;
    if (usedMb + actualSize > activeMb) continue;

    programs.push({ name: def.name, category: def.category, rating: ratingJitter, sizeMb: actualSize });
    usedMb += actualSize;
  }

  return programs;
}

export { ALL_PROGRAMS };
