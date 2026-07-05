import type { QuadtreeBox, QuadtreeNode, FrustumBounds, VisibleNode } from '../types/rti.js';

export class QuadtreeManager {
  imgW: number;
  imgH: number;
  tileSize: number;
  maxSize: number;
  nLevels: number;
  imgBox: QuadtreeBox;
  nodes: QuadtreeNode[] = [];

  constructor(imgW: number, imgH: number, tileSize: number) {
    this.imgW = imgW;
    this.imgH = imgH;
    this.tileSize = tileSize;

    this.maxSize = 2 ** Math.ceil(Math.log2(Math.max(imgW, imgH)));

    this.nLevels = 1;
    let temp = this.maxSize;
    while (temp > tileSize) {
      this.nLevels++;
      temp /= 2;
    }

    const woffset = ((this.maxSize - imgW) / 2.0) / this.maxSize;
    const hoffset = ((this.maxSize - imgH) / 2.0) / this.maxSize;
    this.imgBox = {
      minX: woffset,
      maxX: woffset + imgW / this.maxSize,
      minY: hoffset,
      maxY: hoffset + imgH / this.maxSize,
    };

    this.buildTree();
  }

  buildTree() {
    let index = 0;

    for (let i = 0; i < this.nLevels; i++) {
      const count = 4 ** i;
      for (let j = 0; j < count; j++) {
        const node: QuadtreeNode = {
          id: index + 1,
          level: i,
          isLeaf: i === this.nLevels - 1,
          childrenIndices: [],
        };

        if (index > 0) {
          const t = index % 4;
          const parentIndex = Math.ceil(index / 4) - 1;
          node.parentIndex = parentIndex;

          const pBox = this.nodes[parentIndex].box!;
          const halfW = pBox.minX + (pBox.maxX - pBox.minX) / 2.0;
          const halfH = pBox.minY + (pBox.maxY - pBox.minY) / 2.0;

          if (t === 1) node.box = { minX: pBox.minX, minY: halfH, maxX: halfW, maxY: pBox.maxY };
          else if (t === 2) node.box = { minX: halfW, minY: halfH, maxX: pBox.maxX, maxY: pBox.maxY };
          else if (t === 3) node.box = { minX: pBox.minX, minY: pBox.minY, maxX: halfW, maxY: halfH };
          else if (t === 0) node.box = { minX: halfW, minY: pBox.minY, maxX: pBox.maxX, maxY: halfH };

          node.isValid = this.boxesIntersect(node.box!, this.imgBox);
        } else {
          node.parentIndex = -1;
          node.box = { minX: 0.0, minY: 0.0, maxX: 1.0, maxY: 1.0 };
          node.isValid = true;
        }

        if (!node.isLeaf) {
          for (let c = 0; c < 4; c++) {
            node.childrenIndices.push(index * 4 + 1 + (c + 2) % 4);
          }
        }

        this.nodes.push(node);
        index++;
      }
    }
  }

  boxesIntersect(a: QuadtreeBox, b: QuadtreeBox) {
    return !(a.maxX < b.minX || a.minX > b.maxX || a.maxY < b.minY || a.minY > b.maxY);
  }

  getVisibleNodes(frustumBounds: FrustumBounds, projectedTileSize: number): VisibleNode[] {
    const visibleNodes: VisibleNode[] = [];
    this.traverse(0, frustumBounds, projectedTileSize, visibleNodes);
    return visibleNodes;
  }

  traverse(
    nodeIndex: number,
    frustumBounds: FrustumBounds,
    projectedTileSize: number,
    visibleNodes: VisibleNode[],
  ) {
    const node = this.nodes[nodeIndex];
    if (!node.isValid) return;

    const worldMinX = (node.box!.minX - 0.5) * this.maxSize;
    const worldMaxX = (node.box!.maxX - 0.5) * this.maxSize;
    const worldMinY = (node.box!.minY - 0.5) * this.maxSize;
    const worldMaxY = (node.box!.maxY - 0.5) * this.maxSize;

    if (worldMaxX < frustumBounds.minX || worldMinX > frustumBounds.maxX
      || worldMaxY < frustumBounds.minY || worldMinY > frustumBounds.maxY) {
      return;
    }

    const shouldSubdivide = projectedTileSize > this.tileSize;

    if (shouldSubdivide && !node.isLeaf) {
      visibleNodes.push({
        node,
        worldBox: { minX: worldMinX, maxX: worldMaxX, minY: worldMinY, maxY: worldMaxY },
        isFallback: true,
      });
      for (const childIdx of node.childrenIndices) {
        this.traverse(childIdx, frustumBounds, projectedTileSize / 2, visibleNodes);
      }
    } else {
      visibleNodes.push({
        node,
        worldBox: { minX: worldMinX, maxX: worldMaxX, minY: worldMinY, maxY: worldMaxY },
        isFallback: false,
      });
    }
  }
}
