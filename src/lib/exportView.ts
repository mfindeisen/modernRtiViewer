import type { Annotation } from '../types/rti.js';
import {
  ANNOTATION_LABEL_BOX_OFFSET_Y,
  ANNOTATION_LABEL_FONT_SIZE,
  ANNOTATION_LABEL_LINE_HEIGHT,
  ANNOTATION_LABEL_PAD_X,
  ANNOTATION_LABEL_PAD_Y,
  annotationLabelLines,
  buildOverlayShapes,
  type OverlayProjectors,
  type OverlayShape,
} from '../types/annotations.js';

export const EXPORT_STROKE_REFERENCE = 800;

export const MAX_EXPORT_DIMENSION = 4096;

export function clampExportSize(width: number, height: number, maxDim = MAX_EXPORT_DIMENSION) {
  const longSide = Math.max(width, height);
  if (longSide <= maxDim) return { width: Math.round(width), height: Math.round(height), scale: 1 };
  const scale = maxDim / longSide;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    scale,
  };
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  link.click();
}

export async function dataUrlToBlob(dataUrl: string) {
  const response = await fetch(dataUrl);
  return response.blob();
}

export async function copyPngDataUrl(dataUrl: string) {
  const blob = await dataUrlToBlob(dataUrl);
  if (!navigator.clipboard?.write) {
    throw new Error('Clipboard image copy is not available in this browser');
  }
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
}

export function pixelsToPngDataUrl(
  pixels: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  flipY = true,
) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create export canvas');
  const imageData = ctx.createImageData(width, height);
  if (flipY) {
    const row = width * 4;
    for (let y = 0; y < height; y++) {
      const src = (height - 1 - y) * row;
      imageData.data.set(pixels.subarray(src, src + row), y * row);
    }
  } else {
    imageData.data.set(pixels);
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}

/** Image-normalized Y is world-up; PNG/canvas Y is down. */
export function imageNormToExportXY(nx: number, ny: number, width: number, height: number) {
  return { x: nx * width, y: (1 - ny) * height };
}

export function imageNormExportProjectors(width: number, height: number): OverlayProjectors {
  return {
    normToScreen: (nx, ny) => imageNormToExportXY(nx, ny, width, height),
    circleToScreen: (center, radius) => {
      const pos = imageNormToExportXY(center[0], center[1], width, height);
      return { cx: pos.x, cy: pos.y, r: Math.abs(radius) * width };
    },
  };
}

