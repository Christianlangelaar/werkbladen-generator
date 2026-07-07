export function groep8ProcentenPrompt(amount: number) {
  return [
    `Maak ${amount} korte procentenopdrachten voor groep 8.`,
    'Niveau: percentages berekenen, korting, toename, afname, deel-geheel en eenvoudige procentuele vergelijking.',
    'Gebruik directe opdrachten en realistische contexten zoals prijs, korting, aantallen en resultaten.',
    'Gebruik getallen waarbij leerlingen zonder rekenmachine kunnen oefenen.',
    'Vermijd ingewikkelde samengestelde rente en meer dan drie rekenstappen.',
    'Geef alleen JSON terug in deze vorm: {"questions":["1. ...","2. ..."]}.',
  ].join(' ')
}
