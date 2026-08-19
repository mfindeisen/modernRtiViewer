/** Trace Canny ridges into tapered ink strokes for publication export. */

export interface StrokePoint {
  x: number;
  y: number;
  width: number;
}

export interface StrokePolyline {
  points: StrokePoint[];
  closed: boolean;
}

export interface PublicationStrokeOptions {
  lineWidth?: number;
  flipY?: boolean;
  minLength?: number;
}

const N8: Array<[number, number]> = [
  [1, 0], [1, 1], [0, 1], [-1, 1],
  [-1, 0], [-1, -1], [0, -1], [1, -1],
];

function hypot2(x: number, y: number) {
  return Math.hypot(x, y) || 1;
}

export function widthEnvelope(t: number, closed: boolean) {
  if (closed) return 1;
  const u = Math.min(1, Math.max(0, t));
  return 0.28 + 0.72 * Math.sin(Math.PI * u);
}

export function simplifyPolyline(points: StrokePoint[], epsilon: number): StrokePoint[] {
  if (points.length < 3) return points.slice();

  function rdp(start: number, end: number, keep: boolean[]) {
    let maxDist = 0;
    let index = start;
    const ax = points[start].x;
    const ay = points[start].y;
    const bx = points[end].x;
    const by = points[end].y;
    const dx = bx - ax;
    const dy = by - ay;
    const len = hypot2(dx, dy);
    for (let i = start + 1; i < end; i++) {
      const dist = Math.abs(dy * (points[i].x - ax) - dx * (points[i].y - ay)) / len;
      if (dist > maxDist) {
        maxDist = dist;
        index = i;
      }
    }
    if (maxDist > epsilon) {
      rdp(start, index, keep);
      rdp(index, end, keep);
    } else {
      keep[start] = true;
      keep[end] = true;
    }
  }

  const keep = Array.from({ length: points.length }, () => false);
  rdp(0, points.length - 1, keep);
  return points.filter((_, i) => keep[i]);
}

export function resamplePolyline(points: StrokePoint[], spacing = 2): StrokePoint[] {
  if (points.length < 2) return points.slice();
  const out: StrokePoint[] = [{ ...points[0] }];
  let prev = points[0];
  let acc = 0;
  for (let i = 1; i < points.length; i++) {
    const next = points[i];
    let dx = next.x - prev.x;
    let dy = next.y - prev.y;
    let seg = Math.hypot(dx, dy);
    if (seg < 1e-6) continue;
    while (acc + seg >= spacing) {
      const t = (spacing - acc) / seg;
      prev = {
        x: prev.x + dx * t,
        y: prev.y + dy * t,
        width: prev.width + (next.width - prev.width) * t,
      };
      out.push({ ...prev });
      dx = next.x - prev.x;
      dy = next.y - prev.y;
      seg = Math.hypot(dx, dy);
      acc = 0;
    }
    acc += seg;
    prev = next;
  }
  const last = points[points.length - 1];
  const tail = out[out.length - 1];
  if (Math.hypot(last.x - tail.x, last.y - tail.y) > 0.5) out.push({ ...last });
  return out;
}

export function smoothPolyline(points: StrokePoint[], passes = 2): StrokePoint[] {
  if (points.length < 3) return points.slice();
  let current = points;
  for (let p = 0; p < passes; p++) {
    const next = [current[0]];
    for (let i = 1; i < current.length - 1; i++) {
      const a = current[i - 1];
      const b = current[i];
      const c = current[i + 1];
      next.push({
        x: a.x * 0.25 + b.x * 0.5 + c.x * 0.25,
        y: a.y * 0.25 + b.y * 0.5 + c.y * 0.25,
        width: b.width,
      });
    }
    next.push(current[current.length - 1]);
    current = next;
  }
  return current;
}

