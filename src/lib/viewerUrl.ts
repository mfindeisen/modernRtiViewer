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

  if (params.has('spec')) {
    const spec = parseFloat(params.get('spec')!);
    if (!Number.isNaN(spec)) result.specularExponent = spec;
  }

  if (params.has('si')) {
    const si = parseFloat(params.get('si')!);
    if (!Number.isNaN(si)) result.specularIntensity = si;
  }

  if (params.has('dg')) {
    const dg = parseFloat(params.get('dg')!);
    if (!Number.isNaN(dg)) result.diffuseGain = dg;
  }

  if (params.has('us')) {
    const us = parseFloat(params.get('us')!);
    if (!Number.isNaN(us)) result.unsharpAmount = us;
  }

  if (params.has('ex')) {
    const ex = parseFloat(params.get('ex')!);
    if (!Number.isNaN(ex)) result.exposure = ex;
  }

  if (params.has('lx2') && params.has('ly2')) {
    const lx2 = parseFloat(params.get('lx2')!);
    const ly2 = parseFloat(params.get('ly2')!);
    if (!Number.isNaN(lx2) && !Number.isNaN(ly2)) {
      const r2 = lx2 * lx2 + ly2 * ly2;
      result.lightDir2 = { x: lx2, y: ly2, z: r2 <= 1.0 ? Math.sqrt(1.0 - r2) : 0 };
    }
  }

  if (params.has('unlink')) {
    result.dualLinked = params.get('unlink') !== '1';
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
  lightDir2?: Vec3;
  renderMode: number;
  colorGain: ColorGain;
  specularExponent?: number;
  specularIntensity?: number;
  diffuseGain?: number;
  unsharpAmount?: number;
  exposure?: number;
  dualLinked?: boolean;
}

const DEFAULT_SHARE_SPECULAR = 10;
const DEFAULT_SHARE_SPECULAR_INTENSITY = 0.8;
const DEFAULT_SHARE_DIFFUSE_GAIN = 1;
const DEFAULT_SHARE_UNSHARP = 0;
const DEFAULT_SHARE_EXPOSURE = 1;

/**
 * Build a shareable URL with hash-encoded viewer state.
 */
export function buildShareUrl(baseUrl: string, {
  camera,
  lightDir,
  lightDir2,
  renderMode,
  colorGain,
  specularExponent,
  specularIntensity,
  diffuseGain,
  unsharpAmount,
  exposure,
  dualLinked,
}: BuildShareUrlState) {
  const params = new URLSearchParams();
  params.set('cx', camera.cx.toFixed(4));
  params.set('cy', camera.cy.toFixed(4));
  params.set('z', camera.zoom.toFixed(4));
  params.set('lx', lightDir.x.toFixed(4));
  params.set('ly', lightDir.y.toFixed(4));
  params.set('mode', String(renderMode));

  if (specularExponent !== undefined && Math.abs(specularExponent - DEFAULT_SHARE_SPECULAR) > 0.05) {
    params.set('spec', specularExponent.toFixed(1));
  }
  if (specularIntensity !== undefined && Math.abs(specularIntensity - DEFAULT_SHARE_SPECULAR_INTENSITY) > 0.01) {
    params.set('si', specularIntensity.toFixed(2));
  }
  if (diffuseGain !== undefined && Math.abs(diffuseGain - DEFAULT_SHARE_DIFFUSE_GAIN) > 0.01) {
    params.set('dg', diffuseGain.toFixed(2));
  }
  if (unsharpAmount !== undefined && Math.abs(unsharpAmount - DEFAULT_SHARE_UNSHARP) > 0.01) {
    params.set('us', unsharpAmount.toFixed(2));
  }
  if (exposure !== undefined && Math.abs(exposure - DEFAULT_SHARE_EXPOSURE) > 0.01) {
    params.set('ex', exposure.toFixed(2));
  }
  if (dualLinked === false && lightDir2) {
    params.set('unlink', '1');
    params.set('lx2', lightDir2.x.toFixed(4));
    params.set('ly2', lightDir2.y.toFixed(4));
  }

  if (isWhiteBalanceActive(colorGain)) {
    params.set('wbR', colorGain.r.toFixed(4));
    params.set('wbG', colorGain.g.toFixed(4));
    params.set('wbB', colorGain.b.toFixed(4));
  }

  return `${baseUrl}#${params.toString()}`;
}
