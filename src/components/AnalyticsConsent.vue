<script setup lang="ts">
defineEmits<{
  accept: []
  decline: []
}>()
</script>

<template>
  <aside
    class="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-xl rounded-xl border border-emerald-200 bg-white p-4 shadow-xl shadow-emerald-950/15"
    aria-label="Analyticsvoorkeur"
  >
    <p class="text-sm text-slate-700">
      Mogen we anonieme gebruiksgegevens verzamelen om de generator te verbeteren? We meten alleen vaste keuzes en of genereren en downloaden lukt.
      <a
        href="/privacy.html"
        class="font-medium text-emerald-800 underline decoration-emerald-300 underline-offset-4"
      >Meer informatie</a>.
    </p>
    <div class="mt-3 flex flex-wrap gap-2">
      <button
        type="button"
        class="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
        @click="$emit('accept')"
      >
        Toestaan
      </button>
      <button
        type="button"
        class="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        @click="$emit('decline')"
      >
        Niet toestaan
      </button>
    </div>
  </aside>
</template>
