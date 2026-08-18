import { describe, it, expect } from 'vitest';
import { parseAnnotationEnabledAttr, parseFeaturesAttr } from '@/lib/webComponentAttrs.js';

describe('parseAnnotationEnabledAttr', () => {
  it('parses boolean attribute values', () => {
    expect(parseAnnotationEnabledAttr(true)).toBe(true);
    expect(parseAnnotationEnabledAttr(false)).toBe(false);
    expect(parseAnnotationEnabledAttr(null)).toBe(false);
    expect(parseAnnotationEnabledAttr(undefined)).toBe(false);
  });

  it('parses string attribute values from the DOM', () => {
    expect(parseAnnotationEnabledAttr('true')).toBe(true);
    expect(parseAnnotationEnabledAttr('')).toBe(true);
    expect(parseAnnotationEnabledAttr('false')).toBe(false);
    expect(parseAnnotationEnabledAttr('anything-else')).toBe(false);
  });
});

describe('parseFeaturesAttr', () => {
  it('parses a JSON features map', () => {
    expect(parseFeaturesAttr('{"meshPreview":false}')).toEqual({
      features: { meshPreview: false },
    });
  });

  it('returns undefined for a missing attribute', () => {
    expect(parseFeaturesAttr(null)).toBeUndefined();
    expect(parseFeaturesAttr('')).toBeUndefined();
  });
});

describe('parseAnnotationEnabledAttr', () => {
  it('parses boolean attribute values', () => {
    expect(parseAnnotationEnabledAttr(true)).toBe(true);
    expect(parseAnnotationEnabledAttr(false)).toBe(false);
    expect(parseAnnotationEnabledAttr(null)).toBe(false);
    expect(parseAnnotationEnabledAttr(undefined)).toBe(false);
  });

  it('parses string attribute values from the DOM', () => {
    expect(parseAnnotationEnabledAttr('true')).toBe(true);
    expect(parseAnnotationEnabledAttr('')).toBe(true);
    expect(parseAnnotationEnabledAttr('false')).toBe(false);
    expect(parseAnnotationEnabledAttr('anything-else')).toBe(false);
  });
});
