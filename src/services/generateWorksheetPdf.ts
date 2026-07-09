import { jsPDF } from 'jspdf'

type WorksheetResponse = {
  questions: string[]
  answers?: string[]
  source?: 'openai' | 'fallback'
}

type WorksheetLayout = 'default' | 'compact-arithmetic'

type WorksheetContent = {
  questions: string[]
  answers: string[]
}

type AnswerSection = {
  title: string
  answers: string[]
}

export type WorkbookSection = {
  exercise: string
  amount: number
}

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

function fallbackAnswers(amount: number) {
  return Array.from({ length: amount }, (_, index) => `${index + 1}. Antwoord niet beschikbaar.`)
}

function fallbackReadingContent(amount: number): WorksheetContent {
  const readingItems = [
    {
      text: 'Mila zet haar tas bij de deur. Daarna pakt ze haar broodtrommel en loopt ze naar school.',
      question: 'Waar zet Mila haar tas?',
      answer: 'Bij de deur.',
    },
    {
      text: 'In de tuin staat een kleine boom. Sam geeft de boom water, omdat de grond erg droog is.',
      question: 'Waarom geeft Sam de boom water?',
      answer: 'Omdat de grond erg droog is.',
    },
    {
      text: 'Noor leest een boek op de bank. Als het donker wordt, doet ze de lamp aan.',
      question: 'Wat doet Noor als het donker wordt?',
      answer: 'Ze doet de lamp aan.',
    },
    {
      text: 'De klas gaat naar de bibliotheek. Iedereen mag een boek kiezen om mee naar huis te nemen.',
      question: 'Waar gaat de klas naartoe?',
      answer: 'Naar de bibliotheek.',
    },
  ]
  const fallbackItem = readingItems[0] as typeof readingItems[number]
  const items = Array.from({ length: amount }, (_, index) => {
    const item = readingItems[index % readingItems.length] ?? fallbackItem

    return {
      question: `${index + 1}. ${item.text}\n${item.question}`,
      answer: `${index + 1}. ${item.answer}`,
    }
  })

  return {
    questions: items.map((item) => item.question),
    answers: items.map((item) => item.answer),
  }
}

function fallbackDefaultContent(exercise: string, amount: number): WorksheetContent {
  if (readingExercises.has(exercise)) {
    return fallbackReadingContent(amount)
  }

  return {
    questions: fallbackQuestions(amount),
    answers: fallbackAnswers(amount),
  }
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

function getCompactArithmeticQuestionAndAnswer(group: string, exercise: string, index: number) {
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

    return {
      question: `${index + 1}. ${left} - ${right} = ...`,
      answer: `${index + 1}. ${left - right}`,
    }
  }

  if (exercise === 'tafels' || exercise === 'vermenigvuldigen') {
    const left = groupNumber <= 4 ? smallA : ((seed * 11) % 12) + 1
    const right = groupNumber <= 4 ? smallB : ((seed * 3) % 12) + 1

    return {
      question: `${index + 1}. ${left} x ${right} = ...`,
      answer: `${index + 1}. ${left * right}`,
    }
  }

  if (exercise === 'delen') {
    const divisor = smallA
    const answer = groupNumber <= 5 ? smallB : ((seed * 11) % 12) + 1

    return {
      question: `${index + 1}. ${divisor * answer} : ${divisor} = ...`,
      answer: `${index + 1}. ${answer}`,
    }
  }

  if (exercise === 'tafel-automatiseren') {
    return seed % 3 === 0
      ? {
          question: `${index + 1}. ${smallA * smallB} : ${smallA} = ...`,
          answer: `${index + 1}. ${smallB}`,
        }
      : {
          question: `${index + 1}. ${smallA} x ${smallB} = ...`,
          answer: `${index + 1}. ${smallA * smallB}`,
        }
  }

  if (exercise === 'splitsen') {
    const total = groupNumber <= 3 ? ((seed * 7) % 20) + 1 : ((seed * 7) % 100) + 1
    const part = seed % total

    return {
      question: `${index + 1}. ${part} + ... = ${total}`,
      answer: `${index + 1}. ${total - part}`,
    }
  }

  const left = exercise === 'optellen-grote-getallen' ? largeA : mediumA
  const right = exercise === 'optellen-grote-getallen' ? largeB : mediumB

  return {
    question: `${index + 1}. ${left} + ${right} = ...`,
    answer: `${index + 1}. ${left + right}`,
  }
}

