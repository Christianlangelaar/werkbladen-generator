export function groep5ContextsommenPrompt(amount: number) {
  return [
    `Maak ${amount} korte contextsommen voor groep 5.`,
    'Niveau: plus- en minsommen tot ongeveer 1000, tafels, eenvoudig delen, geldbedragen, tijdsduur en meten.',
    'Gebruik herkenbare situaties voor kinderen van ongeveer 8-9 jaar.',
    'Maak de sommen iets uitdagender dan groep 4, maar houd ze geschikt voor zelfstandig oefenen.',
    'Gebruik maximaal twee rekenstappen per opgave.',
    'Geef alleen JSON terug in deze vorm: {"questions":["1. ...","2. ..."]}.',
  ].join(' ')
}
