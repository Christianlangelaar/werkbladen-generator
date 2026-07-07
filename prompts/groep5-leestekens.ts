export function groep5LeestekensPrompt(amount: number) {
  return [
    `Maak ${amount} korte leestekenopdrachten voor groep 5.`,
    "Niveau: punten, vraagtekens, uitroeptekens, komma's en aanhalingstekens in eenvoudige zinnen.",
    'Wissel opdrachtvormen af: kies het juiste leesteken, plaats ontbrekende leestekens en verbeter een zin.',
    'Gebruik korte, duidelijke zinnen die passen bij kinderen van ongeveer 8-9 jaar.',
    'Vermijd ingewikkelde citaten en lange samengestelde zinnen.',
    'Maak elke opdracht zelfstandig te begrijpen en vraag steeds om precies 1 antwoord.',
    'Geef alleen JSON terug in deze vorm: {"questions":["1. Welk leesteken hoort aan het eind: ...","2. Zet de komma op de juiste plek: ..."]}.',
  ].join(' ')
}
