export type FallbackWorksheetContent = {
  questions: string[]
  answers: string[]
}

type ExerciseItem = {
  question: string
  answer: string
}

const readingItems: ExerciseItem[] = [
  { question: 'Mila zet haar tas bij de deur. Daarna pakt ze haar broodtrommel en loopt ze naar school.\nWaar zet Mila haar tas?', answer: 'Bij de deur.' },
  { question: 'In de tuin staat een kleine boom. Sam geeft de boom water, omdat de grond erg droog is.\nWaarom geeft Sam de boom water?', answer: 'Omdat de grond erg droog is.' },
  { question: 'Noor leest een boek op de bank. Als het donker wordt, doet ze de lamp aan.\nWat doet Noor als het donker wordt?', answer: 'Ze doet de lamp aan.' },
  { question: 'De klas gaat naar de bibliotheek. Iedereen mag een boek kiezen om mee naar huis te nemen.\nWaar gaat de klas naartoe?', answer: 'Naar de bibliotheek.' },
]

const vocabularyItems: ExerciseItem[] = [
  { question: 'Wat betekent het woord "voorzichtig"?', answer: 'Dat je goed oplet om ongelukken of fouten te voorkomen.' },
  { question: 'Noem een ander woord voor "blij".', answer: 'Bijvoorbeeld: vrolijk, gelukkig of opgewekt.' },
  { question: 'Wat is het tegenovergestelde van "smal"?', answer: 'Breed.' },
  { question: 'Gebruik het woord "ontdekken" in een goede zin.', answer: 'Bijvoorbeeld: We ontdekten een vogelnest in de boom.' },
  { question: 'Wat betekent de uitdrukking "de tijd vliegt"?', answer: 'Dat de tijd snel voorbij lijkt te gaan.' },
]

const spellingItems: ExerciseItem[] = [
  { question: 'Schrijf dit woord correct: mischien', answer: 'misschien' },
  { question: 'Schrijf dit woord correct: interesant', answer: 'interessant' },
  { question: 'Schrijf dit woord correct: onmiddelijk', answer: 'onmiddellijk' },
  { question: 'Schrijf het meervoud van: verhaal', answer: 'verhalen' },
  { question: 'Schrijf het verkleinwoord van: koning', answer: 'koninkje' },
]

const verbItems: ExerciseItem[] = [
  { question: 'Vul de juiste vorm in: Morgen ... (worden) ik elf jaar.', answer: 'word' },
  { question: 'Vul de juiste vorm in: De hond ... (blaffen) naar de postbode.', answer: 'blaft' },
  { question: 'Zet in de verleden tijd: Wij fietsen naar school.', answer: 'Wij fietsten naar school.' },
  { question: 'Vul het voltooid deelwoord in: Zij heeft de deur ... (verven).', answer: 'geverfd' },
  { question: 'Vul de juiste vorm in: ... (vinden) jij dit boek spannend?', answer: 'Vind' },
]

const grammarItems: ExerciseItem[] = [
  { question: 'Wat is het onderwerp in: De vrolijke hond rent door het park?', answer: 'De vrolijke hond.' },
  { question: 'Wat is de persoonsvorm in: Morgen spelen wij een wedstrijd?', answer: 'spelen' },
  { question: 'Noem de zelfstandige naamwoorden in: Sara draagt een rode jas.', answer: 'Sara en jas.' },
  { question: 'Noem het bijvoeglijk naamwoord in: De kleine kat slaapt.', answer: 'kleine' },
  { question: 'Zet in het meervoud: Het kind leest een boek.', answer: 'De kinderen lezen boeken.' },
]

const punctuationItems: ExerciseItem[] = [
  { question: 'Voeg hoofdletters en leestekens toe: waar woon jij', answer: 'Waar woon jij?' },
  { question: 'Voeg hoofdletters en leestekens toe: pas op voor die fiets', answer: 'Pas op voor die fiets!' },
  { question: 'Voeg hoofdletters en leestekens toe: sem koopt brood melk en appels', answer: 'Sem koopt brood, melk en appels.' },
  { question: 'Voeg hoofdletters en leestekens toe: morgen gaan we naar utrecht', answer: 'Morgen gaan we naar Utrecht.' },
]

const englishItems: ExerciseItem[] = [
  { question: 'Vertaal naar het Engels: school', answer: 'school' },
  { question: 'Vertaal naar het Engels: woensdag', answer: 'Wednesday' },
  { question: 'Vertaal naar het Nederlands: neighbour', answer: 'buurman of buurvrouw' },
  { question: 'Maak af: I ... twelve years old.', answer: 'am' },
  { question: 'Wat is het Engelse woord voor ontbijt?', answer: 'breakfast' },
]

