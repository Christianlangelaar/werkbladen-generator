export function groep6WerkwoordspellingPrompt(amount: number) {
  return [
    `Maak ${amount} korte werkwoordspellingopdrachten voor groep 6.`,
    'Niveau: tegenwoordige tijd, verleden tijd van regelmatige werkwoorden en eenvoudige voltooid deelwoorden.',
    'Gebruik korte, duidelijke zinnen met alledaagse werkwoorden.',
    'Wissel opdrachtvormen af: vul de juiste vorm in, kies de goede persoonsvorm en verbeter een fout gespeld werkwoord.',
    'Vermijd moeilijke uitzonderingen en lange zinnen met meerdere werkwoorden.',
    'Maak elke opdracht zelfstandig te begrijpen en vraag steeds om precies 1 antwoord.',
    'Geef alleen JSON terug in deze vorm: {"questions":["1. Vul de juiste vorm in: Hij ... (worden) blij.","2. Kies de juiste vorm: gebeurt/gebeurd."]}.',
  ].join(' ')
}
