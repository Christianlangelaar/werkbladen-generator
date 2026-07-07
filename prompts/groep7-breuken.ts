export function groep7BreukenPrompt(amount: number) {
  return [
    `Maak ${amount} korte breukenopdrachten voor groep 7.`,
    'Niveau: breuken vergelijken, vereenvoudigen, gelijknamig maken en eenvoudige breuken optellen of aftrekken.',
    'Gebruik directe opdrachten en korte contexten.',
    'Gebruik overzichtelijke breuken zoals 1/2, 1/3, 1/4, 2/5, 3/8 en 5/10.',
    'Vermijd complexe gemengde getallen en lange meerstapsopdrachten.',
    'Geef alleen JSON terug in deze vorm: {"questions":["1. ...","2. ..."]}.',
  ].join(' ')
}
