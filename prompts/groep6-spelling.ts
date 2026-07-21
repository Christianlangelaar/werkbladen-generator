export function groep6SpellingPrompt(amount: number) {
  return [
    `Maak ${amount} korte spellingopdrachten voor groep 6.`,
    'Niveau: spellingregels en woorden die passen bij kinderen van ongeveer 9-10 jaar.',
    'Wissel opdrachtvormen af: kies de goed gespelde vorm, vul ontbrekende letters in, maak meervoud, verkleinwoord of samenstelling af.',
    'Gebruik duidelijke zinnen en iets uitdagendere woorden dan groep 5.',
    'Vermijd werkwoordspelling; die heeft een aparte oefensoort.',
    'Maak elke opdracht zelfstandig te begrijpen en vraag steeds om precies 1 antwoord.',
    'Geef alleen JSON terug in deze vorm: {"questions":["1. Welk woord is goed gespeld: elektriciteit of electriciteit?","2. Vul het woord aan in de zin: De groep neemt een b_sluit."]}.',
  ].join(' ')
}
