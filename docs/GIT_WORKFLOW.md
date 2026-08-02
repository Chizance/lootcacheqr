# Git workflow (you're new to git — here's the short version)

You'll use the same 4 commands almost every time you want to save changes and have them show up on your live site.

## The everyday loop

After you've edited some files and tested them (`npm run dev`), run these from the project folder:

### 1. See what changed

```
git status
```

Shows which files you've edited, added, or deleted. Nothing is saved yet — this is just a look.

### 2. Stage the files you want to save

```
git add .
```

`.` means "everything I changed in this folder." This stages your changes — think of it as putting them in a box, ready to be committed. **`.gitignore` automatically excludes `.env`, `node_modules`, and build output**, so `git add .` is safe to use here; it won't stage your secrets even though it looks like it grabs everything.

If you ever want to double-check before committing, run `git status` again after `git add .` — it lists exactly which files are staged.

### 3. Commit (save a snapshot with a message)

```
git commit -m "Describe what you changed"
```

Example: `git commit -m "Add tag filtering to search"`. This creates a permanent checkpoint in your project's history, saved locally on your machine only — GitHub doesn't know about it yet.

### 4. Push (send it to GitHub)

```
git push
```

This uploads your commit(s) to GitHub. Once it's pushed, the GitHub Actions workflow automatically builds and redeploys your site — check the **Actions** tab on GitHub to watch it happen (usually done within a minute or two).

## Before your very first push

Since this is the first commit for this project, verify exactly what's about to be committed:

```
git status
```

Read through the list. You should **not** see `.env` anywhere in it (only `.env.example` is expected). If you do see `.env` listed, stop and tell me — it means something is wrong with `.gitignore` and we should fix it before proceeding, not push anyway.

Then:
```
git add .
git commit -m "Initial commit: Storage Inventory app"
git push
```

If `git push` says something like "no upstream branch," it'll usually suggest the exact fix, e.g.:
```
git push --set-upstream origin main
```
Copy-paste that suggested command — it's normal for a brand-new repo's first push.

## A few things worth knowing

- **You can't easily "un-push" a mistake.** Once something is pushed, treat it as public (even if the repo is private, assume it could become public later). This is exactly why we set up `.gitignore` before the first commit — so secrets are never in a position to be pushed by accident.
- **Commit messages are for future-you.** "fix bug" tells you nothing in six months; "Fix bins not showing after emptying" does.
- **Commit often.** Small, working checkpoints are easier to reason about than one giant commit at the end of a session.
- **`git pull` before you start editing on a different device.** If you ever edit this code from two computers, run `git pull` first on whichever machine you're about to use, so you're starting from the latest version.

## If something goes wrong

Paste me the exact error message from your terminal — git's errors are usually specific enough that I can tell you the exact next command to run.
