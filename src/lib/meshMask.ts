/** Masks are stored in display order (origin top-left), matching a 2D canvas. */

export function flipMaskY(mask: Uint8Array, width: number, height: number) {
  if (mask.length !== width * height) {
    throw new Error('Mask size does not match image');
  }
  const out = new Uint8Array(mask.length);
  for (let y = 0; y < height; y++) {
    const src = y * width;
    const dst = (height - 1 - y) * width;
    out.set(mask.subarray(src, src + width), dst);
  }
  return out;
}

export function luminanceAt(
  pixels: Uint8Array | Uint8ClampedArray,
  index: number,
) {
  const o = index * 4;
  return 0.2126 * pixels[o] + 0.7152 * pixels[o + 1] + 0.0722 * pixels[o + 2];
}

function glIndex(x: number, y: number, width: number, height: number) {
  return (height - 1 - y) * width + x;
}

function sampleCornerStats(
  pixels: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
) {
  const inset = Math.max(2, Math.min(8, Math.floor(Math.min(width, height) / 16)));
  let lumSum = 0;
  let lumSq = 0;
  let rSum = 0;
  let gSum = 0;
  let bSum = 0;
  let n = 0;
  const origins = [
    [0, 0],
    [width - inset, 0],
    [0, height - inset],
    [width - inset, height - inset],
  ];
  for (const [ox, oy] of origins) {
    for (let y = oy; y < oy + inset; y++) {
      for (let x = ox; x < ox + inset; x++) {
        const i = glIndex(x, y, width, height);
        const lum = luminanceAt(pixels, i);
        lumSum += lum;
        lumSq += lum * lum;
        rSum += pixels[i * 4];
        gSum += pixels[i * 4 + 1];
        bSum += pixels[i * 4 + 2];
        n++;
      }
    }
  }
  const mean = lumSum / n;
  const variance = Math.max(0, lumSq / n - mean * mean);
  return {
    mean,
    std: Math.sqrt(variance),
    r: rSum / n,
    g: gSum / n,
    b: bSum / n,
  };
}

function isBackgroundPixel(
  pixels: Uint8Array | Uint8ClampedArray,
  index: number,
  stats: ReturnType<typeof sampleCornerStats>,
) {
  const lum = luminanceAt(pixels, index);
  const o = index * 4;
  if (stats.mean < 42) {
    const threshold = Math.max(24, stats.mean + 2.4 * stats.std + 10);
    return lum <= threshold;
  }
  const dr = Math.abs(pixels[o] - stats.r);
  const dg = Math.abs(pixels[o + 1] - stats.g);
  const db = Math.abs(pixels[o + 2] - stats.b);
  return Math.max(dr, dg, db) < 32 && Math.abs(lum - stats.mean) < 28;
}

function floodBackground(
  pixels: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  stats: ReturnType<typeof sampleCornerStats>,
) {
  const count = width * height;
  const visited = new Uint8Array(count);
  const queue = new Int32Array(count);
  let head = 0;
  let tail = 0;

  const enqueueDisplay = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const gl = glIndex(x, y, width, height);
    if (visited[gl] || !isBackgroundPixel(pixels, gl, stats)) return;
    visited[gl] = 1;
    queue[tail++] = gl;
  };

  for (let x = 0; x < width; x++) {
    enqueueDisplay(x, 0);
    enqueueDisplay(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    enqueueDisplay(0, y);
    enqueueDisplay(width - 1, y);
  }

  while (head < tail) {
    const i = queue[head++];
    const glY = Math.floor(i / width);
    const x = i - glY * width;
    const y = height - 1 - glY;
    enqueueDisplay(x - 1, y);
    enqueueDisplay(x + 1, y);
    enqueueDisplay(x, y - 1);
    enqueueDisplay(x, y + 1);
  }

  return visited;
}

