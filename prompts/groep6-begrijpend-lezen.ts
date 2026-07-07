export function groep6BegrijpendLezenPrompt(amount: number) {
  return [
    `Maak ${amount} korte begrijpend-lezenopdrachten voor groep 6.`,
    'Elke opdracht bestaat uit een kort leesstukje van 4 tot 6 zinnen en daarna precies 1 vraag.',
    'Gebruik onderwerpen en woorden die passen bij kinderen van ongeveer 9-10 jaar.',
    'Wissel vragen af over hoofdgedachte, details, verwijswoorden, oorzaak-gevolg, doel van de tekst en conclusies.',
    'Maak de opdrachten zelfstandig te begrijpen en houd de teksten geschikt voor een werkblad.',
    'Geef alleen JSON terug in deze vorm: {"questions":["1. Korte tekst van 4 tot 6 zinnen.\\nVraagzin?","2. Korte tekst van 4 tot 6 zinnen.\\nVraagzin?"]}.',
  ].join(' ')
}
