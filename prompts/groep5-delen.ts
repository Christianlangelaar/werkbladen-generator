export function groep5DelenPrompt(amount: number) {
  return [
    `Maak ${amount} korte deelsommen voor groep 5.`,
    'Niveau: delen passend bij de tafels tot en met 10 en eenvoudige deelsommen tot ongeveer 1.000.',
    'Gebruik directe sommen zoals 56 : 7 = ..., 360 : 6 = ... of 84 : 4 = ..., zonder contextverhaal.',
    'Zorg dat de sommen hele uitkomsten hebben.',
    'Vermijd kommagetallen, breuken, restantnotatie en meerdere rekenstappen.',
    'Geef alleen JSON terug in deze vorm: {"questions":["1. ...","2. ..."]}.',
  ].join(' ')
}
