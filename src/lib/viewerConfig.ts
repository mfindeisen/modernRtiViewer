import bundledConfig from '../viewerConfig.json';

export const VIEWER_FEATURE_IDS = [
  'annotations',
  'whiteBalance',
  'measure',
  'enhancements',
  'dualLight',
  'lineDrawing',
  'latentMap',
  'lightOrbit',
  'export',
  'share',
  'meshPreview',
] as const;

export type ViewerFeatureId = (typeof VIEWER_FEATURE_IDS)[number];
export type ViewerFeatures = Record<ViewerFeatureId, boolean>;

export interface ViewerConfigInput {
  features?: Partial<ViewerFeatures> | Record<string, unknown>;
  experimental?: ViewerFeatureId[];
}

export interface ResolvedViewerConfig {
  features: ViewerFeatures;
  experimental: ViewerFeatureId[];
}

export const DEFAULT_VIEWER_FEATURES: ViewerFeatures = {
  annotations: true,
  whiteBalance: true,
  measure: true,
  enhancements: true,
  dualLight: true,
  lineDrawing: true,
  latentMap: true,
  lightOrbit: true,
  export: true,
  share: true,
  meshPreview: true,
};

export const DEFAULT_EXPERIMENTAL_FEATURES: ViewerFeatureId[] = ['lineDrawing', 'meshPreview'];

const FEATURE_ID_SET = new Set<string>(VIEWER_FEATURE_IDS);

export function isViewerFeatureId(value: string): value is ViewerFeatureId {
  return FEATURE_ID_SET.has(value);
}

function pickKnownFeatures(input: unknown): Partial<ViewerFeatures> {
  if (!input || typeof input !== 'object') return {};
  const next: Partial<ViewerFeatures> = {};
  for (const id of VIEWER_FEATURE_IDS) {
    if (id in input) {
      next[id] = Boolean((input as Record<string, unknown>)[id]);
    }
  }
  return next;
}

function pickExperimental(input: unknown): ViewerFeatureId[] | undefined {
  if (!Array.isArray(input)) return undefined;
  return input.filter((id): id is ViewerFeatureId => typeof id === 'string' && isViewerFeatureId(id));
}

function isFullConfig(input: unknown): input is ViewerConfigInput {
  return !!input && typeof input === 'object' && ('features' in input || 'experimental' in input);
}

/** Accepts a features map, a full config object, or a JSON string. */
export function parseViewerConfigInput(input: unknown): ViewerConfigInput {
  if (input == null || input === '') return {};
  let value = input;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return {};
    }
  }
  if (!value || typeof value !== 'object') return {};
  if (isFullConfig(value)) {
    return {
      features: pickKnownFeatures(value.features),
      experimental: pickExperimental(value.experimental),
    };
  }
  return { features: pickKnownFeatures(value) };
}

export function resolveViewerConfig(override?: unknown): ResolvedViewerConfig {
  const fromFile = parseViewerConfigInput(bundledConfig);
  const fromOverride = parseViewerConfigInput(override);
  return {
    features: {
      ...DEFAULT_VIEWER_FEATURES,
      ...fromFile.features,
      ...fromOverride.features,
    },
    experimental: fromOverride.experimental ?? fromFile.experimental ?? [...DEFAULT_EXPERIMENTAL_FEATURES],
  };
}

export function isFeatureEnabled(config: ResolvedViewerConfig, id: ViewerFeatureId) {
  return config.features[id] !== false;
}

export function isFeatureExperimental(config: ResolvedViewerConfig, id: ViewerFeatureId) {
  return config.experimental.includes(id);
}

/** Bundled defaults from viewerConfig.json, with missing keys filled in. */
export const bundledViewerConfig = resolveViewerConfig();
