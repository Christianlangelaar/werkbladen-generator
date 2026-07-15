# Werkbladen Generator

Vue/Vite-app voor het maken van Nederlandse basisschoolwerkbladen en werkboekjes als PDF. De opdrachten worden via OpenAI gegenereerd; als de generator niet beschikbaar is, maakt de browser een lokale standaardversie.

## Lokaal ontwikkelen

Dit project gebruikt Node `24.13.0` via nvm.

```sh
nvm use
npm install
cp .env.example .env.local
npm run dev
```

Vul in `.env.local` minimaal `OPENAI_API_KEY` in. `OPENAI_MODEL` is optioneel en staat standaard op `gpt-5.5`.

## Controles

```sh
npm run lint
npm test
npm run test:e2e
npm run build
```

De Playwright-tests starten een geïsoleerde lokale server zonder OpenAI-sleutel en veroorzaken dus geen API-kosten.

## Deployen naar Vercel

Vercel is de aanbevolen host voor dit project. De Vite-frontend wordt statisch gepubliceerd en [`api/worksheet.ts`](./api/worksheet.ts) wordt automatisch als Node.js Function uitgevoerd. De OpenAI-sleutel komt daardoor nooit in de browser terecht.

1. Push de repository naar een Git-provider.
2. Importeer de repository in Vercel.
3. Laat Framework Preset op `Vite`, Build Command op `npm run build` en Output Directory op `dist` staan.
4. Voeg bij Project Settings → Environment Variables toe:
   - `OPENAI_API_KEY`
   - `OPENAI_MODEL` (optioneel)
5. Voeg de variabelen toe aan Production en desgewenst Preview.
6. Deploy en maak een testwerkblad.

`vercel.json` stelt de maximale functieduur in op 60 seconden en laat client-side routes terugvallen op `index.html`.

Het gratis Hobby-plan is bedoeld voor persoonlijk, niet-commercieel gebruik. Gebruik voor een professionele of commerciële publicatie het Pro-plan en stel in Vercel een passend uitgavenbudget en waarschuwingen in.
