export function groep6VerhoudingenPrompt(amount: number) {
  return [
    `Maak ${amount} korte verhoudingsopdrachten voor groep 6.`,
    'Niveau: eenvoudige verhoudingstabellen, recepten, schaal en eerlijk verdelen.',
    'Gebruik herkenbare contexten met kleine, overzichtelijke getallen.',
    'Vraag steeds om precies 1 ontbrekend getal of 1 korte conclusie.',
    'Vermijd ingewikkelde schaalberekeningen, kommagetallen en meerdere rekenstappen.',
    'Geef alleen JSON terug in deze vorm: {"questions":["1. ...","2. ..."]}.',
  ].join(' ')
}
