<template>
  <div class="min-h-screen bg-slate-50 text-slate-900 p-8">
    <header class="max-w-6xl mx-auto mb-8 flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold bg-gradient-to-r from-blue-600 to-emerald-500 bg-clip-text text-transparent">
          Modern WebRTI Viewer
        </h1>
        <p class="text-slate-500 mt-2">Next-generation WebGL2 Reflectance Transformation Imaging built with Three.js</p>
      </div>
      <a href="/docs/" target="_blank" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
        Documentation
      </a>
    </header>

    <main class="max-w-6xl mx-auto">
      <div class="glass-card p-6 border border-slate-200 shadow-xl rounded-2xl bg-white">
        <!-- The Viewer Component -->
        <RtiViewer url="/test-record" />
      </div>
    </main>
  </div>
</template>

<script setup>
import RtiViewer from './components/RtiViewer.vue';
</script>
