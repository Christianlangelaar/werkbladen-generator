export function groep7SchaalPrompt(amount: number) {
  return [
    `Maak ${amount} korte schaalopdrachten voor groep 7.`,
    'Niveau: eenvoudige schaalberekeningen met kaarten, plattegronden en modellen.',
    'Gebruik schalen zoals 1:10, 1:100, 1:1.000 en 1:10.000 met overzichtelijke getallen.',
    'Wissel opdrachten af tussen werkelijke afstand, afstand op de kaart en schaal bepalen.',
    'Vermijd ingewikkelde eenheidsconversies en meerdere rekenstappen.',
    'Geef alleen JSON terug in deze vorm: {"questions":["1. ...","2. ..."]}.',
  ].join(' ')
}
