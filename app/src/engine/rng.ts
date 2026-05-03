// Mulberry32 — fast, seedable, good statistical properties for our use.
// Returns a new PRNG function from a uint32 seed.
export function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Derive a child seed from a parent seed + a stable string tag.
// Lets each pipeline stage get its own independent PRNG.
export function childSeed(parentSeed: number, tag: string): number {
  let h = parentSeed >>> 0;
  for (let i = 0; i < tag.length; i++) {
    h = Math.imul(h ^ tag.charCodeAt(i), 0x9e3779b9);
    h ^= h >>> 16;
  }
  return h >>> 0;
}

// Pick a random integer in [0, n).
export function randInt(rng: () => number, n: number): number {
  return Math.floor(rng() * n);
}

// Weighted random pick. weights must be non-negative, need not sum to 1.
export function weightedPick<T>(
  rng: () => number,
  items: T[],
  weights: number[],
): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

// Shuffle array in-place (Fisher-Yates).
export function shuffle<T>(rng: () => number, arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randInt(rng, i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
