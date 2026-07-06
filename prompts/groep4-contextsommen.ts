export function groep4ContextsommenPrompt(amount: number) {
  return [
    `Maak ${amount} korte contextsommen voor groep 4.`,
    'Niveau: eenvoudige plus- en minsommen tot ongeveer 100, beginnende tafels, hele eurobedragen, eenvoudige tijd en meten.',
    'Gebruik herkenbare situaties voor kinderen van ongeveer 7-8 jaar.',
    'Maak elke som kort, duidelijk en zelfstandig te begrijpen.',
    'Vermijd kommagetallen, grote getallen en meerdere rekenstappen.',
    'Geef alleen JSON terug in deze vorm: {"questions":["1. ...","2. ..."]}.',
  ].join(' ')
}
