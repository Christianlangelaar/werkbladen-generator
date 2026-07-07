export function groep5OptellenGroteGetallenPrompt(amount: number) {
  return [
    `Maak ${amount} korte optelsommen met grote getallen voor groep 5.`,
    'Niveau: optellen tot ongeveer 10.000, met twee of drie getallen per som.',
    'Gebruik directe sommen zoals 3.475 + 2.389 = ..., zonder contextverhaal.',
    'Wissel sommen zonder en met overschrijding van tientallen, honderdtallen en duizendtallen af.',
    'Vermijd kommagetallen, negatieve getallen en onnodige meerstapsopdrachten.',
    'Geef alleen JSON terug in deze vorm: {"questions":["1. ...","2. ..."]}.',
  ].join(' ')
}
