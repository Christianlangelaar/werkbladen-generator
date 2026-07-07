export function groep4OptellenPrompt(amount: number) {
  return [
    `Maak ${amount} korte optelsommen voor groep 4.`,
    'Niveau: optellen tot ongeveer 100, met vooral twee getallen per som.',
    'Gebruik directe sommen zoals 34 + 18 = ..., zonder contextverhaal.',
    'Wissel sommen zonder en met tientaloverschrijding af.',
    'Vermijd kommagetallen, negatieve getallen, meerdere rekenstappen en te grote getallen.',
    'Geef alleen JSON terug in deze vorm: {"questions":["1. ...","2. ..."]}.',
  ].join(' ')
}
