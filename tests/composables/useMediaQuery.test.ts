import { describe, it, expect, vi, afterEach } from 'vitest';
import { defineComponent } from 'vue';
import { mount } from '@vue/test-utils';
import { useMediaQuery } from '@/composables/useMediaQuery.js';

describe('useMediaQuery', () => {
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  function mockMatchMedia(matches: boolean) {
    const listeners = new Set<(event: MediaQueryListEvent) => void>();
    const mql = {
      matches,
      media: '',
      addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
        listeners.add(listener);
      },
      removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
        listeners.delete(listener);
      },
      dispatch(next: boolean) {
        mql.matches = next;
        listeners.forEach((listener) => listener({ matches: next } as MediaQueryListEvent));
      },
    };
    window.matchMedia = vi.fn(() => mql as unknown as MediaQueryList);
    return mql;
  }

  it('tracks matchMedia changes', async () => {
    const mql = mockMatchMedia(false);
    const Host = defineComponent({
      setup() {
        return { narrow: useMediaQuery('(max-width: 1023px)') };
      },
      template: '<span>{{ narrow }}</span>',
    });
    const wrapper = mount(Host);
    expect(wrapper.text()).toBe('false');

    mql.dispatch(true);
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toBe('true');
    wrapper.unmount();
  });
});
