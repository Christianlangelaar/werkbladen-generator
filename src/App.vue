<script setup lang="ts">
import WorksheetForm from './components/WorksheetForm.vue'
</script>

<template>
  <main class="min-h-screen bg-slate-100 flex items-center justify-center p-6">
    <div class="w-full max-w-xl rounded-2xl bg-white p-10 shadow-xl">
      <h1 class="text-3xl font-bold text-slate-800">
        Werkbladen Generator
      </h1>

      <p class="mt-2 text-slate-500">
        Maak binnen enkele seconden een werkblad voor je kind.
      </p>

      <WorksheetForm />
    </div>
  </main>
</template>