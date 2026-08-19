# Modern RTI Viewer

The Modern RTI Viewer is a rewrite of traditional `spidergl` RTI viewers, using Vue 3 and Three.js. It has a quadtree LOD system and real-time lighting in custom WebGL shaders, and builds to a standalone web component (`<modern-rti-viewer>`).

Unified ecosystem docs (including rtiDb integration) live in the [rtiDb documentation portal](https://github.com/mfindeisen/rtiDb). This repo also has its own VitePress site under `docs/`.

## Installation

Requires Node.js and [pnpm](https://pnpm.io/):

```bash
pnpm install
pnpm run dev
```

The Vite demo app is typically at `http://localhost:5173`. Docs: `pnpm run docs:dev` (port 5174).

```bash
pnpm test          # Vitest unit tests
pnpm test:e2e      # Playwright smoke test
```

## Loading data

The viewer accepts a URL to either:

- A **directory** with `info.json` or `info.xml` and hierarchical image tiles (JPEG/PNG/WebP), or
- A single **tiled pyramidal TIFF** (COG-like) with coefficient or Neural RTI latent bands and JSON metadata in `ImageDescription`, loaded via HTTP Range Requests (`geotiff.js`, code-split so JPEG datasets skip that cost)

Prepare `.rti` / `.ptm` files with **[rtiprep](https://github.com/mfindeisen/rtiprep)** (`-format jpg|png|webp` for a tile folder, `-tiff` for a GeoTIFF, optional `-legacy` for `info.xml`). Neural RTI: `rtiprep -tiff -weights decoder_weights.json latent_map.png`.

We gratefully acknowledge [jcupitt/webRTIViewer](https://github.com/jcupitt/webRTIViewer) and the C++ `webGLRtiMaker` utility used historically for directory tiles.

## Feature config

Tools and render modes are toggled in `src/viewerConfig.json`. Hosts can override at runtime (`:features` Vue prop or the `features` attribute on the web component). Line drawing and 3D mesh preview are marked experimental by default. `annotation-enabled` still gates annotate mode per session.

## Interface modes

1. **Pan & Zoom (hand):** drag to pan, scroll/pinch to zoom. Higher-resolution tiles load as you zoom. Pointer events cover mouse and touch, including the compass.
2. **Light direction (lightbulb):** drag on the canvas (or the compass) to change lighting. Uses PTM, HSH, or Neural MLP coefficients.

## Render modes

- **Default** — diffuse reflectance from coefficients or the Neural MLP
- **Specular enhancement / glossy** — Blinn-Phong highlight
- **Normals** — from coefficients, or finite differences for Neural RTI
- **Slope heatmap** — steepness as a blue→red gradient
- **Dual light** — opposing raking lights (red / blue)
- **Line drawing (experimental)** — ridges and valleys from photometric normals
- **Latent map (Neural RTI only)** — raw latent RGB
- **3D mesh preview (experimental)**

## Technical details

Shaders in `RtiShaders.ts` / `shaderChunks.ts` reconstruct lighting from textures. Three formulations:

1. **PTM** — biquadratic polynomial: $L = a_0 u^2 + a_1 v^2 + a_2 uv + a_3 u + a_4 v + a_5$
2. **HSH** — four hemispherical-harmonic bases per RGB channel
3. **Neural RTI** — 4D latent map + global decoder MLP in the fragment shader

Architecture (composables, quadtree, lazy GeoTIFF, web-component events) is documented in `docs/technical/architecture.md`. Embed via `src/lib.ts` / `vite.config.ts`.
