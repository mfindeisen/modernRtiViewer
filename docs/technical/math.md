# Mathematics & Shader Architecture

The core magic of RTI (Reflectance Transformation Imaging) happens inside the WebGL fragment shaders in `RtiShaders.ts`. These shaders reconstruct photorealistic lighting dynamically using pre-calculated coefficients or a Neural MLP stored in image textures.

There are three formulations supported by this viewer: **PTM**, **HSH**, and **Neural RTI**.

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

*(Note: Although historically named `Bias` and `Scale` in `info.xml` / `info.json`, the `Bias` tag actually holds the multiplier and the `Scale` tag holds the additive offset).*

---

## 1. Polynomial Texture Mapping (PTM)

PTM uses a 2D biquadratic polynomial to estimate the reflectance. It assumes the light direction $(u, v)$ is projected onto a flat 2D plane.

$$
L = a_0 u^2 + a_1 v^2 + a_2 uv + a_3 u + a_4 v + a_5
$$

where $u$ and $v$ are the $x$ and $y$ components of the normalized light direction vector, and $a_0,\ldots,a_5$ are the six coefficients extracted from two LRGB textures.

The final color is the base RGB texture multiplied by this reconstructed luminance $L$.

---

## 2. Hemispherical Harmonics (HSH)

HSH is a more modern, physically accurate formulation based on spherical harmonics, but restricted to the upper hemisphere (since light cannot shine from underneath a flat surface).

Instead of a simple polynomial, HSH uses four basis functions of the spherical coordinates $\varphi$ (azimuth) and $\theta$ (elevation) of the light vector.

$$
\begin{aligned}
\ell_0 &= \frac{1}{\sqrt{2\pi}} \\
\ell_1 &= \sqrt{\frac{6}{\pi}}\,\cos\varphi\,\sqrt{\max\bigl(0,\, \cos\theta - \cos^2\theta\bigr)} \\
\ell_2 &= \sqrt{\frac{3}{2\pi}}\,(2\cos\theta - 1) \\
\ell_3 &= \sqrt{\frac{6}{\pi}}\,\sin\varphi\,\sqrt{\max\bigl(0,\, \cos\theta - \cos^2\theta\bigr)}
\end{aligned}
$$

$$
\mathbf{C} = c_0 \ell_0 + c_1 \ell_1 + c_2 \ell_2 + c_3 \ell_3
$$

Unlike PTM, which uses a single luminance multiplier, HSH stores these coefficients separately for the red, green, and blue channels. That means four complete RGB textures (12 coefficients per pixel) reconstruct color shifts depending on the light angle, with higher fidelity and more accurate highlights.

### Interaction Constraints

To prevent the equations from breaking down at extreme grazing angles (where the light is exactly parallel to the surface, $n_z = 0$), the UI in `RtiViewer.vue` clamps the maximum light radius to $0.95$. This keeps a slight elevation, so the image does not turn completely black when the pointer is pulled far outside the active area.

---

## 3. Neural RTI

Neural RTI does not store per-pixel polynomials. Each pixel has a 4D latent vector (RGBA texture). A shared decoder MLP (three linear layers, 16 hidden units) runs in the fragment shader:

$$
\mathbf{C} = \mathrm{DecoderMLP}(\mathbf{z}, \mathbf{l})
$$

where $\mathbf{z}$ is the latent vector and $\mathbf{l}$ is the normalized light direction.

Because the representation has no stored normals, specular / heatmap / dual-light modes estimate a pseudo-normal with finite differences of MLP luminance around nadir lighting. See the rtiDb documentation portal for packaging constraints (`rtiprep` nearest-neighbour overviews).

---

## 4. Advanced Rendering Modes

In addition to standard diffuse and specular shading, the viewer implements specialized mathematical visualizations to aid scientific analysis.

### Slope Heatmap

Rather than displaying the normal $(N_x, N_y, N_z)$ directly as RGB, the slope heatmap uses the absolute steepness of the surface:

$$
s = 1 - N_z
$$

If a pixel points directly at the camera ($N_z = 1$), then $s = 0$ (flat). As the surface turns away, $N_z$ drops and $s$ increases. This scalar is mapped with `mix()` to a blue-to-red thermal gradient, amplifying shallow scratches.

### Dual Light (Opposing Raking Light)

This mode evaluates two lighting equations in a single pass. From the primary light $\mathbf{L}_1$ it builds a virtual opposite light that keeps the same elevation:

$$
\mathbf{L}_2 = (-L_{1x},\, -L_{1y},\, L_{1z})
$$

```glsl
vec3 L2 = vec3(-L1.x, -L1.y, L1.z);
```

Luminance is computed independently for both directions. $\mathbf{L}_1$ is tinted red $(1.0,\, 0.3,\, 0.1)$ and $\mathbf{L}_2$ blue $(0.1,\, 0.5,\, 1.0)$. The sum of the two colored results gives strong edge contrast, useful for tool marks in archaeology.
