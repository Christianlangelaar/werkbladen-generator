export function groep6ContextsommenPrompt(amount: number) {
  return [
    `Maak ${amount} korte contextsommen voor groep 6.`,
    'Niveau: rekenen met grotere getallen, breuken, procenten, verhoudingen, kommagetallen, geld, tijd en meten.',
    'Gebruik herkenbare situaties voor kinderen van ongeveer 9-10 jaar.',
    'Maak de sommen uitdagend maar geschikt voor zelfstandig oefenen.',
    'Gebruik maximaal twee rekenstappen per opgave.',
    'Geef alleen JSON terug in deze vorm: {"questions":["1. ...","2. ..."]}.',
  ].join(' ')
}
