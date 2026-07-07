export function groep5AftrekkenGroteGetallenPrompt(amount: number) {
  return [
    `Maak ${amount} korte aftreksommen met grote getallen voor groep 5.`,
    'Niveau: aftrekken tot ongeveer 10.000, met twee getallen per som.',
    'Gebruik directe sommen zoals 8.642 - 3.579 = ..., zonder contextverhaal.',
    'Wissel sommen zonder en met lenen over tientallen, honderdtallen en duizendtallen af.',
    'Zorg dat de uitkomst nooit negatief is.',
    'Vermijd kommagetallen en onnodige meerstapsopdrachten.',
    'Geef alleen JSON terug in deze vorm: {"questions":["1. ...","2. ..."]}.',
  ].join(' ')
}
