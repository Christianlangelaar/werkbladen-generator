export function groep3ContextsommenPrompt(amount: number) {
  return [
    `Maak ${amount} korte contextsommen voor groep 3.`,
    'Niveau: eenvoudige plus- en minsommen tot ongeveer 20, tellen, vergelijken en kleine hoeveelheden.',
    'Gebruik herkenbare situaties voor kinderen van ongeveer 6-7 jaar.',
    'Maak elke som kort, concreet en zelfstandig te begrijpen.',
    'Vermijd tafels, delen, kommagetallen, grote getallen en meerdere rekenstappen.',
    'Geef alleen JSON terug in deze vorm: {"questions":["1. ...","2. ..."]}.',
  ].join(' ')
}
