# Architecture & Quadtree System

The `modernRtiViewer` combines Vue 3 for UI and state with Three.js for WebGL rendering. The codebase is organized as a thin view layer, a facade composable, and focused modules for rendering, interaction, and data loading.

## Layered Architecture

```
RtiViewer.vue              ← template + props only (~180 lines)
└── useRtiViewer.js        ← facade: wires all composables
    ├── useRenderSettings  ← render mode, specular
    ├── useRtiRenderer     ← WebGL scene, tiles, render loop
    ├── useAnnotations     ← SVG overlay, drawing
    ├── useWhiteBalance    ← color correction
    ├── useRtiInteraction  ← pan / light / annotate modes
    └── useViewerChrome    ← share, export, fullscreen, host API
```

Supporting libraries live in `src/lib/`:

| Module | Role |
|---|---|
| `QuadtreeManager.js` | LOD tile hierarchy and visibility |
| `tileMeshLoader.js` | Async tile loading (JPG tiles or TIFF) |
| `textureCache.js` | LRU cache for decoded tile textures |
| `meshUniforms.js` | Sync light / render / color uniforms |
| `rtiMaterialFactory.js` | Pick shader material by RTI type |
| `RtiShaders.js` + `shaderChunks.js` | GLSL materials (HSH, PTM, Neural) |
| `rtiInfoLoader.js` | Parse `info.json` / `info.xml` metadata |
| `openTiffDataset.js` | Lazy-load GeoTIFF stack on demand |
| `viewerUrl.js` / `viewerViewState.js` | Share URLs and view restore |

The public embed API is unchanged: `modern-rti-viewer` Web Component via `src/lib.js`.

## Vue 3 & Three.js Integration

Unlike traditional 3D apps that render every frame unconditionally, this viewer uses a **reactive render pipeline**. In `useRtiRenderer`, the animation loop runs continuously, but tile loading and overlay updates are driven by camera zoom, light direction, and render settings. Vue refs (`camera`, `lightDir`, `renderMode`, etc.) flow into shader uniforms through `meshUniforms.js`.

## GeoTIFF Lazy Loading

GeoTIFF decoding (`geotiff.js` and its codec workers) is only loaded when the dataset URL ends in `.tif` / `.tiff`. Standard JPG-tile datasets never pay that bundle cost.

```js
// openTiffDataset.js — dynamic import, code-split by Vite
const { TiffTileLoader } = await import('./TiffTileLoader.js');
```

JPG tile datasets use `THREE.TextureLoader` directly inside `tileMeshLoader.js`.

## The Quadtree Manager (LOD System)

RTI images are often extremely large (e.g. 16,384 × 16,384 pixels or more). Loading such an image directly into browser memory is not feasible. The RTI format chunks the image into 256×256 pixel tiles across multiple zoom levels.

`QuadtreeManager.js` orchestrates this hierarchy.

### How it works

1. **Tree construction:** When `info.xml` or `info.json` is parsed, the quadtree calculates how many zoom levels exist (Level 0 with a single tile up to Level N).
2. **Intersection testing:** As the user pans/zooms, `updateTiles()` in `useRtiRenderer` computes the camera frustum in world space. The quadtree returns visible nodes whose bounding boxes intersect the view.
3. **LOD selection:** The projected tile size on screen determines the desired level of detail. Deeper levels are chosen when zoomed in.
4. **Tile loading:** Selected tile IDs load asynchronously via `tileMeshLoader.js`. Parent tiles stay visible until children finish loading to avoid empty gaps.

### Padding and bounds masking

RTI images are padded to the nearest power of 2. `QuadtreeManager` computes an `imgBox` in normalized `[0, 1]` space. Shaders receive this as `uBounds` (via `shaderChunks.js`) to clip padded black regions.

## Shader System

`shaderChunks.js` holds shared GLSL: vertex shader, bounds check, slope heatmap, shaded normals, and color correction. `RtiShaders.js` builds HSH, LRGB PTM, and Neural RTI materials from those chunks via `buildRtiFragmentShader()`.

## Testing

Unit tests live in `tests/` (mirroring `src/`) and use Vitest + happy-dom. Imports use the `@/` alias → `src/`.

```bash
pnpm test        # unit tests (Vitest)
pnpm test:watch  # watch mode
pnpm test:e2e    # Playwright smoke test (starts Vite dev server)
```

Tests cover URL parsing, annotation math, quadtree logic, composable helpers, shaders, and UI components. Renderer integration is exercised manually via the demo app (`pnpm dev`).

## Host Integration (Web Component)

The `<modern-rti-viewer>` element dispatches:

- `rti-loaded` — metadata ready
- `annotation-create` / `annotation-click` — annotation events
- accepts `rti-command` custom events for `set-annotations`, `restore-view`, `resize`, `select-annotation`

Observed attributes: `url`, `share-url`, and `annotation-enabled` are reactive — changing them updates the embedded viewer without remounting.

See `useViewerChrome.js` for the host command handler.
