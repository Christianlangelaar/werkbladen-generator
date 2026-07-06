import { jsPDF } from 'jspdf'

type WorksheetResponse = {
  questions: string[]
  source?: 'openai' | 'fallback'
}

const pageMargin = 20
const pageBottom = 280
const questionMaxWidth = 170
const answerLineWidth = 145
const exerciseGap = 20
const maxWorksheetAmount = 50

function fallbackQuestions(amount: number) {
  return Array.from({ length: amount }, (_, index) => `${index + 1}. __________________________________________`)
}

function addHeader(doc: jsPDF, group: string, exercise: string) {
  doc.setFontSize(22)
  doc.text('Werkblad', pageMargin, 20)

  doc.setFontSize(12)
  doc.text(`Groep: ${group}`, pageMargin, 40)
  doc.text(`Oefensoort: ${exercise}`, pageMargin, 48)
}

function drawAnswerSpace(doc: jsPDF, y: number) {
  doc.setFontSize(10)
  doc.text('Antwoord:', pageMargin, y)

  const lineStartX = pageMargin + 25

  doc.line(lineStartX, y, lineStartX + answerLineWidth, y)
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

  let y = 65

  for (const question of questions) {
    doc.setFontSize(12)
    const questionLines = doc.splitTextToSize(question, questionMaxWidth) as string[]
    const questionHeight = questionLines.length * 6
    const exerciseHeight = questionHeight + exerciseGap

    if (y + exerciseHeight > pageBottom) {
      doc.addPage()
      addHeader(doc, group, exercise)
      y = 65
    }

    doc.text(questionLines, pageMargin, y)
    drawAnswerSpace(doc, y + questionHeight + 7)

    y += exerciseHeight
  }

  doc.save('werkblad.pdf')
}
