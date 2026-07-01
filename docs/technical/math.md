# Mathematics & Shader Architecture

The core magic of RTI (Reflectance Transformation Imaging) happens inside the WebGL Fragment Shaders (`RtiShaders.js`). These shaders reconstruct photorealistic lighting dynamically using pre-calculated coefficients stored in image textures.

There are two primary mathematical formulations supported by this viewer: **PTM** and **HSH**.

---

## Coefficient Unpacking (Bias and Scale)

Because standard images (like JPEG) only support 8-bit values per channel (0 to 255), we cannot directly store the complex floating-point coefficients required for RTI.
To get around this, the RTI compiler calculates the global minimum (`Bias`) and range (`Scale`) for each coefficient layer across the entire image. 

In the shader, we reconstruct the exact mathematical floating-point value using:
```glsl
// Example for a single coefficient layer
vec3 coefficient = texture2D(tex0, uv).xyz;
coefficient = coefficient * uBias + uScale;
```
*(Note: Although historically named `Bias` and `Scale` in the `info.xml` file, the `Bias` tag actually holds the multiplier and the `Scale` tag holds the additive offset).*

---

## 1. Polynomial Texture Mapping (PTM)

PTM uses a 2D biquadratic polynomial to estimate the reflectance. It assumes the light direction `(u, v)` is projected onto a flat 2D plane.

**The Equation:**
```text
Luminance = a0*u² + a1*v² + a2*u*v + a3*u + a4*v + a5
```
Where:
- `u` and `v` are the X and Y components of the normalized light direction vector.
- `a0` through `a5` are the 6 coefficients extracted from 2 LRGB textures.

The final color is computed by taking the base RGB texture and multiplying it by this reconstructed `Luminance` scalar.

---

## 2. Hemispherical Harmonics (HSH)

HSH is a more modern, physically accurate formulation based on Spherical Harmonics, but restricted to the upper hemisphere (since light cannot shine from underneath a flat surface).

Instead of a simple polynomial, HSH uses 4 complex basis functions based on the spherical coordinates `phi` (azimuth) and `theta` (elevation) of the light vector.

**The Basis Functions:**
```text
l0 = 1.0 / sqrt(2 * π)
l1 = sqrt(6 / π) * cos(phi) * sqrt(max(0, cos(theta) - cos²(theta)))
l2 = sqrt(3 / 2π) * (2 * cos(theta) - 1)
l3 = sqrt(6 / π) * sin(phi) * sqrt(max(0, cos(theta) - cos²(theta)))
```

**The Equation:**
```text
Color (RGB) = (c0 * l0) + (c1 * l1) + (c2 * l2) + (c3 * l3)
```
Unlike PTM which uses a single luminance multiplier, HSH stores these coefficients separately for the Red, Green, and Blue channels. This means HSH uses 4 complete RGB textures (12 coefficients in total per pixel) to reconstruct color shifts depending on the light angle, providing much higher fidelity and more accurate highlights.

### Interaction Constraints

To prevent the equations from breaking down at extreme grazing angles (where the light is exactly parallel to the surface, `nz = 0`), the UI interaction in `RtiViewer.vue` mathematically clamps the maximum light radius to `0.95`. This ensures the light always has a slight elevation, preventing the image from turning completely black when the mouse is pulled far outside the active area.

---

## 3. Advanced Rendering Modes

In addition to standard diffuse and specular shading, the viewer implements specialized mathematical visualizations to aid scientific analysis:

### Slope Heatmap

Rather than displaying the normal vector's `(x,y,z)` values directly as RGB colors, the Slope Heatmap calculates the absolute steepness of the surface at every pixel. 
The steepness is derived directly from the Z-component of the normal vector:
```text
Steepness = 1.0 - N.z
```
If a pixel points directly at the camera (`N.z = 1.0`), the steepness is 0 (flat). As the surface curves away, `N.z` drops, increasing the steepness. This scalar value is then passed through a `mix()` function in the shader to output a blue-to-red thermal gradient, visually amplifying shallow scratches.

### Dual Light (Opposing Raking Light)

This mode calculates two simultaneous lighting equations in a single pass. 
It uses the primary user-defined light direction `L1` and computes a virtual secondary light `L2` placed exactly on the opposite side:
```glsl
vec3 L2 = vec3(-L1.x, -L1.y, L1.z);
```
The shader calculates the resulting luminance for both light vectors independently. `L1` is tinted red `vec3(1.0, 0.3, 0.1)`, and `L2` is tinted blue `vec3(0.1, 0.5, 1.0)`. The sum of these two colored results provides extreme edge-contrast enhancement, highly useful for deciphering tool marks in archaeology.
