<script setup lang="ts">
import { onMounted, ref } from 'vue'
import AnalyticsConsent from './components/AnalyticsConsent.vue'
import AccountPanel from './components/AccountPanel.vue'
import ProductFeedback from './components/ProductFeedback.vue'
import WorksheetForm from './components/WorksheetForm.vue'
import { getAnalyticsConsent, setAnalyticsConsent } from './services/analyticsConsent'
import {
  disablePostHogAnalytics,
  enablePostHogAnalytics,
  isPostHogConfigured,
} from './services/posthogAnalytics'

const showAnalyticsConsent = ref(false)
const showProductFeedback = ref(false)

onMounted(() => {
  if (!isPostHogConfigured()) return

  const consent = getAnalyticsConsent()
  showAnalyticsConsent.value = consent === null
  if (consent === 'granted') void enablePostHogAnalytics()
})

function acceptAnalytics() {
  setAnalyticsConsent('granted')
  showAnalyticsConsent.value = false
  void enablePostHogAnalytics()
}

function declineAnalytics() {
  setAnalyticsConsent('denied')
  showAnalyticsConsent.value = false
  disablePostHogAnalytics()
}
</script>

<template>
  <main class="min-h-screen bg-emerald-50 flex items-center justify-center p-4 sm:p-6">
    <div class="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl shadow-emerald-950/10 sm:p-10">
      <p class="text-sm font-semibold uppercase tracking-wide text-emerald-700">
        AI-hulp voor leerkrachten
      </p>

      <h1 class="text-3xl font-bold text-emerald-950">
        Werkbladen Generator
      </h1>

      <p class="mt-2 text-lg font-medium text-slate-700">
        Maak in enkele minuten passend oefenmateriaal voor iedere leerling.
      </p>

      <p class="mt-2 text-sm text-slate-500">
        Stem af op groep, niveau en thema en print direct een werkblad of compleet werkboekje.
      </p>

      <AccountPanel class="mt-6" />

      <WorksheetForm />

      <footer class="mt-8 border-t border-slate-100 pt-5 text-center text-xs text-slate-500">
        <button
          type="button"
          class="inline-flex min-h-8 items-center font-medium underline decoration-slate-300 underline-offset-4 hover:text-emerald-800"
          @click="showProductFeedback = true"
        >
          Feedback geven
        </button>
        <a
          href="/privacy.html"
          class="ml-3 font-medium underline decoration-slate-300 underline-offset-4 hover:text-emerald-800"
        >
          Privacy en gegevensgebruik
        </a>
        <button
          v-if="isPostHogConfigured()"
          type="button"
          class="ml-3 font-medium underline decoration-slate-300 underline-offset-4 hover:text-emerald-800"
          @click="showAnalyticsConsent = true"
        >
          Analyticsinstellingen
        </button>
      </footer>
    </div>
  </main>

  <AnalyticsConsent
    v-if="showAnalyticsConsent"
    @accept="acceptAnalytics"
    @decline="declineAnalytics"
  />
  <ProductFeedback
    v-if="showProductFeedback"
    @close="showProductFeedback = false"
  />
</template>
