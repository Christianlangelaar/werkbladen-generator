<script setup lang="ts">
import { ref } from 'vue'
import { generateWorksheetPdf } from '../services/generateWorksheetPdf'

const group = ref('4')
const exercise = ref('contextsommen')
const amount = ref(10)
const isGenerating = ref(false)

async function generatePdf() {
    isGenerating.value = true

    try {
        await generateWorksheetPdf(
            group.value,
            exercise.value,
            amount.value,
        )
    } finally {
        isGenerating.value = false
    }
}
</script>

<template>
    <form
        class="mt-8 space-y-6"
        @submit.prevent="generatePdf"
    >
        <div>
            <label class="mb-2 block text-sm font-medium text-slate-700">
                Groep
            </label>

            <select
                v-model="group"
                class="w-full rounded-lg border border-slate-300 px-4 py-3 focus:border-blue-500 focus:outline-none"
            >
                <option value="4">
                    Groep 4
                </option>
            </select>
        </div>

        <div>
            <label class="mb-2 block text-sm font-medium text-slate-700">
                Oefensoort
            </label>

            <select
                v-model="exercise"
                class="w-full rounded-lg border border-slate-300 px-4 py-3 focus:border-blue-500 focus:outline-none"
            >
                <option value="contextsommen">
                    Contextsommen
                </option>
            </select>
        </div>

        <div>
            <label class="mb-2 block text-sm font-medium text-slate-700">
                Aantal opdrachten
            </label>

            <input
                v-model.number="amount"
                type="number"
                min="1"
                max="25"
                class="w-full rounded-lg border border-slate-300 px-4 py-3 focus:border-blue-500 focus:outline-none"
            >
        </div>

        <button
            type="submit"
            :disabled="isGenerating"
            class="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
            {{ isGenerating ? 'Bezig met genereren...' : 'Genereer PDF' }}
        </button>
    </form>
</template>
