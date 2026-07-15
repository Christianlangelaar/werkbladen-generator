const baseUrl = (process.argv[2] || process.env.EVALUATION_BASE_URL || 'https://werkbladen-generator.vercel.app').replace(/\/$/, '')

if (!baseUrl.startsWith('https://') && !baseUrl.startsWith('http://localhost')) {
  throw new Error('Gebruik een https-URL of localhost voor de inhoudsevaluatie.')
}

const cases = [
  { name: 'groep 3 contextsommen', group: '3', exercise: 'contextsommen', amount: 4, layout: 'default', difficulty: 'Makkelijker' },
  { name: 'groep 4 spelling', group: '4', exercise: 'spelling', amount: 5, layout: 'default' },
  { name: 'groep 5 werkwoordspelling', group: '5', exercise: 'werkwoordspelling', amount: 5, layout: 'default', difficulty: 'Uitdagender' },
  { name: 'groep 6 breuken', group: '6', exercise: 'breuken', amount: 4, layout: 'default' },
  { name: 'groep 7 begrijpend lezen', group: '7', exercise: 'begrijpend-lezen', amount: 3, layout: 'default', theme: 'Ruimte' },
  { name: 'groep 8 samenvatten', group: '8', exercise: 'samenvatten', amount: 2, layout: 'default' },
]

const inappropriatePattern = /\b(?:porno|seksueel|cocaïne|heroïne|zelfmoord|bloedbad|martelen|moordwapen)\b/i
const placeholderPattern = /^(?:antwoord|geen antwoord|onbekend|ik weet het niet|n\.?v\.?t\.?)$/i

function withoutNumber(value) {
  return value.replace(/^\d+\.\s*/, '').trim()
}

function duplicateKey(value) {
  return withoutNumber(value).toLocaleLowerCase('nl').normalize('NFKD').replace(/[\p{P}\p{S}\s]+/gu, '')
}

function inspectContent(testCase, data, qualityFallbackItems) {
  const issues = []
  const questions = Array.isArray(data.questions) ? data.questions : []
  const answers = Array.isArray(data.answers) ? data.answers : []

  if (data.source !== 'openai') issues.push(`bron is ${String(data.source)}`)
  if (questions.length !== testCase.amount) issues.push(`${questions.length}/${testCase.amount} vragen`)
  if (answers.length !== testCase.amount) issues.push(`${answers.length}/${testCase.amount} antwoorden`)
  if (qualityFallbackItems !== 0) issues.push(`${qualityFallbackItems} kwaliteitsfallbacks`)

  const seen = new Set()
  for (let index = 0; index < Math.min(questions.length, answers.length); index += 1) {
    const question = questions[index]
    const answer = answers[index]
    if (typeof question !== 'string' || typeof answer !== 'string') {
      issues.push(`item ${index + 1} is geen tekst`)
      continue
    }
    if (!question.startsWith(`${index + 1}. `) || !answer.startsWith(`${index + 1}. `)) {
      issues.push(`item ${index + 1} heeft onjuiste nummering`)
    }
    const cleanQuestion = withoutNumber(question)
    const cleanAnswer = withoutNumber(answer)
    if (cleanQuestion.length < 8) issues.push(`vraag ${index + 1} is te kort`)
    if (!cleanAnswer || placeholderPattern.test(cleanAnswer)) issues.push(`antwoord ${index + 1} is niet controleerbaar`)
    if (inappropriatePattern.test(cleanQuestion) || inappropriatePattern.test(cleanAnswer)) issues.push(`item ${index + 1} bevat ongeschikte inhoud`)
    const key = duplicateKey(cleanQuestion)
    if (seen.has(key)) issues.push(`vraag ${index + 1} is dubbel`)
    seen.add(key)
  }

  return issues
}

const results = []
for (const testCase of cases) {
  const response = await fetch(`${baseUrl}/api/worksheet`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testCase),
  })
  const requestId = response.headers.get('x-request-id') ?? 'onbekend'
  const qualityFallbackItems = Number(response.headers.get('x-quality-fallback-items') ?? 0)
  if (!response.ok) {
    results.push({ name: testCase.name, requestId, issues: [`HTTP ${response.status}`] })
    continue
  }

  const data = await response.json()
  results.push({ name: testCase.name, requestId, issues: inspectContent(testCase, data, qualityFallbackItems) })
}

for (const result of results) {
  console.log(`${result.issues.length === 0 ? '✓' : '✗'} ${result.name} (request ${result.requestId})`)
  for (const issue of result.issues) console.log(`  - ${issue}`)
}

const failed = results.filter((result) => result.issues.length > 0)
console.log(`\n${results.length - failed.length}/${results.length} inhoudsevaluaties geslaagd voor ${baseUrl}`)
if (failed.length > 0) process.exitCode = 1
