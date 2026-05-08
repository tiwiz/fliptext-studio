import opentype from 'opentype.js';
import { readFileSync } from 'fs';

const fontBuffer = readFileSync('public/fonts/NotoSans-Bold.ttf');
console.log('Buffer size:', fontBuffer.length);

// Try loading the buffer
try {
  const font = opentype.parse(fontBuffer.buffer);
  console.log('Font name:', font.names?.fontFamily?.en || 'unknown');
  console.log('Units per em:', font.unitsPerEm);
  
  // Test "A" glyph
  const glyph = font.charToGlyph('A');
  console.log('Glyph found:', !!glyph);
  const path = glyph.getPath(0, 0, 50);
  console.log('Path commands:', path.commands.length);
  path.commands.slice(0, 20).forEach((c, i) => {
    console.log(`[${i}] ${c.type}`);
  });
} catch(e) {
  console.error('Error:', e.message);
}
