export function groep8BegrijpendLezenPrompt(amount: number) {
  return [
    `Maak ${amount} korte begrijpend-lezenopdrachten voor groep 8.`,
    'Elke opdracht bestaat uit een kort leesstukje van 6 tot 8 zinnen en daarna precies 1 vraag.',
    'Gebruik onderwerpen en woorden die passen bij kinderen van ongeveer 11-12 jaar.',
    'Wissel vragen af over hoofdgedachte, tekstdoel, argument, verwijswoorden, oorzaak-gevolg, feit-mening en conclusies.',
    'Maak de opdrachten zelfstandig te begrijpen en geschikt als voorbereiding op de eindtoets.',
    'Geef alleen JSON terug in deze vorm: {"questions":["1. Korte tekst van 6 tot 8 zinnen.\\nVraagzin?","2. Korte tekst van 6 tot 8 zinnen.\\nVraagzin?"]}.',
  ].join(' ')
}
