import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "Modern RTI Viewer",
  description: "A high-performance Vue 3 & Three.js viewer for Reflectance Transformation Imaging (RTI) data.",
  base: '/docs/',
  outDir: '../dist/docs',
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Technical Details', link: '/technical/architecture' }
    ],

    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Getting Started', link: '/guide/getting-started' },
        ]
      },
      {
        text: 'Technical Documentation',
        items: [
          { text: 'Architecture & Quadtree', link: '/technical/architecture' },
          { text: 'Math & Shaders (PTM/HSH)', link: '/technical/math' }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/vuejs/vitepress' }
    ]
  }
})
