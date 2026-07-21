export type WorksheetPair = {
  question: string
  answer: string
}

export type WorksheetQualityReport = {
  accepted: number
  duplicates: number
  incomplete: number
  inappropriate: number
  incorrect: number
}

const inappropriatePattern = /\b(?:porno|seksueel|cocaïne|heroïne|zelfmoord|bloedbad|martelen|moordwapen)\b/i
const placeholderAnswerPattern = /^(?:antwoord|geen antwoord|onbekend|ik weet het niet|n\.?v\.?t\.?)$/i

function withoutNumber(value: string) {
  return value.replace(/^\d+\.\s*/, '').trim()
}

function duplicateKey(value: string) {
  return withoutNumber(value)
    .toLocaleLowerCase('nl')
    .normalize('NFKD')
    .replace(/[\p{P}\p{S}\s]+/gu, '')
}

function hasInvalidMaskedSpelling(question: string, answer: string) {
  const maskedWord = question.match(/\b[\p{L}]*_+[\p{L}_]*\b/u)?.[0]
  if (!maskedWord) return false

  // A losse omschrijving zoals `p__s (een dier dat zwemt)` is vaak
  // meerduidig en kan inhoudelijk botsen met het bedoelde woord.
  if (/\([^)]{4,}\)/.test(question)) return true

  const answerWord = answer.match(/[\p{L}]+/u)?.[0]
  if (!answerWord || answerWord.length !== maskedWord.length) return true

  return [...maskedWord].some((character, index) => {
    return character !== '_' && character.toLocaleLowerCase('nl') !== answerWord[index]?.toLocaleLowerCase('nl')
  })
}

export function validateWorksheetPairs(
  questionsValue: unknown,
  answersValue: unknown,
  amount: number,
  validateArithmetic = false,
  exercise?: string,
): { pairs: WorksheetPair[], report: WorksheetQualityReport } {
  const questions = Array.isArray(questionsValue) ? questionsValue : []
  const answers = Array.isArray(answersValue) ? answersValue : []
  const pairs: WorksheetPair[] = []
  const seenQuestions = new Set<string>()
  const report: WorksheetQualityReport = { accepted: 0, duplicates: 0, incomplete: 0, inappropriate: 0, incorrect: 0 }

  for (let index = 0; index < Math.min(questions.length, answers.length, amount); index += 1) {
    const rawQuestion = questions[index]
    const rawAnswer = answers[index]
    if (typeof rawQuestion !== 'string' || typeof rawAnswer !== 'string') {
      report.incomplete += 1
      continue
    }

    const question = withoutNumber(rawQuestion)
    const answer = withoutNumber(rawAnswer)
    if (question.length < 3 || !answer || placeholderAnswerPattern.test(answer)) {
      report.incomplete += 1
      continue
    }
    if (inappropriatePattern.test(question) || inappropriatePattern.test(answer)) {
      report.inappropriate += 1
      continue
    }
    if (exercise === 'spelling' && hasInvalidMaskedSpelling(question, answer)) {
      report.incorrect += 1
      continue
    }
    if (validateArithmetic) {
      const calculation = question.match(/(-?\d+(?:[.,]\d+)?)\s*([+\-×x*÷:/])\s*(-?\d+(?:[.,]\d+)?)/)
      const suppliedAnswer = answer.match(/-?\d+(?:[.,]\d+)?/)?.[0]
      if (calculation && suppliedAnswer) {
        const left = Number(calculation[1]?.replace(',', '.'))
        const right = Number(calculation[3]?.replace(',', '.'))
        const operator = calculation[2]
        const expected = operator === '+' ? left + right
          : operator === '-' ? left - right
            : operator === '×' || operator === 'x' || operator === '*' ? left * right
              : left / right
        if (!Number.isFinite(expected) || Math.abs(expected - Number(suppliedAnswer.replace(',', '.'))) > 0.001) {
          report.incorrect += 1
          continue
        }
      }
    }

    const key = duplicateKey(question)
    if (!key || seenQuestions.has(key)) {
      report.duplicates += 1
      continue
    }

    seenQuestions.add(key)
    pairs.push({ question, answer })
  }

  report.accepted = pairs.length
  return { pairs, report }
}
