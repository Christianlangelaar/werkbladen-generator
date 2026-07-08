<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { generateWorksheetPdf } from '../services/generateWorksheetPdf'

type ExerciseOption = {
    value: string
    label: string
}

type ExerciseOptionGroup = {
    label: string
    options: ExerciseOption[]
}

type StoredWorksheetSettings = {
    group?: string
    exercise?: string
    pageCount?: number
}

const defaultGroup = '4'
const defaultExercise = 'contextsommen'
const defaultPageCount = 1
const maxPageCount = 5
const compactArithmeticQuestionsPerPage = 100
const readingQuestionsPerPage = 7
const summaryQuestionsPerPage = 4
const storyQuestionsPerPage = 10
const standardQuestionsPerPage = 18
const settingsStorageKey = 'worksheet-generator-settings'

const group = ref(defaultGroup)
const exercise = ref(defaultExercise)
const pageCount = ref(defaultPageCount)
const amountError = ref('')
const generationError = ref('')
const isGenerating = ref(false)
const generationMessage = ref('Werkblad wordt gemaakt...')
const generationMessages = [
    'Werkblad wordt gemaakt...',
    'Opdrachten worden bedacht...',
    'We zetten alles netjes klaar...',
    'PDF wordt bijna geopend...',
] as const
let generationMessageInterval: number | undefined

