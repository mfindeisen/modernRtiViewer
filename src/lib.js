import { createApp } from 'vue';
import RtiViewer from './components/RtiViewer.vue';
import './style.css'; 

class ModernRtiViewerElement extends HTMLElement {
  connectedCallback() {
    const url = this.getAttribute('url');
    const shareUrl = this.getAttribute('share-url') || '';
    
    // We create a mount point inside the custom element
    this.mountPoint = document.createElement('div');
    this.mountPoint.style.width = '100%';
    this.mountPoint.style.height = '100%';
    this.appendChild(this.mountPoint);

    this.app = createApp(RtiViewer, { url, shareUrl });
    this.app.mount(this.mountPoint);
  }

  disconnectedCallback() {
    if (this.app) {
      this.app.unmount();
    }
  }
}

// Register the custom element if it hasn't been registered yet
if (!customElements.get('modern-rti-viewer')) {
  customElements.define('modern-rti-viewer', ModernRtiViewerElement);
}

// Also export the Vue component for traditional Vue integrations
export { RtiViewer };
