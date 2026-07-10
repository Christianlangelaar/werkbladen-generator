<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { generateWorkbookPdf, generateWorksheetPdf, type WorkbookSection } from '../services/generateWorksheetPdf'

type WorksheetMode = 'worksheet' | 'workbook'

type ExerciseOption = {
    value: string
    label: string
}

type ExerciseOptionGroup = {
    label: string
    options: ExerciseOption[]
}

type StoredWorksheetSettings = {
    mode?: WorksheetMode
    group?: string
    exercise?: string
    assignmentAmount?: number
    pageCount?: number
    includeCoverPage?: boolean
    includeAnswerSheet?: boolean
    theme?: string
    difficulty?: string
}

const defaultGroup = '4'
const defaultExercise = 'contextsommen'
const defaultMode: WorksheetMode = 'worksheet'
const defaultPageCount = 5
const defaultAssignmentAmount = 10
const maxWorksheetPages = 5
const maxWorkbookPages = 25
const compactArithmeticQuestionsPerPage = 100
const readingQuestionsPerPage = 7
const summaryQuestionsPerPage = 4
const storyQuestionsPerPage = 10
const standardQuestionsPerPage = 18
const countingQuestionsPerPage = 6
const settingsStorageKey = 'worksheet-generator-settings'

const mode = ref<WorksheetMode>(defaultMode)
const group = ref(defaultGroup)
const exercise = ref(defaultExercise)
const pageCount = ref(defaultPageCount)
const assignmentAmount = ref(defaultAssignmentAmount)
const includeCoverPage = ref(false)
const includeAnswerSheet = ref(false)
const theme = ref('')
const difficulty = ref('')
const amountError = ref('')
const generationError = ref('')
const isGenerating = ref(false)
const generationStartedAt = ref(0)
const elapsedSeconds = ref(0)
let generationTimer: number | undefined

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
    1: [
        {
            label: 'Rekenen',
            options: [
                { value: 'tellen', label: 'Tellen' },
            ],
        },
    ],
    2: [
        {
            label: 'Rekenen',
            options: [
                { value: 'tellen', label: 'Tellen' },
            ],
        },
    ],
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
const workbookExercisesByGroup: Record<string, string[]> = {
    1: ['tellen'],
    2: ['tellen'],
    3: ['contextsommen', 'begrijpend-lezen', 'woordenschat', 'rijmen', 'optellen', 'aftrekken', 'splitsen'],
    4: ['contextsommen', 'begrijpend-lezen', 'woordenschat', 'spelling', 'optellen', 'aftrekken', 'tafels'],
    5: ['contextsommen', 'begrijpend-lezen', 'spelling', 'grammatica', 'woordenschat', 'vermenigvuldigen', 'delen'],
    6: ['contextsommen', 'breuken', 'begrijpend-lezen', 'spelling', 'werkwoordspelling', 'grammatica', 'procenten'],
    7: ['contextsommen', 'procenten', 'begrijpend-lezen', 'werkwoordspelling', 'grammatica', 'samenvatten', 'breuken'],
    8: ['contextsommen', 'eindtoets-rekenen', 'begrijpend-lezen', 'werkwoordspelling', 'grammatica', 'samenvatten', 'procenten'],
}
const defaultExerciseOptionGroups = exerciseOptionGroupsByGroup[4] as ExerciseOptionGroup[]
const exerciseOptionGroups = computed(() => exerciseOptionGroupsByGroup[group.value] ?? defaultExerciseOptionGroups)
const exerciseOptions = computed(() => exerciseOptionGroups.value.flatMap((optionGroup) => optionGroup.options))
const exerciseLabelByValue = computed(() => new Map(
    exerciseOptions.value.map((option) => [option.value, option.label]),
))
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
const isWorkbookMode = computed(() => mode.value === 'workbook')
const submitButtonText = computed(() => isWorkbookMode.value ? 'Maak werkboekje' : 'Maak werkblad')
const loadingButtonText = computed(() => {
    const outputLabel = isWorkbookMode.value ? 'Werkboekje' : 'Werkblad'
    const elapsedText = elapsedSeconds.value > 0 ? ` ${elapsedSeconds.value} sec` : ''

    return `${outputLabel} maken...${elapsedText}`
})
const workbookExercises = computed(() => workbookExercisesByGroup[group.value] ?? workbookExercisesByGroup[defaultGroup] ?? [])

function getQuestionsPerPage(exerciseValue: string) {
    if (exerciseValue === 'tellen') {
        return countingQuestionsPerPage
    }
    if (compactArithmeticExercises.has(exerciseValue)) {
        return compactArithmeticQuestionsPerPage
    }

    if (readingExercises.has(exerciseValue)) {
        return readingQuestionsPerPage
    }

    if (summaryExercises.has(exerciseValue)) {
        return summaryQuestionsPerPage
    }

    if (storyExercises.has(exerciseValue)) {
        return storyQuestionsPerPage
    }

    return standardQuestionsPerPage
}

