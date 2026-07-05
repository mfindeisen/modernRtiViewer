import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockOpen = vi.fn();
const MockTiffTileLoader = vi.fn(function MockTiffTileLoader(this: { url: string; open: typeof mockOpen }, url: string) {
  this.url = url;
  this.open = mockOpen;
});

vi.mock('@/lib/TiffTileLoader.js', () => ({
  TiffTileLoader: MockTiffTileLoader,
}));

import { openTiffDataset } from '@/lib/openTiffDataset.js';

describe('openTiffDataset', () => {
  beforeEach(() => {
    MockTiffTileLoader.mockClear();
    mockOpen.mockReset();
    mockOpen.mockResolvedValue({ type: 1, width: 512, height: 512 });
  });

  it('lazy-loads TiffTileLoader and returns loader + metadata', async () => {
    const result = await openTiffDataset('/data/sample.tif');

    expect(MockTiffTileLoader).toHaveBeenCalledWith('/data/sample.tif');
    expect(mockOpen).toHaveBeenCalled();
    expect(result.info).toEqual({ type: 1, width: 512, height: 512 });
    expect(result.loader.url).toBe('/data/sample.tif');
  });
});
