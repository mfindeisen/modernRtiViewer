import { describe, it, expect } from 'vitest';
import {
  DEFAULT_EXPERIMENTAL_FEATURES,
  DEFAULT_VIEWER_FEATURES,
  parseViewerConfigInput,
  resolveViewerConfig,
  isFeatureEnabled,
  isFeatureExperimental,
} from '@/lib/viewerConfig.js';

describe('parseViewerConfigInput', () => {
  it('reads a partial features map', () => {
    expect(parseViewerConfigInput({ lineDrawing: false, meshPreview: false })).toEqual({
      features: { lineDrawing: false, meshPreview: false },
    });
  });

  it('reads a full config object and JSON string', () => {
    expect(parseViewerConfigInput({
      features: { export: false },
      experimental: ['lineDrawing'],
    })).toEqual({
      features: { export: false },
      experimental: ['lineDrawing'],
    });
    expect(parseViewerConfigInput('{"lineDrawing":false}')).toEqual({
      features: { lineDrawing: false },
    });
  });

  it('ignores unknown keys and invalid JSON', () => {
    expect(parseViewerConfigInput({ unknown: true, lineDrawing: true }).features).toEqual({
      lineDrawing: true,
    });
    expect(parseViewerConfigInput('{not json')).toEqual({});
    expect(parseViewerConfigInput(null)).toEqual({});
  });
});

describe('resolveViewerConfig', () => {
  it('enables bundled features and marks line drawing plus mesh as experimental', () => {
    const config = resolveViewerConfig();
    expect(config.features).toEqual(DEFAULT_VIEWER_FEATURES);
    expect(config.experimental).toEqual(DEFAULT_EXPERIMENTAL_FEATURES);
    expect(isFeatureEnabled(config, 'lineDrawing')).toBe(true);
    expect(isFeatureExperimental(config, 'lineDrawing')).toBe(true);
    expect(isFeatureExperimental(config, 'meshPreview')).toBe(true);
    expect(isFeatureExperimental(config, 'measure')).toBe(false);
  });

  it('overrides individual features without dropping experimental labels', () => {
    const config = resolveViewerConfig({ lineDrawing: false });
    expect(config.features.lineDrawing).toBe(false);
    expect(config.features.meshPreview).toBe(true);
    expect(config.experimental).toEqual(DEFAULT_EXPERIMENTAL_FEATURES);
  });

  it('replaces the experimental list when the override provides one', () => {
    const config = resolveViewerConfig({ experimental: [] });
    expect(config.experimental).toEqual([]);
    expect(isFeatureExperimental(config, 'lineDrawing')).toBe(false);
  });
});
