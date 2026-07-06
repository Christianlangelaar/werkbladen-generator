<script setup lang="ts">
import { ref } from 'vue'
import { generateWorksheetPdf } from '../services/generateWorksheetPdf'

const group = ref('4')
const exercise = ref('contextsommen')
const amount = ref(10)
const amountError = ref('')
const generationError = ref('')
const isGenerating = ref(false)
const maxAmount = 50

const fieldClass = 'w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-950 transition disabled:cursor-wait disabled:bg-slate-50 disabled:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100'
const selectClass = `${fieldClass} appearance-none pr-12`

function validateAmount() {
    if (amount.value > maxAmount) {
        amountError.value = `Je kunt maximaal ${maxAmount} opdrachten genereren.`

        return false
    }

    amountError.value = ''

    return true
}

function wait(milliseconds: number) {
    return new Promise((resolve) => {
        window.setTimeout(resolve, milliseconds)
    })
}

async function generatePdf() {
    if (!validateAmount()) {
        return
    }

    generationError.value = ''
    isGenerating.value = true

    try {
        await Promise.all([
            generateWorksheetPdf(
                group.value,
                exercise.value,
                amount.value,
            ),
            wait(900),
        ])
    } catch (error) {
        generationError.value = error instanceof Error
            ? error.message
            : 'Er ging iets mis met het genereren van de PDF.'
    } finally {
        isGenerating.value = false
    }
}
</script>

<template>
    <form
        class="mt-8 space-y-6"
        :aria-busy="isGenerating ? 'true' : 'false'"
        @submit.prevent="generatePdf"
    >
        <div>
            <label class="mb-2 block text-sm font-medium text-slate-700">
                Groep
            </label>

            <div class="relative">
                <select
                    v-model="group"
                    :disabled="isGenerating"
                    :class="selectClass"
                >
                    <option value="4">
                        Groep 4
                    </option>
                </select>

                <span class="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-500">
                    <svg
                        aria-hidden="true"
                        class="h-5 w-5"
                        viewBox="0 0 20 20"
                        fill="none"
                    >
                        <path
                            d="M5 7.5L10 12.5L15 7.5"
                            stroke="currentColor"
                            stroke-width="1.8"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        />
                    </svg>
                </span>
            </div>
        </div>

        <div>
            <label class="mb-2 block text-sm font-medium text-slate-700">
                Oefensoort
            </label>

            <div class="relative">
                <select
                    v-model="exercise"
                    :disabled="isGenerating"
                    :class="selectClass"
                >
                    <option value="contextsommen">
                        Contextsommen
                    </option>
                </select>

                <span class="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-500">
                    <svg
                        aria-hidden="true"
                        class="h-5 w-5"
                        viewBox="0 0 20 20"
                        fill="none"
                    >
                        <path
                            d="M5 7.5L10 12.5L15 7.5"
                            stroke="currentColor"
                            stroke-width="1.8"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        />
                    </svg>
                </span>
            </div>
        </div>

        <div>
            <label class="mb-2 block text-sm font-medium text-slate-700">
                Aantal opdrachten
            </label>

            <input
                v-model.number="amount"
                type="number"
                min="1"
                :max="maxAmount"
                :disabled="isGenerating"
                :class="fieldClass"
                :aria-invalid="amountError ? 'true' : 'false'"
                aria-describedby="amount-error"
                @input="validateAmount"
            >

            <p
                v-if="amountError"
                id="amount-error"
                class="mt-2 text-sm text-red-600"
            >
                {{ amountError }}
            </p>
        </div>

        <button
            type="submit"
            :disabled="isGenerating"
            class="relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-wait disabled:bg-blue-500"
        >
            <span
                v-if="isGenerating"
                class="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white"
                aria-hidden="true"
            />

            <span>{{ isGenerating ? 'Werkblad wordt gemaakt...' : 'Genereer PDF' }}</span>

            <span
                v-if="isGenerating"
                class="absolute inset-x-0 bottom-0 h-1 overflow-hidden bg-white/20"
                aria-hidden="true"
            >
                <span class="block h-full w-1/2 animate-pulse rounded-full bg-white/80" />
            </span>
        </button>

        <p
            v-if="generationError"
            class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            role="alert"
        >
            {{ generationError }}
        </p>
    </form>
</template>