function getWorkbookSectionsForPageCount(pageAmount: number) {
    const exercises = workbookExercises.value

    if (exercises.length === 0) {
        return []
    }

    const activePageCount = Math.min(Math.max(Math.trunc(pageAmount), 1), maxWorkbookPages)

    return Array.from({ length: activePageCount }, (_, index) => {
        const exerciseValue = exercises[index % exercises.length] ?? exercises[0] ?? defaultExercise

        return {
            exercise: exerciseValue,
            amount: getQuestionsPerPage(exerciseValue),
        }
    }) satisfies WorkbookSection[]
}

const questionsPerPage = computed(() => getQuestionsPerPage(exercise.value))
const workbookSections = computed(() => getWorkbookSectionsForPageCount(pageCount.value))
const workbookAssignmentAmount = computed(() => workbookSections.value.reduce((total, section) => total + section.amount, 0))
const maxAssignmentAmount = computed(() => questionsPerPage.value * maxWorksheetPages)
const estimatedPageCount = computed(() => {
    if (isWorkbookMode.value) {
        return pageCount.value
    }

    return Math.max(1, Math.ceil(assignmentAmount.value / questionsPerPage.value))
})
const quantityInputId = computed(() => isWorkbookMode.value ? 'page-count' : 'assignment-amount')
const quantityLabel = computed(() => isWorkbookMode.value ? "Aantal pagina's" : 'Aantal opdrachten')
const quantityMax = computed(() => isWorkbookMode.value ? maxWorkbookPages : maxAssignmentAmount.value)
const quantityValue = computed({
    get() {
        return isWorkbookMode.value ? pageCount.value : assignmentAmount.value
    },
    set(value: number) {
        if (isWorkbookMode.value) {
            pageCount.value = value
            return
        }

        assignmentAmount.value = value
    },
})
const amountHelpText = computed(() => {
    if (isWorkbookMode.value) {
        const pageLabel = pageCount.value === 1 ? 'pagina' : "pagina's"
        const exerciseLabels = [...new Set(workbookSections.value.map((section) => (
            exerciseLabelByValue.value.get(section.exercise) ?? section.exercise
        )))]
            .join(', ')

        return `${pageCount.value} ${pageLabel}, gevuld met ongeveer ${workbookAssignmentAmount.value} opdrachten in een mix van ${exerciseLabels}.`
    }

    const assignmentLabel = exercise.value === 'tellen'
        ? 'dobbelstenen'
        : compactArithmeticExercises.has(exercise.value) ? 'sommen' : 'opdrachten'
    const pageLabel = estimatedPageCount.value === 1 ? 'pagina' : "pagina's"

    return `${questionsPerPage.value} ${assignmentLabel} per pagina. ${assignmentAmount.value} ${assignmentLabel} is ongeveer ${estimatedPageCount.value} ${pageLabel}.`
})
const supportsTheme = computed(() => isWorkbookMode.value || themeSupportedExercises.has(exercise.value))
const supportsDifficulty = computed(() => isWorkbookMode.value || exercise.value !== 'tellen')
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

function normalizePageCount(value: unknown) {
    const numericValue = Number(value)

    if (!Number.isFinite(numericValue)) {
        return defaultPageCount
    }

    return Math.min(Math.max(Math.trunc(numericValue), 1), maxWorkbookPages)
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

function normalizeMode(value: unknown): WorksheetMode {
    return value === 'workbook' ? 'workbook' : defaultMode
}

function normalizeBoolean(value: unknown) {
    return typeof value === 'boolean' ? value : false
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

        mode.value = normalizeMode(parsedSettings.mode)
        group.value = storedGroup
        exercise.value = parsedSettings.exercise && isValidExerciseForGroup(storedGroup, parsedSettings.exercise)
            ? parsedSettings.exercise
            : getFirstExerciseForGroup(storedGroup)
        const storedAssignmentAmount = parsedSettings.assignmentAmount
            ?? (typeof parsedSettings.pageCount === 'number'
                ? parsedSettings.pageCount * questionsPerPage.value
                : undefined)

        pageCount.value = normalizePageCount(parsedSettings.pageCount)
        assignmentAmount.value = normalizeAssignmentAmount(storedAssignmentAmount)
        includeCoverPage.value = normalizeBoolean(parsedSettings.includeCoverPage)
        includeAnswerSheet.value = normalizeBoolean(parsedSettings.includeAnswerSheet)
        theme.value = normalizeTheme(parsedSettings.theme)
        difficulty.value = normalizeDifficulty(parsedSettings.difficulty)
    } catch {
        window.localStorage.removeItem(settingsStorageKey)
    }
}