function applyWidths(points: StrokePoint[], closed: boolean, lineWidth: number, longSide: number) {
  const scale = lineWidth * Math.max(0.9, (longSide / 1024) * 0.42);
  const n = Math.max(1, points.length - 1);
  for (let i = 0; i < points.length; i++) {
    const env = widthEnvelope(i / n, closed);
    points[i].width = Math.max(0.55, scale * (0.55 + 0.7 * points[i].width) * env);
  }
}

export function traceRidges(
  pixels: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  options: PublicationStrokeOptions = {},
): StrokePolyline[] {
  const flipY = !!options.flipY;
  const minLength = options.minLength ?? 8;
  const lineWidth = options.lineWidth ?? 1.5;
  const count = width * height;
  const visited = new Uint8Array(count);

  function glIndex(x: number, y: number) {
    const gy = flipY ? height - 1 - y : y;
    return gy * width + x;
  }

  function thinAt(x: number, y: number) {
    return pixels[glIndex(x, y) * 4] / 255;
  }

  function energyAt(x: number, y: number) {
    return pixels[glIndex(x, y) * 4 + 1] / 255;
  }

  function tangentAt(x: number, y: number): [number, number] {
    const packed = pixels[glIndex(x, y) * 4 + 2] / 255;
    const angle = (packed - 0.5) * Math.PI * 2;
    return [-Math.sin(angle), Math.cos(angle)];
  }

  const seeds: Array<[number, number, number]> = [];
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const thin = thinAt(x, y);
      if (thin < 0.36) continue;
      seeds.push([x, y, energyAt(x, y) + thin]);
    }
  }
  seeds.sort((a, b) => b[2] - a[2]);

  function grow(sx: number, sy: number, dirx: number, diry: number) {
    const chain: Array<[number, number, number]> = [];
    let x = sx;
    let y = sy;
    let dx = dirx;
    let dy = diry;
    for (let step = 0; step < 20000; step++) {
      let bestX = -1;
      let bestY = -1;
      let bestScore = 0.08;
      let fallbackX = -1;
      let fallbackY = -1;
      let fallbackScore = -1;
      for (const [ox, oy] of N8) {
        const nx = x + ox;
        const ny = y + oy;
        if (nx < 1 || ny < 1 || nx >= width - 1 || ny >= height - 1) continue;
        const ni = ny * width + nx;
        if (visited[ni]) continue;
        const thin = thinAt(nx, ny);
        if (thin < 0.18) continue;
        const len = hypot2(ox, oy);
        const align = (ox * dx + oy * dy) / len;
        const score = align * 0.72 + energyAt(nx, ny) * 0.2 + thin * 0.08;
        if (align > 0.12 && score > bestScore) {
          bestScore = score;
          bestX = nx;
          bestY = ny;
        }
        if (align > -0.35 && thin + energyAt(nx, ny) > fallbackScore) {
          fallbackScore = thin + energyAt(nx, ny);
          fallbackX = nx;
          fallbackY = ny;
        }
      }
      const nx = bestX >= 0 ? bestX : fallbackX;
      const ny = bestY >= 0 ? bestY : fallbackY;
      if (nx < 0) break;
      visited[ny * width + nx] = 1;
      const [tx, ty] = tangentAt(nx, ny);
      const forward = tx * dx + ty * dy >= 0;
      dx = dx * 0.45 + (forward ? tx : -tx) * 0.55;
      dy = dy * 0.45 + (forward ? ty : -ty) * 0.55;
      const inv = 1 / hypot2(dx, dy);
      dx *= inv;
      dy *= inv;
      chain.push([nx, ny, energyAt(nx, ny)]);
      x = nx;
      y = ny;
    }
    return chain;
  }

  const strokes: StrokePolyline[] = [];

  for (const [sx, sy] of seeds) {
    const si = sy * width + sx;
    if (visited[si]) continue;
    visited[si] = 1;
    let [tx, ty] = tangentAt(sx, sy);
    const tlen = hypot2(tx, ty);
    tx /= tlen;
    ty /= tlen;
    const back = grow(sx, sy, -tx, -ty);
    const fwd = grow(sx, sy, tx, ty);
    const raw: StrokePoint[] = [];
    for (let i = back.length - 1; i >= 0; i--) {
      const [x, y, energy] = back[i];
      raw.push({ x, y, width: energy });
    }
    raw.push({ x: sx, y: sy, width: energyAt(sx, sy) });
    for (const [x, y, energy] of fwd) raw.push({ x, y, width: energy });
    if (raw.length < minLength) continue;

    const simplified = simplifyPolyline(raw, 0.9);
    const resampled = resamplePolyline(simplified, 2);
    const smoothed = smoothPolyline(resampled, 2);
    if (smoothed.length < 2) continue;

    const first = smoothed[0];
    const last = smoothed[smoothed.length - 1];
    const closed = smoothed.length > 18
      && Math.hypot(first.x - last.x, first.y - last.y) < 4;
    applyWidths(smoothed, closed, lineWidth, Math.max(width, height));
    strokes.push({ points: smoothed, closed });
  }

  return strokes;
}