function keepLargestComponent(foregroundGl: Uint8Array, width: number, height: number) {
  const count = width * height;
  const seen = new Uint8Array(count);
  const best = new Uint8Array(count);
  const queue = new Int32Array(count);
  let bestSize = 0;

  for (let start = 0; start < count; start++) {
    if (!foregroundGl[start] || seen[start]) continue;
    let head = 0;
    let tail = 0;
    queue[tail++] = start;
    seen[start] = 1;
    const component: number[] = [start];
    while (head < tail) {
      const i = queue[head++];
      const glY = Math.floor(i / width);
      const x = i - glY * width;
      const neighbors = [i - 1, i + 1, i - width, i + width];
      const valid = [
        x > 0,
        x < width - 1,
        glY > 0,
        glY < height - 1,
      ];
      for (let n = 0; n < 4; n++) {
        if (!valid[n]) continue;
        const j = neighbors[n];
        if (!foregroundGl[j] || seen[j]) continue;
        seen[j] = 1;
        queue[tail++] = j;
        component.push(j);
      }
    }
    if (component.length > bestSize) {
      bestSize = component.length;
      best.fill(0);
      for (const i of component) best[i] = 1;
    }
  }

  return { mask: best, size: bestSize };
}

function dilateMaskGl(mask: Uint8Array, width: number, height: number, radius: number) {
  if (radius <= 0) return mask;
  let current = mask;
  for (let step = 0; step < radius; step++) {
    const next = new Uint8Array(current);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        if (current[i]) continue;
        const left = x > 0 && current[i - 1];
        const right = x < width - 1 && current[i + 1];
        const up = y > 0 && current[i - width];
        const down = y < height - 1 && current[i + width];
        if (left || right || up || down) next[i] = 1;
      }
    }
    current = next;
  }
  return current;
}

/**
 * Guess the object as the largest connected region that is not the
 * table/backdrop, using a flood from the image border.
 * Returns a display-order mask (1 = keep).
 */
export function guessForegroundMask(
  pixels: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
) {
  const stats = sampleCornerStats(pixels, width, height);
  const background = floodBackground(pixels, width, height, stats);
  const foreground = new Uint8Array(width * height);
  let fgCount = 0;
  for (let i = 0; i < foreground.length; i++) {
    if (!background[i]) {
      foreground[i] = 1;
      fgCount++;
    }
  }

  const minKeep = Math.max(32, Math.floor(width * height * 0.002));
  let kept = foreground;
  if (fgCount >= minKeep) {
    const largest = keepLargestComponent(foreground, width, height);
    if (largest.size >= minKeep) kept = largest.mask;
  }

  const dilated = dilateMaskGl(kept, width, height, 2);
  return flipMaskY(dilated, width, height);
}

export function fillMask(width: number, height: number, value: 0 | 1) {
  return new Uint8Array(width * height).fill(value);
}

export function invertMask(mask: Uint8Array) {
  const out = new Uint8Array(mask.length);
  for (let i = 0; i < mask.length; i++) out[i] = mask[i] ? 0 : 1;
  return out;
}

export function maskCoverage(mask: Uint8Array) {
  let n = 0;
  for (let i = 0; i < mask.length; i++) if (mask[i]) n++;
  return n;
}

export function stampDisc(
  mask: Uint8Array,
  width: number,
  height: number,
  cx: number,
  cy: number,
  radius: number,
  value: 0 | 1,
) {
  const r = Math.max(1, Math.round(radius));
  const r2 = r * r;
  const minX = Math.max(0, Math.floor(cx - r));
  const maxX = Math.min(width - 1, Math.ceil(cx + r));
  const minY = Math.max(0, Math.floor(cy - r));
  const maxY = Math.min(height - 1, Math.ceil(cy + r));
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy > r2) continue;
      mask[y * width + x] = value;
    }
  }
}

export function resizeMask(
  mask: Uint8Array,
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number,
) {
  if (mask.length !== srcW * srcH) {
    throw new Error('Mask size does not match source dimensions');
  }
  if (srcW === dstW && srcH === dstH) return mask.slice();
  const out = new Uint8Array(dstW * dstH);
  for (let y = 0; y < dstH; y++) {
    const sy = Math.min(srcH - 1, Math.floor(((y + 0.5) * srcH) / dstH));
    for (let x = 0; x < dstW; x++) {
      const sx = Math.min(srcW - 1, Math.floor(((x + 0.5) * srcW) / dstW));
      out[y * dstW + x] = mask[sy * srcW + sx];
    }
  }
  return out;
}

export function glPixelsToDisplayImageData(
  pixels: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
) {
  const data = new Uint8ClampedArray(width * height * 4);
  const row = width * 4;
  for (let y = 0; y < height; y++) {
    const src = (height - 1 - y) * row;
    data.set(pixels.subarray(src, src + row), y * row);
  }
  return new ImageData(data, width, height);
}
