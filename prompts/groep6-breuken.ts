export function groep6BreukenPrompt(amount: number) {
  return [
    `Maak ${amount} korte breukenopdrachten voor groep 6.`,
    'Niveau: eenvoudige breuken vergelijken, aanvullen, optellen en aftrekken met gelijke noemers.',
    'Gebruik directe opdrachten zoals 1/4 + 2/4 = ... of Welke breuk is groter: 1/2 of 1/3?',
    'Wissel kale sommen en korte contexten af.',
    'Vermijd moeilijke vereenvoudigingen, gemengde getallen en meerdere rekenstappen.',
    'Geef alleen JSON terug in deze vorm: {"questions":["1. ...","2. ..."]}.',
  ].join(' ')
}
