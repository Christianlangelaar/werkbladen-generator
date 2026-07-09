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
    assignmentAmount?: number
    pageCount?: number
    theme?: string
    difficulty?: string
}

const defaultGroup = '4'
const defaultExercise = 'contextsommen'
const defaultAssignmentAmount = 10
const maxWorksheetPages = 5
const compactArithmeticQuestionsPerPage = 100
const readingQuestionsPerPage = 7
const summaryQuestionsPerPage = 4
const storyQuestionsPerPage = 10
const standardQuestionsPerPage = 18
const settingsStorageKey = 'worksheet-generator-settings'

const group = ref(defaultGroup)
const exercise = ref(defaultExercise)
const assignmentAmount = ref(defaultAssignmentAmount)
const theme = ref('')
const difficulty = ref('')
const amountError = ref('')
const generationError = ref('')
const isGenerating = ref(false)
const generationMessage = ref('Werkblad wordt gemaakt...')
const generationMessages = [
    'Werkblad wordt gemaakt...',
    'Opdrachten worden bedacht...',
    'We zetten alles netjes klaar...',
    'Werkblad wordt bijna geopend...',
] as const
let generationMessageInterval: number | undefined

const fieldClass = 'w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-950 transition disabled:cursor-wait disabled:bg-slate-50 disabled:text-slate-500 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100'
const selectClass = `${fieldClass} appearance-none pr-12`
const themeOptions = [
    'Voetbal',
    'Paarden',
    'Dieren',
    "Dino's",
    'Minecraft',
    'Prinsessen',
    'Ruimte',
    "Auto's",
    'Pokémon',
] as const
const difficultyOptions = [
    'Makkelijker',
    'Uitdagender',
] as const
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
const themeSupportedExercises = new Set([
    'begrijpend-lezen',
    'contextsommen',
    'eindtoets-rekenen',
    'engels-woordenschat',
    'grammatica',
    'leestekens',
    'rijmen',
    'samenvatten',
    'spelling',
    'werkwoordspelling',
    'woordenschat',
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
const maxAssignmentAmount = computed(() => questionsPerPage.value * maxWorksheetPages)
const estimatedPageCount = computed(() => Math.max(1, Math.ceil(assignmentAmount.value / questionsPerPage.value)))
const amountHelpText = computed(() => {
    const assignmentLabel = compactArithmeticExercises.has(exercise.value) ? 'sommen' : 'opdrachten'
    const pageLabel = estimatedPageCount.value === 1 ? 'pagina' : "pagina's"

    return `${questionsPerPage.value} ${assignmentLabel} per pagina. ${assignmentAmount.value} ${assignmentLabel} is ongeveer ${estimatedPageCount.value} ${pageLabel}.`
})
const supportsTheme = computed(() => themeSupportedExercises.has(exercise.value))
const activeTheme = computed(() => supportsTheme.value ? normalizeTheme(theme.value) : '')

function getFirstExerciseForGroup(groupValue: string) {
    return exerciseOptionGroupsByGroup[groupValue]?.[0]?.options[0]?.value ?? defaultExercise
}

function isValidExerciseForGroup(groupValue: string, exerciseValue: string) {
    return exerciseOptionGroupsByGroup[groupValue]
        ?.some((optionGroup) => optionGroup.options.some((option) => option.value === exerciseValue)) ?? false
}

function normalizeAssignmentAmount(value: unknown) {
    const numericValue = Number(value)

    if (!Number.isFinite(numericValue)) {
        return defaultAssignmentAmount
    }

    return Math.min(Math.max(Math.trunc(numericValue), 1), maxAssignmentAmount.value)
}

function normalizeTheme(value: unknown) {
    return typeof value === 'string' && themeOptions.includes(value as typeof themeOptions[number])
        ? value
        : ''
}

function normalizeDifficulty(value: unknown) {
    return typeof value === 'string' && difficultyOptions.includes(value as typeof difficultyOptions[number])
        ? value
        : ''
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
        const storedAssignmentAmount = parsedSettings.assignmentAmount
            ?? (typeof parsedSettings.pageCount === 'number'
                ? parsedSettings.pageCount * questionsPerPage.value
                : undefined)

        assignmentAmount.value = normalizeAssignmentAmount(storedAssignmentAmount)
        theme.value = normalizeTheme(parsedSettings.theme)
        difficulty.value = normalizeDifficulty(parsedSettings.difficulty)
    } catch {
        window.localStorage.removeItem(settingsStorageKey)
    }
}

function saveStoredSettings() {
    window.localStorage.setItem(settingsStorageKey, JSON.stringify({
        group: group.value,
        exercise: exercise.value,
        assignmentAmount: normalizeAssignmentAmount(assignmentAmount.value),
        theme: normalizeTheme(theme.value),
        difficulty: normalizeDifficulty(difficulty.value),
    }))
}

loadStoredSettings()

watch(group, () => {
    const hasSelectedExercise = exerciseOptions.value.some((option) => option.value === exercise.value)

    if (!hasSelectedExercise) {
        exercise.value = exerciseOptions.value[0]?.value ?? 'contextsommen'
    }
})

watch([group, exercise, assignmentAmount, theme, difficulty], saveStoredSettings)

function validateAmount() {
    if (assignmentAmount.value < 1) {
        amountError.value = 'Kies minimaal 1 opdracht.'

        return false
    }

    if (assignmentAmount.value > maxAssignmentAmount.value) {
        const assignmentLabel = compactArithmeticExercises.has(exercise.value) ? 'sommen' : 'opdrachten'

        amountError.value = `Je kunt maximaal ${maxAssignmentAmount.value} ${assignmentLabel} genereren.`

        return false
    }

    amountError.value = ''

    return true
}

watch([exercise, assignmentAmount], validateAmount)

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
                assignmentAmount.value,
                compactArithmeticExercises.has(exercise.value) ? 'compact-arithmetic' : 'default',
                activeTheme.value || undefined,
                normalizeDifficulty(difficulty.value) || undefined,
            ),
            wait(7600),
        ])
    } catch (error) {
        generationError.value = error instanceof Error
            ? error.message
            : 'Er ging iets mis met het maken van het werkblad.'
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

        <div v-if="supportsTheme">
            <label class="mb-2 block text-sm font-medium text-slate-700">
                Thema
            </label>

            <div class="relative">
                <select
                    v-model="theme"
                    :disabled="isGenerating"
                    :class="selectClass"
                >
                    <option value="">
                        Geen thema
                    </option>
                    <option
                        v-for="themeOption in themeOptions"
                        :key="themeOption"
                        :value="themeOption"
                    >
                        {{ themeOption }}
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
                Moeilijkheid
            </label>

            <div class="relative">
                <select
                    v-model="difficulty"
                    :disabled="isGenerating"
                    :class="selectClass"
                >
                    <option value="">
                        Standaard
                    </option>
                    <option
                        v-for="difficultyOption in difficultyOptions"
                        :key="difficultyOption"
                        :value="difficultyOption"
                    >
                        {{ difficultyOption }}
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
            <label
                class="mb-2 block text-sm font-medium text-slate-700"
                for="assignment-amount"
            >
                Aantal opdrachten
            </label>

            <input
                id="assignment-amount"
                v-model.number="assignmentAmount"
                type="number"
                min="1"
                :max="maxAssignmentAmount"
                :disabled="isGenerating"
                :class="fieldClass"
                :aria-invalid="amountError ? 'true' : 'false'"
                :aria-describedby="amountError ? 'amount-error' : 'amount-help'"
                @input="validateAmount"
            >

            <p
                v-if="!amountError"
                id="amount-help"
                class="mt-2 text-sm text-slate-500"
            >
                {{ amountHelpText }}
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
            class="relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-lg bg-emerald-600 px-4 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-wait disabled:bg-emerald-500"
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
                {{ isGenerating ? generationMessage : 'Maak werkblad' }}
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
