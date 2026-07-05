/**
 * Lazy-load GeoTIFF support (geotiff.js + decoders) only when a .tif URL is opened.
 */
export async function openTiffDataset(url: string) {
  const { TiffTileLoader } = await import('./TiffTileLoader.js');
  const loader = new TiffTileLoader(url);
  const info = await loader.open();
  return { loader, info };
}
