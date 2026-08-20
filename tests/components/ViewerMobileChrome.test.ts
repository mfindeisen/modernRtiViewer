import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ViewerHud from '@/components/ViewerHud.vue';
import ViewerToolSheet from '@/components/ViewerToolSheet.vue';
import ViewerWhiteBalancePanel from '@/components/ViewerWhiteBalancePanel.vue';
import ViewerLightAnimControls from '@/components/ViewerLightAnimControls.vue';

const gain = { r: 0.84, g: 1.03, b: 1.52 };

describe('ViewerHud', () => {
  it('hides readout values and shortcut help in compact mode', () => {
    const wrapper = mount(ViewerHud, {
      props: {
        visible: true,
        compact: true,
        zoomPercent: 140,
        lightX: '0.10',
        lightY: '-0.20',
        probeRgb: '010 020 030',
      },
    });

    expect(wrapper.text()).not.toContain('Zoom');
    expect(wrapper.text()).not.toContain('RGB');
    expect(wrapper.text()).not.toContain('Fit');
    expect(wrapper.find('button[aria-label="Keyboard shortcuts"]').exists()).toBe(false);
    expect(wrapper.get('button[aria-label="Fit image to view"]').attributes('aria-label')).toBe('Fit image to view');
    expect(wrapper.get('button[aria-label="Reset light to front"]').attributes('aria-label')).toBe('Reset light to front');
  });
});

describe('ViewerToolSheet', () => {
  it('collapses the body on narrow viewports', async () => {
    const wrapper = mount(ViewerToolSheet, {
      props: {
        open: true,
        title: 'White Balance',
        narrow: true,
        expanded: true,
        summary: '0.84  1.03  1.52',
      },
      slots: { default: '<p>sliders</p>' },
    });

    expect(wrapper.text()).toContain('sliders');
    await wrapper.get('button[aria-label="Collapse panel"]').trigger('click');
    expect(wrapper.emitted('update:expanded')?.[0]).toEqual([false]);
  });

  it('shows the summary when collapsed', () => {
    const wrapper = mount(ViewerToolSheet, {
      props: {
        open: true,
        title: 'White Balance',
        narrow: true,
        expanded: false,
        summary: '0.84  1.03  1.52',
      },
      slots: { default: '<p>sliders</p>' },
    });

    expect(wrapper.text()).toContain('0.84  1.03  1.52');
    expect(wrapper.find('[data-testid="tool-sheet-body"]').exists()).toBe(false);
  });
});

describe('ViewerWhiteBalancePanel', () => {
  it('does not stay open on mobile after leaving white-balance mode', () => {
    const wrapper = mount(ViewerWhiteBalancePanel, {
      props: {
        currentMode: 'pan',
        whiteBalanceActive: true,
        colorGain: gain,
        gainMin: 0.2,
        gainMax: 3,
        narrow: true,
      },
    });

    expect(wrapper.text()).not.toContain('White Balance');
  });

  it('opens as a sheet in white-balance mode on mobile', () => {
    const wrapper = mount(ViewerWhiteBalancePanel, {
      props: {
        currentMode: 'whitebalance',
        whiteBalanceActive: true,
        colorGain: gain,
        gainMin: 0.2,
        gainMax: 3,
        narrow: true,
      },
    });

    expect(wrapper.text()).toContain('White Balance');
    expect(wrapper.text()).toContain('Tap a white or gray patch');
    expect(wrapper.text()).not.toContain('Click a white or gray patch on the color chart');
  });
});

describe('ViewerLightAnimControls', () => {
  it('hides the speed slider in compact mode until playing', async () => {
    const wrapper = mount(ViewerLightAnimControls, {
      props: { compact: true, playing: false, mode: 'orbit', speed: 1 },
    });
    expect(wrapper.find('input[aria-label="Light animation speed"]').exists()).toBe(false);

    await wrapper.setProps({ playing: true });
    expect(wrapper.find('input[aria-label="Light animation speed"]').exists()).toBe(true);
  });
});
