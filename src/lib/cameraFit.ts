/** True when a layout box can be used for camera/aspect math. */
export function viewportHasLayout(width: number, height: number): boolean {
  return Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0;
}

/** Compute orthographic zoom so the full image fits in the viewport (legacy WebRTIViewer behavior). */
export function computeFitToViewZoom(
  viewportWidth: number,
  viewportHeight: number,
  imgWidth: number,
  imgHeight: number,
): number {
  if (viewportWidth <= 0 || viewportHeight <= 0 || imgWidth <= 0 || imgHeight <= 0) {
    return 1;
  }

  const viewSize = Math.max(imgWidth, imgHeight) / 2;
  const aspect = viewportWidth / viewportHeight;
  const fitWidthZoom = (2 * viewSize * aspect) / imgWidth;
  const fitHeightZoom = (2 * viewSize) / imgHeight;
  return Math.min(fitWidthZoom, fitHeightZoom);
}

/** Clamp orbit zoom: a little below fit, up to a few screen pixels per image pixel. */
export function computeZoomLimits(
  viewportWidth: number,
  viewportHeight: number,
  imgWidth: number,
  imgHeight: number,
) {
  const fit = computeFitToViewZoom(viewportWidth, viewportHeight, imgWidth, imgHeight);
  const minView = Math.min(viewportWidth, viewportHeight);
  const maxDim = Math.max(imgWidth, imgHeight);
  const pixelPerfect = minView > 0 ? maxDim / minView : fit;
  return {
    fit,
    minZoom: fit * 0.5,
    maxZoom: Math.max(fit * 8, pixelPerfect * 4),
  };
}

export function formatZoomPercent(zoom: number, fitZoom: number) {
  if (!Number.isFinite(zoom) || !Number.isFinite(fitZoom) || fitZoom <= 0) return 100;
  return Math.max(1, Math.round((zoom / fitZoom) * 100));
}
