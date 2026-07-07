export function groep8BreukenPrompt(amount: number) {
  return [
    `Maak ${amount} korte breukenopdrachten voor groep 8.`,
    'Niveau: breuken vergelijken, vereenvoudigen, gelijknamig maken, optellen, aftrekken en koppelen aan procenten of kommagetallen.',
    'Gebruik directe opdrachten en korte contexten.',
    'Gebruik overzichtelijke breuken, maar maak het uitdagender dan groep 7.',
    'Vermijd lange meerstapsopdrachten en zeer ingewikkelde breuken.',
    'Geef alleen JSON terug in deze vorm: {"questions":["1. ...","2. ..."]}.',
  ].join(' ')
}
