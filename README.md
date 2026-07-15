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

Vul in `.env.local` minimaal `OPENAI_API_KEY` in. `OPENAI_MODEL` is optioneel en staat standaard op `gpt-5.5`. Met `WORKSHEET_RATE_LIMIT` kun je de standaardlimiet van 20 AI-aanvragen per IP per minuut aanpassen.

## Controles

```sh
npm run lint
npm test
npm run test:e2e
npm run build
```

De Playwright-tests starten een geïsoleerde lokale server zonder OpenAI-sleutel en veroorzaken dus geen API-kosten.

GitHub Actions voert bij iedere pull request lint, unit/API/PDF-tests, de productiebuild en de browsertests uit. Merges naar `master` worden opnieuw gecontroleerd.

## Deployen naar Vercel

Vercel is de aanbevolen host voor dit project. De Vite-frontend wordt statisch gepubliceerd en [`api/worksheet.ts`](./api/worksheet.ts) wordt automatisch als Node.js Function uitgevoerd. De OpenAI-sleutel komt daardoor nooit in de browser terecht.

1. Push de repository naar een Git-provider.
2. Importeer de repository in Vercel.
3. Laat Framework Preset op `Vite`, Build Command op `npm run build` en Output Directory op `dist` staan.
4. Voeg bij Project Settings → Environment Variables toe:
   - `OPENAI_API_KEY`
   - `OPENAI_MODEL` (optioneel)
   - `WORKSHEET_RATE_LIMIT` (optioneel, standaard `20` per minuut)
   - `UPSTASH_REDIS_REST_URL` en `UPSTASH_REDIS_REST_TOKEN` (aanbevolen voor een gedeelde limiter)
5. Voeg de variabelen toe aan Production en desgewenst Preview.
6. Deploy en maak een testwerkblad.

Gebruik `/api/health` voor een externe uptimecheck. De worksheet-API geeft iedere response een `X-Request-ID` en `Server-Timing` mee en schrijft gestructureerde JSON-logs met status, duur, oefensoort en uitkomst. Er worden geen IP-adressen of gegenereerde opdrachten gelogd.

`vercel.json` stelt de maximale functieduur in op 60 seconden en laat client-side routes terugvallen op `index.html`.

De API bevat een limiet per IP en geeft bij overschrijding lokale standaardcontent terug. Met de twee Upstash-variabelen gebruikt iedere serverless instantie dezelfde atomische Redis-teller. Zonder deze variabelen valt de app terug op een teller per draaiende serverinstantie; dat is geschikt voor lokaal gebruik, maar niet als enige bescherming bij publiek productiegebruik. Maak voor productie een Upstash Redis-database aan en kopieer de REST-gegevens uit het databaseoverzicht naar Vercel.

Het gratis Hobby-plan is bedoeld voor persoonlijk, niet-commercieel gebruik. Gebruik voor een professionele of commerciële publicatie het Pro-plan en stel in Vercel een passend uitgavenbudget en waarschuwingen in.
