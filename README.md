# The Strata of Seoul

`The Strata of Seoul` is a MapLibre-based web app that renders Seoul as stacked building-age layers instead of a flat plan view.

<p>
  <a href="https://rashiedomar.github.io/strata-of-seoul/">
    <img src="https://img.shields.io/badge/See%20the%20live%20page-here-0f172a?style=for-the-badge&logo=githubpages&logoColor=white" alt="See the live page here">
  </a>
</p>

## What the app does

- visualizes four age bands as separate vertical strata
- lets users isolate a single era or view the full stack
- uses hover to inspect the active footprint
- summarizes the visible building mix for the hovered neighborhood
- exposes a vertical spread control to change layer separation

## Stack

- `Vite`
- `MapLibre GL JS`
- plain `HTML`, `CSS`, and `JavaScript`

## Data

The runtime app uses public pre-generated Seoul building-age GeoJSON tiles and organizes them into the stacked-era view used by this project.

Tile groups used by this app:

- `final-gz-2345`
- `final-gz-678`
- `final-gz-901`
- `final-buildings-null`

Expected feature properties include:

- `h`
- `year`
- `address`
- `dongName`

This repository is intentionally the deployable frontend only. It does not include raw data exports or preprocessing workflows.

## Local development

Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

Create a production build:

```bash
npm run build
```

## Deployment

GitHub Pages deploys from `.github/workflows/deploy-pages.yml`.

Key deployment detail:

- `vite.config.js` sets `base: "/strata-of-seoul/"`

## Repo layout

- `index.html`: app shell
- `src/main.js`: map setup, tile loading, state, and hover behavior
- `src/style.css`: full visual styling
- `vite.config.js`: GitHub Pages base path
- `.github/workflows/deploy-pages.yml`: Pages build and deploy workflow

## Follow-up

If someone wants to continue this project, the main extension points are:

- swap the public tile source for a maintained dataset pipeline
- add richer building metadata or temporal filters
- tune performance by replacing client-side GeoJSON loading with a tiled or PMTiles workflow
