# Architecture & Quadtree System

The `modernRtiViewer` is built as a highly performant combination of Vue 3 for UI components and state management, and Three.js for raw WebGL rendering.

## Vue 3 & Three.js Integration

Unlike traditional 3D applications where the render loop constantly draws frames (even when nothing changes), this viewer uses a **reactive render pipeline**. 

In `RtiViewer.vue`, Vue's reactive references (like `camera.value.zoom` or `lightDir.value`) trigger Three.js renders *only* when necessary (e.g. during an active pan/zoom interaction, or when new tiles finish loading). This drastically reduces CPU/GPU usage when the user is idle.

## The Quadtree Manager (LOD System)

RTI images are often extremely large (e.g. 16,384 x 16,384 pixels or more). Loading such an image directly into the browser's memory is impossible. To solve this, the original RTI format chunks the image into smaller 256x256 pixel tiles across multiple "zoom levels".

The `QuadtreeManager.js` component is responsible for orchestrating this hierarchy.

### How it works:
1. **Tree Construction:** When `info.xml` is parsed, the Quadtree calculates how many zoom levels exist (e.g. from Level 0 with a single tile, up to Level N).
2. **Intersection Testing:** As the user moves the camera, `updateTiles()` calculates the visible "World Box" of the camera in normalized space `[0, 1]`. The Quadtree recursively traverses its nodes, checking if a node's bounding box intersects with the camera's view.
3. **LOD Selection:** The manager checks the camera's zoom level. The target `projectedTileSize` dictates the desired Level of Detail (LOD). If a deeper level is needed, it fetches the 4 children of the current node.
4. **Tile Loading:** The selected tile IDs are then loaded asynchronously. If a high-res tile isn't loaded yet, the system temporarily keeps the lower-resolution parent tile visible as a fallback to prevent "popping" or empty gaps.

### Padding and Bounds Masking
RTI images are padded to the nearest power of 2 (e.g. an 8256px image is padded to a 16384px grid).
The `QuadtreeManager` calculates an `imgBox` which restricts rendering exclusively to the valid data boundaries. This boundary is passed to the shaders as `uBounds` to force all padded (black) areas to remain pure black, preventing random shader artifacts at the edges of the image.
