import opentype from 'opentype.js';
import { readFileSync, writeFileSync } from 'fs';
import { generateScadWithFont } from './src/utils/scadGenerator.ts';

const fontBuffer = readFileSync('public/fonts/NotoSans-Bold.ttf');
const font = opentype.parse(fontBuffer.buffer);

const scad = generateScadWithFont('ALICE', 'BOB', 'heart', font);
writeFileSync('/tmp/test-output.scad', scad);
console.log('SCAD generated:', scad.length, 'bytes');
console.log('Has modules:', scad.includes('module c_'));
console.log('First 500 chars:');
console.log(scad.substring(0, 500));
