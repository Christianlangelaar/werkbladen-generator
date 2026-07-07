export function groep3WoordenschatPrompt(amount: number) {
  return [
    `Maak ${amount} korte woordenschatopdrachten voor groep 3.`,
    'Niveau: alledaagse woorden die passen bij kinderen van ongeveer 6-7 jaar.',
    'Wissel opdrachtvormen af: betekenis kiezen, plaatssituatie beschrijven met een woord, tegenstelling noemen en een woord in een korte zin gebruiken.',
    'Gebruik eenvoudige woorden en korte zinnen.',
    'Maak elke opdracht zelfstandig te begrijpen en vraag steeds om precies 1 antwoord.',
    'Geef alleen JSON terug in deze vorm: {"questions":["1. Wat betekent het woord ...?","2. Welk woord is het tegenovergestelde van ...?"]}.',
  ].join(' ')
}
