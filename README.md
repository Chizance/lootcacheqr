# 📦 LootcacheQR

A personal PWA for tracking what's in your storage bins. It's installable to your phone's home screen, searchable, backed by QR-coded stickers on each physical bin.

- **Multi-device sync** - you and one other person can view and edit from your phones in real time (Supabase).
- **Search** - find an item by keyword and see which bin and location it's in.
- **Nested locations** - define your own hierarchy (e.g. `Backyard > Shelf A > Bottom Row`).
- **QR codes** - every bin gets one automatically; scan it to jump straight to that bin's record.
- **Reusable bins** - empty a bin's contents while keeping the same sticker for next season.
- **Optional Claude-powered photo scan** - snap a photo of an open box and get a draft item list to review and edit.

## Docs

- [docs/SETUP.md](./docs/SETUP.md) - full setup walkthrough: Supabase, GitHub Pages, everything
- [docs/CLAUDE_API_KEY.md](./docs/CLAUDE_API_KEY.md) - configuring your Anthropic API key securely
- [docs/QR_CODES.md](./docs/QR_CODES.md) - generating and printing bin QR codes
- [docs/GIT_WORKFLOW.md](./docs/GIT_WORKFLOW.md) - commit/push basics for this repo

## Tech stack

- **Frontend:** React + TypeScript + Vite, deployed as a static PWA to GitHub Pages
- **Backend:** Supabase (Postgres + Auth + Storage + Realtime + one Edge Function)
- **AI:** Claude Sonnet 5 via a Supabase Edge Function (key never touches the browser)

## Local development

```
npm install
cp .env.example .env   # then fill in your Supabase URL + anon key
npm run dev
```

See [docs/SETUP.md](./docs/SETUP.md) if you haven't created your Supabase project yet.

## Deploying

Pushing to `main` triggers an automatic build + deploy via GitHub Actions (see `.github/workflows/deploy.yml`). Live at:

```
https://chizance.github.io/lootcacheqr/
```
