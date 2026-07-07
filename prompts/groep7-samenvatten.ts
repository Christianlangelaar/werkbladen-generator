export function groep7SamenvattenPrompt(amount: number) {
  return [
    `Maak ${amount} korte samenvatopdrachten voor groep 7.`,
    'Elke opdracht bestaat uit een kort tekstje van 4 tot 6 zinnen en daarna precies 1 opdracht om samen te vatten.',
    'Gebruik onderwerpen die passen bij kinderen van ongeveer 10-11 jaar.',
    'Wissel opdrachten af: hoofdgedachte noemen, belangrijkste zin kiezen en een samenvatting in 1 zin schrijven.',
    'Maak de tekst zelfstandig te begrijpen en niet te lang voor een werkblad.',
    'Geef alleen JSON terug in deze vorm: {"questions":["1. Korte tekst van 4 tot 6 zinnen.\\nVat de tekst samen in 1 zin.","2. Korte tekst van 4 tot 6 zinnen.\\nWat is de hoofdgedachte?"]}.',
  ].join(' ')
}
