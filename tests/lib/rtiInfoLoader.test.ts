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
      format: 'webp',
      content: { type: 'HSH_RTI', width: 4096, height: 2048, layerCount: 9 },
      tree: { tileSize: 512 },
    });

    expect(info).toEqual({
      type: 1,
      width: 4096,
      height: 2048,
      tileSize: 512,
      layerCount: 9,
      format: 'webp',
      bias: [],
      scale: [],
      colorGain: undefined,
    });
  });

  it('reads colorGain metadata when present', () => {
    const info = parseRtiInfoJson({
      format: 'jpg',
      content: {
        type: 'HSH_RTI',
        width: 100,
        height: 50,
        coefficients: 4,
        colorGain: { r: 1.1, g: 0.95, b: 1.05 },
      },
      tree: { tileSize: 256 },
    });

    expect(info.colorGain).toEqual({ r: 1.1, g: 0.95, b: 1.05 });
    expect(info.layerCount).toBe(4);
  });

  it('maps LRGB PTM json coefficients to three tile layers', () => {
    const info = parseRtiInfoJson({
      format: 'jpg',
      content: { type: 'LRGB_PTM', width: 512, height: 512, coefficients: 6 },
      tree: { tileSize: 256 },
    });
    expect(info.type).toBe(2);
    expect(info.layerCount).toBe(3);
  });

  it('keeps six tile layers for RGB PTM json', () => {
    const info = parseRtiInfoJson({
      format: 'jpg',
      content: { type: 'RGB_PTM', width: 512, height: 512, coefficients: 6 },
      tree: { tileSize: 256 },
    });
    expect(info.type).toBe(3);
    expect(info.layerCount).toBe(6);
  });

  it('prefers explicit layerCount for HSH json', () => {
    const info = parseRtiInfoJson({
      content: { type: 'HSH_RTI', width: 10, height: 10, coefficients: 4, layerCount: 9 },
      tree: { tileSize: 256 },
    });
    expect(info.layerCount).toBe(9);
  });

  it('defaults unknown json content types to IMAGE', () => {
    const info = parseRtiInfoJson({
      content: { type: 'WEIRD_RTI', width: 10, height: 10, layerCount: 9 },
      tree: { tileSize: 256 },
    });
    expect(info.type).toBe(4);
    expect(info.layerCount).toBe(1);
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

  it('maps LRGB PTM xml coefficients=6 to three tile layers', () => {
    const xml = `<?xml version="1.0"?>
<root>
  <Content type="LRGB_PTM" />
  <Size width="1024" height="768" coefficients="6" />
  <Tree>levels\n256</Tree>
</root>`;
    const info = parseRtiInfoXml(xml);
    expect(info.type).toBe(2);
    expect(info.layerCount).toBe(3);
  });

  it('uses six layers for RGB PTM xml', () => {
    const xml = `<?xml version="1.0"?>
<root>
  <Content type="RGB_PTM" />
  <Size width="512" height="512" coefficients="6" />
  <Tree>levels\n256</Tree>
</root>`;
    const info = parseRtiInfoXml(xml);
    expect(info.type).toBe(3);
    expect(info.layerCount).toBe(6);
  });

  it('does not treat unknown content types as LRGB PTM', () => {
    const xml = `<?xml version="1.0"?>
<root>
  <Content type="WEIRD_RTI" />
  <Size width="256" height="256" coefficients="9" />
  <Tree>levels\n256</Tree>
</root>`;
    const info = parseRtiInfoXml(xml);
    expect(info.type).toBe(4);
    expect(info.layerCount).toBe(1);
  });
});
