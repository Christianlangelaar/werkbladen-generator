export function groep6KommagetallenPrompt(amount: number) {
  return [
    `Maak ${amount} korte kommagetallenopdrachten voor groep 6.`,
    'Niveau: kommagetallen met 1 of 2 decimalen vergelijken, ordenen, optellen en aftrekken.',
    'Gebruik directe sommen en korte contexten met geld, lengte en gewicht.',
    'Gebruik overzichtelijke getallen die passen bij zelfstandig oefenen.',
    'Vermijd delen met kommagetallen, negatieve getallen en lange meerstapsopdrachten.',
    'Geef alleen JSON terug in deze vorm: {"questions":["1. ...","2. ..."]}.',
  ].join(' ')
}
