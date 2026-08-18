import { describe, it, expect } from 'vitest';
import { translateGeometry, applyAnnotationEdit, hitTestOverlayShape } from '@/lib/annotationEdit.js';
import { imagePixelDistance, formatPixelDistance, isMeaningfulMeasure, pixelsPerUnitFromKnown, formatCalibratedDistance, parseScaleCalibration } from '@/lib/measureDistance.js';
import { clampExportSize, imageNormToExportXY, imageNormExportProjectors, exportAnnotationPixelScale } from '@/lib/exportView.js';
import { rtiTypeLabel, supportsMeshExport, supportsLineDrawing } from '@/lib/rtiEnhancements.js';
import { buildOverlayShapes } from '@/lib/annotationOverlay.js';
import type { Annotation } from '@/types/rti.js';

describe('annotationEdit', () => {
  it('translates point geometry', () => {
    expect(translateGeometry('point', { position: [0.2, 0.3] }, 0.1, -0.05).position).toEqual(
      expect.arrayContaining([expect.closeTo(0.3, 10), expect.closeTo(0.25, 10)]),
    );
  });

  it('resizes a rectangle from the SE handle', () => {
    const next = applyAnnotationEdit(
      'rectangle',
      { x1: 0.1, y1: 0.1, x2: 0.4, y2: 0.4 },
      'se',
      { x: 0.4, y: 0.4 },
      { x: 0.6, y: 0.5 },
    );
    expect(next).toEqual({ x1: 0.1, y1: 0.1, x2: 0.6, y2: 0.5 });
  });

  it('hits a point near its center', () => {
    expect(hitTestOverlayShape({
      kind: 'point',
      key: 1,
      cx: 10,
      cy: 10,
      r: 6,
      color: '#fff',
      draft: false,
      strokeWidth: 2,
    }, 12, 11)).toBe('move');
  });
});

describe('measureDistance', () => {
  it('converts normalized points to image pixels', () => {
    expect(imagePixelDistance({ x: 0, y: 0 }, { x: 1, y: 0 }, 1000, 500)).toBe(1000);
    expect(formatPixelDistance(12.34)).toBe('12.3 px');
    expect(isMeaningfulMeasure(0)).toBe(false);
    expect(isMeaningfulMeasure(0.4)).toBe(false);
    expect(isMeaningfulMeasure(1)).toBe(true);
    expect(pixelsPerUnitFromKnown(200, 10)).toBe(20);
    expect(formatCalibratedDistance(200, { pixelsPerUnit: 20, unit: 'mm' })).toBe('10 mm');
    expect(parseScaleCalibration({ pixelsPerUnit: 12.5, unit: 'cm' })).toEqual({
      pixelsPerUnit: 12.5,
      unit: 'cm',
    });
    expect(parseScaleCalibration({ pixelsPerUnit: 0, unit: 'mm' })).toBeNull();
  });
});

describe('exportView', () => {
  it('caps the long side of an export', () => {
    expect(clampExportSize(8192, 4096, 4096)).toEqual({
      width: 4096,
      height: 2048,
      scale: 0.5,
    });
  });

  it('maps image-normalized Y so the top of the image is y=0 in the PNG', () => {
    expect(imageNormToExportXY(0, 0, 200, 100)).toEqual({ x: 0, y: 100 });
    expect(imageNormToExportXY(0, 1, 200, 100)).toEqual({ x: 0, y: 0 });
    expect(imageNormToExportXY(0.5, 0.5, 200, 100)).toEqual({ x: 100, y: 50 });
  });

  it('projects full-res annotations with stroke width and labels', () => {
    const project = imageNormExportProjectors(1000, 500);
    const shapes = buildOverlayShapes(
      [{
        id: '1',
        type: 'circle',
        geometry: { center: [0.25, 0.8], radius: 0.1 },
        color: '#ef4444',
        strokeWidth: 8,
        label: 'scratch',
      }] as Annotation[],
      null,
      '#f59e0b',
      project,
    );
    expect(shapes[0]).toMatchObject({
      kind: 'circle',
      cx: 250,
      r: 100,
      strokeWidth: 8,
      label: 'scratch',
    });
    expect(shapes[0]).toHaveProperty('cy');
    expect((shapes[0] as { cy: number }).cy).toBeCloseTo(100);
    expect(exportAnnotationPixelScale(1600, 800)).toBe(1);
    expect(exportAnnotationPixelScale(4000, 2000)).toBe(2.5);
  });
});

describe('rtiTypeLabel', () => {
  it('names known RTI types', () => {
    expect(rtiTypeLabel(1)).toBe('HSH');
    expect(rtiTypeLabel(5)).toBe('Neural RTI');
  });
});

describe('supportsLineDrawing', () => {
  it('needs photometric normals', () => {
    expect(supportsLineDrawing(1)).toBe(true);
    expect(supportsLineDrawing(4)).toBe(false);
    expect(supportsLineDrawing(5)).toBe(true);
  });
});

describe('supportsMeshExport', () => {
  it('is available for coefficient RTI, not plain images', () => {
    expect(supportsMeshExport(1)).toBe(true);
    expect(supportsMeshExport(2)).toBe(true);
    expect(supportsMeshExport(3)).toBe(true);
    expect(supportsMeshExport(4)).toBe(false);
    expect(supportsMeshExport(5)).toBe(true);
    expect(supportsMeshExport(null)).toBe(false);
  });
});
