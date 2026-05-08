/**
 * Converts font paths (from opentype.js) to OpenSCAD polygon data.
 * Flattens bezier curves into line segments for maximum compatibility.
 */

import type { Font, Path, PathCommand } from 'opentype.js';

/**
 * Flatten a quadratic bezier curve to line segments.
 */
function flattenQuadratic(
  x0: number, y0: number,
  x1: number, y1: number,
  x2: number, y2: number,
  flatness = 1.5,
): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  const steps = Math.max(
    2,
    Math.ceil(
      Math.sqrt(
        Math.abs(x2 - x0) + Math.abs(y2 - y0),
      ) / flatness,
    ),
  );
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    const x = u * u * x0 + 2 * u * t * x1 + t * t * x2;
    const y = u * u * y0 + 2 * u * t * y1 + t * t * y2;
    points.push([x, y]);
  }
  return points;
}

/**
 * Flatten a cubic bezier curve to line segments.
 */
function flattenCubic(
  x0: number, y0: number,
  x1: number, y1: number,
  x2: number, y2: number,
  x3: number, y3: number,
  flatness = 1.5,
): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  const steps = Math.max(
    2,
    Math.ceil(
      Math.sqrt(
        Math.abs(x3 - x0) + Math.abs(y3 - y0),
      ) / flatness,
    ),
  );
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    const x =
      u * u * u * x0 +
      3 * u * u * t * x1 +
      3 * u * t * t * x2 +
      t * t * t * x3;
    const y =
      u * u * u * y0 +
      3 * u * u * t * y1 +
      3 * u * t * t * y2 +
      t * t * t * y3;
    points.push([x, y]);
  }
  return points;
}

interface Contour {
  points: Array<[number, number]>;
}

/**
 * Extract closed contours from a glyph path, flattening curves.
 */
function pathToContours(glyphPath: Path, flatness = 1.5): Contour[] {
  const contours: Contour[] = [];
  let currentPoints: Array<[number, number]> = [];
  let startX = 0;
  let startY = 0;

  function closeContour() {
    if (currentPoints.length > 2) {
      // Ensure first and last points match
      const last = currentPoints[currentPoints.length - 1];
      const first = currentPoints[0];
      if (Math.abs(last[0] - first[0]) > 0.01 || Math.abs(last[1] - first[1]) > 0.01) {
        currentPoints.push([first[0], first[1]]);
      }
      contours.push({ points: currentPoints });
    }
    currentPoints = [];
  }

  for (let i = 0; i < glyphPath.commands.length; i++) {
    const cmd = glyphPath.commands[i];
    switch (cmd.type) {
      case 'M': {
        if (currentPoints.length > 0) closeContour();
        currentPoints.push([cmd.x!, cmd.y!]);
        startX = cmd.x!;
        startY = cmd.y!;
        break;
      }
      case 'L': {
        currentPoints.push([cmd.x!, cmd.y!]);
        break;
      }
      case 'Q': {
        const prev = currentPoints[currentPoints.length - 1] || [0, 0];
        const quad = flattenQuadratic(
          prev[0], prev[1],
          cmd.x1!, cmd.y1!,
          cmd.x!, cmd.y!,
          flatness,
        );
        currentPoints.push(...quad);
        break;
      }
      case 'C': {
        const prev2 = currentPoints[currentPoints.length - 1] || [0, 0];
        const cub = flattenCubic(
          prev2[0], prev2[1],
          cmd.x1!, cmd.y1!,
          cmd.x2!, cmd.y2!,
          cmd.x!, cmd.y!,
          flatness,
        );
        currentPoints.push(...cub);
        break;
      }
      case 'Z': {
        closeContour();
        break;
      }
    }
  }
  if (currentPoints.length > 0) closeContour();

  return contours;
}

/**
 * Determine if a contour is clockwise or counter-clockwise.
 * In screen coordinates (Y-down), CW = outer, CCW = hole.
 * In math coordinates (Y-up), it's reversed.
 * OpenSCAD uses screen coords (Y-down) for 2D.
 * 
 * But opentype.js outputs in math coords (Y-up).
 * We negate Y when converting, so we need to use math coords rule:
 * CCW = outer, CW = hole (in math coords).
 */
function signedArea(points: Array<[number, number]>): number {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    area += x1 * y2 - x2 * y1;
  }
  return area / 2;
}

function isClockwise(points: Array<[number, number]>): boolean {
  return signedArea(points) < 0;
}

interface GlyphPolygons {
  outer: Array<[number, number]>[];
  holes: Array<[number, number]>[];
}

/**
 * Convert font glyph to polygon data for OpenSCAD.
 * Flips Y axis because OpenSCAD uses Y-up while opentype uses Y-down.
 */
export function glyphToPolygons(glyphPath: Path, textHeight: number): GlyphPolygons | null {
  const contours = pathToContours(glyphPath, textHeight / 40);
  if (contours.length === 0) return null;

  const outers: Array<[number, number]>[] = [];
  const holes: Array<[number, number]>[] = [];

  // Scale factor: opentype uses font units, we want textHeight
  const scale = textHeight / 1000; // unitsPerEm is 1000 for Noto Sans

  for (const contour of contours) {
    // Scale and flip Y (opentype = Y-down, OpenSCAD = Y-up)
    const scaled = contour.points.map(
      ([x, y]) => [x * scale, -y * scale] as [number, number],
    );

    // After Y-flip from opentype (Y-down) to OpenSCAD (Y-up):
    // opentype CCW → OpenSCAD CW → negative signed area
    // opentype CW → OpenSCAD CCW → positive signed area
    // In OpenSCAD: CCW winding = outer, CW winding = hole
    // So: negative area = OUTER, positive area = HOLE
    if (isClockwise(scaled)) { // negative area = outer
      outers.push(scaled);
    } else {                   // positive area = hole
      holes.push(scaled);
    }
  }

  return { outer: outers, holes };
}

/**
 * Generate OpenSCAD polygon module code for a single character.
 * Uses named `points=` and `paths=` syntax required by modern OpenSCAD.
 * Hole paths must use REVERSED winding order (CW instead of CCW).
 */
export function charToPolygonModule(ch: string, glyphPath: Path, textHeight: number): string {
  const data = glyphToPolygons(glyphPath, textHeight);
  if (!data || data.outer.length === 0) return '';

  // Collect all points (outer + all holes) and build path definitions
  const allPoints: string[] = [];
  const pathIndices: number[][] = [];

  for (const contour of data.outer) {
    const startIdx = allPoints.length;
    for (const [x, y] of contour) {
      allPoints.push(`[${x.toFixed(3)},${y.toFixed(3)}]`);
    }
    // Outer contours: CCW winding (already correct from signedArea)
    pathIndices.push(Array.from({ length: contour.length }, (_, i) => startIdx + i));
  }

  for (const hole of data.holes) {
    const startIdx = allPoints.length;
    for (const [x, y] of hole) {
      allPoints.push(`[${x.toFixed(3)},${y.toFixed(3)}]`);
    }
    // Holes: REVERSE winding for OpenSCAD (CW = hole in screen coords, but OpenSCAD
    // interprets CCW as holes in its Y-down coordinate system, so we need CW here)
    const reversed = Array.from({ length: hole.length }, (_, i) => startIdx + (hole.length - 1 - i));
    pathIndices.push(reversed);
  }

  const ptsStr = allPoints.join(',');
  const pathsStr = pathIndices.map(p => `[${p.join(',')}]`).join(',');

  const safeName = `c_${ch.charCodeAt(0)}`;
  return `module ${safeName}(){polygon(points=[${ptsStr}],paths=[${pathsStr}]);}`;
}
