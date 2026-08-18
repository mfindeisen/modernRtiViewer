export interface NormPoint {
  x: number;
  y: number;
}

export type MeasureUnit = 'mm' | 'cm' | 'µm' | 'in';

export interface ScaleCalibration {
  pixelsPerUnit: number;
  unit: MeasureUnit;
  knownLength?: number;
  pixelLength?: number;
}

export const MEASURE_UNITS: { id: MeasureUnit; label: string }[] = [
  { id: 'mm', label: 'mm' },
  { id: 'cm', label: 'cm' },
  { id: 'µm', label: 'µm' },
  { id: 'in', label: 'in' },
];

export function imagePixelDistance(
  a: NormPoint,
  b: NormPoint,
  imgWidth: number,
  imgHeight: number,
) {
  return Math.hypot((b.x - a.x) * imgWidth, (b.y - a.y) * imgHeight);
}

export function formatPixelDistance(px: number) {
  if (!Number.isFinite(px)) return '—';
  if (px >= 100) return `${Math.round(px)} px`;
  if (px >= 10) return `${px.toFixed(1)} px`;
  return `${px.toFixed(2)} px`;
}

export function isMeaningfulMeasure(px: number, minPx = 1) {
  return Number.isFinite(px) && px >= minPx;
}

export function parseMeasureUnit(value: unknown): MeasureUnit | null {
  if (value === 'mm' || value === 'cm' || value === 'µm' || value === 'in') return value;
  if (value === 'um' || value === 'micron' || value === 'microns') return 'µm';
  return null;
}

export function parseScaleCalibration(value: unknown): ScaleCalibration | null {
  if (!value || typeof value !== 'object') return null;
  const rec = value as Record<string, unknown>;
  const pixelsPerUnit = Number(rec.pixelsPerUnit);
  const unit = parseMeasureUnit(rec.unit);
  if (!Number.isFinite(pixelsPerUnit) || pixelsPerUnit <= 0 || !unit) return null;
  const knownLength = Number(rec.knownLength);
  const pixelLength = Number(rec.pixelLength);
  const next: ScaleCalibration = { pixelsPerUnit, unit };
  if (Number.isFinite(knownLength) && knownLength > 0) next.knownLength = knownLength;
  if (Number.isFinite(pixelLength) && pixelLength > 0) next.pixelLength = pixelLength;
  return next;
}

export function pixelsPerUnitFromKnown(pixelLength: number, knownLength: number) {
  if (!(pixelLength > 0) || !(knownLength > 0)) return null;
  return pixelLength / knownLength;
}

export function formatRealNumber(value: number) {
  if (!Number.isFinite(value)) return '—';
  if (Math.abs(value - Math.round(value)) < 1e-6) return String(Math.round(value));
  const abs = Math.abs(value);
  if (abs >= 10) return value.toFixed(1);
  if (abs >= 1) return value.toFixed(2);
  return value.toFixed(3);
}

export function formatCalibratedDistance(px: number, calibration: ScaleCalibration | null) {
  if (!calibration) return formatPixelDistance(px);
  return `${formatRealNumber(px / calibration.pixelsPerUnit)} ${calibration.unit}`;
}
