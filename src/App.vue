<template>
  <div class="min-h-screen bg-slate-50 text-slate-900 p-8">
    <header class="max-w-6xl mx-auto mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-3xl font-bold bg-gradient-to-r from-blue-600 to-emerald-500 bg-clip-text text-transparent">
          Modern WebRTI Viewer
        </h1>
        <p class="text-slate-500 mt-2">Next-generation WebGL2 Reflectance Transformation Imaging built with Three.js</p>
      </div>
      <a :href="docsUrl" target="_blank" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors flex items-center gap-2 self-start">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
        Documentation
      </a>
    </header>

    <main class="max-w-6xl mx-auto">
      <form class="mb-4 flex flex-col sm:flex-row gap-2" @submit.prevent="applyUrl">
        <label class="sr-only" for="dataset-url">Dataset URL</label>
        <input
          id="dataset-url"
          v-model="datasetUrl"
          type="text"
          placeholder="/test-record or https://…/info.json"
          class="flex-1 px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm"
        />
        <button type="submit" class="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800">
          Load
        </button>
      </form>
      <aside class="mb-4 px-4 py-3 rounded-lg border border-amber-200 bg-amber-50 text-sm text-amber-900">
        <p class="font-medium">Standalone demo - some features are intentionally disabled</p>
        <ul class="mt-1 list-disc pl-5 space-y-0.5 text-amber-800">
          <li><strong>Annotations</strong> are not available: they are stored in the
            <a href="https://github.com/mfindeisen/rtiDb" target="_blank" rel="noopener" class="underline hover:text-amber-950">rtiDb</a>
            database, which this static page has no connection to.</li>
          <li><strong>Scale calibration</strong> works, but is not saved and resets on reload.</li>
          <li><strong>Other datasets</strong> can be loaded by URL only if their server allows cross-origin (CORS) requests.</li>
        </ul>
      </aside>
      <div class="glass-card p-6 border border-slate-200 shadow-xl rounded-2xl bg-white">
        <RtiViewer :url="loadedUrl" class="min-h-[49rem] h-[min(80vh,calc(100svh-12rem))]" />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import RtiViewer from './components/RtiViewer.vue';

const STORAGE_KEY = 'modernRtiViewer.datasetUrl';
const base = import.meta.env.BASE_URL;
const docsUrl = `${base}docs/`;
const fallback = import.meta.env.VITE_DEFAULT_DATASET || `${base}test-record`;
const queryUrl = typeof location === 'undefined'
  ? null
  : new URLSearchParams(location.search).get('url');
const initial = queryUrl
  || (typeof localStorage === 'undefined' ? null : localStorage.getItem(STORAGE_KEY))
  || fallback;

const datasetUrl = ref(initial);
const loadedUrl = ref(initial);

function applyUrl() {
  const next = datasetUrl.value.trim() || fallback;
  datasetUrl.value = next;
  loadedUrl.value = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* ignore quota / private mode */
  }
}
</script>
