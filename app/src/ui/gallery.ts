export interface GalleryEntry {
  code:      string;
  name:      string;
  archetype: string;
  savedAt:   string;
}

const GALLERY_KEY  = 'sr2chargen-gallery';
const MAX_ENTRIES  = 20;

export function loadGallery(): GalleryEntry[] {
  try {
    const raw = localStorage.getItem(GALLERY_KEY);
    return raw ? (JSON.parse(raw) as GalleryEntry[]) : [];
  } catch {
    return [];
  }
}

export function saveToGallery(entry: GalleryEntry): GalleryEntry[] {
  const current = loadGallery().filter(e => e.code !== entry.code);
  const updated  = [entry, ...current].slice(0, MAX_ENTRIES);
  localStorage.setItem(GALLERY_KEY, JSON.stringify(updated));
  return updated;
}

export function removeFromGallery(code: string): GalleryEntry[] {
  const updated = loadGallery().filter(e => e.code !== code);
  localStorage.setItem(GALLERY_KEY, JSON.stringify(updated));
  return updated;
}
