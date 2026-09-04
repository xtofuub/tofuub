# ValoShopTracker

Unofficial VALORANT personal-shop viewer designed for Vercel.

## Login flow

1. Click **Open Riot Login**.
2. Riot handles the authentication in its own page.
3. Riot redirects to `http://localhost/redirect#...`.
4. Copy the full URL from the browser address bar and paste it into ValoShopTracker.
5. The backend extracts the short-lived access/id tokens, requests an entitlements token and region from Riot, and creates an encrypted short-lived ValoShopTracker session.
6. The `/api/shop` endpoint uses that authenticated session to request the player's personal daily storefront.

Users never enter their Riot password into this app.

## Vercel environment variable

Set:

- `SESSION_SECRET` — long random secret used to encrypt application sessions.

Generate one with:

```bash
openssl rand -hex 32
```

## Important

This is an unofficial integration using Riot authentication/client and VALORANT storefront endpoints rather than an approved public store API. Riot may change or block these endpoints at any time.

The implementation is based on the architecture used by SkinPeek and the newer Valorant Shop Checker project, but the code in this repository is independently implemented.
