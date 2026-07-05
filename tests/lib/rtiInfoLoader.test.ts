import { describe, it, expect } from 'vitest';
import {
  isTiffUrl,
  parseRtiInfoJson,
  parseRtiInfoXml,
} from '@/lib/rtiInfoLoader.js';

describe('isTiffUrl', () => {
  it('detects tiff extensions', () => {
    expect(isTiffUrl('/data/sample.tif')).toBe(true);
    expect(isTiffUrl('/data/sample.TIFF?foo=1')).toBe(true);
    expect(isTiffUrl('/data/rti')).toBe(false);
  });
});

describe('parseRtiInfoJson', () => {
  it('maps nested rtiprep json to viewer info', () => {
    const info = parseRtiInfoJson({
      content: { type: 'HSH_RTI', width: 4096, height: 2048, layerCount: 9 },
      tree: { tileSize: 512 },
    });

    expect(info).toEqual({
      type: 1,
      width: 4096,
      height: 2048,
      tileSize: 512,
      layerCount: 9,
      bias: [],
      scale: [],
    });
  });
});

describe('parseRtiInfoXml', () => {
  it('parses legacy webGLRtiMaker xml', () => {
    const xml = `<?xml version="1.0"?>
<root>
  <Content type="LRGB_PTM" />
  <Size width="1024" height="768" coefficients="3" />
  <Tree>levels\n256</Tree>
  <Bias>0 0 0</Bias>
  <Scale>1 1 1</Scale>
</root>`;

    const info = parseRtiInfoXml(xml);
    expect(info.type).toBe(2);
    expect(info.width).toBe(1024);
    expect(info.height).toBe(768);
    expect(info.tileSize).toBe(256);
    expect(info.layerCount).toBe(3);
  });
});
