export function groep4TafelsPrompt(amount: number) {
  return [
    `Maak ${amount} korte tafelsommen voor groep 4.`,
    'Niveau: oefen de tafels van 1, 2, 3, 4, 5 en 10.',
    'Gebruik vooral directe keersommen zoals 4 x 5 = ..., zonder contextverhaal.',
    'Wissel de tafels af en zorg dat de volgorde niet voorspelbaar is.',
    'Vermijd delen, kommagetallen, grote getallen en meerdere rekenstappen.',
    'Geef alleen JSON terug in deze vorm: {"questions":["1. ...","2. ..."]}.',
  ].join(' ')
}
