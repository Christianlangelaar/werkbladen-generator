export function groep5WerkwoordspellingPrompt(amount: number) {
  return [
    `Maak ${amount} korte werkwoordspellingopdrachten voor groep 5.`,
    'Niveau: tegenwoordige tijd van regelmatige werkwoorden, persoonsvorm herkennen en eenvoudige ik/jij/hij-vormen.',
    'Gebruik korte zinnen met alledaagse werkwoorden.',
    'Wissel opdrachtvormen af: vul de juiste vorm in, kies de goede persoonsvorm en verbeter een fout gespeld werkwoord.',
    'Vermijd voltooid deelwoord, verleden tijd en moeilijke uitzonderingen.',
    'Maak elke opdracht zelfstandig te begrijpen en vraag steeds om precies 1 antwoord.',
    'Geef alleen JSON terug in deze vorm: {"questions":["1. Vul de juiste vorm in: Ik ... (lopen) naar school.","2. Kies de juiste vorm: hij word/wordt blij."]}.',
  ].join(' ')
}
