export function groep8VerhoudingenPrompt(amount: number) {
  return [
    `Maak ${amount} korte verhoudingsopdrachten voor groep 8.`,
    'Niveau: verhoudingstabellen, recepten, schaal, snelheid, prijs per stuk en deel-geheelverhoudingen.',
    'Gebruik realistische contexten met overzichtelijke getallen.',
    'Vraag steeds om precies 1 ontbrekend getal of 1 korte conclusie.',
    'Vermijd te ingewikkelde eenheidsconversies en meer dan drie rekenstappen.',
    'Geef alleen JSON terug in deze vorm: {"questions":["1. ...","2. ..."]}.',
  ].join(' ')
}
