<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  deleteLibraryItem,
  deleteAccount,
  getAccount,
  logout,
  requestLoginCode,
  updateFavorite,
  verifyLoginCode,
  type Account,
  type LibraryItem,
} from '../services/account'

const account = ref<Account>()
const library = ref<LibraryItem[]>([])
const isOpen = ref(false)
const loading = ref(true)
const submitting = ref(false)
const email = ref('')
const code = ref('')
const codeRequested = ref(false)
const message = ref('')

const sortedLibrary = computed(() => [...library.value].sort((left, right) => (
  Number(right.favorite) - Number(left.favorite) || right.createdAt.localeCompare(left.createdAt)
)))

async function refreshAccount() {
  try {
    const result = await getAccount()
    account.value = result?.account
    library.value = result?.library ?? []
  } catch {
    message.value = 'Je account kon niet worden geladen.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void refreshAccount()
  window.addEventListener('worksheet-library-updated', refreshAccount)
})
onBeforeUnmount(() => window.removeEventListener('worksheet-library-updated', refreshAccount))

async function sendCode() {
  submitting.value = true
  message.value = ''
  try {
    await requestLoginCode(email.value)
    codeRequested.value = true
    message.value = 'De zescijferige code is naar je e-mailadres gestuurd.'
  } catch (error) {
    message.value = error instanceof Error ? error.message : 'De code kon niet worden verstuurd.'
  } finally {
    submitting.value = false
  }
}

async function signIn() {
  submitting.value = true
  message.value = ''
  try {
    const result = await verifyLoginCode(email.value, code.value)
    account.value = result.account
    library.value = result.library
    code.value = ''
    codeRequested.value = false
    message.value = 'Je bent ingelogd. Nieuwe werkbladen worden automatisch opgeslagen.'
  } catch (error) {
    message.value = error instanceof Error ? error.message : 'Inloggen is niet gelukt.'
  } finally {
    submitting.value = false
  }
}

async function signOut() {
  await logout()
  account.value = undefined
  library.value = []
  email.value = ''
  message.value = 'Je bent uitgelogd.'
}

async function removeAccount() {
  if (!window.confirm('Weet je zeker dat je je account en opgeslagen werkbladen definitief wilt verwijderen?')) return
  await deleteAccount()
  account.value = undefined
  library.value = []
  email.value = ''
  message.value = 'Je account en opgeslagen werkbladen zijn verwijderd.'
}

async function toggleFavorite(item: LibraryItem) {
  const result = await updateFavorite(item.id, !item.favorite)
  Object.assign(item, result.item)
}

async function removeItem(item: LibraryItem) {
  await deleteLibraryItem(item.id)
  library.value = library.value.filter((candidate) => candidate.id !== item.id)
}

function reuseItem(item: LibraryItem) {
  window.dispatchEvent(new CustomEvent('worksheet-library-apply', { detail: item.settings }))
  isOpen.value = false
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('nl-NL', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}
</script>

<template>
  <section class="mb-6 rounded-xl border border-emerald-200 bg-emerald-50/70">
    <button
      type="button"
      class="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-left font-semibold text-emerald-950"
      :aria-expanded="isOpen"
      @click="isOpen = !isOpen"
    >
      <span>{{ account ? `Mijn account · ${account.email}` : 'Inloggen of registreren' }}</span>
      <span aria-hidden="true">{{ isOpen ? '−' : '+' }}</span>
    </button>

    <div v-if="isOpen" class="space-y-4 border-t border-emerald-100 p-4">
      <p v-if="loading" class="text-sm text-slate-600">Account laden…</p>

      <template v-else-if="!account">
        <p class="text-sm text-slate-600">
          Ontvang een eenmalige code per e-mail. Je account bewaart je gratis tegoed en credits en werkt op ieder apparaat.
        </p>
        <label class="block text-sm font-medium text-slate-700" for="account-email">E-mailadres</label>
        <input
          id="account-email"
          v-model="email"
          type="email"
          autocomplete="email"
          required
          class="w-full rounded-lg border border-slate-300 px-4 py-3 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100"
        >
        <button
          v-if="!codeRequested"
          type="button"
          :disabled="submitting || !email"
          class="w-full rounded-lg bg-emerald-700 px-4 py-3 font-semibold text-white disabled:opacity-60"
          @click="sendCode"
        >
          {{ submitting ? 'Code versturen…' : 'Stuur inlogcode' }}
        </button>
        <template v-else>
          <label class="block text-sm font-medium text-slate-700" for="account-code">Zescijferige code</label>
          <input
            id="account-code"
            v-model="code"
            inputmode="numeric"
            autocomplete="one-time-code"
            maxlength="6"
            class="w-full rounded-lg border border-slate-300 px-4 py-3 text-center text-xl tracking-[0.35em] focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100"
          >
          <button
            type="button"
            :disabled="submitting || code.length !== 6"
            class="w-full rounded-lg bg-emerald-700 px-4 py-3 font-semibold text-white disabled:opacity-60"
            @click="signIn"
          >
            {{ submitting ? 'Controleren…' : 'Inloggen' }}
          </button>
          <button type="button" class="text-sm font-medium text-emerald-800 underline" @click="codeRequested = false">
            Ander e-mailadres gebruiken
          </button>
        </template>
      </template>

      <template v-else>
        <div class="flex flex-wrap items-center justify-between gap-3 text-sm">
          <p class="text-slate-600">Account: <strong class="text-slate-900">Gratis tegoed en credits</strong></p>
          <button type="button" class="font-medium text-emerald-800 underline" @click="signOut">Uitloggen</button>
        </div>
        <div>
          <h2 class="font-semibold text-slate-900">Mijn werkbladen</h2>
          <p v-if="library.length === 0" class="mt-2 text-sm text-slate-600">
            Nieuwe werkbladen en werkboekjes verschijnen hier automatisch.
          </p>
          <ul v-else class="mt-3 space-y-3">
            <li v-for="item in sortedLibrary" :key="item.id" class="rounded-lg border border-slate-200 bg-white p-3">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="font-semibold text-slate-900">{{ item.title }}</p>
                  <p class="mt-1 text-xs text-slate-500">
                    Groep {{ item.group }} · {{ item.pageCount }} {{ item.pageCount === 1 ? 'pagina' : "pagina's" }} · {{ formatDate(item.createdAt) }}
                  </p>
                </div>
                <button type="button" :aria-label="item.favorite ? 'Verwijder uit favorieten' : 'Voeg toe aan favorieten'" class="text-xl" @click="toggleFavorite(item)">
                  {{ item.favorite ? '★' : '☆' }}
                </button>
              </div>
              <div class="mt-3 flex flex-wrap gap-2">
                <button type="button" class="rounded-md bg-emerald-700 px-3 py-2 text-xs font-semibold text-white" @click="reuseItem(item)">Instellingen gebruiken</button>
                <button type="button" class="rounded-md border border-red-200 px-3 py-2 text-xs font-semibold text-red-700" @click="removeItem(item)">Verwijderen</button>
              </div>
            </li>
          </ul>
        </div>
        <button type="button" class="text-xs font-medium text-red-700 underline" @click="removeAccount">
          Account en opgeslagen gegevens verwijderen
        </button>
      </template>

      <p v-if="message" role="status" class="text-sm text-slate-700">{{ message }}</p>
      <p class="text-xs text-slate-500">
        We bewaren je e-mailadres, accountinstellingen en werkbladinhoud. PDF-bestanden blijven op je apparaat.
      </p>
    </div>
  </section>
</template>
