export function groep5BegrijpendLezenPrompt(amount: number) {
  return [
    `Maak ${amount} korte begrijpend-lezenopdrachten voor groep 5.`,
    'Elke opdracht bestaat uit een kort leesstukje van 3 tot 5 zinnen en daarna precies 1 vraag.',
    'Gebruik herkenbare situaties en woorden die passen bij kinderen van ongeveer 8-9 jaar.',
    'Wissel vragen af over hoofdgedachte, details, oorzaak-gevolg, volgorde en eenvoudige conclusies.',
    'Maak de opdrachten zelfstandig te begrijpen en houd de teksten kort genoeg voor een werkblad.',
    'Geef alleen JSON terug in deze vorm: {"questions":["1. Korte tekst van 3 tot 5 zinnen.\\nVraagzin?","2. Korte tekst van 3 tot 5 zinnen.\\nVraagzin?"]}.',
  ].join(' ')
}
