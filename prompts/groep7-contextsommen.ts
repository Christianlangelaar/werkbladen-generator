export function groep7ContextsommenPrompt(amount: number) {
  return [
    `Maak ${amount} korte contextsommen voor groep 7.`,
    'Niveau: rekenen met procenten, breuken, schaal, verhoudingen, kommagetallen, geld, tijd en meten.',
    'Gebruik herkenbare situaties voor kinderen van ongeveer 10-11 jaar.',
    'Maak de sommen uitdagend maar geschikt voor zelfstandig oefenen.',
    'Gebruik maximaal twee rekenstappen per opgave.',
    'Geef alleen JSON terug in deze vorm: {"questions":["1. ...","2. ..."]}.',
  ].join(' ')
}
