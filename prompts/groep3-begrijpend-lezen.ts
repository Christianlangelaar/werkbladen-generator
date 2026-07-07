export function groep3BegrijpendLezenPrompt(amount: number) {
  return [
    `Maak ${amount} korte begrijpend-lezenopdrachten voor groep 3.`,
    'Elke opdracht bestaat uit een heel kort leesstukje van 1 tot 3 eenvoudige zinnen en daarna precies 1 vraag.',
    'Gebruik eenvoudige woorden en herkenbare situaties voor kinderen van ongeveer 6-7 jaar.',
    'Wissel vragen af over wie, wat en waar.',
    'Maak de opdrachten zelfstandig te begrijpen en houd de teksten kort genoeg voor beginnende lezers.',
    'Geef alleen JSON terug in deze vorm: {"questions":["1. Korte tekst van 1 tot 3 zinnen.\\nVraagzin?","2. Korte tekst van 1 tot 3 zinnen.\\nVraagzin?"]}.',
  ].join(' ')
}
