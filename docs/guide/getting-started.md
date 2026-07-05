# Getting Started

The Modern RTI Viewer is a complete rewrite of the traditional `spidergl` based RTI viewers, leveraging the power of Vue 3 and Three.js.

## Installation

If you are a developer looking to build or run the project locally:

1. **Install dependencies:**
   Make sure you have Node.js and `pnpm` installed.
   ```bash
   pnpm install
   ```

2. **Run the Development Server:**
   ```bash
   pnpm run dev
   ```
   This will spin up a Vite development server (usually at `http://localhost:5173`).

3. **Run tests:**
   ```bash
   pnpm test
   pnpm test:e2e
   ```

## Usage Instructions

The viewer loads an RTI dataset via a URL property pointing to either:

- A **directory** containing `info.json` or `info.xml` plus hierarchical JPG tiles, or
- A single **GeoTIFF** file (`.tif` / `.tiff`) produced by `rtiprep -tiff`

GeoTIFF support is loaded on demand — JPG-only datasets do not download the TIFF decoder.

### Interface Modes

The viewer provides several interaction modes on the left sidebar:

1. **Pan & Zoom (Hand Icon):**
   - Click and drag anywhere on the canvas to pan across the image.
   - Use the scroll wheel (or pinch gesture on trackpads) to zoom in and out.
   - The quadtree LOD system will automatically load high-resolution tiles as you zoom in.

2. **Light Direction (Lightbulb Icon):**
   - Click and drag on the main canvas to interactively change the lighting angle.
   - The lighting simulation uses the RTI coefficients (PTM or HSH) to dynamically compute shadows and highlights.
   - **Compass Widget:** The widget in the bottom left provides a visual reference of the current light position (x, y). You can also drag the dot inside the compass to move the light.

### Render Modes

You can switch the mathematical rendering mode:
- **Default Mode:** Computes the standard diffuse reflection based on the encoded RTI coefficients.
- **Specular Enhancement:** Adds an artificial specular highlight on top of the diffuse lighting to enhance surface details and scratches.
- **Normals:** Visualizes the surface normal vectors calculated directly from the RTI coefficients, allowing you to see the raw geometric shape without texture color.
- **Slope Heatmap:** Computes the steepness of the surface and maps it to a color gradient (blue for flat, red for steep). Extremely useful for highlighting shallow engravings or scratches without adjusting the light.
- **Dual Light:** Calculates a secondary, opposite light source (raking light). The primary light is tinted red and the opposing light blue. This creates high-contrast shadows that perfectly reveal fine tool marks and edges.
