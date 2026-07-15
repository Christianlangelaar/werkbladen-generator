import OpenAI from 'openai'
import { getWorksheetPrompt } from '../prompts'
import { createCompactArithmeticContent } from '../shared/compactArithmetic'
import { createFallbackWorksheetContent, type FallbackWorksheetContent } from '../shared/fallbackWorksheet'
import type { ValidatedWorksheetRequest } from './worksheetRequest'

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

function cleanItems(value: unknown, amount: number) {
  if (!Array.isArray(value)) return []

  return value
    .slice(0, amount)
    .filter((item): item is string => typeof item === 'string' && Boolean(item.trim()))
    .map((item, index) => `${index + 1}. ${item.replace(/^\d+\.\s*/, '').trim()}`)
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
  const questions = cleanItems(parsed.questions, request.amount)
  const answers = cleanItems(parsed.answers, request.amount)
  const completeAmount = Math.min(questions.length, answers.length)
  const fallback = createFallback(request, request.amount - completeAmount, completeAmount)

  return {
    questions: [...questions.slice(0, completeAmount), ...fallback.questions],
    answers: [...answers.slice(0, completeAmount), ...fallback.answers],
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
