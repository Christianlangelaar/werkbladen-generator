export function groep5SpellingPrompt(amount: number) {
  return [
    `Maak ${amount} korte spellingopdrachten voor groep 5.`,
    'Niveau: spellingregels en woorden die passen bij kinderen van ongeveer 8-9 jaar.',
    'Wissel opdrachtvormen af: kies de goed gespelde vorm, vul ontbrekende letters in, maak meervoud, verkleinwoord of woord met voorvoegsel af.',
    'Gebruik duidelijke, alledaagse woorden en korte zinnen.',
    'Vermijd werkwoordspelling; die heeft een aparte oefensoort.',
    'Maak elke opdracht zelfstandig te begrijpen en vraag steeds om precies 1 antwoord.',
    'Geef alleen JSON terug in deze vorm: {"questions":["1. Welk woord is goed gespeld: onmiddellijk of onmiddelijk?","2. Vul het woord aan in de zin: De bakker verkoopt br__d."]}.',
  ].join(' ')
}
