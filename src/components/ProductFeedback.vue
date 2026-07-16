<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'
import { track } from '../services/analytics'

type FeedbackType = 'problem' | 'feature' | 'other'

const emit = defineEmits<{
    close: []
}>()

const feedbackTypes: Array<{ value: FeedbackType, label: string }> = [
    { value: 'problem', label: 'Probleem' },
    { value: 'feature', label: 'Wens' },
    { value: 'other', label: 'Overige feedback' },
]

const type = ref<FeedbackType>('problem')
const message = ref('')
const email = ref('')
const website = ref('')
const isSubmitting = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const messageField = ref<HTMLTextAreaElement | null>(null)
const formStartedAt = ref(Date.now())
const appVersion = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.0.0'

function createFeedbackContext() {
    return {
        appVersion,
        route: `${window.location.pathname}${window.location.search}${window.location.hash}`,
        browser: window.navigator.userAgent,
        platform: window.navigator.platform,
        timestamp: new Date().toISOString(),
    }
}

function resetForNextFeedback() {
    type.value = 'problem'
    message.value = ''
    email.value = ''
    website.value = ''
    formStartedAt.value = Date.now()
}

async function submitFeedback() {
    if (isSubmitting.value || !message.value.trim()) return

    isSubmitting.value = true
    errorMessage.value = ''
    successMessage.value = ''
    const feedbackId = crypto.randomUUID()

    try {
        const response = await fetch('/api/feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                feedbackId,
                type: type.value,
                message: message.value,
                email: email.value,
                website: website.value,
                formStartedAt: formStartedAt.value,
                context: createFeedbackContext(),
            }),
        })

        if (!response.ok) {
            const body = await response.json().catch(() => undefined) as { error?: string } | undefined
            throw new Error(body?.error || 'De feedback kon niet worden verstuurd.')
        }

        track('feedback_submitted', { type: type.value })
        resetForNextFeedback()
        successMessage.value = 'Bedankt, je feedback is verstuurd.'
        await nextTick()
        messageField.value?.focus()
    } catch (error) {
        errorMessage.value = error instanceof Error
            ? error.message
            : 'De feedback kon niet worden verstuurd. Probeer het later opnieuw.'
    } finally {
        isSubmitting.value = false
    }
}

onMounted(async () => {
    await nextTick()
    messageField.value?.focus()
})
</script>

<template>
    <div
        class="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 p-3 sm:items-center sm:p-6"
        role="presentation"
        @click.self="emit('close')"
        @keydown.esc="emit('close')"
    >
        <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="feedback-title"
            class="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl shadow-slate-950/20 sm:p-6"
        >
            <div class="flex items-start justify-between gap-4">
                <div>
                    <h2
                        id="feedback-title"
                        class="text-xl font-bold text-emerald-950"
                    >
                        Feedback geven
                    </h2>
                    <p class="mt-1 text-sm text-slate-500">
                        Meld een probleem, deel een wens of stuur iets anders door.
                    </p>
                </div>
                <button
                    type="button"
                    class="rounded-full border border-slate-200 px-3 py-1 text-lg leading-none text-slate-600 hover:bg-slate-50"
                    aria-label="Sluit feedbackformulier"
                    @click="emit('close')"
                >
                    ×
                </button>
            </div>

            <form
                class="mt-5 space-y-4"
                :aria-busy="isSubmitting ? 'true' : 'false'"
                @submit.prevent="submitFeedback"
            >
                <div>
                    <label
                        for="feedback-type"
                        class="mb-2 block text-sm font-medium text-slate-700"
                    >
                        Type
                    </label>
                    <select
                        id="feedback-type"
                        v-model="type"
                        :disabled="isSubmitting"
                        class="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-950 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:cursor-wait disabled:bg-slate-50"
                    >
                        <option
                            v-for="option in feedbackTypes"
                            :key="option.value"
                            :value="option.value"
                        >
                            {{ option.label }}
                        </option>
                    </select>
                </div>

                <div>
                    <label
                        for="feedback-message"
                        class="mb-2 block text-sm font-medium text-slate-700"
                    >
                        Bericht
                    </label>
                    <textarea
                        id="feedback-message"
                        ref="messageField"
                        v-model="message"
                        required
                        maxlength="2000"
                        rows="5"
                        :disabled="isSubmitting"
                        class="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-950 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:cursor-wait disabled:bg-slate-50"
                        aria-describedby="feedback-message-help"
                    />
                    <p
                        id="feedback-message-help"
                        class="mt-2 text-xs text-slate-500"
                    >
                        Vermeld geen namen van kinderen, tokens of andere gevoelige gegevens.
                    </p>
                </div>

                <div>
                    <label
                        for="feedback-email"
                        class="mb-2 block text-sm font-medium text-slate-700"
                    >
                        E-mailadres <span class="font-normal text-slate-500">(optioneel)</span>
                    </label>
                    <input
                        id="feedback-email"
                        v-model="email"
                        type="email"
                        maxlength="254"
                        autocomplete="email"
                        :disabled="isSubmitting"
                        class="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-950 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:cursor-wait disabled:bg-slate-50"
                    >
                </div>

                <div
                    class="hidden"
                    aria-hidden="true"
                >
                    <label for="feedback-website">Website</label>
                    <input
                        id="feedback-website"
                        v-model="website"
                        type="text"
                        autocomplete="off"
                        tabindex="-1"
                    >
                </div>

                <p
                    v-if="successMessage"
                    class="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
                    role="status"
                >
                    {{ successMessage }}
                </p>
                <p
                    v-if="errorMessage"
                    class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                    role="alert"
                >
                    {{ errorMessage }}
                </p>

                <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        class="rounded-lg border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        @click="emit('close')"
                    >
                        Sluiten
                    </button>
                    <button
                        type="submit"
                        :disabled="isSubmitting || !message.trim()"
                        class="rounded-lg bg-emerald-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {{ isSubmitting ? 'Versturen...' : 'Verstuur feedback' }}
                    </button>
                </div>
            </form>
        </section>
    </div>
</template>
