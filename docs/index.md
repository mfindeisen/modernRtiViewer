---
layout: home

hero:
  name: "Modern RTI Viewer"
  text: "High-Performance Vue 3 & Three.js Viewer"
  tagline: "Interactive rendering for Reflectance Transformation Imaging (RTI) data"
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: Technical Details
      link: /technical/architecture

features:
  - title: Multi-Resolution Quadtree
    details: Loads extremely large gigapixel images smoothly by streaming hierarchical Level-of-Detail (LOD) image tiles on demand.
  - title: PTM, HSH & Neural RTI
    details: Shader-level implementations for Polynomial Texture Mapping, Hemispherical Harmonics, and Neural RTI (latent map + decoder MLP).
  - title: Vue 3 Reactivity
    details: Vue 3 Composition API with Three.js, lazy GeoTIFF loading, and a standalone web-component embed API.
---
