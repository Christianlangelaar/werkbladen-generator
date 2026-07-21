import OpenAI from 'openai'
import { getWorksheetPrompt } from '../prompts/index.js'
import { createCompactArithmeticContent } from '../shared/compactArithmetic.js'
import { createFallbackWorksheetContent, type FallbackWorksheetContent } from '../shared/fallbackWorksheet.js'
import type { ValidatedWorksheetRequest } from './worksheetRequest.js'
import { validateWorksheetPairs } from './worksheetQuality.js'

type GeneratedOutput = {
  outputText: string
  inputTokens: number
  outputTokens: number
}

type GenerateOutput = (prompt: string, model: string, apiKey: string) => Promise<string | GeneratedOutput>

export function getOpenAiMaxOutputTokens(value = process.env.OPENAI_MAX_OUTPUT_TOKENS) {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 256 || parsed > 8_000) return 4_000
  return parsed
}

async function requestOpenAIOutput(prompt: string, model: string, apiKey: string) {
  const openai = new OpenAI({ apiKey, timeout: 45_000, maxRetries: 1 })
  const response = await openai.responses.create({
    model,
    max_output_tokens: getOpenAiMaxOutputTokens(),
    input: [
      {
        role: 'system',
        content: 'Je maakt Nederlandse basisschool-werkbladen. Antwoord alleen met geldige JSON.',
      },
      { role: 'user', content: prompt },
    ],
  })
  return {
    outputText: response.output_text,
    inputTokens: response.usage?.input_tokens ?? 0,
    outputTokens: response.usage?.output_tokens ?? 0,
  }
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
    request.exercise,
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

function normalizeWorksheetOutputWithQuality(outputText: string, request: ValidatedWorksheetRequest) {
  const parsed = JSON.parse(outputText) as { questions?: unknown, answers?: unknown }
  const { pairs, report } = validateWorksheetPairs(
    parsed.questions,
    parsed.answers,
    request.amount,
    request.layout === 'compact-arithmetic',
    request.exercise,
  )
  const completeAmount = pairs.length
  const fallback = createFallback(request, request.amount - completeAmount, completeAmount)

  return {
    questions: [...pairs.map((pair, index) => `${index + 1}. ${pair.question}`), ...fallback.questions],
    answers: [...pairs.map((pair, index) => `${index + 1}. ${pair.answer}`), ...fallback.answers],
    quality: {
      ...report,
      fallbackItems: request.amount - completeAmount,
    },
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
  const generated = await generateOutput(prompt, model, apiKey)
  const output = typeof generated === 'string'
    ? { outputText: generated, inputTokens: 0, outputTokens: 0 }
    : generated
  const content = normalizeWorksheetOutputWithQuality(output.outputText, request)

  return {
    ...content,
    usage: {
      inputTokens: output.inputTokens,
      outputTokens: output.outputTokens,
      totalTokens: output.inputTokens + output.outputTokens,
    },
  }
}