function fallbackCompactArithmeticContent(group: string, exercise: string, amount: number): WorksheetContent {
  const items = Array.from({ length: amount }, (_, index) => getCompactArithmeticQuestionAndAnswer(group, exercise, index))

  return {
    questions: items.map((item) => item.question),
    answers: items.map((item) => item.answer),
  }
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

function getWorkbookFileName(group: string) {
  return `groep${group}-werkboekje.pdf`
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

function addFooterTitle(doc: jsPDF, worksheetTitle: string, startPage = 1) {
  const pageCount = doc.getNumberOfPages()
  const footerPageCount = pageCount - startPage + 1

  for (let pageNumber = startPage; pageNumber <= pageCount; pageNumber += 1) {
    const footerPageNumber = pageNumber - startPage + 1

    doc.setPage(pageNumber)
    doc.setDrawColor(226, 232, 240)
    doc.line(pageMargin, pageHeight - 18, pageWidth - pageMargin, pageHeight - 18)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(100, 116, 139)
    doc.text(worksheetTitle, pageMargin, pageHeight - 10)
    doc.text(`Pagina ${footerPageNumber} van ${footerPageCount}`, pageWidth - pageMargin, pageHeight - 10, {
      align: 'right',
    })
  }
}

function addFooter(doc: jsPDF, group: string, exercise: string) {
  addFooterTitle(doc, getWorksheetTitle(group, exercise))
}

function addWorkbookCoverPage(doc: jsPDF, group: string, sections: WorkbookSection[], theme?: string) {
  const exerciseNames = [...new Set(sections.map((section) => formatExerciseName(section.exercise)))]
  const exerciseText = exerciseNames.join(', ')

  doc.setDrawColor(5, 150, 105)
  doc.setFillColor(5, 150, 105)
  doc.roundedRect(pageMargin, 34, 5, 26, 1.5, 1.5, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(34)
  doc.setTextColor(6, 78, 59)
  doc.text('Werkboekje', pageMargin + 13, 50)

  doc.setFontSize(20)
  doc.setTextColor(15, 23, 42)
  doc.text(`Groep ${group}`, pageMargin + 13, 65)

  if (theme) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(13)
    doc.setTextColor(71, 85, 105)
    doc.text(`Thema: ${theme}`, pageMargin + 13, 78)
  }

  doc.setDrawColor(167, 243, 208)
  doc.setFillColor(255, 255, 255)
  doc.roundedRect(pageMargin, 104, pageWidth - (pageMargin * 2), 54, 4, 4, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(6, 95, 70)
  doc.text('In dit werkboekje oefen je met:', pageMargin + 8, 120)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(51, 65, 85)
  doc.text(doc.splitTextToSize(exerciseText, pageWidth - (pageMargin * 2) - 16), pageMargin + 8, 133)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(12)
  doc.setTextColor(71, 85, 105)
  doc.text('Naam:', pageMargin, 200)
  doc.line(pageMargin + 18, 201, pageWidth - pageMargin, 201)
  doc.text('Datum:', pageMargin, 216)
  doc.line(pageMargin + 20, 217, pageWidth - pageMargin, 217)
}

function addAnswerSheet(doc: jsPDF, title: string, sections: AnswerSection[]) {
  doc.addPage()
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(15, 23, 42)
  doc.text('Antwoorden', pageMargin, 27)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(71, 85, 105)
  doc.text(title, pageMargin, 35)

  doc.setDrawColor(226, 232, 240)
  doc.line(pageMargin, 41, pageWidth - pageMargin, 41)

  let y = 54

  for (const section of sections) {
    if (y > pageBottom - 24) {
      doc.addPage()
      y = 28
    }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(6, 95, 70)
    doc.text(section.title, pageMargin, y)
    y += 8

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(15, 23, 42)

    for (const answer of section.answers) {
      const answerLines = doc.splitTextToSize(answer, questionMaxWidth) as string[]
      const answerHeight = answerLines.length * 5

      if (y + answerHeight > pageBottom) {
        doc.addPage()
        y = 28
      }

      doc.text(answerLines, pageMargin, y)
      y += answerHeight + 3
    }

    y += 5
  }
}

function addAnswerFooter(doc: jsPDF, startPage: number) {
  const pageCount = doc.getNumberOfPages()

  for (let pageNumber = startPage; pageNumber <= pageCount; pageNumber += 1) {
    doc.setPage(pageNumber)
    doc.setDrawColor(226, 232, 240)
    doc.line(pageMargin, pageHeight - 18, pageWidth - pageMargin, pageHeight - 18)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(100, 116, 139)
    doc.text('Antwoordenblad', pageMargin, pageHeight - 10)
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
) : Promise<WorksheetContent> {
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
      return {
        questions: data.questions,
        answers: data.answers && data.answers.length > 0 ? data.answers : fallbackAnswers(data.questions.length),
      }
    }

    return layout === 'compact-arithmetic'
      ? fallbackCompactArithmeticContent(group, exercise, amount)
      : fallbackDefaultContent(exercise, amount)
  } catch {
    if (layout === 'compact-arithmetic') {
      return fallbackCompactArithmeticContent(group, exercise, amount)
    }

    return fallbackDefaultContent(exercise, amount)
  }
}

function addDefaultExercisePages(
  doc: jsPDF,
  group: string,
  exercise: string,
  questions: string[],
  startOnNewPage = false,
) {
  if (startOnNewPage) {
    doc.addPage()
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
}

export async function generateWorksheetPdf(
  group: string,
  exercise: string,
  amount: number,
  layout: WorksheetLayout = isCompactArithmeticExercise(exercise) ? 'compact-arithmetic' : 'default',
  theme?: string,
  difficulty?: string,
  includeAnswerSheet = false,
) {
  const maxAmount = layout === 'compact-arithmetic'
    ? compactArithmeticQuestionsPerPage * maxCompactArithmeticPages
    : getDefaultQuestionsPerPage(exercise) * maxDefaultWorksheetPages

  if (amount > maxAmount) {
    throw new Error(`Je kunt maximaal ${maxAmount} opdrachten genereren.`)
  }

  const content = await getWorksheetQuestions(group, exercise, amount, layout, theme, difficulty)
  const doc = new jsPDF()

  if (layout === 'compact-arithmetic') {
    addCompactArithmeticPages(
      doc,
      group,
      exercise,
      content.questions,
      Math.ceil(amount / compactArithmeticQuestionsPerPage),
    )
    addFooter(doc, group, exercise)
    const answerStartPage = doc.getNumberOfPages() + 1

    if (includeAnswerSheet) {
      addAnswerSheet(doc, getWorksheetTitle(group, exercise), [{
        title: formatExerciseName(exercise),
        answers: content.answers,
      }])
      addAnswerFooter(doc, answerStartPage)
    }

    doc.save(getWorksheetFileName(group, exercise))
    return
  }

  addDefaultExercisePages(doc, group, exercise, content.questions)
  addFooter(doc, group, exercise)
  const answerStartPage = doc.getNumberOfPages() + 1

  if (includeAnswerSheet) {
    addAnswerSheet(doc, getWorksheetTitle(group, exercise), [{
      title: formatExerciseName(exercise),
      answers: content.answers,
    }])
    addAnswerFooter(doc, answerStartPage)
  }

  doc.save(getWorksheetFileName(group, exercise))
}

export async function generateWorkbookPdf(
  group: string,
  sections: WorkbookSection[],
  includeCoverPage = false,
  includeAnswerSheet = false,
  theme?: string,
  difficulty?: string,
) {
  const activeSections = sections.filter((section) => section.amount > 0)

  if (activeSections.length === 0) {
    throw new Error('Kies minimaal 1 opdracht.')
  }

  const doc = new jsPDF()
  let hasPages = includeCoverPage
  const answerSections: AnswerSection[] = []

  if (includeCoverPage) {
    addWorkbookCoverPage(doc, group, activeSections, theme)
  }

  for (const section of activeSections) {
    const layout = isCompactArithmeticExercise(section.exercise) ? 'compact-arithmetic' : 'default'
    const content = await getWorksheetQuestions(group, section.exercise, section.amount, layout, theme, difficulty)

    answerSections.push({
      title: formatExerciseName(section.exercise),
      answers: content.answers,
    })

    if (layout === 'compact-arithmetic') {
      if (hasPages) {
        doc.addPage()
      }

      addCompactArithmeticPages(
        doc,
        group,
        section.exercise,
        content.questions,
        Math.ceil(section.amount / compactArithmeticQuestionsPerPage),
      )
    } else {
      addDefaultExercisePages(doc, group, section.exercise, content.questions, hasPages)
    }

    hasPages = true
  }

  addFooterTitle(doc, `Groep ${group} | Werkboekje`, includeCoverPage ? 2 : 1)
  const answerStartPage = doc.getNumberOfPages() + 1

  if (includeAnswerSheet) {
    addAnswerSheet(doc, `Groep ${group} | Werkboekje`, answerSections)
    addAnswerFooter(doc, answerStartPage)
  }

  doc.save(getWorkbookFileName(group))
}
