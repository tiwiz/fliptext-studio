/**
 * Generates OpenSCAD code for flip-text using dynamic font outlines
 * extracted via opentype.js — works with any TTF font (including Google Fonts).
 */

import type { Font } from 'opentype.js';
import { charToPolygonModule } from './fontToScad';

export function generateScadWithFont(
  name1: string,
  name2: string,
  filler: string,
  font: Font,
): string {
  const text1 = name1.toUpperCase().slice(0, 12);
  const text2 = name2.toUpperCase().slice(0, 12);

  if (!text1 || !text2) return '';

  const textHeight = 50;
  const letterSpace = textHeight * 1.3;
  const extrudeLength = textHeight * 5;
  const specialCharMove = textHeight / 11;
  const plateHeight = 5;
  const plateWidth = textHeight * 1.5;
  const numChars = Math.max(text1.length, text2.length);
  const plateLength = Math.max((numChars - 1) * letterSpace, 1);

  const move1 = Math.max(Math.floor((text2.length - text1.length) / 2), 0);
  const move2 = Math.max(Math.floor((text1.length - text2.length) / 2), 0);

  // Generate polygon modules for all unique characters
  const uniqueChars = [...new Set([...text1, ...text2])].filter(
    c => c !== ' ' && font.charToGlyph(c),
  );
  const polyModules: string[] = [];

  for (const ch of uniqueChars) {
    const glyph = font.charToGlyph(ch);
    const path = glyph.getPath(0, 0, 1000); // Get at font size, we scale later... 
    // Actually, charToPolygonModule handles scaling via textHeight
    const modCode = charToPolygonModule(ch, path, textHeight);
    if (modCode) polyModules.push(modCode);
  }

  const modulesCode = polyModules.join('\n');

  // Check if a character has font data
  function hasGlyph(ch: string): boolean {
    try {
      const g = font.charToGlyph(ch);
      const path = g.getPath(0, 0, textHeight);
      return path.commands.length > 0;
    } catch {
      return false;
    }
  }

  // Build character calls for a given text at a position
  function textLine(text: string, move: number): string {
    const lines: string[] = [];
    for (let i = 0; i < numChars; i++) {
      const charIdx = i - move;
      const showFiller =
        charIdx < 0 ||
        charIdx >= text.length ||
        text[charIdx] === ' ' ||
        !hasGlyph(text[charIdx]);

      if (showFiller) {
        lines.push(`      if(i==${i}){translate([0,${textHeight / 2 - specialCharMove},0]){
          difference(){
            special_char(${textHeight});
            translate([0,${-textHeight + specialCharMove},0]) square([${textHeight},${textHeight}],center=true);
          }
        }}`);
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

  return `// Flip_Text - Dynamic font outlines (opentype.js)
$fn=50;
text_height=${textHeight};

// Character polygon modules
${modulesCode}

// Special character modules
module special_char(n){
  if("${filler}"=="heart") heart2(n,1);
  else if("${filler}"=="heart1") heart2(n,1);
  else if("${filler}"=="heart2") heart2(n,2);
  else if("${filler}"=="diamond") diamond(n,1);
  else if("${filler}"=="frame") diamond(n,2);
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
}

// Main model
if(len("${text1}")>0 && len("${text2}")>0){
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
}
`;
}
