# VALORANT Shop Live

A fresh Vercel-ready VALORANT shop tracker.

- No Riot password or session-token collection.
- Pulls the current shared VALORANT store rotation from itemshop.gg server-side.
- Shows current featured bundles and the cosmetics inside them.
- Search and wishlist state are stored locally in the browser.
- Uses a short cache to avoid hammering the upstream source.

## Deploy to Vercel

Import `xtofuub/tofuub` into Vercel and deploy the repository root. No build command is required.

## Important limitation

Riot currently documents online store tracking as an unapproved VALORANT API use case and does not expose a public API for a player's personalized daily offers. This project therefore tracks the shared/featured store rotation rather than pretending it is a user's private shop.

Data source: https://itemshop.gg/valorant
