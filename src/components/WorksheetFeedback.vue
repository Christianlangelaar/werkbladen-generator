<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
    requestId: string
    group: string
    exercise: string
    itemIndex: number
}>()

const categories = [
    { value: 'incorrect', label: 'Antwoord of opdracht klopt niet' },
    { value: 'unclear', label: 'Opdracht is onduidelijk' },
    { value: 'inappropriate', label: 'Inhoud is niet geschikt' },
    { value: 'too-easy', label: 'Te makkelijk' },
    { value: 'too-hard', label: 'Te moeilijk' },
]
const category = ref('')
const isSubmitting = ref(false)
const status = ref('')

async function submit() {
    if (!category.value || isSubmitting.value) return

    isSubmitting.value = true
    status.value = ''
    try {
        const response = await fetch('/api/feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                requestId: props.requestId,
                group: props.group,
                exercise: props.exercise,
                itemIndex: props.itemIndex,
                category: category.value,
            }),
        })
        if (!response.ok) throw new Error('Feedback versturen mislukt.')
        status.value = `Bedankt. Feedback voor opdracht ${props.itemIndex} is ontvangen.`
        category.value = ''
    } catch {
        status.value = 'De feedback kon niet worden verstuurd. Probeer het later opnieuw.'
    } finally {
        isSubmitting.value = false
    }
}
</script>

<template>
    <div class="mt-3 border-t border-slate-100 pt-3">
        <div class="flex flex-col gap-2 sm:flex-row">
            <label
                :for="`feedback-${itemIndex - 1}`"
                class="sr-only"
            >
                Probleem met opdracht {{ itemIndex }}
            </label>
            <select
                :id="`feedback-${itemIndex - 1}`"
                v-model="category"
                class="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-xs text-slate-800"
            >
                <option value="">
                    Meld een probleem
                </option>
                <option
                    v-for="option in categories"
                    :key="option.value"
                    :value="option.value"
                >
                    {{ option.label }}
                </option>
            </select>
            <button
                type="button"
                class="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                :disabled="!category || isSubmitting"
                @click="submit"
            >
                {{ isSubmitting ? 'Versturen...' : 'Verstuur feedback' }}
            </button>
        </div>
        <p
            v-if="status"
            class="mt-2 text-sm text-slate-700"
            role="status"
        >
            {{ status }}
        </p>
    </div>
</template>
