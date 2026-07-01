export class QuadtreeManager {
  constructor(imgW, imgH, tileSize) {
    this.imgW = imgW;
    this.imgH = imgH;
    this.tileSize = tileSize;
    
    // Max size is next power of 2
    this.maxSize = Math.pow(2, Math.ceil(Math.log2(Math.max(imgW, imgH))));
    
    this.nLevels = 1;
    let temp = this.maxSize;
    while (temp > tileSize) {
      this.nLevels++;
      temp /= 2;
    }
    
    // Calculate valid image bounding box in normalized [0, 1] space
    // The image is centered in the padded maxSize square
    const woffset = ((this.maxSize - imgW) / 2.0) / this.maxSize;
    const hoffset = ((this.maxSize - imgH) / 2.0) / this.maxSize;
    this.imgBox = {
      minX: woffset,
      maxX: woffset + imgW / this.maxSize,
      minY: hoffset,
      maxY: hoffset + imgH / this.maxSize
    };

    this.nodes = [];
    this.buildTree();
  }

  buildTree() {
    let index = 0;
    
    for (let i = 0; i < this.nLevels; i++) {
      const count = Math.pow(4, i);
      for (let j = 0; j < count; j++) {
        const node = {
          id: index + 1, // matches filename: {id}_{layer}.png
          level: i,
          isLeaf: (i === this.nLevels - 1),
          childrenIndices: []
        };
        
        if (index > 0) {
          const t = index % 4; // 1:TL, 2:TR, 3:BL, 0:BR
          const parentIndex = Math.ceil(index / 4) - 1;
          node.parentIndex = parentIndex;
          
          const pBox = this.nodes[parentIndex].box;
          const halfW = pBox.minX + (pBox.maxX - pBox.minX) / 2.0;
          const halfH = pBox.minY + (pBox.maxY - pBox.minY) / 2.0;
          
          if (t === 1)      node.box = { minX: pBox.minX, minY: halfH, maxX: halfW, maxY: pBox.maxY };
          else if (t === 2) node.box = { minX: halfW, minY: halfH, maxX: pBox.maxX, maxY: pBox.maxY };
          else if (t === 3) node.box = { minX: pBox.minX, minY: pBox.minY, maxX: halfW, maxY: halfH };
          else if (t === 0) node.box = { minX: halfW, minY: pBox.minY, maxX: pBox.maxX, maxY: halfH };
          
          // Check intersection with actual image data to cull empty tiles
          node.isValid = this.boxesIntersect(node.box, this.imgBox);
        } else {
          node.parentIndex = -1;
          node.box = { minX: 0.0, minY: 0.0, maxX: 1.0, maxY: 1.0 };
          node.isValid = true;
        }

        // Precompute children indices
        if (!node.isLeaf) {
          for (let c = 0; c < 4; ++c) {
            node.childrenIndices.push(index * 4 + 1 + (c + 2) % 4);
          }
        }
        
        this.nodes.push(node);
        index++;
      }
    }
  }

  boxesIntersect(a, b) {
    return !(a.maxX < b.minX || a.minX > b.maxX || a.maxY < b.minY || a.minY > b.maxY);
  }

  // Traverse the tree to find which nodes should be rendered
  // frustumBounds: [minX, maxX, minY, maxY] in world coords
  // cameraZoom: scaling factor to determine LOD
  getVisibleNodes(frustumBounds, projectedTileSize) {
    const visibleNodes = [];
    
    // Traverse from root (node 0)
    this.traverse(0, frustumBounds, projectedTileSize, visibleNodes);
    
    return visibleNodes;
  }

  traverse(nodeIndex, frustumBounds, projectedTileSize, visibleNodes) {
    const node = this.nodes[nodeIndex];
    if (!node.isValid) return;

    // Convert node normalized box [0..1] to world box [-maxSize/2 .. maxSize/2]
    const worldMinX = (node.box.minX - 0.5) * this.maxSize;
    const worldMaxX = (node.box.maxX - 0.5) * this.maxSize;
    const worldMinY = (node.box.minY - 0.5) * this.maxSize;
    const worldMaxY = (node.box.maxY - 0.5) * this.maxSize;

    // Frustum culling
    if (worldMaxX < frustumBounds.minX || worldMinX > frustumBounds.maxX || 
        worldMaxY < frustumBounds.minY || worldMinY > frustumBounds.maxY) {
      return; // Outside view
    }

    // Determine if we should subdivide (LOD logic)
    // If the projected size of this tile on screen is larger than actual tileSize, we need higher resolution
    const shouldSubdivide = projectedTileSize > this.tileSize;

    if (shouldSubdivide && !node.isLeaf) {
      // Push parent as fallback so it renders underneath and covers any loading gaps
      visibleNodes.push({
        node: node,
        worldBox: { minX: worldMinX, maxX: worldMaxX, minY: worldMinY, maxY: worldMaxY },
        isFallback: true
      });
      // Subdivide! Project size halves for children
      for (const childIdx of node.childrenIndices) {
        this.traverse(childIdx, frustumBounds, projectedTileSize / 2, visibleNodes);
      }
    } else {
      // Render this node
      visibleNodes.push({
        node: node,
        worldBox: { minX: worldMinX, maxX: worldMaxX, minY: worldMinY, maxY: worldMaxY },
        isFallback: false
      });
    }
  }
}
