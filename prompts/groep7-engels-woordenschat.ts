export function groep7EngelsWoordenschatPrompt(amount: number) {
  return [
    `Maak ${amount} korte Engelse woordenschatopdrachten voor groep 7.`,
    'Niveau: eenvoudige Engelse woorden en korte zinnen voor kinderen van ongeveer 10-11 jaar.',
    'Wissel opdrachtvormen af: vertaal naar het Nederlands, vertaal naar het Engels, kies het juiste Engelse woord en vul een ontbrekend woord in.',
    'Gebruik thema’s zoals school, eten, dieren, hobby’s, familie, kleuren, dagen en eenvoudige werkwoorden.',
    'Maak elke opdracht zelfstandig te begrijpen en vraag steeds om precies 1 antwoord.',
    'Geef alleen JSON terug in deze vorm: {"questions":["1. Wat betekent het Engelse woord ...?","2. Vertaal naar het Engels: ..."]}.',
  ].join(' ')
}
