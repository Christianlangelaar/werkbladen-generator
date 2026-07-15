import type { FallbackWorksheetContent } from './fallbackWorksheet'

function getCompactArithmeticItem(group: string, exercise: string, index: number) {
  const groupNumber = Number(group) || 4
  const seed = index + 1
  const smallA = ((seed * 7) % 9) + 1
  const smallB = ((seed * 5) % 9) + 1
  const mediumA = ((seed * 17) % 89) + 10
  const mediumB = ((seed * 13) % 89) + 10
  const largeA = ((seed * 197) % 8_900) + 1_000
  const largeB = ((seed * 131) % 8_900) + 1_000

  if (exercise === 'aftrekken' || exercise === 'aftrekken-grote-getallen') {
    const left = exercise === 'aftrekken-grote-getallen' ? Math.max(largeA, largeB) : Math.max(mediumA, mediumB)
    const right = exercise === 'aftrekken-grote-getallen' ? Math.min(largeA, largeB) : Math.min(mediumA, mediumB)
    return { question: `${left} - ${right} = ...`, answer: String(left - right) }
  }

  if (exercise === 'tafels' || exercise === 'vermenigvuldigen') {
    const left = groupNumber <= 4 ? smallA : ((seed * 11) % 12) + 1
    const right = groupNumber <= 4 ? smallB : ((seed * 3) % 12) + 1
    return { question: `${left} x ${right} = ...`, answer: String(left * right) }
  }

  if (exercise === 'delen') {
    const divisor = smallA
    const answer = groupNumber <= 5 ? smallB : ((seed * 11) % 12) + 1
    return { question: `${divisor * answer} : ${divisor} = ...`, answer: String(answer) }
  }

  if (exercise === 'tafel-automatiseren') {
    return seed % 3 === 0
      ? { question: `${smallA * smallB} : ${smallA} = ...`, answer: String(smallB) }
      : { question: `${smallA} x ${smallB} = ...`, answer: String(smallA * smallB) }
  }

  if (exercise === 'splitsen') {
    const total = groupNumber <= 3 ? ((seed * 7) % 20) + 1 : ((seed * 7) % 100) + 1
    const part = seed % total
    return { question: `${part} + ... = ${total}`, answer: String(total - part) }
  }

  const left = exercise === 'optellen-grote-getallen' ? largeA : mediumA
  const right = exercise === 'optellen-grote-getallen' ? largeB : mediumB
  return { question: `${left} + ${right} = ...`, answer: String(left + right) }
}

export function createCompactArithmeticContent(
  group: string,
  exercise: string,
  amount: number,
  startIndex = 0,
): FallbackWorksheetContent {
  const items = Array.from({ length: amount }, (_, offset) => {
    const index = startIndex + offset
    const item = getCompactArithmeticItem(group, exercise, index)
    return {
      question: `${index + 1}. ${item.question}`,
      answer: `${index + 1}. ${item.answer}`,
    }
  })

  return {
    questions: items.map((item) => item.question),
    answers: items.map((item) => item.answer),
  }
}
