import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ViewerSidebar from '@/components/ViewerSidebar.vue';

const defaultProps = {
  currentMode: 'pan',
  renderMode: 0,
  annotationEnabled: false,
  annotationShape: 'circle',
  annotationColor: '#f59e0b',
  shapeMenuOpen: false,
  activeShapeHint: 'Drag to draw a circle',
  rtiType: undefined as number | undefined,
  isFullscreen: false,
  infoOpen: false,
};

describe('ViewerSidebar', () => {
  it('emits set-mode when pan button is clicked', async () => {
    const wrapper = mount(ViewerSidebar, { props: defaultProps });
    const buttons = wrapper.findAll('button');
    await buttons[0].trigger('click');
    expect(wrapper.emitted('set-mode')?.[0]).toEqual(['pan']);
  });

  it('emits copy-link from footer actions', async () => {
    const wrapper = mount(ViewerSidebar, { props: defaultProps });
    const buttons = wrapper.findAll('button');
    const copyButton = buttons[buttons.length - 2];
    await copyButton.trigger('click');
    expect(wrapper.emitted('copy-link')).toHaveLength(1);
  });

  it('shows latent render mode for neural RTI type 5', () => {
    const wrapper = mount(ViewerSidebar, {
      props: { ...defaultProps, rtiType: 5 },
    });
    const labels = wrapper.findAll('button').map((button) => button.attributes('aria-label'));
    expect(labels).toContain('Latent Map');
  });
});
