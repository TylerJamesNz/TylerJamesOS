# Tyler James OS — Claude Code Rules

## Project structure

- `_project/` — planning and documentation only (markdown). Never deployed.
- `app/` — all deployable code. GitHub Actions will target this directory. The living brand kit runs as a **Vite + React** app (`app/package.json`, `npm run dev`); colour presets live in `app/src/themes/palettes.ts`. A static HTML snapshot remains at `app/brand-kit.html` (no theme helper). Production build outputs to `app/dist/`.

## Git workflow

**Commits**
- After finishing a coherent set of edits (feature, fix, or restore), create a git commit with a clear, accurate message — unless the user says not to.
- Split unrelated changes into separate commits. Don't bundle everything into one.
- If the request is exploratory or the user says "don't commit," respect that.

**Pushing**
- Never run `git push` unless the user explicitly asks to push, publish, or deploy.
- "Save" does not mean push. Local commits are enough until a push is requested.
- Never force-push unless explicitly asked.

**Branching**
- Work on the branch the user specifies. Don't push new branches or open PRs unless asked.

**Before pushing**
- When the user says "push", "push it", "push that up", or anything that clearly means publish to remote — treat that as the trigger to squash first, then push.
- Squash all local commits since `origin/main` into a single commit using `git rebase -i origin/main`.
- Write a summary commit message that covers everything that changed across those commits — what was tried, what was kept, and the final outcome.
- Never push a messy string of "WIP" or checkpoint commits to the remote.

**After pushing to `main`**
- Use `gh` (GitHub CLI) to watch the active deploy workflow and report progress.
- Summarise outcome — success or failure — with next steps.
- Workflow is `.github/workflows/deploy.yml` (name: `Deploy to Vercel`). Watch it with `gh run watch` after every push to main.

## Code standards

Before writing or updating any code — components, functions, or CSS rules — read the relevant project docs:

- **`_project/coding-principles.md`** — always. Apply these standards to every code change.
- **`_project/brand-kit.md`** and **`app/brand-kit.html`** — for any UI, CSS, or visual work. Use the existing tokens, colour variables, type scale, spacing scale, and component patterns. Never hardcode values that have a token.
- **`_project/data-model.md`** — for any new data structures, schemas, or functions that read/write data. Align with the existing entities and relationships.

If a change would require deviating from these docs, flag it to the user before proceeding.

## Docs

When AI instructions change, update both `CLAUDE.md` and the relevant section of `README.md` in the same commit.
