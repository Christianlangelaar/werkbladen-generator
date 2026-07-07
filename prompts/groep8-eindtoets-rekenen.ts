export function groep8EindtoetsRekenenPrompt(amount: number) {
  return [
    `Maak ${amount} korte eindtoets-rekenopdrachten voor groep 8.`,
    'Niveau: eind basisschool, gemengd oefenen met procenten, breuken, verhoudingen, schaal, kommagetallen, meten, tijd en geld.',
    'Wissel kale sommen en contextsommen af.',
    'Maak de opdrachten toetsachtig, duidelijk en geschikt voor zelfstandig oefenen.',
    'Gebruik maximaal drie rekenstappen per opgave en vermijd rekenmachine-afhankelijke getallen.',
    'Geef alleen JSON terug in deze vorm: {"questions":["1. ...","2. ..."]}.',
  ].join(' ')
}
