# Architecture & Quadtree System

The `modernRtiViewer` combines Vue 3 for UI and state with Three.js for WebGL rendering. The codebase is TypeScript: a thin view layer, a facade composable, and focused modules for rendering, interaction, and data loading.

## Layered Architecture

```
RtiViewer.vue              ← template + props only (~180 lines)
└── useRtiViewer.ts        ← facade: wires all composables
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
| `QuadtreeManager.ts` | LOD tile hierarchy and visibility |
| `tileMeshLoader.ts` | Async tile loading (JPG tiles or TIFF) |
| `textureCache.ts` | LRU cache for decoded tile textures |
| `meshUniforms.ts` | Sync light / render / color uniforms |
| `rtiMaterialFactory.ts` | Pick shader material by RTI type |
| `RtiShaders.ts` + `shaderChunks.ts` | GLSL materials (HSH, PTM, Neural) |
| `rtiInfoLoader.ts` | Parse `info.json` / `info.xml` metadata |
| `openTiffDataset.ts` | Lazy-load GeoTIFF stack on demand |
| `viewerUrl.ts` / `viewerViewState.ts` | Share URLs and view restore |

The public embed API is the `modern-rti-viewer` Web Component via `src/lib.ts`. TypeScript ESM imports still use `.js` specifiers (e.g. `import './RtiShaders.js'`), even though the source files are `.ts`.

## Vue 3 & Three.js Integration

Unlike traditional 3D apps that render every frame unconditionally, this viewer uses a **reactive render pipeline**. In `useRtiRenderer`, the animation loop runs continuously, but tile loading and overlay updates are driven by camera zoom, light direction, and render settings. Vue refs (`camera`, `lightDir`, `renderMode`, etc.) flow into shader uniforms through `meshUniforms.ts`.

## GeoTIFF Lazy Loading

GeoTIFF decoding (the `geotiff.js` library and its codec workers) is only loaded when the dataset URL ends in `.tif` / `.tiff`. Standard JPG-tile datasets never pay that bundle cost.

```ts
// openTiffDataset.ts — dynamic import, code-split by Vite
const { TiffTileLoader } = await import('./TiffTileLoader.js');
```

JPG tile datasets use `THREE.TextureLoader` directly inside `tileMeshLoader.ts`.

## The Quadtree Manager (LOD System)

RTI images are often extremely large (e.g. 16,384 × 16,384 pixels or more). Loading such an image directly into browser memory is not feasible. The RTI format chunks the image into 256×256 pixel tiles across multiple zoom levels.

`QuadtreeManager.ts` orchestrates this hierarchy.

### How it works

1. **Tree construction:** When `info.xml` or `info.json` is parsed, the quadtree calculates how many zoom levels exist (Level 0 with a single tile up to Level N).
2. **Intersection testing:** As the user pans/zooms, `updateTiles()` in `useRtiRenderer` computes the camera frustum in world space. The quadtree returns visible nodes whose bounding boxes intersect the view.
3. **LOD selection:** The projected tile size on screen determines the desired level of detail. Deeper levels are chosen when zoomed in.
4. **Tile loading:** Selected tile IDs load asynchronously via `tileMeshLoader.ts`. Parent tiles stay visible until children finish loading to avoid empty gaps.

### Padding and bounds masking

RTI images are padded to the nearest power of 2. `QuadtreeManager` computes an `imgBox` in normalized `[0, 1]` space. Shaders receive this as `uBounds` (via `shaderChunks.ts`) to clip padded black regions.

## Shader System

`shaderChunks.ts` holds shared GLSL: vertex shader, bounds check, slope heatmap, shaded normals, and color correction. `RtiShaders.ts` builds HSH, LRGB PTM, and Neural RTI materials from those chunks via `buildRtiFragmentShader()`.

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
- `view-change` — debounced camera / light / mode snapshot
- `rti-export` — PNG data URL from an `export` command with `download: false`

It accepts `rti-command` custom events:

- `set-annotations`, `restore-view`, `resize`, `select-annotation`
- `set-light`, `set-render-mode`, `set-interaction-mode`, `fit`, `export`

Keyboard (when the viewer is focused): `H` pan, `L` light, `W` white balance, `A` annotate, `1–5` render modes, arrows nudge light, `+`/`-` zoom, `F` fit, `S` snapshot, `Esc` back to pan.

Observed attributes: `url`, `share-url`, `annotation-enabled`, `scale-editable`, `tile-format`, `debug`, and `features` are reactive — changing them updates the embedded viewer without remounting.

`features` accepts a JSON object (or a full `{ "features": {…}, "experimental": […] }` document) to turn tools on or off. Defaults live in `src/viewerConfig.json`. Line drawing and 3D mesh preview are enabled and marked experimental unless the config says otherwise.

See `useViewerChrome.ts` for the host command handler.
