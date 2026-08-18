/** In-place radix-2 Cooley–Tukey FFT. `n` must be a power of two. */
export function fftRadix2(re: Float64Array, im: Float64Array, inverse = false) {
  const n = re.length;
  if (n !== im.length || n < 1 || (n & (n - 1)) !== 0) {
    throw new Error('FFT length must be a power of two');
  }

  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const tr = re[i];
      re[i] = re[j];
      re[j] = tr;
      const ti = im[i];
      im[i] = im[j];
      im[j] = ti;
    }
  }

  for (let len = 2; len <= n; len <<= 1) {
    const ang = ((inverse ? 2 : -2) * Math.PI) / len;
    const wlenRe = Math.cos(ang);
    const wlenIm = Math.sin(ang);
    const half = len >> 1;
    for (let i = 0; i < n; i += len) {
      let wRe = 1;
      let wIm = 0;
      for (let j = 0; j < half; j++) {
        const uRe = re[i + j];
        const uIm = im[i + j];
        const vRe = re[i + j + half] * wRe - im[i + j + half] * wIm;
        const vIm = re[i + j + half] * wIm + im[i + j + half] * wRe;
        re[i + j] = uRe + vRe;
        im[i + j] = uIm + vIm;
        re[i + j + half] = uRe - vRe;
        im[i + j + half] = uIm - vIm;
        const nextRe = wRe * wlenRe - wIm * wlenIm;
        wIm = wRe * wlenIm + wIm * wlenRe;
        wRe = nextRe;
      }
    }
  }

  if (inverse) {
    const inv = 1 / n;
    for (let i = 0; i < n; i++) {
      re[i] *= inv;
      im[i] *= inv;
    }
  }
}

export function nextPow2(n: number) {
  if (n <= 1) return 1;
  return 2 ** Math.ceil(Math.log2(n));
}

/** Row-major 2D FFT. Width and height must be powers of two. */
export function fft2d(
  re: Float64Array,
  im: Float64Array,
  width: number,
  height: number,
  inverse = false,
) {
  if (re.length !== width * height || im.length !== width * height) {
    throw new Error('FFT buffer size must match width * height');
  }

  const rowRe = new Float64Array(width);
  const rowIm = new Float64Array(width);
  for (let y = 0; y < height; y++) {
    const off = y * width;
    rowRe.set(re.subarray(off, off + width));
    rowIm.set(im.subarray(off, off + width));
    fftRadix2(rowRe, rowIm, inverse);
    re.set(rowRe, off);
    im.set(rowIm, off);
  }

  const colRe = new Float64Array(height);
  const colIm = new Float64Array(height);
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      const i = y * width + x;
      colRe[y] = re[i];
      colIm[y] = im[i];
    }
    fftRadix2(colRe, colIm, inverse);
    for (let y = 0; y < height; y++) {
      const i = y * width + x;
      re[i] = colRe[y];
      im[i] = colIm[y];
    }
  }
}
