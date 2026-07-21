import { jsPDF } from 'jspdf'
import { createFallbackWorksheetContent } from '../../shared/fallbackWorksheet'
import { createCompactArithmeticContent } from '../../shared/compactArithmetic'

type WorksheetResponse = {
  questions: string[]
  answers?: string[]
  source?: 'openai' | 'fallback'
}

type WorksheetLayout = 'default' | 'compact-arithmetic' | 'counting'

type WorksheetContent = {
  questions: string[]
  answers: string[]
}

type GeneratedWorksheetContent = WorksheetContent & {
  source: 'openai' | 'fallback'
  warning?: string
  requestId?: string
}

export type PdfGenerationResult = {
  source: 'openai' | 'fallback' | 'local'
  warning?: string
  previewUrl: string
  fileName: string
  pageCount: number
  editableItems?: EditableWorksheetItem[]
  requestId?: string
}

export type EditableWorksheetItem = {
  question: string
  answer: string
}

export type WorkbookGenerationProgress = {
  completed: number
  total: number
  exercise: string
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = []
  let nextIndex = 0

  async function runWorker() {
    while (nextIndex < items.length) {
      const index = nextIndex
      nextIndex += 1
      results[index] = await worker(items[index] as T)
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, runWorker))
  return results
}

function sliceAndRenumberContent(
  content: GeneratedWorksheetContent,
  startIndex: number,
  amount: number,
): GeneratedWorksheetContent {
  const renumber = (items: string[]) => items
    .slice(startIndex, startIndex + amount)
    .map((item, index) => `${index + 1}. ${item.replace(/^\d+\.\s*/, '')}`)

  return {
    questions: renumber(content.questions),
    answers: renumber(content.answers),
    source: content.source,
    warning: content.warning,
    requestId: content.requestId,
  }
}

function createPdfResult(
  doc: jsPDF,
  fileName: string,
  source: PdfGenerationResult['source'],
  warning?: string,
  editableItems?: EditableWorksheetItem[],
  requestId?: string,
): PdfGenerationResult {
  const previewUrl = URL.createObjectURL(doc.output('blob'))
  return { source, warning, previewUrl, fileName, pageCount: doc.getNumberOfPages(), editableItems, requestId }
}

function withoutNumber(value: string) {
  return value.replace(/^\d+\.\s*/, '')
}

function toEditableItems(content: WorksheetContent): EditableWorksheetItem[] {
  return content.questions.map((question, index) => ({
    question: withoutNumber(question),
    answer: withoutNumber(content.answers[index] ?? ''),
  }))
}

function numberEditableItems(items: EditableWorksheetItem[]): WorksheetContent {
  return {
    questions: items.map((item, index) => `${index + 1}. ${withoutNumber(item.question)}`),
    answers: items.map((item, index) => `${index + 1}. ${withoutNumber(item.answer)}`),
  }
}

type AnswerSection = {
  title: string
  answers: string[]
}

export type WorkbookSection = {
  exercise: string
  amount: number
}

export type WorkbookCoverTheme = 'dinosaurs' | 'space' | 'football'