export function exportAnnotationPixelScale(width: number, height: number, reference = EXPORT_STROKE_REFERENCE) {
  if (reference <= 0) return 1;
  return Math.max(1, Math.min(width, height) / reference);
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawShapeLabel(
  ctx: CanvasRenderingContext2D,
  shape: OverlayShape,
  sx: number,
  sy: number,
  pixelScale: number,
) {
  const lines = annotationLabelLines(shape);
  if (!lines.length) return;
  const x = (shape.labelX ?? 0) * sx;
  const y = (shape.labelY ?? 0) * sy;
  const fontSize = Math.max(10, ANNOTATION_LABEL_FONT_SIZE * pixelScale);
  const padX = ANNOTATION_LABEL_PAD_X * pixelScale;
  const padY = ANNOTATION_LABEL_PAD_Y * pixelScale;
  const lineHeight = ANNOTATION_LABEL_LINE_HEIGHT * pixelScale;
  const boxTop = y - ANNOTATION_LABEL_BOX_OFFSET_Y * pixelScale;
  const boxH = (shape.labelHeight ?? (ANNOTATION_LABEL_PAD_Y * 2 + ANNOTATION_LABEL_LINE_HEIGHT)) * pixelScale;
  const boxW = ((shape.labelWidth ?? 0) + ANNOTATION_LABEL_PAD_X * 2) * pixelScale;
  ctx.save();
  ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = Math.max(1, pixelScale);
  roundRectPath(ctx, x - padX, boxTop, boxW, boxH, 4 * pixelScale);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#f8fafc';
  ctx.font = `500 ${fontSize}px system-ui, sans-serif`;
  ctx.textBaseline = 'middle';
  let lineY = boxTop + padY + lineHeight / 2;
  for (const line of lines) {
    ctx.fillText(line, x, lineY);
    lineY += lineHeight;
  }
  ctx.restore();
}

export function drawOverlayShapesOnCanvas(
  canvas: HTMLCanvasElement,
  shapes: OverlayShape[],
  overlaySize: { w: number; h: number },
  options?: { strokeScale?: number },
) {
  if (!shapes.length || overlaySize.w <= 0 || overlaySize.h <= 0) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const sx = canvas.width / overlaySize.w;
  const sy = canvas.height / overlaySize.h;
  const pixelScale = Math.min(sx, sy) * (options?.strokeScale ?? 1);
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  for (const shape of shapes) {
    if (shape.draft) continue;
    ctx.strokeStyle = shape.color;
    ctx.fillStyle = shape.color;
    ctx.lineWidth = Math.max(1, shape.strokeWidth * pixelScale);
    if (shape.kind === 'point') {
      ctx.beginPath();
      ctx.arc(shape.cx * sx, shape.cy * sy, Math.max(3, shape.r * pixelScale), 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (shape.kind === 'circle') {
      ctx.beginPath();
      ctx.arc(shape.cx * sx, shape.cy * sy, Math.max(2, shape.r * Math.min(sx, sy)), 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.strokeRect(shape.x * sx, shape.y * sy, shape.w * sx, shape.h * sy);
    }
    drawShapeLabel(ctx, shape, sx, sy, pixelScale);
  }
  ctx.restore();
}

export function drawNormalizedAnnotationsOnCanvas(
  canvas: HTMLCanvasElement,
  annotations: Annotation[],
) {
  if (!annotations.length) return;
  const project = imageNormExportProjectors(canvas.width, canvas.height);
  const shapes = buildOverlayShapes(annotations, null, '#f59e0b', project);
  drawOverlayShapesOnCanvas(
    canvas,
    shapes,
    { w: canvas.width, h: canvas.height },
    { strokeScale: exportAnnotationPixelScale(canvas.width, canvas.height) },
  );
}

function compositeDataUrl(
  dataUrl: string,
  paint: (canvas: HTMLCanvasElement) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not composite export'));
        return;
      }
      ctx.drawImage(image, 0, 0);
      paint(canvas);
      resolve(canvas.toDataURL('image/png'));
    };
    image.onerror = () => reject(new Error('Could not load export image'));
    image.src = dataUrl;
  });
}

export function compositeDataUrlWithAnnotations(
  dataUrl: string,
  annotations: Annotation[],
): Promise<string> {
  return compositeDataUrl(dataUrl, (canvas) => drawNormalizedAnnotationsOnCanvas(canvas, annotations));
}

export function compositeDataUrlWithOverlay(
  dataUrl: string,
  shapes: OverlayShape[],
  overlaySize: { w: number; h: number },
): Promise<string> {
  return compositeDataUrl(dataUrl, (canvas) => drawOverlayShapesOnCanvas(canvas, shapes, overlaySize));
}

export function recordCanvasWebm(
  canvas: HTMLCanvasElement,
  durationMs: number,
  onTick: (elapsedMs: number) => void,
): Promise<Blob> {
  if (typeof MediaRecorder === 'undefined' || !canvas.captureStream) {
    return Promise.reject(new Error('Video export is not supported in this browser'));
  }

  const stream = canvas.captureStream(30);
  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
    ? 'video/webm;codecs=vp9'
    : MediaRecorder.isTypeSupported('video/webm')
      ? 'video/webm'
      : '';
  if (!mimeType) {
    stream.getTracks().forEach((track) => track.stop());
    return Promise.reject(new Error('WebM recording is not supported in this browser'));
  }

  return new Promise((resolve, reject) => {
    const chunks: BlobPart[] = [];
    const recorder = new MediaRecorder(stream, { mimeType });
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onerror = () => {
      stream.getTracks().forEach((track) => track.stop());
      reject(new Error('Video recording failed'));
    };
    recorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      resolve(new Blob(chunks, { type: mimeType }));
    };

    const started = performance.now();
    recorder.start(100);

    const tick = () => {
      const elapsed = performance.now() - started;
      onTick(elapsed);
      if (elapsed >= durationMs) {
        recorder.stop();
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

export function blobToObjectUrlDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
