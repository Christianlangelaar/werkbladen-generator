export type WorksheetRequest = {
  group?: string
  exercise?: string
  amount?: number
  layout?: 'default' | 'compact-arithmetic'
  theme?: string
  difficulty?: string
}

export type ValidatedWorksheetRequest = {
  group: string
  exercise: string
  amount: number
  layout: 'default' | 'compact-arithmetic'
  theme?: string
  difficulty?: string
}

const compactArithmeticQuestionsPerPage = 100
const maxCompactArithmeticPages = 5
const readingQuestionsPerPage = 7
const summaryQuestionsPerPage = 4
const storyQuestionsPerPage = 10
const standardQuestionsPerPage = 18
const maxDefaultWorksheetPages = 5
const compactArithmeticExercises = new Set([
  'optellen', 'aftrekken', 'splitsen', 'tafels', 'optellen-grote-getallen',
  'aftrekken-grote-getallen', 'vermenigvuldigen', 'delen', 'tafel-automatiseren',
])
const exercisesByGroup: Record<string, Set<string>> = {
  3: new Set(['contextsommen', 'optellen', 'aftrekken', 'splitsen', 'begrijpend-lezen', 'woordenschat', 'rijmen']),
  4: new Set(['contextsommen', 'optellen', 'aftrekken', 'tafels', 'begrijpend-lezen', 'woordenschat', 'spelling']),
  5: new Set(['contextsommen', 'optellen-grote-getallen', 'aftrekken-grote-getallen', 'vermenigvuldigen', 'delen', 'tafel-automatiseren', 'begrijpend-lezen', 'woordenschat', 'spelling', 'werkwoordspelling', 'grammatica', 'leestekens']),
  6: new Set(['contextsommen', 'breuken', 'procenten', 'verhoudingen', 'kommagetallen', 'begrijpend-lezen', 'spelling', 'werkwoordspelling', 'grammatica']),
  7: new Set(['contextsommen', 'procenten', 'schaal', 'breuken', 'begrijpend-lezen', 'werkwoordspelling', 'grammatica', 'samenvatten', 'engels-woordenschat']),
  8: new Set(['contextsommen', 'eindtoets-rekenen', 'breuken', 'procenten', 'verhoudingen', 'begrijpend-lezen', 'werkwoordspelling', 'grammatica', 'samenvatten']),
}
const readingExercises = new Set(['begrijpend-lezen'])
const summaryExercises = new Set(['samenvatten'])
const storyExercises = new Set(['contextsommen', 'eindtoets-rekenen'])
const themeSupportedExercises = new Set([
  'begrijpend-lezen', 'contextsommen', 'eindtoets-rekenen', 'engels-woordenschat',
  'grammatica', 'leestekens', 'rijmen', 'samenvatten', 'spelling',
  'werkwoordspelling', 'woordenschat',
])
const themeOptions = new Set([
  'Voetbal', 'Paarden', 'Dieren', "Dino's", 'Minecraft', 'Prinsessen',
  'Ruimte', "Auto's", 'Pokémon',
])
const difficultyOptions = new Set(['Makkelijker', 'Uitdagender'])

export class RequestError extends Error {
  constructor(message: string, readonly statusCode = 400) {
    super(message)
  }
}

function getDefaultQuestionsPerPage(exercise: string) {
  if (readingExercises.has(exercise)) return readingQuestionsPerPage
  if (summaryExercises.has(exercise)) return summaryQuestionsPerPage
  if (storyExercises.has(exercise)) return storyQuestionsPerPage
  return standardQuestionsPerPage
}

export function validateWorksheetRequest(value: unknown): ValidatedWorksheetRequest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new RequestError('Het verzoek heeft geen geldig formaat.')
  }

  const request = value as WorksheetRequest
  const group = request.group ?? '4'
  const exercise = request.exercise ?? 'contextsommen'
  const amount = request.amount ?? 10
  const layout = request.layout ?? 'default'

  if (typeof group !== 'string' || !exercisesByGroup[group]) throw new RequestError('Kies een geldige groep.')
  if (typeof exercise !== 'string' || !exercisesByGroup[group]?.has(exercise)) throw new RequestError('Kies een geldige oefensoort voor deze groep.')
  if (layout !== 'default' && layout !== 'compact-arithmetic') throw new RequestError('Kies een geldige werkbladindeling.')
  if (layout === 'compact-arithmetic' && !compactArithmeticExercises.has(exercise)) throw new RequestError('Deze oefensoort ondersteunt de compacte indeling niet.')
  if (layout === 'default' && compactArithmeticExercises.has(exercise)) throw new RequestError('Deze oefensoort vereist de compacte indeling.')
  if (typeof amount !== 'number' || !Number.isInteger(amount) || amount < 1) throw new RequestError('Kies een geldig geheel aantal opdrachten.')
  if (request.theme !== undefined && (typeof request.theme !== 'string' || !themeOptions.has(request.theme))) throw new RequestError('Kies een geldig thema.')
  if (request.theme && !themeSupportedExercises.has(exercise)) throw new RequestError('Deze oefensoort ondersteunt geen thema.')
  if (request.difficulty !== undefined && (typeof request.difficulty !== 'string' || !difficultyOptions.has(request.difficulty))) throw new RequestError('Kies een geldige moeilijkheid.')

  const maxAmount = layout === 'compact-arithmetic'
    ? compactArithmeticQuestionsPerPage * maxCompactArithmeticPages
    : getDefaultQuestionsPerPage(exercise) * maxDefaultWorksheetPages

  if (amount > maxAmount) throw new RequestError(`Je kunt maximaal ${maxAmount} opdrachten genereren.`)

  return {
    group,
    exercise,
    amount,
    layout,
    theme: request.theme,
    difficulty: request.difficulty,
  }
}
