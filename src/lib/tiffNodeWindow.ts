export interface QuadtreeNormBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface PaddedNodePixelWindow {
  nx0: number;
  ny0: number;
  nx1: number;
  ny1: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  texW: number;
  texH: number;
  tileW: number;
  tileH: number;
}

/**
 * Map a quadtree node onto IFD pixels.
 * nx0/ny0 is the full padded cell; x0/y0 is the clipped image window.
 */
export function paddedNodePixelWindow(
  box: QuadtreeNormBox,
  gridSize: number,
  fullWidth: number,
  fullHeight: number,
  imgWidth: number,
  imgHeight: number,
): PaddedNodePixelWindow {
  const woffset = (gridSize - fullWidth) / 2.0;
  const hoffset = (gridSize - fullHeight) / 2.0;
  const scaleX = imgWidth / fullWidth;
  const scaleY = imgHeight / fullHeight;

  const fullX0 = box.minX * gridSize - woffset;
  const fullY0 = (1.0 - box.maxY) * gridSize - hoffset;
  const fullX1 = box.maxX * gridSize - woffset;
  const fullY1 = (1.0 - box.minY) * gridSize - hoffset;

  const nx0 = Math.floor(fullX0 * scaleX);
  const ny0 = Math.floor(fullY0 * scaleY);
  const nx1 = Math.ceil(fullX1 * scaleX);
  const ny1 = Math.ceil(fullY1 * scaleY);

  const x0 = Math.max(0, nx0);
  const y0 = Math.max(0, ny0);
  const x1 = Math.min(imgWidth, nx1);
  const y1 = Math.min(imgHeight, ny1);

  return {
    nx0,
    ny0,
    nx1,
    ny1,
    x0,
    y0,
    x1,
    y1,
    texW: Math.max(1, nx1 - nx0),
    texH: Math.max(1, ny1 - ny0),
    tileW: Math.max(0, x1 - x0),
    tileH: Math.max(0, y1 - y0),
  };
}
