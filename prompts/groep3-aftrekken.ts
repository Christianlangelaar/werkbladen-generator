export function groep3AftrekkenPrompt(amount: number) {
  return [
    `Maak ${amount} korte aftreksommen voor groep 3.`,
    'Niveau: aftrekken tot ongeveer 20, met twee getallen per som.',
    'Gebruik directe sommen zoals 16 - 7 = ..., zonder contextverhaal.',
    'Wissel sommen zonder en met overschrijding van 10 af.',
    'Zorg dat de uitkomst nooit negatief is.',
    'Vermijd kommagetallen, grote getallen en meerdere rekenstappen.',
    'Geef alleen JSON terug in deze vorm: {"questions":["1. ...","2. ..."]}.',
  ].join(' ')
}
