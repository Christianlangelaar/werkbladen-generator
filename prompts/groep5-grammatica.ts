export function groep5GrammaticaPrompt(amount: number) {
  return [
    `Maak ${amount} korte grammaticaopdrachten voor groep 5.`,
    'Niveau: eenvoudige zinsontleding en woordsoorten voor kinderen van ongeveer 8-9 jaar.',
    'Wissel opdrachtvormen af: onderwerp aanwijzen, persoonsvorm aanwijzen, zelfstandig naamwoord herkennen, bijvoeglijk naamwoord herkennen en zinnen verbeteren.',
    'Gebruik korte, duidelijke zinnen.',
    'Vermijd te lange zinnen, moeilijke taaltermen en meerdere stappen per opdracht.',
    'Maak elke opdracht zelfstandig te begrijpen en vraag steeds om precies 1 antwoord.',
    'Geef alleen JSON terug in deze vorm: {"questions":["1. Wat is het onderwerp in de zin: ...?","2. Welk woord is het zelfstandig naamwoord?"]}.',
  ].join(' ')
}
