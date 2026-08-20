import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ViewerMeshMask from '@/components/ViewerMeshMask.vue';

function tinySource() {
  return {
    pixels: new Uint8Array([20, 20, 20, 255, 200, 200, 200, 255, 20, 20, 20, 255, 20, 20, 20, 255]),
    width: 2,
    height: 2,
  };
}

describe('ViewerMeshMask', () => {
  it('exposes zoom controls while masking', () => {
    const wrapper = mount(ViewerMeshMask, {
      props: {
        open: true,
        source: tinySource(),
      },
    });

    expect(wrapper.find('button[aria-label="Zoom in"]').exists()).toBe(true);
    expect(wrapper.find('button[aria-label="Zoom out"]').exists()).toBe(true);
    expect(wrapper.find('button[aria-label="Fit image"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Scroll to zoom');
  });

  it('starts zoomed out to fit', () => {
    const wrapper = mount(ViewerMeshMask, {
      props: {
        open: true,
        source: tinySource(),
      },
    });

    expect(wrapper.get('button[aria-label="Zoom out"]').attributes('disabled')).toBeDefined();
    expect(wrapper.get('button[aria-label="Fit image"]').text()).toMatch(/%$/);
  });
});
