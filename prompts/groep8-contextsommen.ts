export function groep8ContextsommenPrompt(amount: number) {
  return [
    `Maak ${amount} korte contextsommen voor groep 8.`,
    'Niveau: eind basisschool, met procenten, breuken, verhoudingen, kommagetallen, schaal, geld, tijd en meten.',
    'Gebruik realistische situaties voor kinderen van ongeveer 11-12 jaar.',
    'Maak de sommen uitdagend maar geschikt voor zelfstandig oefenen.',
    'Gebruik maximaal drie rekenstappen per opgave.',
    'Geef alleen JSON terug in deze vorm: {"questions":["1. ...","2. ..."]}.',
  ].join(' ')
}
