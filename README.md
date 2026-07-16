# Werkbladen Generator

Vue/Vite-app voor het maken van Nederlandse basisschoolwerkbladen en werkboekjes als PDF. De opdrachten worden via OpenAI gegenereerd; als de generator niet beschikbaar is, maakt de browser een lokale standaardversie.

Broncode en automatische controles staan in [Christianlangelaar/werkbladen-generator](https://github.com/Christianlangelaar/werkbladen-generator).

## Lokaal ontwikkelen

Dit project gebruikt Node `24.13.0` via nvm.

```sh
nvm use
npm install
cp .env.example .env.local
npm run dev
```

Vul in `.env.local` minimaal `OPENAI_API_KEY` in. `OPENAI_MODEL` is optioneel en staat standaard op `gpt-5.5`. Met `WORKSHEET_RATE_LIMIT` kun je de standaardlimiet van 20 AI-aanvragen per IP per minuut aanpassen.

OpenAI-aanvragen hebben een time-out van 45 seconden, maximaal één retry en standaard maximaal 4.000 outputtokens. Pas die laatste grens alleen indien nodig aan met `OPENAI_MAX_OUTPUT_TOKENS` (toegestaan: 256–8.000).

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

Het productieproject is gekoppeld aan de GitHub-branch `main`: iedere push wordt automatisch gebouwd en na een geslaagde build uitgerold naar [werkbladen-generator.vercel.app](https://werkbladen-generator.vercel.app). GitHub Actions controleert dezelfde commit onafhankelijk met unit-, API-, build- en browsertests.

1. Push de repository naar een Git-provider.
2. Importeer de repository in Vercel.
3. Laat Framework Preset op `Vite`, Build Command op `npm run build` en Output Directory op `dist` staan.
4. Voeg bij Project Settings → Environment Variables toe:
   - `OPENAI_API_KEY`
   - `OPENAI_MODEL` (optioneel)
   - `OPENAI_MAX_OUTPUT_TOKENS` (optioneel, standaard `4000`)
   - `WORKSHEET_RATE_LIMIT` (optioneel, standaard `20` per minuut)
   - `UPSTASH_REDIS_REST_URL` en `UPSTASH_REDIS_REST_TOKEN` (aanbevolen voor een gedeelde limiter)
   - `OPENAI_INPUT_COST_PER_MILLION_USD` en `OPENAI_OUTPUT_COST_PER_MILLION_USD` (optioneel, voor kostenramingen in logs)
   - `VITE_SITE_URL` (de publieke URL, voor canonical- en socialmetadata)
   - `VITE_POSTHOG_KEY` (optioneel; de Project API Key uit PostHog, activeert de toestemmingsvraag)
   - `VITE_POSTHOG_HOST` (optioneel; standaard `https://eu.i.posthog.com`, pas aan voor de regio van het PostHog-project)
5. Voeg de variabelen toe aan Production en desgewenst Preview.
6. Deploy en maak een testwerkblad.

Controleer na iedere productie-uitrol de publieke pagina, healthcheck, privacytekst en social preview met:

```sh
npm run smoke -- https://jouw-domein.nl
```

De workflow `Production smoke test` voert deze controle iedere 30 minuten uit tegen de productie-URL en kan ook handmatig tegen een andere publieke URL worden gestart. Iedere aanvraag heeft een time-out van 10 seconden. De readiness-check verifieert daarnaast dat OpenAI is geconfigureerd. Bij een mislukte productiecontrole opent GitHub automatisch één incidentissue; zodra de controle herstelt, wordt dit issue met een herstelmelding gesloten. De wekelijkse inhoudsevaluatie gebruikt hetzelfde mechanisme voor kwaliteitsincidenten.

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

Feedback op een losse AI-opdracht wordt als `worksheet_feedback` gelogd met alleen request-ID, groep, oefensoort, opdrachtnummer en een vaste probleemcategorie. De vraag, het antwoord, vrije tekst en het IP-adres worden niet gelogd.

### Clientanalytics

`src/services/analytics.ts` is de centrale, getypeerde analyticslaag. Zonder toestemming of ingestelde provider is deze volledig no-op. `src/services/posthogAnalytics.ts` koppelt PostHog pas na expliciete toestemming; fouten of ontbrekende configuratie vallen terug op no-op en hebben geen invloed op genereren of downloaden.

De MVP-events en properties zijn:

- `generation_started`: `outputType`, `group`, `exercises`, `theme`;
- `generation_succeeded`: dezelfde properties plus `source`;
- `generation_failed`: dezelfde basisproperties plus de vaste `errorCategory` `generation_error`;
- `pdf_downloaded`: dezelfde basisproperties plus `source`.

`outputType` is `worksheet` of `workbook`; `exercises` bevat uitsluitend gekozen vaste vak-/oefensoortcodes en `theme` uitsluitend een vaste themakeuze of `null`. Namen, e-mailadressen, prompts, gegenereerde opdrachten, antwoorden, vrije invoer, foutmeldingen en leerlinggegevens worden niet gevolgd. Autocapture, pageviews, sessie-opnames, foutregistratie, performancecapture, externe SDK-uitbreidingen, feature flags en persoonsprofielen staan uit. Events zetten bovendien `$ip` expliciet op `null`.

Stel de PostHog Project API Key in als `VITE_POSTHOG_KEY` in `.env.local` voor lokaal gebruik en in de Vercel Environment Variables voor productie. Gebruik de publieke Project API Key, niet een persoonlijke API-key. Zet `VITE_POSTHOG_HOST` op de ingestion-host van dezelfde PostHog-regio. Zonder project key verschijnt geen toestemmingsvraag en blijft analytics no-op.

Stel daarnaast een Vercel-uitgavenwaarschuwing en een externe uptimecheck op `/api/health` in. De actuele modeltarieven wijzigen regelmatig; vul ze daarom via omgevingsvariabelen in en leg ze niet vast in de code.

Controleer vóór verdere publieke bekendmaking in Vercel, OpenAI en eventueel Upstash welke bewaartermijnen en verwerkersvoorwaarden voor het gekozen account gelden.

`vercel.json` stelt de maximale functieduur in op 60 seconden en laat client-side routes terugvallen op `index.html`.

De API bevat een limiet per IP en geeft bij overschrijding lokale standaardcontent terug. Met de twee Upstash-variabelen gebruikt iedere serverless instantie dezelfde atomische Redis-teller. Zonder deze variabelen valt de app terug op een teller per draaiende serverinstantie; dat is geschikt voor lokaal gebruik, maar niet als enige bescherming bij publiek productiegebruik. Maak voor productie een Upstash Redis-database aan en kopieer de REST-gegevens uit het databaseoverzicht naar Vercel.

Het gratis Hobby-plan is bedoeld voor persoonlijk, niet-commercieel gebruik. Gebruik voor een professionele of commerciële publicatie het Pro-plan en stel in Vercel een passend uitgavenbudget en waarschuwingen in.
