import opentype from 'opentype.js';
import { readFileSync, writeFileSync } from 'fs';
import { charToPolygonModule } from './src/utils/fontToScad.ts';

const openscad = await import('./node_modules/openscad-wasm-prebuilt/dist/openscad.js');
const instance = await openscad.createOpenSCAD({ print: () => {}, printErr: (e) => console.log('ERR:', e) });
const render = instance.renderToStl.bind(instance);

// Load font
const fontBuffer = readFileSync('public/fonts/NotoSans-Bold.ttf');
const font = opentype.parse(fontBuffer.buffer);

// Generate modules for 'A' and 'X' (filler char for 'X')
const modA = charToPolygonModule('A', font.charToGlyph('A').getPath(0, 0, 1000), 50);
const modX_special = charToPolygonModule('X', font.charToGlyph('X').getPath(0, 0, 1000), 50);

// Filler char module (for when we want a special char instead of text)
const modX_special_gen = `module special_char(n){
  if("heart"=="heart") heart2(n,1);
  else if("heart"=="heart1") heart2(n,1);
  else if("heart"=="heart2") heart2(n,2);
  else if("heart"=="diamond") diamond(n,1);
  else if("heart"=="frame") diamond(n,2);
  else heart2(n,1);
}

module heart2(size,t){
    difference(){
        union(){
            r=0.7;
            translate([0,-size*r])
            scale([0.9*r,1.15*r])
            rotate([0,0,45]){
                square(size);
                translate([size/2,size]) circle(size/2,$fn=$fn);
                translate([size,size/2]) circle(size/2,$fn=$fn);
            }
        }
        if(t==2){
          union(){
            r=0.48;
            translate([0,-size*r])
                scale([0.9*r,1.15*r])
                    rotate([0,0,45]){
                        square(size);
                        translate([size/2,size]) circle(size/2,$fn=$fn);
                        translate([size,size/2]) circle(size/2,$fn=$fn);
                    }
          }
        }
    }
}

module diamond(s,t){
    size=s/1.555;
    if(t==1){
        translate([0,-s/2.2])  {
            rotate([0,0,45])
                difference() {
                    square(size*1.2);
                    translate([size/4,size/4]) square(size/1.6);
                }
                translate([-size/2.3/2,0]) square([size/2.3,size/5]);
        }
    }
    else{
        translate([-size*1.5/2,-s/2.2])  {
            difference() {
                square(size*1.50);
                translate([size/4,size/4]) square(size);
            }
        }
    }
}`;

// Now generate text lines the way scadGenerator does
const textHeight = 50;
const letterSpace = textHeight * 1.3;
const extrudeLength = textHeight * 5;
const specialCharMove = textHeight / 11;
const plateHeight = 5;
const plateWidth = textHeight * 1.5;
const numChars = 2;

const text1 = 'AX'.toUpperCase().slice(0, 12);
const text2 = 'XB'.toUpperCase().slice(0, 12);

const move1 = Math.max(Math.floor((text2.length - text1.length) / 2), 0);
const move2 = Math.max(Math.floor((text1.length - text2.length) / 2), 0);
const plateLength = Math.max((numChars - 1) * letterSpace, 1);

function hasGlyph(ch) {
  try {
    const g = font.charToGlyph(ch);
    const path = g.getPath(0, 0, textHeight);
    return path.commands.length > 0;
  } catch {
    return false;
  }
}

function textLine(text, move) {
  const lines = [];
  for (let i = 0; i < numChars; i++) {
    const charIdx = i - move;
    const showFiller =
      charIdx < 0 ||
      charIdx >= text.length ||
      text[charIdx] === ' ' ||
      !hasGlyph(text[charIdx]);

    if (showFiller) {
      lines.push(`      if(i==${i}){translate([0,${textHeight / 2 - specialCharMove},0]){\n          difference(){\n            special_char(${textHeight});\n            translate([0,${-textHeight + specialCharMove},0]) square([${textHeight},${textHeight}],center=true);\n          }\n        }}`);
    } else {
      const ch = text[charIdx];
      const safeName = `c_${ch.charCodeAt(0)}`;
      lines.push(`      if(i==${i}){${safeName}();}`);
    }
  }
  return lines.join('\n');
}

const text1Code = textLine(text1, move1);
const text2Code = textLine(text2, move2);

const code = `// Flip_Text - Dynamic font outlines (opentype.js)
$fn=30;
text_height=${textHeight};

// Character polygon modules
${modA}
${modX_special}

// Special character modules
${modX_special_gen}

// Main model
if(len("AX")>0 && len("XB")>0){
    render(){ union(){
        // Base plate
        translate([${plateLength / 2},0,${plateHeight / 2}])
          cube([${plateLength},${plateWidth},${plateHeight}], center=true);
        translate([0,0,${plateHeight / 2}]) cylinder(h=${plateHeight}, d=${plateWidth}, center=true);
        translate([${plateLength},0,${plateHeight / 2}]) cylinder(h=${plateHeight}, d=${plateWidth}, center=true);

        // Characters - flip text intersection
        for (i=[0:${numChars - 1}]){
            translate([${letterSpace}*i,0,${plateHeight}]){
                intersection(){
                    rotate([90,0,-45]){
                        translate([0,0,-${extrudeLength / 2}]){
                            linear_extrude(${extrudeLength}){
                                ${text1Code}
                            }
                        }
                    }
                    rotate([90,0,45]){
                        translate([0,0,-${extrudeLength / 2}]){
                            linear_extrude(${extrudeLength}){
                                ${text2Code}
                            }
                        }
                    }
                }
            }
        }
    }}
}`;

console.log('SCAD code (full):');
console.log(code);

writeFileSync('test-output-full.scad', code);

console.log('\nTesting full generation...');
let stl = await render(code);
console.log('Result:', stl.includes('solid') ? 'SUCCESS (' + stl.length + ' bytes)' : 'FAILED');