export function groep4WoordenschatPrompt(amount: number) {
  return [
    `Maak ${amount} korte woordenschatopdrachten voor groep 4.`,
    'Niveau: woorden die passen bij kinderen van ongeveer 7-8 jaar.',
    'Wissel opdrachtvormen af: betekenis kiezen, synoniem noemen, tegenstelling noemen en een woord in een zin gebruiken.',
    'Gebruik duidelijke, alledaagse woorden en korte zinnen.',
    'Maak elke opdracht zelfstandig te begrijpen en vraag steeds om precies 1 antwoord.',
    'Geef alleen JSON terug in deze vorm: {"questions":["1. Wat betekent het woord ...?","2. Welk woord betekent hetzelfde als ...?"]}.',
  ].join(' ')
}
