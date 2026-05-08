import opentype from 'opentype.js';
import { readFileSync } from 'fs';
import { charToPolygonModule } from './src/utils/fontToScad.ts';

const fontBuffer = readFileSync('public/fonts/NotoSans-Bold.ttf');
const font = opentype.parse(fontBuffer.buffer);

// Test a few characters
for (const ch of ['A', 'B', 'O', 'I']) {
  const glyph = font.charToGlyph(ch);
  const path = glyph.getPath(0, 0, 1000);
  const mod = charToPolygonModule(ch, path, 50);
  const lines = mod.split('\n');
  console.log(ch + ':', lines.length > 1 ? lines[0].trim() + ' // ' + (lines.length-1) + ' polygon lines' : mod);
}
