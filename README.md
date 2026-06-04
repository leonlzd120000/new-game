# new-game

GitHub Pages is GitHub's static site hosting service. For this repository, the project site URL is:

`https://leonlzd120000.github.io/new-game/`

## GitHub Pages setup

- `vite.config.ts` now computes the Pages `base` path from the repository name instead of hardcoding the old `/game/` path.
- `.github/workflows/deploy-pages.yml` builds the app on every push to `main` and deploys `dist/client` to GitHub Pages.
- `npm run build:pages` lets you test a Pages-style build locally.

## Enable it on GitHub

1. Open the `new-game` repository on GitHub.
2. Go to `Settings` -> `Pages`.
3. Set `Source` to `GitHub Actions`.
4. Push to `main` or manually run the `Deploy GitHub Pages` workflow.