export function resolveWorkbookCoverTheme(theme?: string): WorkbookCoverTheme | undefined {
  const normalizedTheme = theme?.trim().toLocaleLowerCase('nl')

  if (normalizedTheme === "dino's" || normalizedTheme === 'dinos' || normalizedTheme === 'dinosaurussen') {
    return 'dinosaurs'
  }
  if (normalizedTheme === 'ruimte') return 'space'
  if (normalizedTheme === 'voetbal') return 'football'

  return undefined
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
const countingQuestionsPerPage = 6
const earlyLearningExercises = new Set([
  'cijfers-overtrekken',
  'lijnen-overtrekken',
  'raamfiguren',
  'schaduwen',
  'spiegelen',
  'woorden-overtrekken',
])
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
  if (exercise === 'raamfiguren') return 3
  if (exercise === 'spiegelen') return 2
  if (exercise === 'schaduwen' || exercise === 'woorden-overtrekken') return 6
  if (exercise === 'cijfers-overtrekken') return 5
  if (exercise === 'lijnen-overtrekken') {
    return 5
  }
  if (exercise.startsWith('tellen-')) {
    return countingQuestionsPerPage
  }
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

function fallbackAnswers(amount: number) {
  return Array.from({ length: amount }, (_, index) => `${index + 1}. Antwoord niet beschikbaar.`)
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

function drawDinosaurCover(doc: jsPDF) {
  doc.setDrawColor(4, 120, 87)
  doc.setFillColor(209, 250, 229)
  doc.ellipse(168, 65, 24, 15, 'FD')
  doc.ellipse(187, 54, 10, 9, 'FD')
  doc.setLineWidth(1.2)
  doc.line(147, 69, 135, 78)
  doc.line(160, 77, 156, 89)
  doc.line(178, 77, 183, 89)
  doc.circle(190, 52, 1, 'F')
  doc.setFillColor(4, 120, 87)
  doc.triangle(152, 53, 158, 42, 163, 55, 'F')
  doc.triangle(162, 50, 169, 39, 174, 53, 'F')
  doc.triangle(173, 51, 181, 42, 184, 57, 'F')
}

function drawSpaceCover(doc: jsPDF) {
  doc.setDrawColor(30, 64, 175)
  doc.setFillColor(219, 234, 254)
  doc.ellipse(170, 62, 13, 24, 'FD')
  doc.setFillColor(255, 255, 255)
  doc.circle(170, 56, 5, 'FD')
  doc.setFillColor(30, 64, 175)
  doc.triangle(157, 71, 145, 82, 160, 78, 'F')
  doc.triangle(183, 71, 195, 82, 180, 78, 'F')
  doc.setFillColor(251, 191, 36)
  doc.triangle(164, 84, 170, 99, 176, 84, 'F')

  for (const [x, y] of [[139, 48], [196, 42], [198, 91], [144, 98]] as const) {
    doc.line(x - 3, y, x + 3, y)
    doc.line(x, y - 3, x, y + 3)
  }
}

function drawFootballCover(doc: jsPDF) {
  doc.setDrawColor(5, 150, 105)
  doc.setFillColor(255, 255, 255)
  doc.circle(170, 66, 24, 'FD')
  doc.setFillColor(15, 23, 42)
  doc.circle(170, 66, 6, 'F')

  for (const [x, y] of [[170, 45], [190, 59], [182, 84], [158, 84], [150, 59]] as const) {
    doc.circle(x, y, 4, 'F')
    doc.line(170, 66, x, y)
  }
}

function drawWorkbookCoverTheme(doc: jsPDF, theme?: string) {
  const coverTheme = resolveWorkbookCoverTheme(theme)

  if (coverTheme === 'dinosaurs') drawDinosaurCover(doc)
  if (coverTheme === 'space') drawSpaceCover(doc)
  if (coverTheme === 'football') drawFootballCover(doc)

  return coverTheme
}

function addWorkbookCoverPage(doc: jsPDF, group: string, sections: WorkbookSection[], theme?: string) {
  const exerciseNames = [...new Set(sections.map((section) => formatExerciseName(section.exercise)))]
  const exerciseText = exerciseNames.join(', ')
  const coverTheme = drawWorkbookCoverTheme(doc, theme)

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

  if (coverTheme) {
    doc.setDrawColor(167, 243, 208)
    doc.setLineWidth(0.8)
    doc.roundedRect(pageMargin - 6, 20, pageWidth - ((pageMargin - 6) * 2), 235, 8, 8, 'S')
  }

  if (isButterflyTheme(group, theme)) {
    drawButterfly(doc, 164, 67, 2.1, false, 0)
    drawButterfly(doc, 188, 89, 0.75, false, 1)
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
  const columnGap = 10
  const columnWidth = (questionMaxWidth - columnGap) / 2
  const columnXPositions = [pageMargin, pageMargin + columnWidth + columnGap]

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

  function addSectionHeading(sectionTitle: string, continued = false) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(6, 95, 70)
    doc.text(`${sectionTitle}${continued ? ' (vervolg)' : ''}`, pageMargin, y)
    y += 8

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    doc.setTextColor(15, 23, 42)
  }

  for (const section of sections) {
    if (y > pageBottom - 24) {
      doc.addPage()
      y = 28
    }

    addSectionHeading(section.title)

    for (let answerIndex = 0; answerIndex < section.answers.length; answerIndex += 2) {
      const answers = section.answers.slice(answerIndex, answerIndex + 2)
      const answerLines = answers.map((answer) => doc.splitTextToSize(answer, columnWidth) as string[])
      const rowHeight = Math.max(...answerLines.map((lines) => lines.length * 4.6))

      if (y + rowHeight > pageBottom) {
        doc.addPage()
        y = 28
        addSectionHeading(section.title, true)
      }

      for (const [columnIndex, lines] of answerLines.entries()) {
        doc.text(lines, columnXPositions[columnIndex] as number, y)
      }

      y += rowHeight + 3
    }

    y += 5
  }
}

function addAnswerFooter(doc: jsPDF, startPage: number) {
  const pageCount = doc.getNumberOfPages()
  const answerPageCount = pageCount - startPage + 1

  for (let pageNumber = startPage; pageNumber <= pageCount; pageNumber += 1) {
    const answerPageNumber = pageNumber - startPage + 1

    doc.setPage(pageNumber)
    doc.setDrawColor(226, 232, 240)
    doc.line(pageMargin, pageHeight - 18, pageWidth - pageMargin, pageHeight - 18)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(100, 116, 139)
    doc.text('Antwoordenblad', pageMargin, pageHeight - 10)
    doc.text(`Pagina ${answerPageNumber} van ${answerPageCount}`, pageWidth - pageMargin, pageHeight - 10, {
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

const diePipPositions: Record<number, [number, number][]> = {
  1: [[0, 0]],
  2: [[-1, -1], [1, 1]],
  3: [[-1, -1], [0, 0], [1, 1]],
  4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
  5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
  6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
}

function drawDie(doc: jsPDF, x: number, y: number, value: number) {
  const size = 24
  doc.setDrawColor(71, 85, 105)
  doc.setLineWidth(0.7)
  doc.roundedRect(x, y, size, size, 2, 2, 'S')
  doc.setFillColor(15, 23, 42)
  for (const [column, row] of diePipPositions[value] ?? []) {
    doc.circle(x + 12 + (column * 6.2), y + 12 + (row * 6.2), 1.7, 'F')
  }
}

function isButterflyTheme(group: string, theme?: string) {
  return group === '2' && theme === 'Vlinders'
}

function drawButterfly(doc: jsPDF, x: number, y: number, scale = 1, filled = false, variant = 0) {
  const style = filled ? 'F' : 'S'
  const wingWidth = (variant % 2 === 0 ? 5 : 4.4) * scale
  const upperWingHeight = (variant % 3 === 0 ? 6.2 : 5.3) * scale
  const lowerWingHeight = (variant % 2 === 0 ? 4.2 : 5) * scale
  doc.setDrawColor(15, 23, 42)
  doc.setFillColor(15, 23, 42)
  doc.setLineWidth(Math.max(0.35, 0.65 * scale))
  doc.ellipse(x - 4.2 * scale, y - 3.2 * scale, wingWidth, upperWingHeight, style)
  doc.ellipse(x + 4.2 * scale, y - 3.2 * scale, wingWidth, upperWingHeight, style)
  doc.ellipse(x - 3.2 * scale, y + 3.4 * scale, 3.8 * scale, lowerWingHeight, style)
  doc.ellipse(x + 3.2 * scale, y + 3.4 * scale, 3.8 * scale, lowerWingHeight, style)
  doc.ellipse(x, y, 1.15 * scale, 6.3 * scale, style)
  doc.line(x - 0.4 * scale, y - 5.8 * scale, x - 3.2 * scale, y - 9 * scale)
  doc.line(x + 0.4 * scale, y - 5.8 * scale, x + 3.2 * scale, y - 9 * scale)
  if (!filled && scale >= 0.7) {
    doc.circle(x - 4.5 * scale, y - 3.5 * scale, 1.1 * scale, 'S')
    doc.circle(x + 4.5 * scale, y - 3.5 * scale, 1.1 * scale, 'S')
  }
}

function drawButterflyPageDecoration(doc: jsPDF, group: string, theme?: string) {
  if (!isButterflyTheme(group, theme)) return
  drawButterfly(doc, 178, 31, 0.65, false, 0)
  drawButterfly(doc, 191, 38, 0.42, false, 1)
}

function drawPictureIcon(doc: jsPDF, x: number, y: number, index: number, butterflyTheme = false) {
  if (butterflyTheme) {
    drawButterfly(doc, x, y, 0.38, false, index)
    return
  }
  doc.setDrawColor(15, 23, 42)
  doc.setFillColor(15, 23, 42)
  if (index % 3 === 0) {
    doc.circle(x, y, 3.2, 'S')
  } else if (index % 3 === 1) {
    doc.rect(x - 3.2, y - 3.2, 6.4, 6.4, 'S')
  } else {
    doc.triangle(x, y - 4, x - 4, y + 3, x + 4, y + 3, 'S')
  }
}

function drawTracingPattern(doc: jsPDF, pattern: number, y: number, butterflyTheme = false) {
  doc.setDrawColor(30, 41, 59)
  doc.setLineWidth(0.7)
  doc.setLineDashPattern([2.2, 2.2], 0)
  const points: [number, number][] = []
  for (let step = 0; step <= 34; step += 1) {
    const x = 25 + (step * 4.7)
    const phase = step / 34
    let offset = 0
    if (pattern === 0) offset = Math.sin(phase * Math.PI * 6) * 11
    if (pattern === 1) offset = (step % 4 < 2 ? -11 : 11)
    if (pattern === 2) offset = Math.abs(Math.sin(phase * Math.PI * 5)) * -18
    if (pattern === 3) offset = Math.cos(phase * Math.PI * 5) * 13
    if (pattern === 4) offset = Math.sin(phase * Math.PI * 3) * 16
    points.push([x, y + offset])
  }
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1] as [number, number]
    const current = points[index] as [number, number]
    doc.line(previous[0], previous[1], current[0], current[1])
  }
  doc.setLineDashPattern([], 0)
  if (butterflyTheme) drawButterfly(doc, 190, points.at(-1)?.[1] ?? y, 0.52, false, pattern)
}

function drawDotGrid(doc: jsPDF, x: number, y: number, size: number) {
  doc.setFillColor(249, 115, 22)
  for (let row = 0; row < 5; row += 1) {
    for (let column = 0; column < 5; column += 1) doc.circle(x + column * size, y + row * size, 0.75, 'F')
  }
}

function drawGridFigure(doc: jsPDF, x: number, y: number, size: number, variant: number, butterflyTheme = false) {
  const patterns = butterflyTheme ? [
    [[0, 2], [1, 0], [2, 2], [3, 0], [4, 2], [3, 4], [2, 2], [1, 4], [0, 2]],
    [[0, 1], [1, 0], [2, 2], [3, 0], [4, 1], [3, 3], [2, 2], [1, 3], [0, 1]],
  ] : [
    [[0, 4], [2, 1], [4, 4], [3, 4], [3, 3], [1, 3], [1, 4], [0, 4]],
    [[0, 2], [1, 0], [2, 2], [3, 0], [4, 2], [3, 4], [2, 2], [1, 4], [0, 2]],
    [[0, 1], [1, 0], [4, 0], [4, 4], [1, 4], [0, 3], [0, 1], [2, 3], [4, 3]],
  ]
  const points = patterns[variant % patterns.length] ?? patterns[0] ?? []
  doc.setDrawColor(5, 150, 105)
  doc.setLineWidth(0.75)
  for (let index = 1; index < points.length; index += 1) {
    const from = points[index - 1]
    const to = points[index]
    if (from && to) {
      const [fromColumn = 0, fromRow = 0] = from
      const [toColumn = 0, toRow = 0] = to
      doc.line(x + fromColumn * size, y + fromRow * size, x + toColumn * size, y + toRow * size)
    }
  }
}

function drawSimpleShape(doc: jsPDF, x: number, y: number, variant: number, filled = false, butterflyTheme = false) {
  if (butterflyTheme) {
    drawButterfly(doc, x, y, 0.8 + (variant % 3) * 0.08, filled, variant)
    return
  }
  const style = filled ? 'F' : 'S'
  doc.setDrawColor(15, 23, 42)
  doc.setFillColor(15, 23, 42)
  doc.setLineWidth(1)
  if (variant === 0) {
    doc.circle(x, y, 9, style)
    if (!filled) {
      doc.circle(x - 3, y - 1, 1, 'S')
      doc.circle(x + 3, y - 1, 1, 'S')
    }
  } else if (variant === 1) {
    doc.triangle(x, y - 11, x - 11, y + 9, x + 11, y + 9, style)
  } else if (variant === 2) {
    doc.roundedRect(x - 10, y - 8, 20, 16, 4, 4, style)
    doc.circle(x - 6, y + 10, 3, style)
    doc.circle(x + 6, y + 10, 3, style)
  } else if (variant === 3) {
    doc.ellipse(x, y, 12, 7, style)
    doc.triangle(x - 12, y, x - 18, y - 6, x - 18, y + 6, style)
  } else if (variant === 4) {
    doc.rect(x - 9, y - 9, 18, 18, style)
    doc.triangle(x - 9, y - 9, x - 4, y - 15, x, y - 9, style)
    doc.triangle(x, y - 9, x + 4, y - 15, x + 9, y - 9, style)
  } else {
    doc.triangle(x, y - 12, x - 12, y, x, y + 12, style)
    doc.triangle(x, y - 12, x + 12, y, x, y + 12, style)
  }
}

function drawLeftSemicircle(doc: jsPDF, centerX: number, centerY: number, radius: number) {
  let previousX = centerX
  let previousY = centerY - radius
  for (let step = 1; step <= 18; step += 1) {
    const angle = (Math.PI / 2) + (step / 18) * Math.PI
    const x = centerX + Math.cos(angle) * radius
    const y = centerY - Math.sin(angle) * radius
    doc.line(previousX, previousY, x, y)
    previousX = x
    previousY = y
  }
}

function drawHalfPicture(doc: jsPDF, centerX: number, centerY: number, variant: number, butterflyTheme = false) {
  doc.setDrawColor(15, 23, 42)
  doc.setLineWidth(1.3)
  doc.setLineDashPattern([1.5, 1.5], 0)
  doc.line(centerX, centerY - 42, centerX, centerY + 42)
  doc.setLineDashPattern([], 0)
  if (butterflyTheme) {
    doc.ellipse(centerX - 14, centerY - 13, 14, 21, 'S')
    doc.ellipse(centerX - 12, centerY + 17, 12, 15, 'S')
    doc.ellipse(centerX - 1, centerY, 2, 25, 'S')
    doc.circle(centerX - 15, centerY - 14, 3, 'S')
    doc.line(centerX - 1, centerY - 23, centerX - 10, centerY - 36)
  } else if (variant % 2 === 0) {
    drawLeftSemicircle(doc, centerX, centerY, 25)
    doc.line(centerX - 25, centerY, centerX - 38, centerY - 10)
    doc.line(centerX - 25, centerY, centerX - 38, centerY + 10)
    doc.circle(centerX - 9, centerY - 7, 2, 'F')
    doc.line(centerX - 11, centerY + 9, centerX, centerY + 13)
  } else {
    doc.rect(centerX - 25, centerY - 22, 25, 44, 'S')
    doc.triangle(centerX - 30, centerY - 22, centerX, centerY - 42, centerX, centerY - 22, 'S')
    doc.rect(centerX - 12, centerY + 4, 12, 18, 'S')
  }
}

function addEarlyLearningPages(doc: jsPDF, group: string, exercise: string, amount: number, startOnNewPage = false, theme?: string) {
  const perPage = exercise === 'cijfers-overtrekken' && Number(group) >= 2
    ? 10
    : getDefaultQuestionsPerPage(exercise)
  const pageCount = Math.ceil(amount / perPage)
  const butterflyTheme = isButterflyTheme(group, theme)
  const words = butterflyTheme
    ? ['vlinder', 'rups', 'bloem', 'vleugel', 'tuin', 'blad', 'pop', 'nectar']
    : ['beer', 'fiets', 'vis', 'maan', 'roos', 'boom', 'kat', 'zon']
  for (let page = 0; page < pageCount; page += 1) {
    if (startOnNewPage || page > 0) doc.addPage()
    addHeader(doc, group, exercise)
    drawButterflyPageDecoration(doc, group, theme)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    doc.setTextColor(71, 85, 105)
    const instructions: Record<string, string> = {
      'cijfers-overtrekken': 'Trek de cijfers over.',
      'lijnen-overtrekken': butterflyTheme ? 'Volg de vliegroutes van de vlinders.' : 'Trek de lijnen over.',
      raamfiguren: butterflyTheme ? 'Teken de vlinder na op het lege stippenraam en kleur hem in.' : 'Teken de figuur na op het lege stippenraam.',
      schaduwen: 'Trek een lijn van elke vorm naar de juiste schaduw.',
      spiegelen: butterflyTheme ? 'Teken de andere helft van de vlinder en kleur hem in.' : 'Teken de andere helft van de figuur.',
      'woorden-overtrekken': butterflyTheme ? 'Trek de vlinderwoorden over en schrijf ze daarna zelf.' : 'Trek de woorden over en schrijf ze daarna zelf.',
    }
    doc.text(instructions[exercise] ?? '', pageMargin, 44)
    const remaining = Math.min(perPage, amount - page * perPage)
    for (let row = 0; row < remaining; row += 1) {
      const absoluteIndex = page * perPage + row
      if (exercise === 'lijnen-overtrekken') drawTracingPattern(doc, row, 64 + row * 42, butterflyTheme)
      if (exercise === 'cijfers-overtrekken') {
        const number = (absoluteIndex % (Number(group) === 1 ? 5 : 10)) + 1
        const rowHeight = perPage === 10 ? 21 : 42
        const y = 61 + row * rowHeight
        doc.setFont('helvetica', 'bold'); doc.setFontSize(perPage === 10 ? 22 : 29); doc.setTextColor(15, 23, 42); doc.text(String(number), 25, y)
        doc.setFont('helvetica', 'normal'); doc.setFontSize(perPage === 10 ? 21 : 28); doc.setTextColor(156, 163, 175)
        for (let repeat = 0; repeat < 5; repeat += 1) doc.text(String(number), 55 + repeat * 25, y)
        doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.3); doc.line(48, y + 2, 187, y + 2)
      }
      if (exercise === 'woorden-overtrekken') {
        const word = words[absoluteIndex % words.length] ?? 'boom'; const y = 64 + row * 35
        doc.setFontSize(27); doc.setTextColor(156, 163, 175); doc.text(word, 28, y)
        doc.setDrawColor(203, 213, 225); doc.setLineWidth(0.35)
        doc.line(105, y + 2, 185, y + 2); doc.setLineDashPattern([1, 1.5], 0); doc.line(105, y - 8, 185, y - 8); doc.setLineDashPattern([], 0)
      }
      if (exercise === 'raamfiguren') {
        const y = 64 + row * 68; drawDotGrid(doc, 28, y, 9); drawGridFigure(doc, 28, y, 9, absoluteIndex, butterflyTheme); drawDotGrid(doc, 125, y, 9)
      }
      if (exercise === 'spiegelen') drawHalfPicture(doc, 105, 98 + row * 105, absoluteIndex, butterflyTheme)
      if (exercise === 'schaduwen') {
        const shadowOrder = [2, 5, 0, 4, 1, 3]
        const y = 65 + row * 33; drawSimpleShape(doc, 40, y, row, false, butterflyTheme); drawSimpleShape(doc, 165, y, shadowOrder[row] ?? row, true, butterflyTheme)
        doc.setFillColor(100, 116, 139); doc.circle(62, y, 1.5, 'F'); doc.circle(143, y, 1.5, 'F')
      }
    }
    startOnNewPage = false
  }
}

function addCountingPages(doc: jsPDF, group: string, exercise: string, amount: number, theme?: string) {
  const isNumberMode = exercise === 'tellen-cijfers'
  const isPictureMode = exercise === 'tellen-vormen'
  const isTracingMode = exercise === 'lijnen-overtrekken'
  const maxValue = Number(group) <= 1 ? 5 : 10
  const butterflyTheme = isButterflyTheme(group, theme)
  const circleCount = maxValue
  const rowsPerPage = isNumberMode ? 10 : isPictureMode ? 8 : isTracingMode ? 5 : countingQuestionsPerPage
  const pageCount = Math.ceil(amount / rowsPerPage)
  const rowYs = isNumberMode || isPictureMode || isTracingMode ? Array.from({ length: rowsPerPage }, (_, index) => 58 + (index * (isTracingMode ? 42 : isPictureMode ? 26 : 22))) : [53, 88, 123, 158, 193, 228]

  for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
    if (pageIndex > 0) doc.addPage()
    addHeader(doc, group, exercise)
    drawButterflyPageDecoration(doc, group, theme)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    doc.setTextColor(71, 85, 105)
    const instruction = isTracingMode
      ? (butterflyTheme ? 'Volg de vliegroutes van de vlinders.' : 'Trek de lijnen over.')
      : isPictureMode
        ? (butterflyTheme ? 'Tel de vlinders, kleur ze in en omcirkel het juiste cijfer.' : 'Tel de vormen en omcirkel het juiste cijfer.')
        : isNumberMode
          ? 'Kleur evenveel rondjes als het cijfer.'
          : 'Hoeveel ogen staan er op de dobbelsteen? Kleur het juiste aantal rondjes.'
    doc.text(instruction, pageMargin, 44)

    const values = maxValue <= 5 ? [3, 1, 4, 5, 2] : [3, 1, 6, 4, 5, 2]
    const remaining = Math.min(rowsPerPage, amount - (pageIndex * rowsPerPage))
    for (let row = 0; row < remaining; row += 1) {
      const y = rowYs[row] ?? 53
      if (isTracingMode) {
        drawTracingPattern(doc, row, y + 12, butterflyTheme)
        continue
      }
      const value = isNumberMode
        ? (((row + pageIndex * rowsPerPage) * 7) % maxValue) + 1
        : isPictureMode
          ? (((row + pageIndex * rowsPerPage) * (maxValue <= 5 ? 2 : 3)) % maxValue) + 1
          : (values[(row + pageIndex) % values.length] ?? 1)
      if (isPictureMode) {
        doc.setDrawColor(148, 163, 184)
        doc.setLineWidth(0.45)
        doc.rect(20, y + 1, 52, 25, 'S')
        for (let icon = 0; icon < value; icon += 1) {
          drawPictureIcon(doc, 27 + ((icon % 4) * 12), y + 6 + (Math.floor(icon / 4) * 8.5), row, butterflyTheme)
        }
        doc.setFontSize(13)
        doc.setTextColor(71, 85, 105)
        const optionStartX = maxValue <= 5 ? 103 : 88
        const optionSpacing = maxValue <= 5 ? 18 : 10
        for (let number = 1; number <= maxValue; number += 1) doc.text(String(number), optionStartX + ((number - 1) * optionSpacing), y + 15)
      } else if (isNumberMode) {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(25); doc.setTextColor(15, 23, 42)
        doc.text(String(value), 28, y + 17, { align: 'center' })
      } else drawDie(doc, 30, y, value)

      if (!isPictureMode) {
        doc.setDrawColor(100, 116, 139)
        doc.setLineWidth(0.55)
        const firstCircleX = isNumberMode ? 52 : 70
        for (let circle = 0; circle < circleCount; circle += 1) {
          doc.circle(firstCircleX + (circle * (maxValue <= 5 ? 18 : 13)), y + 12, 5.2, 'S')
        }
      }
    }

  }
}

function getCountingAnswers(group: string, exercise: string, amount: number) {
  const maxValue = Number(group) <= 1 ? 5 : 10
  const values = maxValue <= 5 ? [3, 1, 4, 5, 2] : [3, 1, 6, 4, 5, 2]

  return Array.from({ length: amount }, (_, index) => {
    const rowIndex = index % countingQuestionsPerPage
    const pageIndex = Math.floor(index / countingQuestionsPerPage)
    const answer = exercise === 'tellen-cijfers'
      ? (((index * 7) % maxValue) + 1)
      : exercise === 'tellen-vormen'
        ? (((index * (maxValue <= 5 ? 2 : 3)) % maxValue) + 1)
        : values[(rowIndex + pageIndex) % values.length]

    return `${index + 1}. ${answer}`
  })
}

async function getWorksheetQuestions(
  group: string,
  exercise: string,
  amount: number,
  layout: WorksheetLayout,
  theme?: string,
  difficulty?: string,
  generationReservation?: string,
) : Promise<GeneratedWorksheetContent> {
  try {
    const response = await fetch('/api/worksheet', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(generationReservation ? { 'X-Generation-Reservation': generationReservation } : {}),
      },
      body: JSON.stringify({ group, exercise, amount, layout, theme, difficulty }),
    })

    if (response.status === 429) {
      const retryAfter = Number(response.headers.get('Retry-After'))
      const waitText = Number.isFinite(retryAfter) ? ` Probeer het over ${retryAfter} seconden opnieuw.` : ''

      const fallbackContent = layout === 'compact-arithmetic'
        ? createCompactArithmeticContent(group, exercise, amount)
        : createFallbackWorksheetContent(group, exercise, amount)

      return {
        ...fallbackContent,
        source: 'fallback',
        warning: `De limiet voor online werkbladen is bereikt. Er is een standaardversie gemaakt.${waitText}`,
      }
    }

    if (!response.ok) {
      throw new Error('Werkblad API gaf geen geldige response.')
    }

    const data = (await response.json()) as WorksheetResponse
    const requestId = response.headers.get('X-Request-ID') ?? undefined

    if (data.questions.length > 0) {
      const source = data.source === 'fallback' ? 'fallback' : 'openai'

      return {
        questions: data.questions,
        answers: data.answers && data.answers.length > 0 ? data.answers : fallbackAnswers(data.questions.length),
        source,
        requestId,
        warning: source === 'fallback'
          ? 'De AI-generator was niet beschikbaar. Er is een standaardversie van het werkblad gemaakt.'
          : undefined,
      }
    }

    const fallbackContent = layout === 'compact-arithmetic'
      ? createCompactArithmeticContent(group, exercise, amount)
      : createFallbackWorksheetContent(group, exercise, amount)

    return {
      ...fallbackContent,
      source: 'fallback',
      warning: 'De AI-generator gaf geen bruikbare opdrachten terug. Er is een standaardversie gemaakt.',
    }
  } catch {
    const fallbackContent = layout === 'compact-arithmetic'
      ? createCompactArithmeticContent(group, exercise, amount)
      : createFallbackWorksheetContent(group, exercise, amount)

    return {
      ...fallbackContent,
      source: 'fallback',
      warning: 'De online generator kon niet worden bereikt. Er is een standaardversie van het werkblad gemaakt.',
    }
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
  generationReservation?: string,
): Promise<PdfGenerationResult> {
  if (exercise.startsWith('tellen-')) {
    layout = 'counting'
  }
  const maxAmount = layout === 'compact-arithmetic'
    ? compactArithmeticQuestionsPerPage * maxCompactArithmeticPages
    : getDefaultQuestionsPerPage(exercise) * maxDefaultWorksheetPages

  if (amount > maxAmount) {
    throw new Error(`Je kunt maximaal ${maxAmount} opdrachten genereren.`)
  }

  const doc = new jsPDF()

  if (earlyLearningExercises.has(exercise)) {
    addEarlyLearningPages(doc, group, exercise, amount, false, theme)
    addFooter(doc, group, exercise)
    return createPdfResult(doc, getWorksheetFileName(group, exercise), 'local')
  }

  if (layout === 'counting') {
    addCountingPages(doc, group, exercise, amount, theme)
    addFooter(doc, group, exercise)
    if (includeAnswerSheet) {
      const answers = getCountingAnswers(group, exercise, amount)
      const answerStartPage = doc.getNumberOfPages() + 1
      addAnswerSheet(doc, getWorksheetTitle(group, exercise), [{ title: 'Tellen', answers }])
      addAnswerFooter(doc, answerStartPage)
    }
    return createPdfResult(doc, getWorksheetFileName(group, exercise), 'local')
  }

  const content = await getWorksheetQuestions(group, exercise, amount, layout, theme, difficulty, generationReservation)

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

    return createPdfResult(
      doc,
      getWorksheetFileName(group, exercise),
      content.source,
      content.warning,
      toEditableItems(content),
      content.requestId,
    )
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

  return createPdfResult(
    doc,
    getWorksheetFileName(group, exercise),
    content.source,
    content.warning,
    toEditableItems(content),
    content.requestId,
  )
}

export async function createEditedWorksheetPdf(
  group: string,
  exercise: string,
  items: EditableWorksheetItem[],
  layout: WorksheetLayout = isCompactArithmeticExercise(exercise) ? 'compact-arithmetic' : 'default',
  includeAnswerSheet = false,
  source: PdfGenerationResult['source'] = 'local',
  warning?: string,
  requestId?: string,
): Promise<PdfGenerationResult> {
  if (items.length === 0) {
    throw new Error('Behoud minimaal één opdracht.')
  }

  const content = numberEditableItems(items)
  const doc = new jsPDF()

  if (layout === 'compact-arithmetic') {
    addCompactArithmeticPages(
      doc,
      group,
      exercise,
      content.questions,
      Math.ceil(items.length / compactArithmeticQuestionsPerPage),
    )
  } else {
    addDefaultExercisePages(doc, group, exercise, content.questions)
  }

  addFooter(doc, group, exercise)
  const answerStartPage = doc.getNumberOfPages() + 1
  if (includeAnswerSheet) {
    addAnswerSheet(doc, getWorksheetTitle(group, exercise), [{
      title: formatExerciseName(exercise),
      answers: content.answers,
    }])
    addAnswerFooter(doc, answerStartPage)
  }

  return createPdfResult(
    doc,
    getWorksheetFileName(group, exercise),
    source,
    warning,
    items.map((item) => ({ ...item })),
    requestId,
  )
}

export async function regenerateWorksheetItem(
  group: string,
  exercise: string,
  layout: WorksheetLayout,
  theme?: string,
  difficulty?: string,
): Promise<EditableWorksheetItem> {
  const content = await getWorksheetQuestions(group, exercise, 1, layout, theme, difficulty)
  return toEditableItems(content)[0] ?? { question: '', answer: '' }
}

export async function generateWorkbookPdf(
  group: string,
  sections: WorkbookSection[],
  includeCoverPage = false,
  includeAnswerSheet = false,
  theme?: string,
  difficulty?: string,
  onProgress?: (progress: WorkbookGenerationProgress) => void,
  generationReservation?: string,
): Promise<PdfGenerationResult> {
  const activeSections = sections.filter((section) => section.amount > 0)

  if (activeSections.length === 0) {
    throw new Error('Kies minimaal 1 opdracht.')
  }

  const doc = new jsPDF()
  let hasPages = includeCoverPage
  const answerSections: AnswerSection[] = []
  const fallbackWarnings = new Set<string>()
  let hasOpenAiContent = false
  const requestsByExercise = new Map<string, { exercise: string, amount: number, layout: WorksheetLayout }>()

  for (const section of activeSections) {
    if (section.exercise.startsWith('tellen-') || earlyLearningExercises.has(section.exercise)) continue

    const existingRequest = requestsByExercise.get(section.exercise)
    const layout = isCompactArithmeticExercise(section.exercise) ? 'compact-arithmetic' : 'default'

    if (existingRequest) {
      existingRequest.amount += section.amount
    } else {
      requestsByExercise.set(section.exercise, { exercise: section.exercise, amount: section.amount, layout })
    }
  }

  const contentRequests = [...requestsByExercise.values()]
  let completedRequests = 0
  onProgress?.({ completed: 0, total: contentRequests.length, exercise: '' })
  const generatedEntries = await mapWithConcurrency(contentRequests, 3, async (request) => {
    const content = await getWorksheetQuestions(
      group,
      request.exercise,
      request.amount,
      request.layout,
      theme,
      difficulty,
      generationReservation,
    )

    completedRequests += 1
    onProgress?.({
      completed: completedRequests,
      total: contentRequests.length,
      exercise: formatExerciseName(request.exercise),
    })
    return [request.exercise, content] as const
  })
  const generatedContentByExercise = new Map(generatedEntries)
  const contentOffsets = new Map<string, number>()

  if (includeCoverPage) {
    addWorkbookCoverPage(doc, group, activeSections, theme)
  }

  for (const section of activeSections) {
    if (section.exercise.startsWith('tellen-')) {
      if (hasPages) doc.addPage()
      addCountingPages(doc, group, section.exercise, section.amount, theme)
      answerSections.push({
        title: formatExerciseName(section.exercise),
        answers: getCountingAnswers(group, section.exercise, section.amount),
      })
      hasPages = true
      continue
    }

    if (earlyLearningExercises.has(section.exercise)) {
      addEarlyLearningPages(doc, group, section.exercise, section.amount, hasPages, theme)
      hasPages = true
      continue
    }

    const layout = isCompactArithmeticExercise(section.exercise) ? 'compact-arithmetic' : 'default'
    const combinedContent = generatedContentByExercise.get(section.exercise)

    if (!combinedContent) {
      throw new Error(`Geen inhoud beschikbaar voor ${formatExerciseName(section.exercise)}.`)
    }

    const contentOffset = contentOffsets.get(section.exercise) ?? 0
    const content = sliceAndRenumberContent(combinedContent, contentOffset, section.amount)
    contentOffsets.set(section.exercise, contentOffset + section.amount)

    if (content.source === 'openai') {
      hasOpenAiContent = true
    }
    if (content.warning) {
      fallbackWarnings.add(content.warning)
    }

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

  if (fallbackWarnings.size > 0) {
    return createPdfResult(
      doc,
      getWorkbookFileName(group),
      'fallback',
      'Een deel van het werkboekje kon niet met AI worden gemaakt. Voor die onderdelen is standaardcontent gebruikt.',
    )
  }

  return createPdfResult(doc, getWorkbookFileName(group), hasOpenAiContent ? 'openai' : 'local')
}
