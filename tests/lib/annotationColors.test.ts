import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_ANNOTATION_COLOR,
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
});
