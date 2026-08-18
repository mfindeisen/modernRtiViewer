import RtiViewer from './components/RtiViewer.vue';
import './style.css';
import { registerModernRtiViewerElement } from './lib/modernRtiViewerElement.js';

registerModernRtiViewerElement();

export { RtiViewer };
export { ModernRtiViewerElement, registerModernRtiViewerElement } from './lib/modernRtiViewerElement.js';
export { parseAnnotationEnabledAttr, parseFeaturesAttr } from './lib/webComponentAttrs.js';
export { resolveViewerConfig, bundledViewerConfig } from './lib/viewerConfig.js';
