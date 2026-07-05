import { describe, it, expect } from 'vitest';
import { QuadtreeManager } from '@/lib/QuadtreeManager.js';

describe('QuadtreeManager', () => {
  it('computes maxSize as next power of two and level count from tile size', () => {
    const qt = new QuadtreeManager(1024, 1024, 256);

    expect(qt.maxSize).toBe(1024);
    expect(qt.nLevels).toBe(3);
    expect(qt.nodes).toHaveLength(1 + 4 + 16);
  });

  it('centers non-square images in normalized imgBox', () => {
    const qt = new QuadtreeManager(800, 400, 256);

    expect(qt.maxSize).toBe(1024);
    const { imgBox } = qt;
    const widthNorm = imgBox.maxX - imgBox.minX;
    const heightNorm = imgBox.maxY - imgBox.minY;

    expect(widthNorm).toBeCloseTo(800 / 1024);
    expect(heightNorm).toBeCloseTo(400 / 1024);
    expect(imgBox.minX + widthNorm / 2).toBeCloseTo(0.5);
    expect(imgBox.minY + heightNorm / 2).toBeCloseTo(0.5);
  });

  it('culls nodes that do not intersect the image bounds', () => {
    const qt = new QuadtreeManager(200, 800, 256);
    const invalid = qt.nodes.filter((n) => n.isValid === false);

    expect(invalid.length).toBe(8);
    expect(qt.nodes[0].isValid).toBe(true);
    expect(qt.getVisibleNodes({
      minX: -600,
      maxX: 600,
      minY: -600,
      maxY: 600,
    }, 64).every((v) => v.node.isValid)).toBe(true);
  });

  describe('boxesIntersect', () => {
    it('detects overlap and separation', () => {
      const qt = new QuadtreeManager(512, 512, 256);
      const a = { minX: 0, maxX: 0.5, minY: 0, maxY: 0.5 };
      const b = { minX: 0.25, maxX: 0.75, minY: 0.25, maxY: 0.75 };
      const c = { minX: 0.6, maxX: 1, minY: 0.6, maxY: 1 };

      expect(qt.boxesIntersect(a, b)).toBe(true);
      expect(qt.boxesIntersect(a, c)).toBe(false);
    });
  });

  describe('getVisibleNodes', () => {
    it('returns no nodes when the frustum is outside the image', () => {
      const qt = new QuadtreeManager(1024, 1024, 256);
      const visible = qt.getVisibleNodes({
        minX: 2000,
        maxX: 3000,
        minY: 2000,
        maxY: 3000,
      }, 100);

      expect(visible).toHaveLength(0);
    });

    it('returns coarse tiles when zoomed out', () => {
      const qt = new QuadtreeManager(1024, 1024, 256);
      const visible = qt.getVisibleNodes({
        minX: -200,
        maxX: 200,
        minY: -200,
        maxY: 200,
      }, 64);

      expect(visible.length).toBeGreaterThanOrEqual(1);
      expect(visible.some((v) => v.node.level === 0)).toBe(true);
      expect(visible.every((v) => !v.isFallback || v.node.level < qt.nLevels - 1)).toBe(true);
    });

    it('subdivides into finer tiles when projected size exceeds tile size', () => {
      const qt = new QuadtreeManager(1024, 1024, 256);
      const coarse = qt.getVisibleNodes({
        minX: -128,
        maxX: 128,
        minY: -128,
        maxY: 128,
      }, 128);

      const fine = qt.getVisibleNodes({
        minX: -128,
        maxX: 128,
        minY: -128,
        maxY: 128,
      }, 1024);

      const maxCoarseLevel = Math.max(...coarse.map((v) => v.node.level));
      const maxFineLevel = Math.max(...fine.map((v) => v.node.level));

      expect(maxFineLevel).toBeGreaterThan(maxCoarseLevel);
      expect(fine.some((v) => v.isFallback)).toBe(true);
    });

    it('maps visible nodes to world-space bounding boxes', () => {
      const qt = new QuadtreeManager(512, 512, 256);
      const [entry] = qt.getVisibleNodes({
        minX: -256,
        maxX: 256,
        minY: -256,
        maxY: 256,
      }, 64);

      expect(entry.worldBox.minX).toBeCloseTo(-256);
      expect(entry.worldBox.maxX).toBeCloseTo(256);
      expect(entry.worldBox.minY).toBeCloseTo(-256);
      expect(entry.worldBox.maxY).toBeCloseTo(256);
    });
  });
});
