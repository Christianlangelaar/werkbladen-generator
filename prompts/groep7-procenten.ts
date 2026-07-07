export function groep7ProcentenPrompt(amount: number) {
  return [
    `Maak ${amount} korte procentenopdrachten voor groep 7.`,
    'Niveau: percentages berekenen, korting, toename, afname en deel van een geheel.',
    'Gebruik overzichtelijke getallen waarbij leerlingen zonder rekenmachine kunnen oefenen.',
    'Wissel directe sommen en korte contexten af.',
    'Vermijd ingewikkelde samengestelde procentberekeningen en meer dan twee rekenstappen.',
    'Geef alleen JSON terug in deze vorm: {"questions":["1. ...","2. ..."]}.',
  ].join(' ')
}
