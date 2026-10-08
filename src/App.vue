<template>
  <div class="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 p-8 transition-colors">
    <header class="max-w-6xl mx-auto mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-3xl font-bold bg-gradient-to-r from-blue-600 to-emerald-500 dark:from-blue-400 dark:to-emerald-400 bg-clip-text text-transparent">
          Modern WebRTI Viewer
        </h1>
        <p class="text-slate-500 dark:text-slate-400 mt-2">Next-generation WebGL2 Reflectance Transformation Imaging built with Three.js</p>
      </div>
      <div class="flex items-center gap-2 self-start">
        <button
          type="button"
          :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
          :title="isDark ? 'Light mode' : 'Dark mode'"
          class="w-10 h-10 rounded-lg flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 transition-colors"
          @click="toggleTheme"
        >
          <SunIcon v-if="isDark" class="w-4 h-4" />
          <MoonIcon v-else class="w-4 h-4" />
        </button>
        <a :href="docsUrl" target="_blank" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 rounded-lg font-medium transition-colors flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
          Documentation
        </a>
      </div>
    </header>

    <main class="max-w-6xl mx-auto">
      <form class="mb-4 flex flex-col sm:flex-row gap-2" @submit.prevent="applyUrl">
        <label class="sr-only" for="dataset-url">Dataset URL</label>
        <input
          id="dataset-url"
          v-model="datasetUrl"
          type="text"
          placeholder="/test-record or https://…/info.json"
          class="flex-1 px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
        />
        <button type="submit" class="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white">
          Load
        </button>
      </form>
      <aside v-if="!noticeDismissed" class="relative mb-4 pl-4 pr-10 py-3 rounded-lg border border-amber-200 bg-amber-50 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
        <button
          type="button"
          aria-label="Dismiss notice"
          class="absolute top-2 right-2 w-7 h-7 rounded-md flex items-center justify-center text-amber-700 hover:bg-amber-100 hover:text-amber-950 dark:text-amber-300 dark:hover:bg-amber-500/20 dark:hover:text-amber-100 transition-colors"
          @click="dismissNotice"
        >
          <XIcon class="w-4 h-4" />
        </button>
        <p class="font-medium">Standalone demo - some features are intentionally disabled</p>
        <ul class="mt-1 list-disc pl-5 space-y-0.5 text-amber-800 dark:text-amber-200/80">
          <li><strong>Annotations</strong> are not available: they are stored in the
            <a href="https://github.com/mfindeisen/rtiDb" target="_blank" rel="noopener" class="underline hover:text-amber-950 dark:hover:text-amber-100">rtiDb</a>
            database, which this static page has no connection to.</li>
          <li><strong>Scale calibration</strong> works, but is not saved and resets on reload.</li>
          <li><strong>Other datasets</strong> can be loaded by URL only if their server allows cross-origin (CORS) requests.</li>
        </ul>
      </aside>
      <div class="demo-viewer-card glass-card p-6 border border-slate-200 shadow-xl rounded-2xl bg-white dark:border-slate-800 dark:bg-slate-900">
        <RtiViewer :url="loadedUrl" class="min-h-[49rem] h-[min(80vh,calc(100svh-12rem))]" />
      </div>
    </main>

    <footer class="max-w-6xl mx-auto mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-3 text-sm text-slate-500 dark:text-slate-400">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p>Modern RTI Viewer v{{ VIEWER_VERSION }} &middot; GPL-3.0</p>
        <nav class="flex flex-wrap gap-x-5 gap-y-1">
          <a href="https://github.com/mfindeisen/modernRtiViewer" target="_blank" rel="noopener" class="hover:text-slate-900 dark:hover:text-white transition-colors">GitHub</a>
          <a :href="docsUrl" target="_blank" class="hover:text-slate-900 dark:hover:text-white transition-colors">Documentation</a>
          <a href="https://github.com/mfindeisen/rtiDb" target="_blank" rel="noopener" class="hover:text-slate-900 dark:hover:text-white transition-colors">rtiDb</a>
          <a href="https://github.com/mfindeisen/rtiprep" target="_blank" rel="noopener" class="hover:text-slate-900 dark:hover:text-white transition-colors">rtiprep</a>
        </nav>
      </div>
      <p class="text-xs text-slate-400 dark:text-slate-500">
        Sample data: modern obsidian point (<code>Lookout_Mtn</code>) by
        <a href="https://rtimage.us/?page_id=18" target="_blank" rel="noopener" class="underline hover:text-slate-700 dark:hover:text-slate-300">Leszek Pawlowicz</a>
        (Northern Arizona University).
      </p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Moon as MoonIcon, Sun as SunIcon, X as XIcon } from '@lucide/vue';
import RtiViewer from './components/RtiViewer.vue';
import { VIEWER_VERSION } from './version.js';

const STORAGE_KEY = 'modernRtiViewer.datasetUrl';
const NOTICE_KEY = 'modernRtiViewer.demoNoticeDismissed';
const THEME_KEY = 'modernRtiViewer.theme';
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
const noticeDismissed = ref(
  typeof localStorage !== 'undefined' && localStorage.getItem(NOTICE_KEY) === '1',
);
// index.html sets the class before first paint to avoid a light flash.
const isDark = ref(document.documentElement.classList.contains('dark'));

function toggleTheme() {
  isDark.value = !isDark.value;
  document.documentElement.classList.toggle('dark', isDark.value);
  try {
    localStorage.setItem(THEME_KEY, isDark.value ? 'dark' : 'light');
  } catch {
    /* ignore quota / private mode */
  }
}

function dismissNotice() {
  noticeDismissed.value = true;
  try {
    localStorage.setItem(NOTICE_KEY, '1');
  } catch {
    /* ignore quota / private mode */
  }
}

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

<style>
html.dark {
  color-scheme: dark;
  background-color: #020617;
}

/* The viewer squares its top corners on narrow screens to sit flush under an rtiDb header;
   the standalone demo has no header, so keep them rounded. */
@media (max-width: 1023px) {
  .demo-viewer-card .rti-viewer-root,
  .demo-viewer-card .rti-viewer-sidebar {
    border-top-left-radius: 0.75rem !important;
    border-top-right-radius: 0.75rem !important;
  }
}
</style>
