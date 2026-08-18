import { ref } from 'vue';
import type { Ref } from 'vue';
import type * as THREE from 'three';
import { ensureOrbitRadius, rotateLightDir, rakingLightDir } from '../lib/lightDirection.js';

export type LightAnimationMode = 'orbit' | 'raking';

export const LIGHT_ANIM_SPEED = {
  min: 0.25,
  max: 4,
  step: 0.25,
  default: 1,
} as const;

export function clampLightAnimSpeed(value: number) {
  if (!Number.isFinite(value)) return LIGHT_ANIM_SPEED.default;
  return Math.min(LIGHT_ANIM_SPEED.max, Math.max(LIGHT_ANIM_SPEED.min, value));
}

export function formatLightAnimSpeed(value: number) {
  const n = clampLightAnimSpeed(value);
  if (Number.isInteger(n)) return `${n}×`;
  return `${String(n)}×`;
}

interface UseLightAnimationOptions {
  lightDir: Ref<THREE.Vector3>;
  requestRender: () => void;
}

export function useLightAnimation({ lightDir, requestRender }: UseLightAnimationOptions) {
  const playing = ref(false);
  const mode = ref<LightAnimationMode>('orbit');
  const speed = ref<number>(LIGHT_ANIM_SPEED.default);
  let rafId: number | null = null;
  let lastTs = 0;
  let rakingPhase = 0;
  let rakingY = 0;

  function apply(next: { x: number; y: number; z: number }) {
    lightDir.value.set(next.x, next.y, next.z);
    requestRender();
  }

  function tick(now: number) {
    rafId = null;
    if (!playing.value) return;
    const dt = Math.min(0.05, (now - lastTs) / 1000 || 0.016);
    lastTs = now;
    const rate = speed.value * 1.2;

    if (mode.value === 'orbit') {
      apply(rotateLightDir(lightDir.value, -dt * rate));
    } else {
      rakingPhase += dt * rate * 2;
      apply(rakingLightDir(rakingPhase, rakingY));
    }

    rafId = requestAnimationFrame(tick);
  }

  function play() {
    if (playing.value) return;
    if (mode.value === 'orbit') {
      const primed = ensureOrbitRadius(lightDir.value);
      apply(primed);
    } else {
      rakingY = lightDir.value.y;
      rakingPhase = Math.atan2(lightDir.value.x, 1);
    }
    playing.value = true;
    lastTs = performance.now();
    rafId = requestAnimationFrame(tick);
  }

  function pause() {
    playing.value = false;
    if (rafId != null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    rakingY = lightDir.value.y;
    rakingPhase = Math.atan2(lightDir.value.x, 1);
  }

  function toggle() {
    if (playing.value) pause();
    else play();
  }

  function setMode(next: LightAnimationMode) {
    const wasPlaying = playing.value;
    if (wasPlaying) pause();
    mode.value = next;
    if (wasPlaying) play();
  }

  function setSpeed(next: number) {
    speed.value = clampLightAnimSpeed(next);
  }

  function dispose() {
    pause();
  }

  return {
    playing,
    mode,
    speed,
    play,
    pause,
    toggle,
    setMode,
    setSpeed,
    dispose,
  };
}
