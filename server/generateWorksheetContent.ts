import OpenAI from 'openai'
import { getWorksheetPrompt } from '../prompts'
import { createCompactArithmeticContent } from '../shared/compactArithmetic'
import { createFallbackWorksheetContent, type FallbackWorksheetContent } from '../shared/fallbackWorksheet'
import type { ValidatedWorksheetRequest } from './worksheetRequest'
import { validateWorksheetPairs } from './worksheetQuality'

type GenerateOutput = (prompt: string, model: string, apiKey: string) => Promise<string>

async function requestOpenAIOutput(prompt: string, model: string, apiKey: string) {
  const openai = new OpenAI({ apiKey })
  const response = await openai.responses.create({
    model,
    input: [
      {
        role: 'system',
        content: 'Je maakt Nederlandse basisschool-werkbladen. Antwoord alleen met geldige JSON.',
      },
      { role: 'user', content: prompt },
    ],
  })
  return response.output_text
}

function createFallback(request: ValidatedWorksheetRequest, amount: number, startIndex = 0) {
  return request.layout === 'compact-arithmetic'
    ? createCompactArithmeticContent(request.group, request.exercise, amount, startIndex)
    : createFallbackWorksheetContent(request.group, request.exercise, amount, startIndex)
}

export function normalizeWorksheetOutput(
  outputText: string,
  request: ValidatedWorksheetRequest,
): FallbackWorksheetContent {
  const parsed = JSON.parse(outputText) as { questions?: unknown, answers?: unknown }
  const { pairs } = validateWorksheetPairs(
    parsed.questions,
    parsed.answers,
    request.amount,
    request.layout === 'compact-arithmetic',
  )
  const completeAmount = pairs.length
  const fallback = createFallback(request, request.amount - completeAmount, completeAmount)

  return {
    questions: [
      ...pairs.map((pair, index) => `${index + 1}. ${pair.question}`),
      ...fallback.questions,
    ],
    answers: [
      ...pairs.map((pair, index) => `${index + 1}. ${pair.answer}`),
      ...fallback.answers,
    ],
  }
}

export async function generateWorksheetContent(
  request: ValidatedWorksheetRequest,
  apiKey: string,
  model = 'gpt-5.5',
  generateOutput: GenerateOutput = requestOpenAIOutput,
) {
  const prompt = getWorksheetPrompt(
    request.group,
    request.exercise,
    request.amount,
    request.theme,
    request.difficulty,
  )
  const outputText = await generateOutput(prompt, model, apiKey)
  return normalizeWorksheetOutput(outputText, request)
}
