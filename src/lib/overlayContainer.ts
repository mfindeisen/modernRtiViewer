import { onMounted, onUnmounted, ref, type Ref } from 'vue';

export type OverlayContainer = string | HTMLElement;

const FULLSCREEN_EVENTS = ['fullscreenchange', 'webkitfullscreenchange'] as const;

export function getOverlayContainer(): OverlayContainer {
  if (typeof document === 'undefined') return 'body';
  const doc = document as Document & { webkitFullscreenElement?: Element | null };
  const el = doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
  return el instanceof HTMLElement ? el : 'body';
}

const overlayContainer: Ref<OverlayContainer> = ref('body');
let subscriberCount = 0;

function syncOverlayContainer() {
  overlayContainer.value = getOverlayContainer();
}

export function useOverlayContainer(): Ref<OverlayContainer> {
  onMounted(() => {
    if (subscriberCount === 0) {
      FULLSCREEN_EVENTS.forEach((event) => {
        document.addEventListener(event, syncOverlayContainer);
      });
      syncOverlayContainer();
    }
    subscriberCount += 1;
  });

  onUnmounted(() => {
    subscriberCount -= 1;
    if (subscriberCount <= 0) {
      subscriberCount = 0;
      FULLSCREEN_EVENTS.forEach((event) => {
        document.removeEventListener(event, syncOverlayContainer);
      });
      overlayContainer.value = 'body';
    }
  });

  return overlayContainer;
}
