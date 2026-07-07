export function groep8WerkwoordspellingPrompt(amount: number) {
  return [
    `Maak ${amount} korte werkwoordspellingopdrachten voor groep 8.`,
    'Niveau: tegenwoordige tijd, verleden tijd, voltooid deelwoord en bijvoeglijk gebruikt voltooid deelwoord.',
    'Gebruik duidelijke zinnen met regelmatige en veelvoorkomende onregelmatige werkwoorden.',
    'Wissel opdrachtvormen af: vul de juiste vorm in, kies de goede spelling en verbeter een fout gespeld werkwoord.',
    'Vermijd lange zinnen met meerdere lastige werkwoorden.',
    'Maak elke opdracht zelfstandig te begrijpen en vraag steeds om precies 1 antwoord.',
    'Geef alleen JSON terug in deze vorm: {"questions":["1. Vul de juiste vorm in: Hij ... (worden) morgen twaalf.","2. Kies de juiste vorm: gebeurt/gebeurd."]}.',
  ].join(' ')
}
