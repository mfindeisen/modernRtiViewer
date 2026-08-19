import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExactRangeSource, toArrayBuffer } from '@/lib/tiffRangeSource.js';

describe('toArrayBuffer', () => {
  it('returns an ArrayBuffer DataView can wrap', () => {
    const buf = new ArrayBuffer(8);
    const out = toArrayBuffer(buf);
    expect(out).toBeInstanceOf(ArrayBuffer);
    expect(out.byteLength).toBe(8);
    expect(() => new DataView(out)).not.toThrow();
  });

  it('copies a Uint8Array view into a standalone ArrayBuffer', () => {
    const parent = new Uint8Array([0, 1, 2, 3, 4, 5]);
    const view = parent.subarray(2, 5);
    const out = toArrayBuffer(view);
    expect(out).toBeInstanceOf(ArrayBuffer);
    expect(out.byteLength).toBe(3);
    expect([...new Uint8Array(out)]).toEqual([2, 3, 4]);
    expect(() => new DataView(out)).not.toThrow();
  });

  it('trims extra bytes to the requested length', () => {
    const buf = new Uint8Array([9, 8, 7, 6]).buffer;
    const out = toArrayBuffer(buf, 2);
    expect(out.byteLength).toBe(2);
    expect([...new Uint8Array(out)]).toEqual([9, 8]);
  });
});

describe('ExactRangeSource', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('issues Range fetches with cache: no-store', async () => {
    const fetchMock = vi.fn(async () => new Response(new Uint8Array([1, 2, 3, 4]), { status: 206 }));
    vi.stubGlobal('fetch', fetchMock);

    const source = new ExactRangeSource('/static/uploads/example.tif');
    const [buf] = await source.fetch([{ offset: 10, length: 4 }]);

    expect([...new Uint8Array(buf)]).toEqual([1, 2, 3, 4]);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      cache: 'no-store',
      headers: { Range: 'bytes=10-13' },
    });
  });
});
