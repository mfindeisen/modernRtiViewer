import RtiViewer from './components/RtiViewer.vue';
import './style.css';
import { registerModernRtiViewerElement } from './lib/modernRtiViewerElement.js';

registerModernRtiViewerElement();

export { RtiViewer };
export { ModernRtiViewerElement, registerModernRtiViewerElement } from './lib/modernRtiViewerElement.js';
export { parseAnnotationEnabledAttr } from './lib/webComponentAttrs.js';
