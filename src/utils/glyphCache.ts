/**
 * Pre-computed polygon data for A-Z uppercase at text_height=50.
 * Generated from NotoSans-Bold to avoid loading opentype.js + font file at runtime.
 * 
 * Format: { "A": { outer: [[x,y],...], holes: [[[x,y],...]] }, ... }
 */

export interface GlyphData {
  outer: number[][];
  holes: number[][][];
}

// This will be populated by the pre-computation script.
// For now, we compute at build time and embed.
// Actually, let's compute at init time once and cache.
let glyphCache: Record<string, GlyphData> | null = null;

export function setGlyphCache(cache: Record<string, GlyphData>): void {
  glyphCache = cache;
}

export function getGlyphData(ch: string): GlyphData | null {
  return glyphCache?.[ch] ?? null;
}

export function isCacheReady(): boolean {
  return glyphCache !== null;
}
