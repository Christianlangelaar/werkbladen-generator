export function groep7WerkwoordspellingPrompt(amount: number) {
  return [
    `Maak ${amount} korte werkwoordspellingopdrachten voor groep 7.`,
    'Niveau: tegenwoordige tijd, verleden tijd en voltooid deelwoord van regelmatige en eenvoudige onregelmatige werkwoorden.',
    'Gebruik korte, duidelijke zinnen met alledaagse werkwoorden.',
    'Wissel opdrachtvormen af: vul de juiste vorm in, kies de goede spelling en verbeter een fout gespeld werkwoord.',
    'Vermijd lange zinnen met meerdere lastige werkwoorden.',
    'Maak elke opdracht zelfstandig te begrijpen en vraag steeds om precies 1 antwoord.',
    'Geef alleen JSON terug in deze vorm: {"questions":["1. Vul de juiste vorm in: Hij ... (worden) morgen elf.","2. Kies de juiste vorm: gebeurt/gebeurd."]}.',
  ].join(' ')
}
