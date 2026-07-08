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
