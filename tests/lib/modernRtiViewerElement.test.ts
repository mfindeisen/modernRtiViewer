import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { nextTick } from 'vue';

const mountSpy = vi.fn();

vi.mock('@/components/RtiViewer.vue', () => ({
  default: {
    name: 'RtiViewer',
    props: ['url', 'shareUrl', 'annotationEnabled'],
    emits: ['annotation-create', 'rti-loaded', 'annotation-click'],
    mounted(this: { $emit: (event: string, payload?: unknown) => void }) {
      this.$emit('annotation-create', { id: 'a1' });
      this.$emit('rti-loaded', { type: 1 });
      this.$emit('annotation-click', { id: 'a1' });
    },
    render(this: { url: string; shareUrl: string; annotationEnabled: boolean }) {
      mountSpy({
        url: this.url,
        shareUrl: this.shareUrl,
        annotationEnabled: this.annotationEnabled,
      });
      return null;
    },
  },
}));

import {
  ModernRtiViewerElement,
  registerModernRtiViewerElement,
} from '@/lib/modernRtiViewerElement.js';

describe('ModernRtiViewerElement', () => {
  let host: ModernRtiViewerElement;

  beforeEach(() => {
    mountSpy.mockClear();
    registerModernRtiViewerElement();
    host = document.createElement('modern-rti-viewer') as ModernRtiViewerElement;
    host.setAttribute('url', '/demo');
    host.setAttribute('share-url', 'https://example.com/view');
  });

  afterEach(() => {
    host?.remove();
  });

  it('mounts the viewer with url and share-url attributes', () => {
    document.body.appendChild(host);

    expect(host.mountPoint).toBeTruthy();
    expect(host.querySelector('div')).toBe(host.mountPoint);
    expect(mountSpy).toHaveBeenCalledWith(expect.objectContaining({
      url: '/demo',
      shareUrl: 'https://example.com/view',
      annotationEnabled: false,
    }));
  });

  it('updates url and share-url when attributes change', async () => {
    document.body.appendChild(host);
    mountSpy.mockClear();

    host.setAttribute('url', '/other-dataset');
    host.setAttribute('share-url', 'https://example.com/other');
    await nextTick();

    expect(mountSpy).toHaveBeenCalledWith(expect.objectContaining({
      url: '/other-dataset',
      shareUrl: 'https://example.com/other',
    }));
  });

  it('updates annotation-enabled through attributeChangedCallback', async () => {
    document.body.appendChild(host);
    mountSpy.mockClear();

    host.setAttribute('annotation-enabled', 'true');
    await nextTick();

    expect(mountSpy).toHaveBeenCalledWith(expect.objectContaining({
      annotationEnabled: true,
    }));
  });

  it('re-dispatches viewer events on the host element', () => {
    const created = vi.fn();
    const loaded = vi.fn();
    const clicked = vi.fn();
    host.addEventListener('annotation-create', created);
    host.addEventListener('rti-loaded', loaded);
    host.addEventListener('annotation-click', clicked);

    document.body.appendChild(host);

    expect(created).toHaveBeenCalledWith(expect.objectContaining({
      detail: { id: 'a1' },
      bubbles: true,
    }));
    expect(loaded).toHaveBeenCalledWith(expect.objectContaining({
      detail: { type: 1 },
    }));
    expect(clicked).toHaveBeenCalledWith(expect.objectContaining({
      detail: { id: 'a1' },
    }));
  });

  it('unmounts the vue app on disconnect', () => {
    document.body.appendChild(host);
    const unmountSpy = vi.spyOn(host.app!, 'unmount');

    host.remove();

    expect(unmountSpy).toHaveBeenCalled();
    expect(host.app).toBeNull();
  });
});
