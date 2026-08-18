import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_ANNOTATION_COLOR,
  hexToHsv,
  hsvToHex,
  isPresetAnnotationColor,
  loadAnnotationColor,
  saveAnnotationColor,
} from '@/lib/annotationColors.js';

describe('annotationColors', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('migrates the legacy viewer storage key', () => {
    localStorage.setItem('annotationColor', '#22c55e');
    expect(loadAnnotationColor()).toBe('#22c55e');
    expect(localStorage.getItem('rtiAnnotationColor')).toBe('#22c55e');
    expect(localStorage.getItem('annotationColor')).toBeNull();
  });

  it('stores normalized custom hex colors', () => {
    saveAnnotationColor('#123456');
    expect(loadAnnotationColor()).toBe('#123456');
    saveAnnotationColor('invalid');
    expect(loadAnnotationColor()).toBe(DEFAULT_ANNOTATION_COLOR);
  });

  it('round-trips primary HSV colors', () => {
    expect(hsvToHex(0, 1, 1)).toBe('#ff0000');
    expect(hsvToHex(120, 1, 1)).toBe('#00ff00');
    expect(hsvToHex(240, 1, 1)).toBe('#0000ff');
    expect(hexToHsv('#ff0000')).toEqual({ h: 0, s: 1, v: 1 });
    expect(isPresetAnnotationColor('#3b82f6')).toBe(true);
    expect(isPresetAnnotationColor('#123456')).toBe(false);
  });
});