function contextItem(group: number, index: number): ExerciseItem {
  const first = group <= 4 ? 12 + ((index * 7) % 28) : 45 + ((index * 17) % 155)
  const second = group <= 4 ? 3 + ((index * 5) % 17) : 12 + ((index * 11) % 68)

  if (index % 3 === 0) return { question: `Lina heeft ${first} stickers en krijgt er ${second} bij. Hoeveel stickers heeft ze nu?`, answer: String(first + second) }
  if (index % 3 === 1) return { question: `Er liggen ${first + second} boeken. ${second} boeken worden uitgeleend. Hoeveel boeken blijven er?`, answer: String(first) }
  return { question: `${first} kinderen worden verdeeld over ${second} teams. Hoeveel kinderen zijn dat gemiddeld per team? Rond af op één decimaal.`, answer: (first / second).toFixed(1).replace('.', ',') }
}

function mathItem(exercise: string, index: number): ExerciseItem | undefined {
  const a = 2 + (index % 8)
  const b = 3 + ((index * 3) % 9)

  if (exercise === 'breuken') return { question: `Bereken en vereenvoudig: 1/${a} + 1/${a}`, answer: `2/${a}${a % 2 === 0 ? ` = 1/${a / 2}` : ''}` }
  if (exercise === 'procenten') return { question: `Bereken ${a * 10}% van ${b * 10}.`, answer: String((a * b)) }
  if (exercise === 'verhoudingen') return { question: `De verhouding rood : blauw is ${a} : ${b}. Er zijn ${a * 4} rode knikkers. Hoeveel blauwe zijn er?`, answer: String(b * 4) }
  if (exercise === 'kommagetallen') return { question: `Bereken: ${(a + 0.4).toFixed(1).replace('.', ',')} + ${(b + 0.3).toFixed(1).replace('.', ',')}`, answer: (a + b + 0.7).toFixed(1).replace('.', ',') }
  if (exercise === 'schaal') return { question: `Op een kaart met schaal 1 : 1000 is een route ${a} cm. Hoeveel meter is dat in werkelijkheid?`, answer: `${a * 10} meter` }
  return undefined
}

function getItem(group: number, exercise: string, index: number): ExerciseItem {
  const math = mathItem(exercise, index)
  if (math) return math
  if (exercise === 'contextsommen' || exercise === 'eindtoets-rekenen') return contextItem(group, index)
  if (exercise === 'begrijpend-lezen') return readingItems[index % readingItems.length] as ExerciseItem
  if (exercise === 'woordenschat') return vocabularyItems[index % vocabularyItems.length] as ExerciseItem
  if (exercise === 'spelling') return spellingItems[index % spellingItems.length] as ExerciseItem
  if (exercise === 'werkwoordspelling') return verbItems[index % verbItems.length] as ExerciseItem
  if (exercise === 'grammatica') return grammarItems[index % grammarItems.length] as ExerciseItem
  if (exercise === 'leestekens') return punctuationItems[index % punctuationItems.length] as ExerciseItem
  if (exercise === 'engels-woordenschat') return englishItems[index % englishItems.length] as ExerciseItem
  if (exercise === 'rijmen') {
    const pairs = [['maan', 'staan'], ['boek', 'hoek'], ['kat', 'mat'], ['feest', 'beest']] as const
    const pair = pairs[index % pairs.length] as typeof pairs[number]
    return { question: `Schrijf een woord dat rijmt op "${pair[0]}".`, answer: `Bijvoorbeeld: ${pair[1]}.` }
  }
  if (exercise === 'samenvatten') {
    return {
      question: 'De schooltuin was droog. De leerlingen verzamelden regenwater en gaven daarmee de planten water. Na een week stonden de planten er weer fris bij.\nSchrijf de hoofdgedachte in één zin.',
      answer: 'De leerlingen hielpen de droge schooltuin door regenwater te gebruiken.',
    }
  }
  return { question: `Leg in je eigen woorden uit wat je bij ${exercise.replace(/-/g, ' ')} hebt geleerd.`, answer: 'Een passend antwoord in een volledige zin.' }
}

export function createFallbackWorksheetContent(
  group: string,
  exercise: string,
  amount: number,
  startIndex = 0,
): FallbackWorksheetContent {
  const groupNumber = Number(group) || 4
  const items = Array.from({ length: amount }, (_, offset) => {
    const index = startIndex + offset
    const item = getItem(groupNumber, exercise, index)

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