const fieldClass = 'w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-950 transition disabled:cursor-wait disabled:bg-slate-50 disabled:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100'
const selectClass = `${fieldClass} appearance-none pr-12`
const exerciseOptionGroupsByGroup: Record<string, ExerciseOptionGroup[]> = {
    3: [
        {
            label: 'Rekenen',
            options: [
                { value: 'contextsommen', label: 'Contextsommen' },
                { value: 'optellen', label: 'Optellen' },
                { value: 'aftrekken', label: 'Aftrekken' },
                { value: 'splitsen', label: 'Splitsen' },
            ],
        },
        {
            label: 'Taal',
            options: [
                { value: 'begrijpend-lezen', label: 'Begrijpend lezen' },
                { value: 'woordenschat', label: 'Woordenschat' },
                { value: 'rijmen', label: 'Rijmen' },
            ],
        },
    ],
    4: [
        {
            label: 'Rekenen',
            options: [
                { value: 'contextsommen', label: 'Contextsommen' },
                { value: 'optellen', label: 'Optellen' },
                { value: 'aftrekken', label: 'Aftrekken' },
                { value: 'tafels', label: 'Tafels' },
            ],
        },
        {
            label: 'Taal',
            options: [
                { value: 'begrijpend-lezen', label: 'Begrijpend lezen' },
                { value: 'woordenschat', label: 'Woordenschat' },
                { value: 'spelling', label: 'Spelling' },
            ],
        },
    ],
    5: [
        {
            label: 'Rekenen',
            options: [
                { value: 'contextsommen', label: 'Contextsommen' },
                { value: 'optellen-grote-getallen', label: 'Optellen (grote getallen)' },
                { value: 'aftrekken-grote-getallen', label: 'Aftrekken (grote getallen)' },
                { value: 'vermenigvuldigen', label: 'Vermenigvuldigen' },
                { value: 'delen', label: 'Delen' },
                { value: 'tafel-automatiseren', label: 'Tafel automatiseren' },
            ],
        },
        {
            label: 'Taal',
            options: [
                { value: 'begrijpend-lezen', label: 'Begrijpend lezen' },
                { value: 'woordenschat', label: 'Woordenschat' },
                { value: 'spelling', label: 'Spelling' },
                { value: 'werkwoordspelling', label: 'Werkwoordspelling' },
                { value: 'grammatica', label: 'Grammatica' },
                { value: 'leestekens', label: 'Leestekens' },
            ],
        },
    ],
    6: [
        {
            label: 'Rekenen',
            options: [
                { value: 'contextsommen', label: 'Contextsommen' },
                { value: 'breuken', label: 'Breuken' },
                { value: 'procenten', label: 'Procenten' },
                { value: 'verhoudingen', label: 'Verhoudingen' },
                { value: 'kommagetallen', label: 'Kommagetallen' },
            ],
        },
        {
            label: 'Taal',
            options: [
                { value: 'begrijpend-lezen', label: 'Begrijpend lezen' },
                { value: 'spelling', label: 'Spelling' },
                { value: 'werkwoordspelling', label: 'Werkwoordspelling' },
                { value: 'grammatica', label: 'Grammatica' },
            ],
        },
    ],
    7: [
        {
            label: 'Rekenen',
            options: [
                { value: 'contextsommen', label: 'Contextsommen' },
                { value: 'procenten', label: 'Procenten' },
                { value: 'schaal', label: 'Schaal' },
                { value: 'breuken', label: 'Breuken' },
            ],
        },
        {
            label: 'Taal',
            options: [
                { value: 'begrijpend-lezen', label: 'Begrijpend lezen' },
                { value: 'werkwoordspelling', label: 'Werkwoordspelling' },
                { value: 'grammatica', label: 'Grammatica' },
                { value: 'samenvatten', label: 'Samenvatten' },
            ],
        },
        {
            label: 'Engels',
            options: [
                { value: 'engels-woordenschat', label: 'Woordenschat' },
            ],
        },
    ],
    8: [
        {
            label: 'Rekenen',
            options: [
                { value: 'contextsommen', label: 'Contextsommen' },
                { value: 'eindtoets-rekenen', label: 'Eindtoets rekenen' },
                { value: 'breuken', label: 'Breuken' },
                { value: 'procenten', label: 'Procenten' },
                { value: 'verhoudingen', label: 'Verhoudingen' },
            ],
        },
        {
            label: 'Taal',
            options: [
                { value: 'begrijpend-lezen', label: 'Begrijpend lezen' },
                { value: 'werkwoordspelling', label: 'Werkwoordspelling' },
                { value: 'grammatica', label: 'Grammatica' },
                { value: 'samenvatten', label: 'Samenvatten' },
            ],
        },
    ],
}
const defaultExerciseOptionGroups = exerciseOptionGroupsByGroup[4] as ExerciseOptionGroup[]
const exerciseOptionGroups = computed(() => exerciseOptionGroupsByGroup[group.value] ?? defaultExerciseOptionGroups)
const exerciseOptions = computed(() => exerciseOptionGroups.value.flatMap((optionGroup) => optionGroup.options))
const compactArithmeticExercises = new Set([
    'optellen',
    'aftrekken',
    'splitsen',
    'tafels',
    'optellen-grote-getallen',
    'aftrekken-grote-getallen',
    'vermenigvuldigen',
    'delen',
    'tafel-automatiseren',
])
const readingExercises = new Set([
    'begrijpend-lezen',
])
const summaryExercises = new Set([
    'samenvatten',
])
const storyExercises = new Set([
    'contextsommen',
    'eindtoets-rekenen',
])
const questionsPerPage = computed(() => {
    if (compactArithmeticExercises.has(exercise.value)) {
        return compactArithmeticQuestionsPerPage
    }

    if (readingExercises.has(exercise.value)) {
        return readingQuestionsPerPage
    }

    if (summaryExercises.has(exercise.value)) {
        return summaryQuestionsPerPage
    }

    if (storyExercises.has(exercise.value)) {
        return storyQuestionsPerPage
    }

    return standardQuestionsPerPage
})
const generatedAmount = computed(() => pageCount.value * questionsPerPage.value)
const pageCountHelpText = computed(() => {
    const assignmentLabel = compactArithmeticExercises.has(exercise.value) ? 'sommen' : 'opdrachten'

    return `Ongeveer ${generatedAmount.value} ${assignmentLabel} in compacte A4-indeling.`
})

function getFirstExerciseForGroup(groupValue: string) {
    return exerciseOptionGroupsByGroup[groupValue]?.[0]?.options[0]?.value ?? defaultExercise
}

function isValidExerciseForGroup(groupValue: string, exerciseValue: string) {
    return exerciseOptionGroupsByGroup[groupValue]
        ?.some((optionGroup) => optionGroup.options.some((option) => option.value === exerciseValue)) ?? false
}

function normalizePageCount(value: unknown) {
    const numericValue = Number(value)

    if (!Number.isFinite(numericValue)) {
        return defaultPageCount
    }

    return Math.min(Math.max(Math.trunc(numericValue), 1), maxPageCount)
}

