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
   - `OPENAI_INPUT_COST_PER_MILLION_USD` en `OPENAI_OUTPUT_COST_PER_MILLION_USD` (optioneel, voor kostenramingen in logs)
   - `VITE_SITE_URL` (de publieke URL, voor canonical- en socialmetadata)
5. Voeg de variabelen toe aan Production en desgewenst Preview.
6. Deploy en maak een testwerkblad.

Controleer na iedere productie-uitrol de publieke pagina, healthcheck, privacytekst en social preview met:

```sh
npm run smoke -- https://jouw-domein.nl
```

De workflow `Production smoke test` voert deze controle iedere 30 minuten uit tegen de productie-URL en kan ook handmatig tegen een andere publieke URL worden gestart. Iedere aanvraag heeft een time-out van 10 seconden. Schakel in GitHub bij Settings → Notifications meldingen voor mislukte Actions-workflows in, zodat een storing niet alleen in het workflowoverzicht zichtbaar is.

## Inhoudsevaluatie

De productie-inhoud kan handmatig worden gecontroleerd met zes representatieve AI-aanvragen voor groep 3 tot en met 8:

```sh
npm run evaluate:content
```

De controle valideert bron, aantallen, nummering, variatie, bruikbare antwoorden, kwaliteitsfallbacks en ongewenste inhoud zonder de gegenereerde vragen en antwoorden in CI-logs te schrijven. De GitHub Actions-workflow `Content evaluation` draait dit wekelijks en kan ook handmatig tegen een andere publieke URL worden gestart. Groep 1 en 2 zijn niet opgenomen omdat die werkbladen lokaal en deterministisch worden opgebouwd.

Gebruik `/api/health` voor een externe uptimecheck. De worksheet-API geeft iedere response een `X-Request-ID` en `Server-Timing` mee en schrijft gestructureerde JSON-logs met status, duur, oefensoort en uitkomst. Er worden geen IP-adressen of gegenereerde opdrachten gelogd.

### Productiemonitoring

De gestructureerde `worksheet_request`-logs bevatten geen vragen, antwoorden of IP-adressen. Ze bevatten wel `outcome`, `status`, `durationMs`, tokengebruik, het aantal vervangen kwaliteitsitems en — als de twee kostentarieven zijn ingesteld — `estimatedCostUsd`. Maak in Vercel Observability opgeslagen zoekopdrachten of grafieken voor:

- foutpercentage: `outcome` is `generation_error` of `invalid_request`;
- fallbackpercentage: alle uitkomsten behalve `openai`, plus `qualityFallbackItems > 0`;
- latency: p50/p95 van `durationMs`;
- AI-verbruik: som van `totalTokens` en `estimatedCostUsd`.

Stel daarnaast een Vercel-uitgavenwaarschuwing en een externe uptimecheck op `/api/health` in. De actuele modeltarieven wijzigen regelmatig; vul ze daarom via omgevingsvariabelen in en leg ze niet vast in de code.

Controleer vóór verdere publieke bekendmaking in Vercel, OpenAI en eventueel Upstash welke bewaartermijnen en verwerkersvoorwaarden voor het gekozen account gelden.

`vercel.json` stelt de maximale functieduur in op 60 seconden en laat client-side routes terugvallen op `index.html`.

De API bevat een limiet per IP en geeft bij overschrijding lokale standaardcontent terug. Met de twee Upstash-variabelen gebruikt iedere serverless instantie dezelfde atomische Redis-teller. Zonder deze variabelen valt de app terug op een teller per draaiende serverinstantie; dat is geschikt voor lokaal gebruik, maar niet als enige bescherming bij publiek productiegebruik. Maak voor productie een Upstash Redis-database aan en kopieer de REST-gegevens uit het databaseoverzicht naar Vercel.

Het gratis Hobby-plan is bedoeld voor persoonlijk, niet-commercieel gebruik. Gebruik voor een professionele of commerciële publicatie het Pro-plan en stel in Vercel een passend uitgavenbudget en waarschuwingen in.
