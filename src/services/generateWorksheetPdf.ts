import { jsPDF } from 'jspdf'

type WorksheetResponse = {
  questions: string[]
  source?: 'openai' | 'fallback'
}

type WorksheetLayout = 'default' | 'compact-arithmetic'

const pageMargin = 20
const pageWidth = 210
const pageHeight = 297
const pageBottom = 280
const questionMaxWidth = 170
const readingQuestionIndent = 6
const readingQuestionMaxWidth = questionMaxWidth - readingQuestionIndent
const compactArithmeticQuestionsPerPage = 100
const maxCompactArithmeticPages = 5
const maxDefaultWorksheetPages = 5
const readingQuestionsPerPage = 7
const summaryQuestionsPerPage = 4
const storyQuestionsPerPage = 10
const standardQuestionsPerPage = 18
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

function isCompactArithmeticExercise(exercise: string) {
  return compactArithmeticExercises.has(exercise)
}

function isReadingExercise(exercise: string) {
  return readingExercises.has(exercise) || summaryExercises.has(exercise)
}

function isStoryExercise(exercise: string) {
  return storyExercises.has(exercise)
}

function getDefaultQuestionsPerPage(exercise: string) {
  if (readingExercises.has(exercise)) {
    return readingQuestionsPerPage
  }

  if (summaryExercises.has(exercise)) {
    return summaryQuestionsPerPage
  }

  if (isStoryExercise(exercise)) {
    return storyQuestionsPerPage
  }

  return standardQuestionsPerPage
}

function setDefaultBodyTextStyle(doc: jsPDF) {
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10.5)
  doc.setTextColor(0, 0, 0)
}

function fallbackQuestions(amount: number) {
  return Array.from({ length: amount }, (_, index) => `${index + 1}. __________________________________________`)
}

function fallbackCompactArithmeticQuestions(group: string, exercise: string, amount: number) {
  const groupNumber = Number(group) || 4

  return Array.from({ length: amount }, (_, index) => {
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

      return `${index + 1}. ${left} - ${right} = ...`
    }

    if (exercise === 'tafels' || exercise === 'vermenigvuldigen') {
      const left = groupNumber <= 4 ? smallA : ((seed * 11) % 12) + 1
      const right = groupNumber <= 4 ? smallB : ((seed * 3) % 12) + 1

      return `${index + 1}. ${left} x ${right} = ...`
    }

    if (exercise === 'delen') {
      const divisor = smallA
      const answer = groupNumber <= 5 ? smallB : ((seed * 11) % 12) + 1

      return `${index + 1}. ${divisor * answer} : ${divisor} = ...`
    }

    if (exercise === 'tafel-automatiseren') {
      return seed % 3 === 0
        ? `${index + 1}. ${smallA * smallB} : ${smallA} = ...`
        : `${index + 1}. ${smallA} x ${smallB} = ...`
    }

    if (exercise === 'splitsen') {
      const total = groupNumber <= 3 ? ((seed * 7) % 20) + 1 : ((seed * 7) % 100) + 1
      const part = seed % total

      return `${index + 1}. ${part} + ... = ${total}`
    }

    const left = exercise === 'optellen-grote-getallen' ? largeA : mediumA
    const right = exercise === 'optellen-grote-getallen' ? largeB : mediumB

    return `${index + 1}. ${left} + ${right} = ...`
  })
}

