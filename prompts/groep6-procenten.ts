export function groep6ProcentenPrompt(amount: number) {
  return [
    `Maak ${amount} korte procentenopdrachten voor groep 6.`,
    'Niveau: eenvoudige percentages zoals 10%, 25%, 50%, 75% en 100%.',
    'Gebruik directe opdrachten en herkenbare contexten zoals korting, aantallen en delen van een geheel.',
    'Gebruik getallen waarbij leerlingen zonder rekenmachine kunnen rekenen.',
    'Vermijd kommagetallen als uitkomst en ingewikkelde procentberekeningen.',
    'Geef alleen JSON terug in deze vorm: {"questions":["1. ...","2. ..."]}.',
  ].join(' ')
}
