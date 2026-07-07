export function groep3RijmenPrompt(amount: number) {
  return [
    `Maak ${amount} korte rijmopdrachten voor groep 3.`,
    'Niveau: eenvoudige klankzuivere woorden die passen bij beginnende lezers van ongeveer 6-7 jaar.',
    'Wissel opdrachtvormen af: kies het rijmwoord, bedenk een rijmwoord en vul een rijmend woord in.',
    'Gebruik korte, bekende woorden zoals maan, vis, bal, huis en pop.',
    'Maak elke opdracht zelfstandig te begrijpen en vraag steeds om precies 1 antwoord.',
    'Geef alleen JSON terug in deze vorm: {"questions":["1. Welk woord rijmt op ...?","2. Bedenk een woord dat rijmt op ..."]}.',
  ].join(' ')
}