function formatExerciseName(exercise: string) {
  return exercise
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function getWorksheetTitle(group: string, exercise: string) {
  return `Groep ${group} | ${formatExerciseName(exercise)}`
}

function getWorksheetFileName(group: string, exercise: string) {
  const safeExercise = exercise
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  return `groep${group}-${safeExercise || 'werkblad'}.pdf`
}

function cleanQuestionText(question: string) {
  return question
    .replace(/^\d+\.\s*/, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function getCompactQuestionParts(question: string) {
  const cleanQuestion = cleanQuestionText(question)
    .replace(/\s*\.{2,}\s*$/g, '')
    .replace(/\s*_+\s*$/g, '')
    .trim()
  const hasInternalBlank = /\.{2,}|_+/.test(cleanQuestion)

  if (hasInternalBlank) {
    return {
      text: cleanQuestion.replace(/_+/g, '...'),
      showTrailingAnswerDots: false,
    }
  }

  if (cleanQuestion.includes('=')) {
    return {
      text: cleanQuestion.replace(/\s*=\s*(?:\.{2,}|_+)?\s*$/g, ' ='),
      showTrailingAnswerDots: true,
    }
  }

  return {
    text: `${cleanQuestion} =`,
    showTrailingAnswerDots: true,
  }
}

function addHeader(doc: jsPDF, group: string, exercise: string) {
  const pageNumber = doc.getCurrentPageInfo().pageNumber

  doc.setDrawColor(5, 150, 105)
  doc.setFillColor(5, 150, 105)
  doc.roundedRect(pageMargin, 17, 4, 14, 1, 1, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(15, 23, 42)
  doc.text(getWorksheetTitle(group, exercise), pageMargin + 9, 27)

  if (pageNumber === 1) {
    const fieldX = 152
    const lineX = 164
    const lineWidth = 25

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(71, 85, 105)
    doc.setDrawColor(148, 163, 184)
    doc.setLineWidth(0.25)

    doc.text('Naam:', fieldX, 20)
    doc.line(lineX, 20.6, lineX + lineWidth, 20.6)
    doc.text('Datum:', fieldX, 27)
    doc.line(lineX, 27.6, lineX + lineWidth, 27.6)
  }

  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.4)
  doc.line(pageMargin, 36, pageWidth - pageMargin, 36)

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(0, 0, 0)
}

function drawCompactAnswerSpace(doc: jsPDF, x: number, y: number, width: number) {
  doc.setDrawColor(203, 213, 225)
  doc.setLineWidth(0.35)
  doc.line(x, y, x + width, y)
}

function parseReadingExercise(question: string) {
  const cleanQuestion = question.replace(/^\d+\.\s*/, '').trim()
  const withoutTextLabel = cleanQuestion.replace(/^tekst\s*:\s*/i, '')
  const questionLabelMatch = withoutTextLabel.match(/\bvraag\s*:\s*/i)

  if (questionLabelMatch?.index !== undefined) {
    return {
      text: withoutTextLabel.slice(0, questionLabelMatch.index).trim(),
      question: withoutTextLabel.slice(questionLabelMatch.index + questionLabelMatch[0].length).trim(),
    }
  }

  const parts = withoutTextLabel
    .split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean)

  if (parts.length > 1) {
    return {
      text: parts.slice(0, -1).join(' '),
      question: parts.at(-1) ?? '',
    }
  }

  return {
    text: withoutTextLabel,
    question: '',
  }
}

function addFooter(doc: jsPDF, group: string, exercise: string) {
  const pageCount = doc.getNumberOfPages()
  const worksheetTitle = getWorksheetTitle(group, exercise)

  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    doc.setPage(pageNumber)
    doc.setDrawColor(226, 232, 240)
    doc.line(pageMargin, pageHeight - 18, pageWidth - pageMargin, pageHeight - 18)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(100, 116, 139)
    doc.text(worksheetTitle, pageMargin, pageHeight - 10)
    doc.text(`Pagina ${pageNumber} van ${pageCount}`, pageWidth - pageMargin, pageHeight - 10, {
      align: 'right',
    })
  }
}

function addCompactArithmeticPages(
  doc: jsPDF,
  group: string,
  exercise: string,
  questions: string[],
  pageCount: number,
) {
  const columns = [20, 63, 106, 149]
  const columnWidth = 36
  const firstY = 51
  const rowGap = 8.1
  const blockGap = 13
  const rowsPerBlock = 5
  const blocksPerPage = 5

  doc.setFont('courier', 'normal')
  doc.setFontSize(10.5)
  doc.setTextColor(20, 20, 20)

  for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
    if (pageIndex > 0) {
      doc.addPage()
    }

    addHeader(doc, group, exercise)
    doc.setFont('courier', 'normal')
    doc.setFontSize(10.5)
    doc.setTextColor(20, 20, 20)

    for (let itemIndex = 0; itemIndex < compactArithmeticQuestionsPerPage; itemIndex += 1) {
      const question = questions[(pageIndex * compactArithmeticQuestionsPerPage) + itemIndex]

      if (!question) {
        continue
      }

      const columnIndex = Math.floor(itemIndex / (rowsPerBlock * blocksPerPage))
      const rowWithinColumn = itemIndex % (rowsPerBlock * blocksPerPage)
      const blockIndex = Math.floor(rowWithinColumn / rowsPerBlock)
      const rowIndex = rowWithinColumn % rowsPerBlock
      const x = columns[columnIndex] ?? 12
      const y = firstY + (blockIndex * ((rowsPerBlock - 1) * rowGap + blockGap)) + (rowIndex * rowGap)

      const compactQuestion = getCompactQuestionParts(question)

      doc.text(compactQuestion.text, x, y, {
        maxWidth: columnWidth,
      })

      if (compactQuestion.showTrailingAnswerDots) {
        const dotsWidth = doc.getTextWidth('...')
        const dotsOffset = Math.min(doc.getTextWidth(compactQuestion.text) + 1.2, columnWidth - dotsWidth)

        doc.text('...', x + dotsOffset, y)
      }
    }
  }
}

