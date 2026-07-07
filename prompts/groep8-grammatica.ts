export function groep8GrammaticaPrompt(amount: number) {
  return [
    `Maak ${amount} korte grammaticaopdrachten voor groep 8.`,
    'Niveau: zinsontleding en woordsoorten voor kinderen van ongeveer 11-12 jaar.',
    'Wissel opdrachtvormen af: onderwerp, persoonsvorm, lijdend voorwerp, meewerkend voorwerp, bijwoordelijke bepaling, gezegde en woordsoorten herkennen.',
    'Gebruik duidelijke zinnen die niet te lang zijn.',
    'Vermijd meerdere stappen per opdracht en te specialistische taaltermen.',
    'Maak elke opdracht zelfstandig te begrijpen en vraag steeds om precies 1 antwoord.',
    'Geef alleen JSON terug in deze vorm: {"questions":["1. Wat is het gezegde in de zin: ...?","2. Welk woord is het voorzetsel?"]}.',
  ].join(' ')
}
