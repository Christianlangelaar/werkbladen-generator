export function groep3OptellenPrompt(amount: number) {
  return [
    `Maak ${amount} korte optelsommen voor groep 3.`,
    'Niveau: optellen tot ongeveer 20, met twee getallen per som.',
    'Gebruik directe sommen zoals 8 + 5 = ..., zonder contextverhaal.',
    'Wissel sommen zonder en met overschrijding van 10 af.',
    'Vermijd kommagetallen, negatieve getallen, grote getallen en meerdere rekenstappen.',
    'Geef alleen JSON terug in deze vorm: {"questions":["1. ...","2. ..."]}.',
  ].join(' ')
}
