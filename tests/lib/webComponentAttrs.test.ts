import { describe, it, expect } from 'vitest';
import { parseAnnotationEnabledAttr } from '@/lib/webComponentAttrs.js';

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
