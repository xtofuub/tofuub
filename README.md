# ValoShopTracker

Vercel-ready VALORANT shop tracker with Riot Sign On (RSO) account linking.

Riot's current VALORANT developer policy identifies online store tracking/updates as an unapproved API use case and says the technology for a player's personalized daily shop does not currently exist in the official API. This project therefore does not fabricate or scrape a private shop.

The project includes the official RSO OAuth login flow and server-side Riot account verification, plus the live shared/featured rotation.

## Vercel environment variables

Configure these for Riot login:

- `RSO_CLIENT_ID`
- `RSO_CLIENT_SECRET`
- `RSO_SESSION_SECRET` — long random secret
- `RSO_REDIRECT_URI` — `https://YOUR_DOMAIN/api/auth-callback`
- `APP_BASE_URL` — `https://YOUR_DOMAIN` (optional fallback)

RSO requires an approved Riot production application and RSO client. Riot credentials are entered only on Riot's own authorization page, never into this site.
