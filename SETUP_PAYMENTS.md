# Betalingen instellen

1. Maak in Stripe testmodus één eenmalige Price voor een creditbundel.
2. Zet `STRIPE_SECRET_KEY` op de server-side testkey (`sk_test_…`).
3. Zet `STRIPE_CREDIT_BUNDLE_PRICE_ID` op de Price ID (`price_…`).
4. Zet `STRIPE_CREDIT_BUNDLE_CREDITS` op het aantal credits in de bundel.
5. Zet `STRIPE_WEBHOOK_SECRET` op het geheim van webhook `/api/stripe-webhook`.
6. Zet `APP_URL` op de publieke HTTPS-URL; Checkout toont Apple Pay automatisch waar beschikbaar.
7. Configureer `WORKSHEET_CREDIT_COST` en `WORKBOOK_CREDIT_COST` als positieve gehele aantallen.
8. Houd `PAYMENTS_DEV_BYPASS=true` uitsluitend lokaal; zet deze nooit in productie.
9. Zet pas na een geslaagde testbetaling `PAYMENTS_ENABLED=true`; zonder deze vlag blijft bestaand gratis gebruik werken.
10. Gebruik voor StoreKit 2 dezelfde account-ID en `fulfillPurchase` met provider `app_store`.