function drawRibbon(ctx: CanvasRenderingContext2D, stroke: StrokePolyline) {
  const pts = stroke.points;
  if (pts.length < 2) return;
  const left: Array<[number, number]> = [];
  const right: Array<[number, number]> = [];
  for (let i = 0; i < pts.length; i++) {
    const prev = pts[Math.max(0, i - 1)];
    const next = pts[Math.min(pts.length - 1, i + 1)];
    let tx = next.x - prev.x;
    let ty = next.y - prev.y;
    const inv = 1 / hypot2(tx, ty);
    tx *= inv;
    ty *= inv;
    const hx = -ty * pts[i].width * 0.5;
    const hy = tx * pts[i].width * 0.5;
    left.push([pts[i].x + hx, pts[i].y + hy]);
    right.push([pts[i].x - hx, pts[i].y - hy]);
  }
  ctx.beginPath();
  ctx.moveTo(left[0][0], left[0][1]);
  for (let i = 1; i < left.length; i++) ctx.lineTo(left[i][0], left[i][1]);
  for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i][0], right[i][1]);
  ctx.closePath();
  ctx.fill();
}

function fillCircle(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  cx: number,
  cy: number,
  radius: number,
) {
  const r = Math.max(0.5, radius);
  const r2 = r * r;
  const x0 = Math.max(0, Math.floor(cx - r));
  const x1 = Math.min(width - 1, Math.ceil(cx + r));
  const y0 = Math.max(0, Math.floor(cy - r));
  const y1 = Math.min(height - 1, Math.ceil(cy + r));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      if (dx * dx + dy * dy > r2) continue;
      const i = (y * width + x) * 4;
      data[i] = 17;
      data[i + 1] = 17;
      data[i + 2] = 17;
      data[i + 3] = 255;
    }
  }
}

export function rasterizeStrokes(
  strokes: StrokePolyline[],
  width: number,
  height: number,
): Uint8ClampedArray {
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#111111';
      for (const stroke of strokes) drawRibbon(ctx, stroke);
      return ctx.getImageData(0, 0, width, height).data;
    }
  }
  const data = new Uint8ClampedArray(width * height * 4);
  data.fill(255);
  for (const stroke of strokes) {
    const pts = stroke.points;
    if (pts.length === 0) continue;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) * 2));
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        fillCircle(
          data,
          width,
          height,
          a.x + (b.x - a.x) * t,
          a.y + (b.y - a.y) * t,
          (a.width + (b.width - a.width) * t) * 0.5,
        );
      }
    }
  }
  return data;
}

export function renderPublicationStrokes(
  pixels: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  options: PublicationStrokeOptions = {},
) {
  const strokes = traceRidges(pixels, width, height, options);
  return rasterizeStrokes(strokes, width, height);
}
