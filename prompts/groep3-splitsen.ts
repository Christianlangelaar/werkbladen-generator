export function groep3SplitsenPrompt(amount: number) {
  return [
    `Maak ${amount} korte splitsopdrachten voor groep 3.`,
    'Niveau: getallen splitsen tot en met 20.',
    'Gebruik opdrachten zoals Splits 8: 3 + ... = 8 of 14 = 10 + ...',
    'Wissel getallen tot 10 en getallen tussen 10 en 20 af.',
    'Maak elke opdracht kort en vraag steeds om precies 1 ontbrekend getal.',
    'Vermijd kommagetallen, negatieve getallen en meerdere rekenstappen.',
    'Geef alleen JSON terug in deze vorm: {"questions":["1. ...","2. ..."]}.',
  ].join(' ')
}