function loadStoredSettings() {
    try {
        const storedSettings = window.localStorage.getItem(settingsStorageKey)

        if (!storedSettings) {
            return
        }

        const parsedSettings = JSON.parse(storedSettings) as StoredWorksheetSettings
        const storedGroup = parsedSettings.group && exerciseOptionGroupsByGroup[parsedSettings.group]
            ? parsedSettings.group
            : defaultGroup

        group.value = storedGroup
        exercise.value = parsedSettings.exercise && isValidExerciseForGroup(storedGroup, parsedSettings.exercise)
            ? parsedSettings.exercise
            : getFirstExerciseForGroup(storedGroup)
        pageCount.value = normalizePageCount(parsedSettings.pageCount)
    } catch {
        window.localStorage.removeItem(settingsStorageKey)
    }
}

function saveStoredSettings() {
    window.localStorage.setItem(settingsStorageKey, JSON.stringify({
        group: group.value,
        exercise: exercise.value,
        pageCount: normalizePageCount(pageCount.value),
    }))
}

loadStoredSettings()

watch(group, () => {
    const hasSelectedExercise = exerciseOptions.value.some((option) => option.value === exercise.value)

    if (!hasSelectedExercise) {
        exercise.value = exerciseOptions.value[0]?.value ?? 'contextsommen'
    }
})

watch([group, exercise, pageCount], saveStoredSettings)

function validateAmount() {
    if (pageCount.value > maxPageCount) {
        amountError.value = `Je kunt maximaal ${maxPageCount} pagina's genereren.`

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

function startGenerationMessages() {
    let messageIndex = 0

    generationMessage.value = generationMessages[messageIndex] ?? generationMessages[0]
    generationMessageInterval = window.setInterval(() => {
        messageIndex = (messageIndex + 1) % generationMessages.length
        generationMessage.value = generationMessages[messageIndex] ?? generationMessages[0]
    }, 3500)
}

function stopGenerationMessages() {
    if (generationMessageInterval) {
        window.clearInterval(generationMessageInterval)
        generationMessageInterval = undefined
    }
}

async function generatePdf() {
    if (!validateAmount()) {
        return
    }

    generationError.value = ''
    isGenerating.value = true
    startGenerationMessages()

    try {
        await Promise.all([
            generateWorksheetPdf(
                group.value,
                exercise.value,
                generatedAmount.value,
                compactArithmeticExercises.has(exercise.value) ? 'compact-arithmetic' : 'default',
            ),
            wait(7600),
        ])
    } catch (error) {
        generationError.value = error instanceof Error
            ? error.message
            : 'Er ging iets mis met het genereren van de PDF.'
    } finally {
        stopGenerationMessages()
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
                    <option value="3">
                        Groep 3
                    </option>
                    <option value="4">
                        Groep 4
                    </option>
                    <option value="5">
                        Groep 5
                    </option>
                    <option value="6">
                        Groep 6
                    </option>
                    <option value="7">
                        Groep 7
                    </option>
                    <option value="8">
                        Groep 8
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
                    <optgroup
                        v-for="optionGroup in exerciseOptionGroups"
                        :key="optionGroup.label"
                        :label="optionGroup.label"
                    >
                        <option
                            v-for="option in optionGroup.options"
                            :key="option.value"
                            :value="option.value"
                        >
                            {{ option.label }}
                        </option>
                    </optgroup>
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
            <label
                class="mb-2 block text-sm font-medium text-slate-700"
                for="page-count"
            >
                Aantal pagina's
            </label>

            <input
                id="page-count"
                v-model.number="pageCount"
                type="number"
                min="1"
                :max="maxPageCount"
                :disabled="isGenerating"
                :class="fieldClass"
                :aria-invalid="amountError ? 'true' : 'false'"
                :aria-describedby="amountError ? 'amount-error' : 'page-count-help'"
                @input="validateAmount"
            >

            <p
                v-if="!amountError"
                id="page-count-help"
                class="mt-2 text-sm text-slate-500"
            >
                {{ pageCountHelpText }}
            </p>

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

            <span
                aria-live="polite"
                aria-atomic="true"
            >
                {{ isGenerating ? generationMessage : 'Genereer PDF' }}
            </span>

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
