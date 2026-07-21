export function groep4SpellingPrompt(amount: number) {
  return [
    `Maak ${amount} korte spellingopdrachten voor groep 4.`,
    'Niveau: woorden en spellingregels die passen bij kinderen van ongeveer 7-8 jaar.',
    'Wissel opdrachtvormen af: vul de ontbrekende letter in, kies de goed gespelde vorm, maak het woord af en schrijf het woord over in een korte zin.',
    'Gebruik duidelijke, alledaagse woorden en korte zinnen.',
    'Vermijd te moeilijke leenwoorden, werkwoordspelling en lange meerstapsopdrachten.',
    'Maak elke opdracht zelfstandig te begrijpen en vraag steeds om precies 1 antwoord.',
    'Geef alleen JSON terug in deze vorm: {"questions":["1. Vul het woord aan in de zin: Ik lees een b__k.","2. Welk woord is goed gespeld: fiets of fietz?"]}.',
  ].join(' ')
}
