/**
 * HTTP Range source for geotiff.js that returns ArrayBuffers (the fromSource
 * contract). RemoteSource without BlockedSource returns { data, offset, length }
 * objects instead, which blows up DataView.
 */
export interface ByteSlice {
  offset: number;
  length: number;
}

export function toArrayBuffer(data: ArrayBuffer | ArrayBufferView, length?: number): ArrayBuffer {
  let bytes: Uint8Array;
  if (data instanceof ArrayBuffer) {
    bytes = new Uint8Array(data);
  } else {
    bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  }
  const size = length !== undefined ? Math.min(length, bytes.byteLength) : bytes.byteLength;
  const out = new ArrayBuffer(size);
  new Uint8Array(out).set(bytes.subarray(0, size));
  return out;
}

export class ExactRangeSource {
  url: string;
  credentials: RequestCredentials;

  constructor(url: string, credentials: RequestCredentials = 'same-origin') {
    this.url = url;
    this.credentials = credentials;
  }

  async fetch(slices: ByteSlice[], signal?: AbortSignal): Promise<ArrayBuffer[]> {
    return Promise.all(slices.map((slice) => this.fetchSlice(slice, signal)));
  }

  async fetchSlice(slice: ByteSlice, signal?: AbortSignal): Promise<ArrayBuffer> {
    const start = slice.offset;
    const end = slice.offset + slice.length - 1;
    const response = await fetch(this.url, {
      headers: { Range: `bytes=${start}-${end}` },
      credentials: this.credentials,
      // Chrome throws net::ERR_CACHE_OPERATION_NOT_SUPPORTED for Range
      // requests that hit a previously cached 206/full response.
      cache: 'no-store',
      signal,
    });
    if (!response.ok && response.status !== 206) {
      throw new Error(`TIFF range request failed (${response.status})`);
    }
    return toArrayBuffer(await response.arrayBuffer(), slice.length);
  }

  get fileSize(): number | null {
    return null;
  }
}
