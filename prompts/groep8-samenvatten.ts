export function groep8SamenvattenPrompt(amount: number) {
  return [
    `Maak ${amount} korte samenvatopdrachten voor groep 8.`,
    'Elke opdracht bestaat uit een kort tekstje van 5 tot 7 zinnen en daarna precies 1 opdracht om samen te vatten.',
    'Gebruik onderwerpen die passen bij kinderen van ongeveer 11-12 jaar.',
    'Wissel opdrachten af: hoofdgedachte noemen, kernzinnen kiezen en een samenvatting in 1 of 2 zinnen schrijven.',
    'Maak de tekst zelfstandig te begrijpen en geschikt als voorbereiding op de eindtoets.',
    'Geef alleen JSON terug in deze vorm: {"questions":["1. Korte tekst van 5 tot 7 zinnen.\\nVat de tekst samen in 1 zin.","2. Korte tekst van 5 tot 7 zinnen.\\nWat is de hoofdgedachte?"]}.',
  ].join(' ')
}
