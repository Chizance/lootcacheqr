# LootcacheQR

A free app for tracking what's in your storage bins. Runs on your phone like a real app, syncs across everyone in your household, and uses QR-coded stickers so you can scan any bin to jump straight to its contents.

- **Search** - find any item by keyword and see exactly which bin and shelf it's in.
- **QR codes** - stick one on each bin; scan it to open that bin instantly.
- **Nested locations** - organize by room, shelf, or whatever makes sense to you.
- **Shared inventory** - everyone with an account sees the same bins in real time.
- **Reusable bins** - clear a bin's contents for next season without reprinting anything.
- **Optional AI photo scan** - photograph an open box and get a draft item list to review.

---

## Get your own copy

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/chizance/lootcacheqr)

See [QUICKSTART.md](./QUICKSTART.md) for step-by-step instructions - no coding or installs required, takes about 20 minutes. The button above handles deployment once you've set up your Supabase database.

---

## Docs

- [QUICKSTART.md](./QUICKSTART.md) - start here, no experience needed
- [docs/SETUP.md](./docs/SETUP.md) - full reference and GitHub Pages alternative
- [docs/CLAUDE_API_KEY.md](./docs/CLAUDE_API_KEY.md) - optional AI photo scanning setup
- [docs/QR_CODES.md](./docs/QR_CODES.md) - how to print and use bin QR codes
- [docs/GIT_WORKFLOW.md](./docs/GIT_WORKFLOW.md) - for developers: commit and push basics

---

## For developers

```
npm install
cp .env.example .env   # fill in your Supabase URL and anon key
npm run dev
```

Stack: React + TypeScript + Vite, deployed to Netlify or GitHub Pages. Backend is Supabase (Postgres + Auth + Storage + Realtime). Optional AI feature uses Claude Sonnet via a Supabase Edge Function.

---

## Credits

Created by [chizance](https://github.com/chizance) - original repo at [github.com/chizance/lootcacheqr](https://github.com/chizance/lootcacheqr). MIT licensed - fork it, make it yours.
