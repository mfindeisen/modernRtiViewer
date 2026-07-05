/** URL hash helpers for sharing and restoring RTI viewer state. */

import type { ColorGain, ParsedViewHash, RtiCameraState, Vec3 } from '../types/rti.js';

export function isWhiteBalanceActive(colorGain: ColorGain | null | undefined, threshold = 0.01) {
  if (!colorGain) return false;
  return Math.abs(colorGain.r - 1) > threshold
    || Math.abs(colorGain.g - 1) > threshold
    || Math.abs(colorGain.b - 1) > threshold;
}

/**
 * Parse viewer state from a location hash (with or without leading #).
 */
export function parseViewHash(hash: string): ParsedViewHash {
  const raw = (hash || '').replace(/^#/, '').trim();
  if (!raw) return {};

  const params = new URLSearchParams(raw);
  const result: ParsedViewHash = {};

  if (params.has('lx') && params.has('ly')) {
    const lx = parseFloat(params.get('lx')!);
    const ly = parseFloat(params.get('ly')!);
    if (!Number.isNaN(lx) && !Number.isNaN(ly)) {
      const r2 = lx * lx + ly * ly;
      const lz = r2 <= 1.0 ? Math.sqrt(1.0 - r2) : 0;
      result.lightDir = { x: lx, y: ly, z: lz };
    }
  }

  if (params.has('mode')) {
    const mode = parseInt(params.get('mode')!, 10);
    if (!Number.isNaN(mode)) result.renderMode = mode;
  }

  if (params.has('wbR') && params.has('wbG') && params.has('wbB')) {
    const wbR = parseFloat(params.get('wbR')!);
    const wbG = parseFloat(params.get('wbG')!);
    const wbB = parseFloat(params.get('wbB')!);
    if (!Number.isNaN(wbR) && !Number.isNaN(wbG) && !Number.isNaN(wbB)) {
      result.colorGain = { r: wbR, g: wbG, b: wbB };
    }
  }

  if (params.has('cx') && params.has('cy') && params.has('z')) {
    const cx = parseFloat(params.get('cx')!);
    const cy = parseFloat(params.get('cy')!);
    const z = parseFloat(params.get('z')!);
    if (!Number.isNaN(cx) && !Number.isNaN(cy) && !Number.isNaN(z)) {
      result.camera = { cx, cy, z };
    }
  }

  return result;
}

export interface BuildShareUrlState {
  camera: RtiCameraState & { zoom: number };
  lightDir: Vec3;
  renderMode: number;
  colorGain: ColorGain;
}

/**
 * Build a shareable URL with hash-encoded viewer state.
 */
export function buildShareUrl(baseUrl: string, { camera, lightDir, renderMode, colorGain }: BuildShareUrlState) {
  const params = new URLSearchParams();
  params.set('cx', camera.cx.toFixed(4));
  params.set('cy', camera.cy.toFixed(4));
  params.set('z', camera.zoom.toFixed(4));
  params.set('lx', lightDir.x.toFixed(4));
  params.set('ly', lightDir.y.toFixed(4));
  params.set('mode', String(renderMode));

  if (isWhiteBalanceActive(colorGain)) {
    params.set('wbR', colorGain.r.toFixed(4));
    params.set('wbG', colorGain.g.toFixed(4));
    params.set('wbB', colorGain.b.toFixed(4));
  }

  return `${baseUrl}#${params.toString()}`;
}