async function getWorksheetQuestions(
  group: string,
  exercise: string,
  amount: number,
  layout: WorksheetLayout,
  theme?: string,
  difficulty?: string,
) {
  try {
    const response = await fetch('/api/worksheet', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ group, exercise, amount, layout, theme, difficulty }),
    })

    if (!response.ok) {
      throw new Error('Werkblad API gaf geen geldige response.')
    }

    const data = (await response.json()) as WorksheetResponse

    if (data.questions.length > 0) {
      return data.questions
    }

    return layout === 'compact-arithmetic'
      ? fallbackCompactArithmeticQuestions(group, exercise, amount)
      : fallbackQuestions(amount)
  } catch {
    if (layout === 'compact-arithmetic') {
      return fallbackCompactArithmeticQuestions(group, exercise, amount)
    }

    return fallbackQuestions(amount)
  }
}

export async function generateWorksheetPdf(
  group: string,
  exercise: string,
  amount: number,
  layout: WorksheetLayout = isCompactArithmeticExercise(exercise) ? 'compact-arithmetic' : 'default',
  theme?: string,
  difficulty?: string,
) {
  const maxAmount = layout === 'compact-arithmetic'
    ? compactArithmeticQuestionsPerPage * maxCompactArithmeticPages
    : getDefaultQuestionsPerPage(exercise) * maxDefaultWorksheetPages

  if (amount > maxAmount) {
    throw new Error(`Je kunt maximaal ${maxAmount} opdrachten genereren.`)
  }

  const questions = await getWorksheetQuestions(group, exercise, amount, layout, theme, difficulty)
  const doc = new jsPDF()

  if (layout === 'compact-arithmetic') {
    addCompactArithmeticPages(
      doc,
      group,
      exercise,
      questions,
      Math.ceil(amount / compactArithmeticQuestionsPerPage),
    )
    addFooter(doc, group, exercise)
    doc.save(getWorksheetFileName(group, exercise))
    return
  }

  addHeader(doc, group, exercise)
  setDefaultBodyTextStyle(doc)

  let y = 50
  let columnIndex = 0
  const defaultQuestionsPerPage = getDefaultQuestionsPerPage(exercise)
  const standardQuestionsPerColumn = standardQuestionsPerPage / 2
  const standardColumns = [
    { x: pageMargin, width: 78 },
    { x: 112, width: 78 },
  ] as const
  const getStandardColumn = (index: number) => standardColumns[index] ?? standardColumns[0]

  for (const [questionIndex, question] of questions.entries()) {
    const itemIndexOnPage = questionIndex % defaultQuestionsPerPage

    if (questionIndex > 0 && itemIndexOnPage === 0) {
      doc.addPage()
      addHeader(doc, group, exercise)
      setDefaultBodyTextStyle(doc)
      columnIndex = 0
      y = 50
    }

    if (isReadingExercise(exercise)) {
      const readingExercise = parseReadingExercise(question)

      setDefaultBodyTextStyle(doc)

      const textLines = doc.splitTextToSize(`${questionIndex + 1}. ${readingExercise.text}`, questionMaxWidth) as string[]

      doc.setFont('helvetica', 'bold')

      const questionLines = readingExercise.question
        ? doc.splitTextToSize(readingExercise.question, readingQuestionMaxWidth) as string[]
        : []
      const textHeight = textLines.length * 5
      const readingQuestionHeight = questionLines.length * 5
      const exerciseHeight = textHeight + readingQuestionHeight + 17

      if (y + exerciseHeight > pageBottom) {
        doc.addPage()
        addHeader(doc, group, exercise)
        setDefaultBodyTextStyle(doc)
        y = 50
      }

      doc.setFont('helvetica', 'normal')
      doc.text(textLines, pageMargin, y)

      if (questionLines.length > 0) {
        const currentQuestionY = y + textHeight + 6

        doc.setDrawColor(203, 213, 225)
        doc.setLineWidth(0.6)
        doc.line(pageMargin, currentQuestionY - 4, pageMargin, currentQuestionY + readingQuestionHeight - 2)
        doc.setFont('helvetica', 'bold')
        doc.text(questionLines, pageMargin + readingQuestionIndent, currentQuestionY)
        doc.setFont('helvetica', 'normal')
      }

      drawCompactAnswerSpace(doc, pageMargin, y + textHeight + readingQuestionHeight + 11, questionMaxWidth)

      y += exerciseHeight
      continue
    }

    setDefaultBodyTextStyle(doc)

    if (isStoryExercise(exercise)) {
      const questionLines = doc.splitTextToSize(question, questionMaxWidth) as string[]
      const questionHeight = questionLines.length * 5
      const exerciseHeight = questionHeight + 12

      if (y + exerciseHeight > pageBottom) {
        doc.addPage()
        addHeader(doc, group, exercise)
        setDefaultBodyTextStyle(doc)
        y = 50
      }

      doc.text(questionLines, pageMargin, y)
      drawCompactAnswerSpace(doc, pageMargin, y + questionHeight + 5, questionMaxWidth)

      y += exerciseHeight
      continue
    }

    if (itemIndexOnPage === standardQuestionsPerColumn) {
      columnIndex = 1
      y = 50
    }

    const column = getStandardColumn(columnIndex)
    const questionLines = doc.splitTextToSize(question, column.width) as string[]
    const questionHeight = questionLines.length * 5
    const exerciseHeight = questionHeight + 11

    if (y + exerciseHeight > pageBottom) {
      if (columnIndex === 0) {
        columnIndex = 1
        y = 50
      } else {
        doc.addPage()
        addHeader(doc, group, exercise)
        setDefaultBodyTextStyle(doc)
        columnIndex = 0
        y = 50
      }
    }

    const activeColumn = getStandardColumn(columnIndex)

    doc.text(questionLines, activeColumn.x, y)
    drawCompactAnswerSpace(doc, activeColumn.x, y + questionHeight + 5, activeColumn.width)

    y += exerciseHeight
  }

  addFooter(doc, group, exercise)

  doc.save(getWorksheetFileName(group, exercise))
}
