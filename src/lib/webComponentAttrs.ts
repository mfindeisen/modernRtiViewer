import { parseViewerConfigInput, type ViewerConfigInput } from './viewerConfig.js';

export function parseAnnotationEnabledAttr(val: string | boolean | null | undefined) {
  if (val === true) return true;
  if (val === false || val == null) return false;
  return val === 'true' || val === '';
}

export function parseFeaturesAttr(val: string | null | undefined): ViewerConfigInput | undefined {
  if (val == null || val === '') return undefined;
  return parseViewerConfigInput(val);
}
