export function groep6GrammaticaPrompt(amount: number) {
  return [
    `Maak ${amount} korte grammaticaopdrachten voor groep 6.`,
    'Niveau: zinsontleding en woordsoorten voor kinderen van ongeveer 9-10 jaar.',
    'Wissel opdrachtvormen af: onderwerp, persoonsvorm, lijdend voorwerp, zelfstandig naamwoord, werkwoord, bijvoeglijk naamwoord en voorzetsel herkennen.',
    'Gebruik duidelijke zinnen die niet te lang zijn.',
    'Vermijd moeilijke taaltermen en meerdere stappen per opdracht.',
    'Maak elke opdracht zelfstandig te begrijpen en vraag steeds om precies 1 antwoord.',
    'Geef alleen JSON terug in deze vorm: {"questions":["1. Wat is de persoonsvorm in de zin: ...?","2. Welk woord is het bijvoeglijk naamwoord?"]}.',
  ].join(' ')
}
