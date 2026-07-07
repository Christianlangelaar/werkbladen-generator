export function groep5VermenigvuldigenPrompt(amount: number) {
  return [
    `Maak ${amount} korte vermenigvuldigingsopdrachten voor groep 5.`,
    'Niveau: tafels tot en met 10, tientallen keer eenheden en eenvoudige grotere keersommen.',
    'Gebruik directe sommen zoals 7 x 8 = ..., 6 x 40 = ... of 23 x 4 = ..., zonder contextverhaal.',
    'Wissel makkelijke en iets uitdagendere sommen af.',
    'Vermijd kommagetallen, meerdere rekenstappen en te grote getallen.',
    'Geef alleen JSON terug in deze vorm: {"questions":["1. ...","2. ..."]}.',
  ].join(' ')
}
