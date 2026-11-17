Documentation K-pay : https://kpay.site/documentation

PApplication
Update your application settings and configuration.

Complete setup to use the production API
The production API is blocked for the applications below until their domain is verified and a valid callback is configured. Existing API keys are also affected.

Restio
Website domain not verified.

This application's website: restio-app.nerix.site. Verifying another website does not automatically verify this one.

Verify domain
Build the callback from your website and the path supported by your integration, such as /api/kpay/webhook. Access is restored automatically once setup is complete. Test mode remains available.

Edited by : VLADIMIR DJIEDEU (vladimirdjiedeu@gmail.com)
Application website
Start with the address of the website or web app that integrates KPAY-NOW: your callback endpoints are built on it.
https://restio.nerix.site
Its domain is added to your account; verify it before generating production keys.

New domain: restio.nerix.site will be added to your account, to verify before production
Callback URLs (Webhooks)
Only enter the path: the full address is built on restio.nerix.site.

Suggested paths

I'm working locally (ngrok, tunnel…)
Sandbox only: your callback and card payment URLs can point to a tunnel (ngrok…) instead of your site. Not allowed in Live: when you switch to production, these URLs will be cleared and this box unticked.
https://restio.nerix.site
/api/kpay/webhook
Receives all event types if specific URLs are not set.

https://restio.nerix.site
/api/kpay/deposits
Receives deposit (payment in) notifications.

https://restio.nerix.site
/api/kpay/payouts
Receives payout (payment out) notifications.

https://restio.nerix.site
/api/kpay/refunds
Receives refund notifications.

Basic Information
General information about your application.
Restio
App de gestion de commande.

Choose an activity

Commerce and retail
App Restio
Nom légal de l’entreprise ou de l’activité associée à cette application.

Logo
Upload a logo for your application.
Logo de l'application
Change logo
Remove
JPEG, PNG, WebP ou SVG — 8 Mo maximum.

Mobile Money payments
Accepted countries and operators, then how your customers confirm the payment.
Search a country...
Deselect all
Your country : Cameroun. Change in my profile

12 countries selected (23 operators)

TopOf K-Remittances

You collect in 12 countries

Your customers pay from each of these countries, no plan needed.

🇨🇲
🇧🇯
🇨🇬
🇨🇮
🇬🇦
🇨🇩
🇸🇳
+5
1
Collection open everywhere

Every selected country accepts Mobile Money payments as soon as you save, free of charge.

2
One wallet per country

Each country has its own balance, in its currency, shown on its card in your application.

3
Withdraw with TopOf

To withdraw from a foreign country: TopOf plan, then a request processed by K-PAY to Cameroun.

Outside your region: Kenya, Ouganda, Rwanda, Sierra Leone, Zambie. Repatriation possible, handled case by case by K-PAY.

Sandbox: all tests are open. In Live, foreign wallet withdrawals go through a TopOf request.

Your region

Recommended countries: funds are repatriated to your home country through proven TopOf routes.


🇨🇲
Cameroun
Your country
+237
XAF
MTN
Orange

🇧🇯
Bénin
Recommended
+229
XOF
MTN
Moov

🇨🇬
Congo
Recommended
+242
XAF
Airtel
MTN

🇨🇮
Côte d'Ivoire
Recommended
+225
XOF
MTN
Orange

🇬🇦
Gabon
Recommended
+241
XAF
Airtel

🇨🇩
RD Congo
Recommended
+243
CDF
Vodacom M-Pesa
Airtel
Orange

🇸🇳
Sénégal
Recommended
+221
XOF
Free
Orange
All other countries

Also open for collection. Repatriation of these funds is handled case by case by K-PAY.


🇰🇪
Kenya
+254
KES
M-Pesa

🇺🇬
Ouganda
+256
UGX
Airtel
MTN

🇷🇼
Rwanda
+250
RWF
Airtel
MTN

🇸🇱
Sierra Leone
+232
SLE
Orange

🇿🇲
Zambie
+260
ZMW
Airtel
MTN
Zamtel

USSD - Customer dials a code

USSD - Customer dials a code
USSD: the customer dials a code on their phone. Gateway: the customer is redirected to a payment page.

Bank payments
Card collection in international currencies, with its own return URLs.

Visa
Visa
From 300 XAF

Mastercard
Mastercard
From 300 XAF
Customers enter their card or PayPal details on a secure payment page. No card data passes through your site. Whatever you tick here is what your customers will see at checkout.

Enter only the path: the full address is built on restio.nerix.site, like the callbacks.

Suggested paths
https://restio.nerix.site
/paiement/retour
Page the customer is redirected to after paying. No notification is sent here.

https://restio.nerix.site
/api/kpay/cards
Called on every card payment status change. Leave empty to use the general callback URL.

Webhook Secret
Sign webhooks with the X-KPAY-Signature header to verify authenticity.