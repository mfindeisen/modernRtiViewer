import { describe, it, expect, vi } from 'vitest';
import type { Ref } from 'vue';
import type * as THREE from 'three';
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { captureRtiView, applyRtiView } from '@/lib/viewerViewState.js';

describe('captureRtiView', () => {
  it('serializes camera, light, and render settings', () => {
    const view = captureRtiView({
      lightDir: { x: 0.1, y: 0.2, z: 0.97 } as THREE.Vector3,
      renderMode: 2,
      specularExponent: 12,
      colorGain: { r: 1.1, g: 0.9, b: 1 },
      camera: {
        position: { x: 5, y: -3 },
        zoom: 1.5,
      } as THREE.OrthographicCamera,
      controls: {
        target: { x: 5, y: -3 },
      } as OrbitControls,
    });

    expect(view).toEqual({
      lightDir: { x: 0.1, y: 0.2, z: 0.97 },
      renderMode: 2,
      specularExponent: 12,
      colorGain: { r: 1.1, g: 0.9, b: 1 },
      camera: {
        cx: 5,
        cy: -3,
        zoom: 1.5,
        targetX: 5,
        targetY: -3,
      },
    });
  });
});

describe('applyRtiView', () => {
  it('restores view state through callbacks', () => {
    const lightDir = {
      value: {
        set: vi.fn(function set(this: unknown) { return this; }),
        normalize: vi.fn(),
      },
    };
    const renderMode = { value: 0 };
    const specularExponent = { value: 10 };
    const colorGain = { value: { r: 1, g: 1, b: 1 } };
    const camera = {
      value: {
        position: { set: vi.fn() },
        zoom: 1,
        updateProjectionMatrix: vi.fn(),
      },
    };
    const controls = {
      value: {
        target: { set: vi.fn() },
        update: vi.fn(),
      },
    };
    const setRenderMode = vi.fn();
    const updateSpecular = vi.fn();
    const updateColorGain = vi.fn();
    const onApplied = vi.fn();

    applyRtiView({
      lightDir: { x: 0.5, y: 0, z: 0.87 },
      renderMode: 3,
      specularExponent: 20,
      colorGain: { r: 1.2, g: 1, b: 0.9 },
      camera: { cx: 1, cy: 2, zoom: 2.5, targetX: 1, targetY: 2 },
    }, {
      lightDir: lightDir as unknown as Ref<THREE.Vector3>,
      renderMode: renderMode as unknown as Ref<number>,
      specularExponent: specularExponent as unknown as Ref<number>,
      colorGain: colorGain as unknown as Ref<{ r: number; g: number; b: number }>,
      camera: camera as unknown as Ref<THREE.OrthographicCamera | null>,
      controls: controls as unknown as Ref<OrbitControls | null>,
      setRenderMode,
      updateSpecular,
      updateColorGain,
      onApplied,
    });

    expect(lightDir.value.set).toHaveBeenCalledWith(0.5, 0, 0.87);
    expect(renderMode.value).toBe(3);
    expect(setRenderMode).toHaveBeenCalledWith(3);
    expect(specularExponent.value).toBe(20);
    expect(updateSpecular).toHaveBeenCalled();
    expect(colorGain.value).toEqual({ r: 1.2, g: 1, b: 0.9 });
    expect(updateColorGain).toHaveBeenCalled();
    expect(camera.value.position.set).toHaveBeenCalledWith(1, 2, 10);
    expect(camera.value.zoom).toBe(2.5);
    expect(onApplied).toHaveBeenCalled();
  });
});
