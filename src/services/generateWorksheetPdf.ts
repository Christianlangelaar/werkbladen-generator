import { jsPDF } from 'jspdf'

type WorksheetResponse = {
  questions: string[]
  source?: 'openai' | 'fallback'
}

const pageMargin = 20
const pageWidth = 210
const pageHeight = 297
const pageBottom = 280
const questionMaxWidth = 170
const readingQuestionIndent = 6
const readingQuestionMaxWidth = questionMaxWidth - readingQuestionIndent
const answerLineWidth = 145
const exerciseGap = 20
const maxWorksheetAmount = 50

function fallbackQuestions(amount: number) {
  return Array.from({ length: amount }, (_, index) => `${index + 1}. __________________________________________`)
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

function addHeader(doc: jsPDF, group: string, exercise: string) {
  doc.setDrawColor(37, 99, 235)
  doc.setFillColor(37, 99, 235)
  doc.roundedRect(pageMargin, 17, 4, 14, 1, 1, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(15, 23, 42)
  doc.text(getWorksheetTitle(group, exercise), pageMargin + 9, 27)

  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.4)
  doc.line(pageMargin, 36, pageWidth - pageMargin, 36)

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(0, 0, 0)
}

function drawAnswerSpace(doc: jsPDF, y: number) {
  doc.setFontSize(10)
  doc.text('Antwoord:', pageMargin, y)

  const lineStartX = pageMargin + 25

  doc.setDrawColor(203, 213, 225)
  doc.setLineWidth(0.4)
  doc.line(lineStartX, y, lineStartX + answerLineWidth, y)
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

async function getWorksheetQuestions(group: string, exercise: string, amount: number) {
  try {
    const response = await fetch('/api/worksheet', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ group, exercise, amount }),
    })

    if (!response.ok) {
      throw new Error('Werkblad API gaf geen geldige response.')
    }

    const data = (await response.json()) as WorksheetResponse

    return data.questions.length > 0 ? data.questions : fallbackQuestions(amount)
  } catch {
    return fallbackQuestions(amount)
  }
}

export async function generateWorksheetPdf(
  group: string,
  exercise: string,
  amount: number,
) {
  if (amount > maxWorksheetAmount) {
    throw new Error(`Je kunt maximaal ${maxWorksheetAmount} opdrachten genereren.`)
  }

  const questions = await getWorksheetQuestions(group, exercise, amount)
  const doc = new jsPDF()

  addHeader(doc, group, exercise)

  let y = 50

  for (const [questionIndex, question] of questions.entries()) {
    if (exercise === 'begrijpend-lezen') {
      const readingExercise = parseReadingExercise(question)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(12)

      const textLines = doc.splitTextToSize(`${questionIndex + 1}. ${readingExercise.text}`, questionMaxWidth) as string[]

      doc.setFont('helvetica', 'bold')

      const questionLines = readingExercise.question
        ? doc.splitTextToSize(readingExercise.question, readingQuestionMaxWidth) as string[]
        : []
      const textHeight = textLines.length * 6
      const readingQuestionHeight = questionLines.length * 6
      const exerciseHeight = textHeight + readingQuestionHeight + 24

      if (y + exerciseHeight > pageBottom) {
        doc.addPage()
        y = 20
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

      drawAnswerSpace(doc, y + textHeight + readingQuestionHeight + 14)

      y += exerciseHeight
      continue
    }

    doc.setFontSize(12)
    const questionLines = doc.splitTextToSize(question, questionMaxWidth) as string[]
    const questionHeight = questionLines.length * 6
    const exerciseHeight = questionHeight + exerciseGap

    if (y + exerciseHeight > pageBottom) {
      doc.addPage()
      y = 20
    }

    doc.text(questionLines, pageMargin, y)
    drawAnswerSpace(doc, y + questionHeight + 7)

    y += exerciseHeight
  }

  addFooter(doc, group, exercise)

  doc.save(getWorksheetFileName(group, exercise))
}
