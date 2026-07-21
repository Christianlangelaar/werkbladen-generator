<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import WorksheetFeedback from './WorksheetFeedback.vue'
import { track, type GenerationContext } from '../services/analytics'
import type {
    EditableWorksheetItem,
    PdfGenerationResult,
    WorkbookGenerationProgress,
    WorkbookSection,
} from '../services/generateWorksheetPdf'

type WorksheetMode = 'worksheet' | 'workbook'

type ExerciseOption = {
    value: string
    label: string
}

type ExerciseOptionGroup = {
    label: string
    options: ExerciseOption[]
}

type WorkbookBuilderItem = {
    id: number
    exercise: string
    pages: number
}

type StoredWorksheetSettings = {
    mode?: WorksheetMode
    group?: string
    exercise?: string
    assignmentAmount?: number
    pageCount?: number
    workbookItems?: Array<{ exercise?: string, pages?: number }>
    includeCoverPage?: boolean
    includeAnswerSheet?: boolean
    theme?: string
    difficulty?: string
}

type WorksheetPreset = {
    id: string
    name: string
    settings: StoredWorksheetSettings
}

const defaultGroup = '4'
const defaultExercise = 'contextsommen'
const defaultMode: WorksheetMode = 'worksheet'
const defaultPageCount = 5
const defaultAssignmentAmount = 10
const maxWorksheetPages = 5
const maxWorkbookPages = 25
const maxWorkbookSectionPages = 5
const compactArithmeticQuestionsPerPage = 100
const readingQuestionsPerPage = 7
const summaryQuestionsPerPage = 4
const storyQuestionsPerPage = 10
const standardQuestionsPerPage = 18
const countingQuestionsPerPage = 6
const settingsStorageKey = 'worksheet-generator-settings'
const presetsStorageKey = 'worksheet-generator-presets'

const mode = ref<WorksheetMode>(defaultMode)
const group = ref(defaultGroup)
const exercise = ref(defaultExercise)
const pageCount = ref(defaultPageCount)
const workbookItems = ref<WorkbookBuilderItem[]>([])
const workbookExerciseToAdd = ref('')
let nextWorkbookItemId = 1
const assignmentAmount = ref(defaultAssignmentAmount)
const includeCoverPage = ref(false)
const includeAnswerSheet = ref(false)
const theme = ref('')
const difficulty = ref('')
const amountError = ref('')
const generationError = ref('')
const generationNotice = ref('')
const lastGenerationResult = ref<PdfGenerationResult | null>(null)
const isPreviewVisible = ref(false)
const previewIframe = ref<HTMLIFrameElement | null>(null)
const generationResultTitle = ref<HTMLElement | null>(null)
const editableItems = ref<EditableWorksheetItem[]>([])
const regeneratingItemIndex = ref<number | null>(null)
const presets = ref<WorksheetPreset[]>([])
const presetName = ref('')
const presetMessage = ref('')
const hasUnappliedEdits = ref(false)
const workbookProgress = ref<WorkbookGenerationProgress | null>(null)
const isGenerating = ref(false)
const generationStartedAt = ref(0)
const elapsedSeconds = ref(0)
const lastGenerationContext = ref<GenerationContext | null>(null)
let generationTimer: number | undefined

