/** Shared RTI viewer domain types. */

export type RtiType = 1 | 2 | 3 | 4 | 5;

export interface RtiInfo {
  type: RtiType | number;
  width: number;
  height: number;
  tileSize: number;
  layerCount: number;
  bias?: number[];
  scale?: number[];
  weights?: NeuralWeights;
  numCoeffs?: number;
  isTiff?: boolean;
}

export interface NeuralWeights {
  w1: number[][];
  b1: number[];
  w2: number[][];
  b2: number[];
  w3: number[][];
  b3: number[];
}

export interface ColorGain {
  r: number;
  g: number;
  b: number;
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface RtiCameraState {
  cx: number;
  cy: number;
  zoom?: number;
  z?: number;
  targetX?: number;
  targetY?: number;
}

export interface RtiViewState {
  lightDir?: Vec3;
  renderMode?: number;
  specularExponent?: number;
  colorGain?: ColorGain;
  camera?: RtiCameraState;
}

export interface ParsedViewHash {
  lightDir?: Vec3;
  renderMode?: number;
  colorGain?: ColorGain;
  camera?: RtiCameraState;
}

export type AnnotationType = 'point' | 'circle' | 'rectangle';

export interface Annotation {
  id?: string;
  type: AnnotationType | string;
  geometry: Record<string, unknown>;
  color?: string;
  [key: string]: unknown;
}

export interface AnnotationCreatePayload {
  type: AnnotationType | string;
  geometry: Record<string, unknown>;
  color: string;
  rtiView: RtiViewState;
}

export interface QuadtreeBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface QuadtreeNode {
  id: number;
  level: number;
  isLeaf: boolean;
  childrenIndices: number[];
  parentIndex?: number;
  box?: QuadtreeBox;
  isValid?: boolean;
}

export interface FrustumBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface WorldBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface RtiInfoLoaders {
  openTiff?: (url: string) => Promise<RtiInfo>;
}

export interface VisibleNode {
  node: QuadtreeNode;
  worldBox: WorldBox;
  isFallback?: boolean;
}
