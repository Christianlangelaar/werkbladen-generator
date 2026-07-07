export function groep4AftrekkenPrompt(amount: number) {
  return [
    `Maak ${amount} korte aftreksommen voor groep 4.`,
    'Niveau: aftrekken tot ongeveer 100, met vooral twee getallen per som.',
    'Gebruik directe sommen zoals 72 - 18 = ..., zonder contextverhaal.',
    'Wissel sommen zonder en met tientaloverschrijding af.',
    'Zorg dat de uitkomst nooit negatief is.',
    'Vermijd kommagetallen, meerdere rekenstappen en te grote getallen.',
    'Geef alleen JSON terug in deze vorm: {"questions":["1. ...","2. ..."]}.',
  ].join(' ')
}
