export function groep5TafelAutomatiserenPrompt(amount: number) {
  return [
    `Maak ${amount} korte opdrachten om tafels te automatiseren voor groep 5.`,
    'Niveau: vlot oefenen met de tafels van 1 tot en met 10, inclusief omgekeerde deelsommen.',
    'Gebruik directe sommen zoals 8 x 7 = ..., 9 x ... = 54 of 72 : 8 = ..., zonder contextverhaal.',
    'Wissel alle tafels af en zorg dat de volgorde niet voorspelbaar is.',
    'Vermijd kommagetallen, grote getallen en meerdere rekenstappen.',
    'Geef alleen JSON terug in deze vorm: {"questions":["1. ...","2. ..."]}.',
  ].join(' ')
}