const fieldClass = 'w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-950 transition disabled:cursor-wait disabled:bg-slate-50 disabled:text-slate-500 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100'
const selectClass = `${fieldClass} appearance-none pr-12`
const themeOptions = [
    'Voetbal',
    'Paarden',
    'Vlinders',
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
                { value: 'tellen-dobbelsteen', label: 'Tellen - dobbelsteen' },
                { value: 'tellen-cijfers', label: 'Tellen - cijfers' },
                { value: 'tellen-vormen', label: 'Tellen - vormen' },
                { value: 'cijfers-overtrekken', label: 'Cijfers overtrekken' },
            ],
        },
        {
            label: 'Motoriek',
            options: [
                { value: 'lijnen-overtrekken', label: 'Lijnen overtrekken' },
                { value: 'raamfiguren', label: 'Raamfiguren natekenen' },
                { value: 'spiegelen', label: 'Spiegelen' },
                { value: 'schaduwen', label: 'Schaduwen koppelen' },
                { value: 'woorden-overtrekken', label: 'Woorden overtrekken' },
            ],
        },
    ],
    2: [
        {
            label: 'Rekenen',
            options: [
                { value: 'tellen-dobbelsteen', label: 'Tellen - dobbelsteen' },
                { value: 'tellen-cijfers', label: 'Tellen - cijfers' },
                { value: 'tellen-vormen', label: 'Tellen - vormen' },
                { value: 'cijfers-overtrekken', label: 'Cijfers overtrekken' },
            ],
        },
        {
            label: 'Motoriek',
            options: [
                { value: 'lijnen-overtrekken', label: 'Lijnen overtrekken' },
                { value: 'raamfiguren', label: 'Raamfiguren natekenen' },
                { value: 'spiegelen', label: 'Spiegelen' },
                { value: 'schaduwen', label: 'Schaduwen koppelen' },
                { value: 'woorden-overtrekken', label: 'Woorden overtrekken' },
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
    1: ['tellen-dobbelsteen', 'tellen-cijfers', 'tellen-vormen', 'cijfers-overtrekken', 'lijnen-overtrekken', 'raamfiguren', 'spiegelen', 'schaduwen', 'woorden-overtrekken'],
    2: ['tellen-dobbelsteen', 'tellen-cijfers', 'tellen-vormen', 'cijfers-overtrekken', 'lijnen-overtrekken', 'raamfiguren', 'spiegelen', 'schaduwen', 'woorden-overtrekken'],
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
const answerlessExercises = new Set([
    'cijfers-overtrekken',
    'lijnen-overtrekken',
    'raamfiguren',
    'schaduwen',
    'spiegelen',
    'woorden-overtrekken',
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
    const progressText = workbookProgress.value && workbookProgress.value.total > 0
        ? ` ${workbookProgress.value.completed}/${workbookProgress.value.total}`
        : ''

    return `${outputLabel} maken...${progressText}${elapsedText}`
})
const workbookProgressPercentage = computed(() => {
    if (!workbookProgress.value?.total) return 0
    return Math.round((workbookProgress.value.completed / workbookProgress.value.total) * 100)
})
const generationSourceLabel = computed(() => {
    if (lastGenerationResult.value?.source === 'openai') return 'Met AI gegenereerd'
    if (lastGenerationResult.value?.source === 'fallback') return 'Standaardcontent gebruikt'
    return 'Lokaal opgebouwd'
})
function getQuestionsPerPage(exerciseValue: string) {
    if (exerciseValue === 'raamfiguren') {
        return 3
    }
    if (exerciseValue === 'spiegelen') {
        return 2
    }
    if (exerciseValue === 'schaduwen' || exerciseValue === 'woorden-overtrekken') {
        return 6
    }
    if (exerciseValue === 'cijfers-overtrekken') {
        return group.value === '1' ? 5 : 10
    }
    if (exerciseValue === 'lijnen-overtrekken') {
        return 5
    }
    if (exerciseValue === 'tellen-vormen') {
        return 8
    }
    if (exerciseValue === 'tellen-cijfers') {
        return 10
    }
    if (exerciseValue === 'tellen-dobbelsteen') {
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

function createDefaultWorkbookItems(groupValue: string, pageAmount = defaultPageCount) {
    const exercises = workbookExercisesByGroup[groupValue] ?? workbookExercisesByGroup[defaultGroup] ?? []
    const itemCount = Math.min(Math.max(Math.trunc(pageAmount), 1), exercises.length, maxWorkbookPages)

    return exercises.slice(0, itemCount).map((exerciseValue) => ({
        id: nextWorkbookItemId++,
        exercise: exerciseValue,
        pages: 1,
    }))
}

function normalizeWorkbookItems(value: unknown, groupValue: string, legacyPageCount?: unknown) {
    if (!Array.isArray(value)) {
        return createDefaultWorkbookItems(groupValue, normalizePageCount(legacyPageCount))
    }

    const validExercises = new Set(workbookExercisesByGroup[groupValue] ?? [])
    const seenExercises = new Set<string>()
    let remainingPages = maxWorkbookPages
    const items: WorkbookBuilderItem[] = []

    for (const candidate of value) {
        if (!candidate || typeof candidate !== 'object') continue
        const { exercise: exerciseValue, pages: pagesValue } = candidate as { exercise?: unknown, pages?: unknown }
        if (typeof exerciseValue !== 'string' || !validExercises.has(exerciseValue) || seenExercises.has(exerciseValue)) continue

        const pages = Math.min(
            Math.max(Math.trunc(Number(pagesValue) || 1), 1),
            maxWorkbookSectionPages,
            remainingPages,
        )
        items.push({ id: nextWorkbookItemId++, exercise: exerciseValue, pages })
        seenExercises.add(exerciseValue)
        remainingPages -= pages
        if (remainingPages === 0) break
    }

    return items.length > 0 ? items : createDefaultWorkbookItems(groupValue)
}

const questionsPerPage = computed(() => getQuestionsPerPage(exercise.value))
const workbookSections = computed(() => workbookItems.value.map((item) => ({
    exercise: item.exercise,
    amount: item.pages * getQuestionsPerPage(item.exercise),
})) satisfies WorkbookSection[])
const workbookPageCount = computed(() => workbookItems.value.reduce((total, item) => total + item.pages, 0))
const availableWorkbookExercises = computed(() => {
    const selectedExercises = new Set(workbookItems.value.map((item) => item.exercise))
    return exerciseOptions.value.filter((option) => !selectedExercises.has(option.value))
})
const workbookAssignmentAmount = computed(() => workbookSections.value.reduce((total, section) => total + section.amount, 0))
const estimatedAnswerPageCount = computed(() => {
    if (!includeAnswerSheet.value) return 0

    const answerPageLoad = workbookSections.value.reduce((total, section) => {
        if (answerlessExercises.has(section.exercise)) return total
        const answersPerPage = compactArithmeticExercises.has(section.exercise)
            ? 80
            : readingExercises.has(section.exercise) || summaryExercises.has(section.exercise)
                ? 28
                : 40
        return total + (section.amount / answersPerPage)
    }, 0)

    return Math.max(1, Math.ceil(answerPageLoad))
})
const estimatedWorkbookPdfPages = computed(() => (
    workbookPageCount.value
    + (includeCoverPage.value ? 1 : 0)
    + estimatedAnswerPageCount.value
))
const maxAssignmentAmount = computed(() => questionsPerPage.value * maxWorksheetPages)
const estimatedPageCount = computed(() => {
    if (isWorkbookMode.value) {
        return workbookPageCount.value
    }

    return Math.max(1, Math.ceil(assignmentAmount.value / questionsPerPage.value))
})
const quantityInputId = 'assignment-amount'
const quantityLabel = 'Aantal opdrachten'
const quantityMax = computed(() => maxAssignmentAmount.value)
const quantityValue = computed({
    get: () => assignmentAmount.value,
    set: (value: number) => { assignmentAmount.value = value },
})
const amountHelpText = computed(() => {
    if (isWorkbookMode.value) {
        const pageLabel = workbookPageCount.value === 1 ? 'pagina' : "pagina's"
        const exerciseLabels = [...new Set(workbookSections.value.map((section) => (
            exerciseLabelByValue.value.get(section.exercise) ?? section.exercise
        )))]
            .join(', ')

        return `${workbookPageCount.value} ${pageLabel}, ongeveer ${workbookAssignmentAmount.value} opdrachten in ${exerciseLabels}.`
    }

    const assignmentLabel = exercise.value === 'tellen-cijfers'
        ? 'cijfers'
        : exercise.value === 'tellen-dobbelsteen'
            ? 'dobbelstenen'
        : compactArithmeticExercises.has(exercise.value) ? 'sommen' : 'opdrachten'
    const pageLabel = estimatedPageCount.value === 1 ? 'pagina' : "pagina's"

    return `${questionsPerPage.value} ${assignmentLabel} per pagina. ${assignmentAmount.value} ${assignmentLabel} is ongeveer ${estimatedPageCount.value} ${pageLabel}.`
})
const supportsTheme = computed(() => (
    isWorkbookMode.value
    || group.value === '2'
    || themeSupportedExercises.has(exercise.value)
))
const supportsDifficulty = computed(() => isWorkbookMode.value || ![
    'cijfers-overtrekken',
    'lijnen-overtrekken',
    'raamfiguren',
    'schaduwen',
    'spiegelen',
    'woorden-overtrekken',
].includes(exercise.value) && !exercise.value.startsWith('tellen-'))
const activeTheme = computed(() => supportsTheme.value ? normalizeTheme(theme.value) : '')

function addWorkbookItem() {
    const exerciseValue = workbookExerciseToAdd.value || availableWorkbookExercises.value[0]?.value
    if (!exerciseValue || workbookPageCount.value >= maxWorkbookPages) return

    workbookItems.value.push({ id: nextWorkbookItemId++, exercise: exerciseValue, pages: 1 })
    workbookExerciseToAdd.value = ''
}

function removeWorkbookItem(id: number) {
    if (workbookItems.value.length <= 1) return
    workbookItems.value = workbookItems.value.filter((item) => item.id !== id)
}

function moveWorkbookItem(index: number, direction: -1 | 1) {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= workbookItems.value.length) return

    const items = [...workbookItems.value]
    const currentItem = items[index]
    const targetItem = items[targetIndex]
    if (!currentItem || !targetItem) return
    items[index] = targetItem
    items[targetIndex] = currentItem
    workbookItems.value = items
}

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

function applySettings(settings: StoredWorksheetSettings) {
    const storedGroup = settings.group && exerciseOptionGroupsByGroup[settings.group]
        ? settings.group
        : defaultGroup

    mode.value = normalizeMode(settings.mode)
    group.value = storedGroup
    exercise.value = settings.exercise && isValidExerciseForGroup(storedGroup, settings.exercise)
        ? settings.exercise
        : getFirstExerciseForGroup(storedGroup)
    const storedAssignmentAmount = settings.assignmentAmount
        ?? (typeof settings.pageCount === 'number'
            ? settings.pageCount * questionsPerPage.value
            : undefined)

    pageCount.value = normalizePageCount(settings.pageCount)
    workbookItems.value = normalizeWorkbookItems(settings.workbookItems, storedGroup, settings.pageCount)
    assignmentAmount.value = normalizeAssignmentAmount(storedAssignmentAmount)
    includeCoverPage.value = normalizeBoolean(settings.includeCoverPage)
    includeAnswerSheet.value = normalizeBoolean(settings.includeAnswerSheet)
    theme.value = normalizeTheme(settings.theme)
    difficulty.value = normalizeDifficulty(settings.difficulty)
}

function currentSettings(): StoredWorksheetSettings {
    return {
        mode: mode.value,
        group: group.value,
        exercise: exercise.value,
        pageCount: normalizePageCount(pageCount.value),
        workbookItems: workbookItems.value.map(({ exercise: exerciseValue, pages }) => ({
            exercise: exerciseValue,
            pages,
        })),
        assignmentAmount: normalizeAssignmentAmount(assignmentAmount.value),
        includeCoverPage: includeCoverPage.value,
        includeAnswerSheet: includeAnswerSheet.value,
        theme: normalizeTheme(theme.value),
        difficulty: normalizeDifficulty(difficulty.value),
    }
}

function loadStoredSettings() {
    try {
        const storedSettings = window.localStorage.getItem(settingsStorageKey)
        if (storedSettings) applySettings(JSON.parse(storedSettings) as StoredWorksheetSettings)
    } catch {
        window.localStorage.removeItem(settingsStorageKey)
    }
}

function saveStoredSettings() {
    window.localStorage.setItem(settingsStorageKey, JSON.stringify(currentSettings()))
}

function savePresets() {
    window.localStorage.setItem(presetsStorageKey, JSON.stringify(presets.value))
}

function loadPresets() {
    try {
        const stored = JSON.parse(window.localStorage.getItem(presetsStorageKey) ?? '[]') as unknown
        if (!Array.isArray(stored)) return
        presets.value = stored
            .filter((preset): preset is WorksheetPreset => Boolean(
                preset
                && typeof preset === 'object'
                && typeof (preset as WorksheetPreset).id === 'string'
                && typeof (preset as WorksheetPreset).name === 'string'
                && (preset as WorksheetPreset).settings,
            ))
            .slice(0, 20)
    } catch {
        window.localStorage.removeItem(presetsStorageKey)
    }
}

function savePreset() {
    const name = presetName.value.trim().slice(0, 40)
    if (!name) {
        presetMessage.value = 'Geef het sjabloon eerst een naam.'
        return
    }

    const existing = presets.value.find((preset) => preset.name.toLocaleLowerCase('nl') === name.toLocaleLowerCase('nl'))
    if (existing) {
        existing.name = name
        existing.settings = currentSettings()
        presetMessage.value = `Sjabloon “${name}” is bijgewerkt.`
    } else {
        presets.value.push({ id: crypto.randomUUID(), name, settings: currentSettings() })
        presetMessage.value = `Sjabloon “${name}” is opgeslagen.`
    }
    presetName.value = ''
    savePresets()
}

function applyPreset(preset: WorksheetPreset) {
    releasePreview()
    applySettings(preset.settings)
    presetMessage.value = `Sjabloon “${preset.name}” is toegepast.`
}

function removePreset(id: string) {
    const preset = presets.value.find((candidate) => candidate.id === id)
    presets.value = presets.value.filter((candidate) => candidate.id !== id)
    savePresets()
    presetMessage.value = preset ? `Sjabloon “${preset.name}” is verwijderd.` : ''
}

loadStoredSettings()
loadPresets()

if (workbookItems.value.length === 0) {
    workbookItems.value = createDefaultWorkbookItems(group.value)
}

watch(group, () => {
    const hasSelectedExercise = exerciseOptions.value.some((option) => option.value === exercise.value)

    if (!hasSelectedExercise) {
        exercise.value = exerciseOptions.value[0]?.value ?? 'contextsommen'
    }

    workbookItems.value = normalizeWorkbookItems(workbookItems.value, group.value)
    workbookExerciseToAdd.value = ''
})

watch(
    [mode, group, exercise, pageCount, assignmentAmount, workbookItems, includeCoverPage, includeAnswerSheet, theme, difficulty],
    saveStoredSettings,
    { deep: true },
)

function validateAmount() {
    if (isWorkbookMode.value) {
        if (workbookItems.value.length === 0 || workbookPageCount.value < 1) {
            amountError.value = 'Voeg minimaal één onderdeel toe.'
            return false
        }
        if (workbookItems.value.some((item) => (
            !Number.isInteger(item.pages) || item.pages < 1 || item.pages > maxWorkbookSectionPages
        ))) {
            amountError.value = `Kies per onderdeel 1 tot ${maxWorkbookSectionPages} pagina's.`
            return false
        }
        if (workbookPageCount.value > maxWorkbookPages) {
            amountError.value = `Je kunt maximaal ${maxWorkbookPages} pagina's maken.`
            return false
        }

        amountError.value = ''
        return true
    }

    if (quantityValue.value < 1) {
        amountError.value = 'Kies minimaal 1 opdracht.'

        return false
    }

    if (quantityValue.value > quantityMax.value) {
        const assignmentLabel = exercise.value === 'tellen-cijfers'
            ? 'cijfers'
            : exercise.value === 'tellen-dobbelsteen'
                ? 'dobbelstenen'
            : compactArithmeticExercises.has(exercise.value) ? 'sommen' : 'opdrachten'

        amountError.value = `Je kunt maximaal ${maxAssignmentAmount.value} ${assignmentLabel} genereren.`

        return false
    }

    amountError.value = ''

    return true
}

watch([mode, exercise, assignmentAmount, workbookItems], validateAmount, { deep: true })

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

function releasePreview() {
    if (lastGenerationResult.value?.previewUrl) {
        URL.revokeObjectURL(lastGenerationResult.value.previewUrl)
    }

    lastGenerationResult.value = null
    isPreviewVisible.value = false
    editableItems.value = []
    hasUnappliedEdits.value = false
}

function printPdf() {
    if (hasUnappliedEdits.value) {
        generationError.value = 'Werk eerst de preview bij voordat je print.'
        return
    }

    const previewWindow = previewIframe.value?.contentWindow

    if (!previewWindow) {
        generationError.value = 'De PDF-preview is nog niet klaar om af te drukken.'
        return
    }

    previewWindow.focus()
    previewWindow.print()
}

function removeEditableItem(index: number) {
    if (editableItems.value.length <= 1) {
        generationError.value = 'Behoud minimaal één opdracht.'
        return
    }

    generationError.value = ''
    editableItems.value.splice(index, 1)
    hasUnappliedEdits.value = true
}

function markWorksheetEditsPending() {
    hasUnappliedEdits.value = true
    generationError.value = ''
}

async function applyWorksheetEdits() {
    if (!lastGenerationResult.value || editableItems.value.length === 0) return

    generationError.value = ''
    const previousResult = lastGenerationResult.value

    try {
        const { createEditedWorksheetPdf } = await import('../services/generateWorksheetPdf')
        const result = await createEditedWorksheetPdf(
            group.value,
            exercise.value,
            editableItems.value,
            compactArithmeticExercises.has(exercise.value) ? 'compact-arithmetic' : 'default',
            includeAnswerSheet.value,
            previousResult.source,
            previousResult.warning,
            previousResult.requestId,
        )
        URL.revokeObjectURL(previousResult.previewUrl)
        lastGenerationResult.value = result
        editableItems.value = result.editableItems?.map((item) => ({ ...item })) ?? []
        isPreviewVisible.value = true
        hasUnappliedEdits.value = false
    } catch (error) {
        generationError.value = error instanceof Error ? error.message : 'De wijzigingen konden niet worden verwerkt.'
    }
}

async function regenerateEditableItem(index: number) {
    const currentItem = editableItems.value[index]
    if (!currentItem || regeneratingItemIndex.value !== null) return

    generationError.value = ''
    regeneratingItemIndex.value = index
    try {
        const { regenerateWorksheetItem } = await import('../services/generateWorksheetPdf')
        editableItems.value[index] = await regenerateWorksheetItem(
            group.value,
            exercise.value,
            compactArithmeticExercises.has(exercise.value) ? 'compact-arithmetic' : 'default',
            activeTheme.value || undefined,
            normalizeDifficulty(difficulty.value) || undefined,
        )
        await applyWorksheetEdits()
    } catch (error) {
        generationError.value = error instanceof Error ? error.message : 'De opdracht kon niet opnieuw worden gemaakt.'
    } finally {
        regeneratingItemIndex.value = null
    }
}

onBeforeUnmount(releasePreview)

async function generatePdf() {
    if (!validateAmount()) {
        return
    }

    generationError.value = ''
    generationNotice.value = ''
    workbookProgress.value = null
    releasePreview()
    isGenerating.value = true
    startGenerationTimer()

    const generationContext: GenerationContext = {
        outputType: mode.value,
        group: group.value,
        exercises: isWorkbookMode.value
            ? [...new Set(workbookSections.value.map((section) => section.exercise))]
            : [exercise.value],
        theme: activeTheme.value || null,
    }
    track('generation_started', generationContext)

    try {
        const { generateWorkbookPdf, generateWorksheetPdf } = await import('../services/generateWorksheetPdf')
        const workbookPdfPromise = isWorkbookMode.value
            ? generateWorkbookPdf(
                group.value,
                workbookSections.value,
                includeCoverPage.value,
                includeAnswerSheet.value,
                activeTheme.value || undefined,
                normalizeDifficulty(difficulty.value) || undefined,
                (progress) => {
                    workbookProgress.value = progress
                },
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

        const result = await workbookPdfPromise

        lastGenerationResult.value = result
        lastGenerationContext.value = generationContext
        editableItems.value = result.editableItems?.map((item) => ({ ...item })) ?? []
        hasUnappliedEdits.value = false
        isPreviewVisible.value = true
        generationNotice.value = result.warning ?? ''
        track('generation_succeeded', { ...generationContext, source: result.source })
        await nextTick()
        generationResultTitle.value?.focus()
    } catch (error) {
        track('generation_failed', { ...generationContext, errorCategory: 'generation_error' })
        generationError.value = error instanceof Error
            ? error.message
            : 'Er ging iets mis met het maken van het werkblad.'
    } finally {
        stopGenerationTimer()
        isGenerating.value = false
    }
}

function trackPdfDownload() {
    if (!lastGenerationResult.value || !lastGenerationContext.value) return

    track('pdf_downloaded', {
        ...lastGenerationContext.value,
        source: lastGenerationResult.value.source,
    })
}
</script>

<template>
    <form
        class="mt-6 space-y-5 sm:mt-8 sm:space-y-6"
        :aria-busy="isGenerating ? 'true' : 'false'"
        @submit.prevent="generatePdf"
    >
        <details class="rounded-xl border border-emerald-200 bg-emerald-50/60">
            <summary class="cursor-pointer px-4 py-3 text-sm font-semibold text-emerald-950">
                Mijn sjablonen{{ presets.length > 0 ? ` (${presets.length})` : '' }}
            </summary>

            <div class="space-y-3 border-t border-emerald-100 p-4">
                <div class="flex flex-col gap-2 sm:flex-row">
                    <div class="flex-1">
                        <label
                            for="preset-name"
                            class="sr-only"
                        >
                            Naam van sjabloon
                        </label>
                        <input
                            id="preset-name"
                            v-model="presetName"
                            type="text"
                            maxlength="40"
                            placeholder="Bijv. Weektaak groep 4"
                            class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                            @keydown.enter.prevent="savePreset"
                        >
                    </div>
                    <button
                        type="button"
                        class="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800"
                        @click="savePreset"
                    >
                        Huidige instellingen opslaan
                    </button>
                </div>

                <ul
                    v-if="presets.length > 0"
                    class="space-y-2"
                    aria-label="Opgeslagen sjablonen"
                >
                    <li
                        v-for="preset in presets"
                        :key="preset.id"
                        class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-100 bg-white p-3"
                    >
                        <span class="text-sm font-semibold text-slate-800">{{ preset.name }}</span>
                        <span class="flex gap-2">
                            <button
                                type="button"
                                class="rounded-md border border-emerald-300 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-50"
                                @click="applyPreset(preset)"
                            >
                                Toepassen
                            </button>
                            <button
                                type="button"
                                class="rounded-md border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                                :aria-label="`Verwijder sjabloon ${preset.name}`"
                                @click="removePreset(preset.id)"
                            >
                                Verwijder
                            </button>
                        </span>
                    </li>
                </ul>
                <p
                    v-else
                    class="text-sm text-slate-600"
                >
                    Sla een combinatie van groep, oefeningen, thema en opties op voor later.
                </p>

                <p
                    v-if="presetMessage"
                    class="text-sm text-emerald-800"
                    role="status"
                >
                    {{ presetMessage }}
                </p>
            </div>
        </details>

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
            <label
                for="group"
                class="mb-2 block text-sm font-medium text-slate-700"
            >
                Groep
            </label>
            <div class="relative">
                <select
                    id="group"
                    v-model="group"
                    :disabled="isGenerating"
                    :class="selectClass"
                >
                    <option
                        v-for="groupNumber in 8"
                        :key="groupNumber"
                        :value="String(groupNumber)"
                    >
                        Groep {{ groupNumber }}
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

        <section
            v-if="isWorkbookMode"
            class="space-y-3"
            aria-labelledby="workbook-builder-title"
        >
            <div>
                <h2
                    id="workbook-builder-title"
                    class="font-medium text-slate-800"
                >
                    Onderdelen
                </h2>
                <p class="mt-1 text-sm text-slate-500">
                    Kies de volgorde en het aantal pagina's per oefensoort.
                </p>
            </div>

            <ol class="space-y-3">
                <li
                    v-for="(item, itemIndex) in workbookItems"
                    :key="item.id"
                    class="rounded-lg border border-slate-200 bg-slate-50 p-3"
                >
                    <div class="flex items-start gap-3">
                        <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-800">
                            {{ itemIndex + 1 }}
                        </span>

                        <div class="min-w-0 flex-1 space-y-3">
                            <div class="flex flex-wrap items-center justify-between gap-2">
                                <span class="font-medium text-slate-800">
                                    {{ exerciseLabelByValue.get(item.exercise) ?? item.exercise }}
                                </span>
                                <div class="flex gap-1">
                                    <button
                                        type="button"
                                        :disabled="isGenerating || itemIndex === 0"
                                        :aria-label="`${exerciseLabelByValue.get(item.exercise) ?? item.exercise} omhoog`"
                                        class="rounded-md border border-slate-300 bg-white px-2 py-1 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                                        @click="moveWorkbookItem(itemIndex, -1)"
                                    >
                                        ↑
                                    </button>
                                    <button
                                        type="button"
                                        :disabled="isGenerating || itemIndex === workbookItems.length - 1"
                                        :aria-label="`${exerciseLabelByValue.get(item.exercise) ?? item.exercise} omlaag`"
                                        class="rounded-md border border-slate-300 bg-white px-2 py-1 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                                        @click="moveWorkbookItem(itemIndex, 1)"
                                    >
                                        ↓
                                    </button>
                                    <button
                                        type="button"
                                        :disabled="isGenerating || workbookItems.length <= 1"
                                        :aria-label="`${exerciseLabelByValue.get(item.exercise) ?? item.exercise} verwijderen`"
                                        class="rounded-md border border-red-200 bg-white px-2 py-1 text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                                        @click="removeWorkbookItem(item.id)"
                                    >
                                        Verwijder
                                    </button>
                                </div>
                            </div>

                            <label
                                :for="`workbook-pages-${item.id}`"
                                class="flex items-center justify-between gap-3 text-sm text-slate-600"
                            >
                                <span>Pagina's</span>
                                <input
                                    :id="`workbook-pages-${item.id}`"
                                    v-model.number="item.pages"
                                    type="number"
                                    :aria-label="`${exerciseLabelByValue.get(item.exercise) ?? item.exercise}: pagina's`"
                                    min="1"
                                    :max="maxWorkbookSectionPages"
                                    :disabled="isGenerating"
                                    class="w-24 rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                                >
                            </label>
                            <p class="text-right text-xs text-slate-500">
                                Ongeveer {{ item.pages * getQuestionsPerPage(item.exercise) }} opdrachten
                            </p>
                        </div>
                    </div>
                </li>
            </ol>

            <div
                v-if="availableWorkbookExercises.length > 0"
                class="flex flex-col gap-2 sm:flex-row"
            >
                <label
                    for="workbook-exercise-add"
                    class="sr-only"
                >
                    Oefensoort toevoegen
                </label>
                <select
                    id="workbook-exercise-add"
                    v-model="workbookExerciseToAdd"
                    :disabled="isGenerating || workbookPageCount >= maxWorkbookPages"
                    :class="selectClass"
                >
                    <option value="">
                        Kies een oefensoort
                    </option>
                    <option
                        v-for="option in availableWorkbookExercises"
                        :key="option.value"
                        :value="option.value"
                    >
                        {{ option.label }}
                    </option>
                </select>
                <button
                    type="button"
                    :disabled="isGenerating || !workbookExerciseToAdd || workbookPageCount >= maxWorkbookPages"
                    class="shrink-0 rounded-lg border border-emerald-600 px-4 py-3 font-medium text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                    @click="addWorkbookItem"
                >
                    Toevoegen
                </button>
            </div>

            <section
                id="workbook-summary"
                class="rounded-lg border border-emerald-200 bg-emerald-50/70 p-4"
                aria-labelledby="workbook-summary-title"
            >
                <h3
                    id="workbook-summary-title"
                    class="font-medium text-emerald-950"
                >
                    Verwachte omvang
                </h3>
                <dl class="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                    <div>
                        <dt class="text-slate-500">Werkbladen</dt>
                        <dd class="mt-1 font-semibold text-slate-900">{{ workbookPageCount }}</dd>
                    </div>
                    <div>
                        <dt class="text-slate-500">Opdrachten</dt>
                        <dd class="mt-1 font-semibold text-slate-900">± {{ workbookAssignmentAmount }}</dd>
                    </div>
                    <div>
                        <dt class="text-slate-500">Antwoorden</dt>
                        <dd class="mt-1 font-semibold text-slate-900">± {{ estimatedAnswerPageCount }} pag.</dd>
                    </div>
                    <div>
                        <dt class="text-slate-500">PDF totaal</dt>
                        <dd class="mt-1 font-semibold text-slate-900">± {{ estimatedWorkbookPdfPages }} pag.</dd>
                    </div>
                </dl>
                <p class="mt-3 text-xs text-slate-500">
                    Antwoordpagina's zijn een schatting; langere antwoorden kunnen extra ruimte gebruiken.
                </p>
            </section>
            <p
                v-if="amountError"
                id="amount-error"
                class="text-sm text-red-600"
            >
                {{ amountError }}
            </p>
        </section>

        <div v-if="!isWorkbookMode">
            <label
                for="exercise"
                class="mb-2 block text-sm font-medium text-slate-700"
            >
                Oefensoort
            </label>

            <div class="relative">
                <select
                    id="exercise"
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
            <label
                for="theme"
                class="mb-2 block text-sm font-medium text-slate-700"
            >
                Thema
            </label>

            <div class="relative">
                <select
                    id="theme"
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
            <label
                for="difficulty"
                class="mb-2 block text-sm font-medium text-slate-700"
            >
                Moeilijkheid
            </label>

            <div class="relative">
                <select
                    id="difficulty"
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

        <div v-if="!isWorkbookMode">
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
            class="relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-lg bg-emerald-700 px-4 py-3 font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-wait disabled:bg-emerald-700 disabled:opacity-80"
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

        <div
            v-if="isGenerating && isWorkbookMode && workbookProgress && workbookProgress.total > 0"
            class="space-y-2"
            role="progressbar"
            aria-label="Voortgang werkboekje"
            :aria-valuenow="workbookProgress.completed"
            aria-valuemin="0"
            :aria-valuemax="workbookProgress.total"
        >
            <div class="flex justify-between gap-3 text-sm text-slate-600">
                <span>
                    {{ workbookProgress.exercise || 'Onderdelen voorbereiden' }}
                </span>
                <span>{{ workbookProgress.completed }} van {{ workbookProgress.total }}</span>
            </div>
            <div class="h-2 overflow-hidden rounded-full bg-emerald-100">
                <div
                    class="h-full rounded-full bg-emerald-600 transition-all"
                    :style="{ width: `${workbookProgressPercentage}%` }"
                />
            </div>
        </div>

        <section
            v-if="lastGenerationResult"
            class="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4"
            aria-labelledby="generation-result-title"
        >
            <div class="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2
                        id="generation-result-title"
                        ref="generationResultTitle"
                        tabindex="-1"
                        class="font-semibold text-emerald-950"
                    >
                        Je PDF is klaar
                    </h2>
                    <p class="mt-1 text-sm text-emerald-800">
                        {{ generationSourceLabel }}, {{ lastGenerationResult.pageCount }}
                        {{ lastGenerationResult.pageCount === 1 ? 'pagina' : "pagina's" }}. Bekijk de preview en download wanneer je tevreden bent.
                    </p>
                </div>

                <span class="rounded-full bg-white px-3 py-1 text-xs font-semibold text-emerald-800 shadow-sm">
                    {{ generationSourceLabel }}
                </span>
            </div>

            <details
                v-if="editableItems.length > 0"
                class="mt-4 rounded-lg border border-emerald-200 bg-white"
            >
                <summary class="cursor-pointer px-4 py-3 text-sm font-semibold text-emerald-900">
                    Bewerk opdrachten ({{ editableItems.length }})
                </summary>

                <div class="max-h-[32rem] space-y-4 overflow-y-auto border-t border-emerald-100 p-4">
                    <fieldset
                        v-for="(item, index) in editableItems"
                        :key="index"
                        class="rounded-lg border border-slate-200 p-3"
                    >
                        <legend class="px-1 text-sm font-semibold text-slate-700">
                            Opdracht {{ index + 1 }}
                        </legend>

                        <label
                            :for="`edit-question-${index}`"
                            class="mb-1 block text-xs font-semibold text-slate-600"
                        >
                            Vraag
                        </label>
                        <textarea
                            :id="`edit-question-${index}`"
                            v-model="item.question"
                            rows="2"
                            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-950 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                            @input="markWorksheetEditsPending"
                        />

                        <label
                            :for="`edit-answer-${index}`"
                            class="mb-1 mt-3 block text-xs font-semibold text-slate-600"
                        >
                            Antwoord
                        </label>
                        <textarea
                            :id="`edit-answer-${index}`"
                            v-model="item.answer"
                            rows="2"
                            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-950 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                            @input="markWorksheetEditsPending"
                        />

                        <div class="mt-3 flex flex-wrap gap-2">
                            <button
                                type="button"
                                class="rounded-md border border-emerald-300 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 disabled:cursor-wait disabled:opacity-60"
                                :disabled="regeneratingItemIndex !== null"
                                @click="regenerateEditableItem(index)"
                            >
                                {{ regeneratingItemIndex === index ? 'Opnieuw maken...' : 'Opnieuw genereren' }}
                            </button>
                            <button
                                type="button"
                                class="rounded-md border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                                @click="removeEditableItem(index)"
                            >
                                Verwijder opdracht
                            </button>
                        </div>

                        <WorksheetFeedback
                            v-if="lastGenerationResult?.source === 'openai' && lastGenerationResult.requestId"
                            :request-id="lastGenerationResult.requestId"
                            :group="group"
                            :exercise="exercise"
                            :item-index="index + 1"
                        />
                    </fieldset>

                    <button
                        type="button"
                        class="w-full rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-default disabled:opacity-50"
                        :disabled="!hasUnappliedEdits"
                        @click="applyWorksheetEdits"
                    >
                        {{ hasUnappliedEdits ? 'Werk preview bij' : 'Preview is bijgewerkt' }}
                    </button>
                </div>
            </details>

            <p
                v-if="hasUnappliedEdits"
                class="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900"
                role="status"
            >
                Je hebt wijzigingen die nog niet in de PDF staan. Werk de preview bij om downloaden en printen weer beschikbaar te maken.
            </p>

            <div class="mt-4 grid gap-2 sm:grid-cols-3">
                <a
                    v-if="!hasUnappliedEdits"
                    :href="lastGenerationResult.previewUrl"
                    :download="lastGenerationResult.fileName"
                    class="rounded-lg bg-emerald-700 px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-emerald-800"
                    @click="trackPdfDownload"
                >
                    Download PDF
                </a>

                <button
                    v-else
                    type="button"
                    disabled
                    class="cursor-not-allowed rounded-lg bg-slate-300 px-4 py-2 text-center text-sm font-semibold text-slate-600"
                >
                    Download na bijwerken
                </button>

                <button
                    type="button"
                    class="rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500"
                    :disabled="hasUnappliedEdits"
                    @click="printPdf"
                >
                    {{ hasUnappliedEdits ? 'Print na bijwerken' : 'Print PDF' }}
                </button>

                <button
                    type="button"
                    class="rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50"
                    :aria-expanded="isPreviewVisible"
                    @click="isPreviewVisible = !isPreviewVisible"
                >
                    {{ isPreviewVisible ? 'Sluit preview' : 'Bekijk preview' }}
                </button>
            </div>

            <button
                type="button"
                class="mt-3 text-sm font-semibold text-emerald-800 underline decoration-emerald-300 underline-offset-4 hover:text-emerald-950"
                @click="generatePdf"
            >
                Maak nog een variant
            </button>

            <iframe
                v-if="isPreviewVisible"
                ref="previewIframe"
                :src="lastGenerationResult.previewUrl"
                title="Preview van de gemaakte PDF"
                class="mt-4 h-96 w-full rounded-lg border border-emerald-200 bg-white"
            />
        </section>

        <p
            v-if="generationNotice"
            class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
            role="status"
        >
            {{ generationNotice }}
        </p>

        <p
            v-if="generationError"
            class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            role="alert"
        >
            {{ generationError }}
        </p>
    </form>
</template>
