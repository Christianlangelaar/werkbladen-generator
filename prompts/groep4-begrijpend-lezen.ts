export function groep4BegrijpendLezenPrompt(amount: number) {
  return [
    `Maak ${amount} korte begrijpend-lezenopdrachten voor groep 4.`,
    'Elke opdracht bestaat uit een kort leesstukje van 2 tot 4 zinnen en daarna precies 1 vraag.',
    'Gebruik eenvoudige woorden en herkenbare situaties voor kinderen van ongeveer 7-8 jaar.',
    'Wissel vragen af over wie, wat, waar, wanneer, oorzaak-gevolg en een eenvoudige conclusie.',
    'Maak de opdrachten zelfstandig te begrijpen en houd de teksten kort genoeg voor een werkblad.',
    'Geef alleen JSON terug in deze vorm: {"questions":["1. Korte tekst van 2 tot 4 zinnen.\\nVraagzin?","2. Korte tekst van 2 tot 4 zinnen.\\nVraagzin?"]}.',
  ].join(' ')
}