function saveStoredSettings() {
    window.localStorage.setItem(settingsStorageKey, JSON.stringify({
        mode: mode.value,
        group: group.value,
        exercise: exercise.value,
        pageCount: normalizePageCount(pageCount.value),
        assignmentAmount: normalizeAssignmentAmount(assignmentAmount.value),
        includeCoverPage: includeCoverPage.value,
        includeAnswerSheet: includeAnswerSheet.value,
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

watch([mode, group, exercise, pageCount, assignmentAmount, includeCoverPage, includeAnswerSheet, theme, difficulty], saveStoredSettings)

function validateAmount() {
    if (quantityValue.value < 1) {
        amountError.value = isWorkbookMode.value ? 'Kies minimaal 1 pagina.' : 'Kies minimaal 1 opdracht.'

        return false
    }

    if (quantityValue.value > quantityMax.value) {
        const assignmentLabel = exercise.value === 'tellen'
            ? 'dobbelstenen'
            : compactArithmeticExercises.has(exercise.value) ? 'sommen' : 'opdrachten'

        amountError.value = isWorkbookMode.value
            ? `Je kunt maximaal ${maxWorkbookPages} pagina's maken.`
            : `Je kunt maximaal ${maxAssignmentAmount.value} ${assignmentLabel} genereren.`

        return false
    }

    amountError.value = ''

    return true
}

watch([mode, exercise, pageCount, assignmentAmount], validateAmount)

function startGenerationTimer() {
    generationStartedAt.value = Date.now()
    elapsedSeconds.value = 0
    generationTimer = window.setInterval(() => {
        elapsedSeconds.value = Math.floor((Date.now() - generationStartedAt.value) / 1000)
    }, 1000)
}

function stopGenerationTimer() {
    if (generationTimer) {
        window.clearInterval(generationTimer)
        generationTimer = undefined
    }
}

async function generatePdf() {
    if (!validateAmount()) {
        return
    }

    generationError.value = ''
    isGenerating.value = true
    startGenerationTimer()

    try {
        const workbookPdfPromise = isWorkbookMode.value
            ? generateWorkbookPdf(
                group.value,
                workbookSections.value,
                includeCoverPage.value,
                includeAnswerSheet.value,
                activeTheme.value || undefined,
                normalizeDifficulty(difficulty.value) || undefined,
            )
            : generateWorksheetPdf(
                group.value,
                exercise.value,
                assignmentAmount.value,
                compactArithmeticExercises.has(exercise.value) ? 'compact-arithmetic' : 'default',
                activeTheme.value || undefined,
                normalizeDifficulty(difficulty.value) || undefined,
                includeAnswerSheet.value,
            )

        await workbookPdfPromise
    } catch (error) {
        generationError.value = error instanceof Error
            ? error.message
            : 'Er ging iets mis met het maken van het werkblad.'
    } finally {
        stopGenerationTimer()
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
                Ik wil maken
            </label>

            <div class="grid grid-cols-2 rounded-lg border border-slate-300 bg-slate-50 p-1">
                <button
                    type="button"
                    :disabled="isGenerating"
                    class="rounded-md px-3 py-2 text-sm font-semibold transition disabled:cursor-wait"
                    :class="!isWorkbookMode ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'"
                    :aria-pressed="!isWorkbookMode"
                    @click="mode = 'worksheet'"
                >
                    Werkblad
                </button>

                <button
                    type="button"
                    :disabled="isGenerating"
                    class="rounded-md px-3 py-2 text-sm font-semibold transition disabled:cursor-wait"
                    :class="isWorkbookMode ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'"
                    :aria-pressed="isWorkbookMode"
                    @click="mode = 'workbook'"
                >
                    Werkboekje
                </button>
            </div>
        </div>

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
                    <option value="1">
                        Groep 1
                    </option>
                    <option value="2">
                        Groep 2
                    </option>
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

        <div v-if="!isWorkbookMode">
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

        <div v-if="supportsDifficulty">
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
                :for="quantityInputId"
            >
                {{ quantityLabel }}
            </label>

            <input
                :id="quantityInputId"
                v-model.number="quantityValue"
                type="number"
                min="1"
                :max="quantityMax"
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

        <label
            v-if="isWorkbookMode"
            class="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
        >
            <input
                v-model="includeCoverPage"
                type="checkbox"
                :disabled="isGenerating"
                class="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-100 disabled:cursor-wait"
            >

            <span>
                <span class="block font-medium text-slate-800">Voorblad toevoegen</span>
                <span class="mt-1 block text-slate-500">Met titel, groep, naam en datum.</span>
            </span>
        </label>

        <label class="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <input
                v-model="includeAnswerSheet"
                type="checkbox"
                :disabled="isGenerating"
                class="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-100 disabled:cursor-wait"
            >

            <span>
                <span class="block font-medium text-slate-800">Antwoordenblad toevoegen</span>
                <span class="mt-1 block text-slate-500">Altijd achteraan in de PDF.</span>
            </span>
        </label>

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
                {{ isGenerating ? loadingButtonText : submitButtonText }}
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
