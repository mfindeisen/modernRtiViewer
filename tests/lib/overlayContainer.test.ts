import { afterEach, describe, expect, it } from 'vitest';
import { getOverlayContainer } from '@/lib/overlayContainer.js';

describe('getOverlayContainer', () => {
  afterEach(() => {
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      get: () => null,
    });
  });

  it('returns body when nothing is fullscreen', () => {
    expect(getOverlayContainer()).toBe('body');
  });

  it('returns the fullscreen element so overlays render above it', () => {
    const host = document.createElement('div');
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      get: () => host,
    });
    expect(getOverlayContainer()).toBe(host);
  });
});
