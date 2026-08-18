import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ViewerSidebar from '@/components/ViewerSidebar.vue';
import { DEFAULT_VIEWER_FEATURES } from '@/lib/viewerConfig.js';

const defaultProps = {
  currentMode: 'pan',
  renderMode: 0,
  annotationEnabled: false,
  annotationShape: 'circle',
  annotationColor: '#f59e0b',
  annotationStrokeWidth: 2,
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
    const copyButton = wrapper.get('button[aria-label="Copy Link"]');
    await copyButton.trigger('click');
    expect(wrapper.emitted('copy-link')).toHaveLength(1);
  });

  it('shows latent render mode for neural RTI type 5', () => {
    const wrapper = mount(ViewerSidebar, {
      props: { ...defaultProps, rtiType: 5 },
    });
    const labels = wrapper.findAll('button').map((button) => button.attributes('aria-label'));
    expect(labels).toContain('Latent Map');
    expect(labels).toContain('Line Drawing');
  });

  it('hides line drawing for plain image RTI', () => {
    const wrapper = mount(ViewerSidebar, {
      props: { ...defaultProps, rtiType: 4 },
    });
    const labels = wrapper.findAll('button').map((button) => button.attributes('aria-label'));
    expect(labels).not.toContain('Line Drawing');
  });

  it('hides line drawing when the feature is disabled', () => {
    const wrapper = mount(ViewerSidebar, {
      props: {
        ...defaultProps,
        rtiType: 1,
        features: { ...DEFAULT_VIEWER_FEATURES, lineDrawing: false },
      },
    });
    const labels = wrapper.findAll('button').map((button) => button.attributes('aria-label'));
    expect(labels).not.toContain('Line Drawing');
  });

  it('marks line drawing as experimental', () => {
    const wrapper = mount(ViewerSidebar, {
      props: { ...defaultProps, rtiType: 1 },
    });
    const tooltips = wrapper.findAllComponents({ name: 'SidebarTooltip' });
    const lineDrawing = tooltips.find((tooltip) => tooltip.props('title') === 'Line Drawing');
    expect(lineDrawing?.props('experimental')).toBe(true);
  });

  it('opens a custom color slider next to the presets', async () => {
    const wrapper = mount(ViewerSidebar, {
      props: {
        ...defaultProps,
        annotationEnabled: true,
        currentMode: 'annotate',
        shapeMenuOpen: true,
      },
    });
    await wrapper.get('button[aria-label="Custom color"]').trigger('click');
    const hue = wrapper.get('input[aria-label="Hue"]');
    await hue.setValue(0);
    expect(wrapper.emitted('select-annotation-color')?.[0]?.[0]).toMatch(/^#[0-9a-f]{6}$/);
  });
});
