import { jsPDF } from 'jspdf'

type WorksheetResponse = {
  questions: string[]
  source?: 'openai' | 'fallback'
}

function fallbackQuestions(amount: number) {
  return Array.from({ length: amount }, (_, index) => `${index + 1}. __________________________________________`)
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
  const questions = await getWorksheetQuestions(group, exercise, amount)
  const doc = new jsPDF()

  doc.setFontSize(22)
  doc.text('Werkblad', 20, 20)

  doc.setFontSize(12)
  doc.text(`Groep: ${group}`, 20, 40)
  doc.text(`Oefensoort: ${exercise}`, 20, 48)

  let y = 65

  for (const question of questions) {
    doc.text(question, 20, y, { maxWidth: 170 })
    y += 12
  }

  doc.save('werkblad.pdf')
}
