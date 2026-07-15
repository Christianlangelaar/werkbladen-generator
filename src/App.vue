<script setup lang="ts">
import WorksheetForm from './components/WorksheetForm.vue'
</script>

<template>
  <main class="min-h-screen bg-emerald-50 flex items-center justify-center p-4 sm:p-6">
    <div class="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl shadow-emerald-950/10 sm:p-10">
      <h1 class="text-3xl font-bold text-emerald-950">
        Werkbladen Generator
      </h1>

      <p class="mt-2 text-slate-500">
        Maak binnen enkele seconden een werkblad voor je kind.
      </p>

      <WorksheetForm />

      <footer class="mt-8 border-t border-slate-100 pt-5 text-center text-xs text-slate-500">
        <a
          href="/privacy.html"
          class="font-medium underline decoration-slate-300 underline-offset-4 hover:text-emerald-800"
        >
          Privacy en gegevensgebruik
        </a>
      </footer>
    </div>
  </main>
</template>
