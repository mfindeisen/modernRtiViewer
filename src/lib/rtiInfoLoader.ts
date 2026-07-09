import type { RtiInfo, RtiInfoLoaders } from '../types/rti.js';

const JSON_TYPE_MAP: Record<string, number> = { HSH_RTI: 1, LRGB_PTM: 2, RGB_PTM: 3, IMAGE: 4 };
const XML_TYPE_MAP: Record<string, number> = { HSH: 1, HSH_RTI: 1, LRGB_PTM: 2, RGB_PTM: 3, IMAGE: 4 };

export function parseRtiInfoJson(json: Record<string, unknown>): RtiInfo {
  const content = (json.content || json) as Record<string, unknown>;
  const tree = (json.tree || json) as Record<string, unknown>;
  const rawFormat = typeof json.format === 'string' ? json.format : 'jpg';

  return {
    type: JSON_TYPE_MAP[String(content.type)] ?? 4,
    width: content.width as number,
    height: content.height as number,
    tileSize: tree.tileSize as number,
    layerCount: (content.layerCount ?? content.coefficients ?? 1) as number,
    format: normalizeTileFormat(rawFormat),
    bias: (content.bias ?? []) as number[],
    scale: (content.scale ?? []) as number[],
  };
}

function normalizeTileFormat(format: string): string {
  const value = format.toLowerCase().trim();
  if (value === 'png' || value === 'webp') return value;
  return 'jpg';
}

export { normalizeTileFormat };

export function parseRtiInfoXml(xmlText: string): RtiInfo {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
  const getValue = (tag: string) => {
    const el = xmlDoc.getElementsByTagName(tag)[0];
    return el?.textContent ?? null;
  };

  const contentEl = xmlDoc.getElementsByTagName('Content')[0];
  const sizeEl = xmlDoc.getElementsByTagName('Size')[0];

  if (contentEl && sizeEl) {
    const contentType = contentEl.getAttribute('type') ?? '';
    const multiResEl = xmlDoc.getElementsByTagName('MultiRes')[0];
    const legacyFormat = multiResEl?.getAttribute('format');
    const treeEl = xmlDoc.getElementsByTagName('Tree')[0];
    let tileSize = 256;
    if (treeEl?.textContent) {
      const lines = treeEl.textContent.trim().split('\n');
      if (lines.length > 1) tileSize = parseInt(lines[1], 10);
    }
    const biasEl = xmlDoc.getElementsByTagName('Bias')[0];
    const scaleEl = xmlDoc.getElementsByTagName('Scale')[0];
    const bias = biasEl?.textContent ? biasEl.textContent.trim().split(/\s+/).map(parseFloat) : [];
    const scale = scaleEl?.textContent ? scaleEl.textContent.trim().split(/\s+/).map(parseFloat) : [];
    const ordlen = parseInt(sizeEl.getAttribute('coefficients') ?? '3', 10) || 3;
    const parsedType = XML_TYPE_MAP[contentType] || 2;
    let numLayers = ordlen;
    if (parsedType === 2) numLayers = 3;

    return {
      type: parsedType,
      width: parseInt(sizeEl.getAttribute('width') ?? '0', 10),
      height: parseInt(sizeEl.getAttribute('height') ?? '0', 10),
      tileSize,
      layerCount: numLayers,
      format: legacyFormat === '1' ? 'png' : 'jpg',
      bias,
      scale,
    };
  }

  return {
    type: parseInt(getValue('type') ?? '4', 10),
    width: parseInt(getValue('width') ?? '0', 10),
    height: parseInt(getValue('height') ?? '0', 10),
    tileSize: parseInt(getValue('tileSize') ?? '256', 10),
    layerCount: parseInt(getValue('layerCount') ?? '1', 10) || 1,
  };
}

export function isTiffUrl(url: string) {
  const cleanUrl = url.split(/[?#]/)[0].trim().toLowerCase();
  return cleanUrl.endsWith('.tif') || cleanUrl.endsWith('.tiff');
}

/**
 * Load RTI metadata from a dataset URL or TIFF file URL.
 * @param {string} url
 * @param {{ openTiff?: (url: string) => Promise<object> }} loaders
 */
export async function loadRtiInfo(url: string, loaders: RtiInfoLoaders = {}) {
  if (isTiffUrl(url)) {
    if (!loaders.openTiff) {
      throw new Error('TIFF loader is required for .tif URLs');
    }
    return loaders.openTiff(url);
  }

  const jsonResponse = await fetch(`${url}/info.json`);
  if (jsonResponse.ok) {
    return parseRtiInfoJson(await jsonResponse.json());
  }

  const xmlResponse = await fetch(`${url}/info.xml`);
  if (!xmlResponse.ok) {
    throw new Error(`Could not load info from ${url}`);
  }
  return parseRtiInfoXml(await xmlResponse.text());
}
