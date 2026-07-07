export function groep7BegrijpendLezenPrompt(amount: number) {
  return [
    `Maak ${amount} korte begrijpend-lezenopdrachten voor groep 7.`,
    'Elke opdracht bestaat uit een kort leesstukje van 5 tot 7 zinnen en daarna precies 1 vraag.',
    'Gebruik onderwerpen en woorden die passen bij kinderen van ongeveer 10-11 jaar.',
    'Wissel vragen af over hoofdgedachte, tekstdoel, verwijswoorden, oorzaak-gevolg, mening-feit en conclusies.',
    'Maak de opdrachten zelfstandig te begrijpen en houd de teksten geschikt voor een werkblad.',
    'Geef alleen JSON terug in deze vorm: {"questions":["1. Korte tekst van 5 tot 7 zinnen.\\nVraagzin?","2. Korte tekst van 5 tot 7 zinnen.\\nVraagzin?"]}.',
  ].join(' ')
}
