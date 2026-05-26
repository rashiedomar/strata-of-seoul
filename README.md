# The Strata of Seoul

`The Strata of Seoul` is a map-first experimental visualization of Seoul's architectural age structure.  
It treats building approval eras as stacked urban layers rather than as a single flat city surface.

The current version is an artistic-analytical prototype:
- **Bedrock**: early building stock
- **Mid-strata**: expansion-era stock
- **Upper shelf**: recent vertical growth
- **Phantoms**: records without registered approval age

Instead of reading the city only as 2D footprint geometry, the app renders Seoul as a vertical cross-section of time.

## Concept

The main visual move is simple:

1. split buildings into historical age buckets
2. place each bucket on a different vertical band
3. keep the original building extrusion height within that band
4. let the user isolate eras or read them together as stacked urban history

The result is not intended as a literal physical model of Seoul. It is an interpretive visualization of:
- architectural age
- urban accumulation
- neighborhood-level temporal layering

## Current interaction

- **Era Focus**: filter the scene to one historical layer or show all strata
- **Vertical spread**: increase or decrease the separation between eras
- **Hover slice**: hover a building to inspect:
  - neighborhood
  - era bucket
  - approval date
  - address
  - building height proxy
- **Neighborhood cross-section**: counts how many currently visible buildings in the same `dongName` belong to each era layer

## Data sources

### Primary rendered data

This prototype currently uses the public age-bucket building tiles from the reference Seoul Building Explorer project:

- Project: https://hanbyul-here.github.io/seoul-building-explorer/
- Repo: https://github.com/hanbyul-here/seoul-building-explorer

The original project is based on NSDI building records and pre-generated static GeoJSON tiles.

Rendered tile sources used here:
- `https://s3.amazonaws.com/odd-tiles/final-gz-2345/{z}/{x}/{y}.geojson`
- `https://s3.amazonaws.com/odd-tiles/final-gz-678/{z}/{x}/{y}.geojson`
- `https://s3.amazonaws.com/odd-tiles/final-gz-901/{z}/{x}/{y}.geojson`
- `https://s3.amazonaws.com/odd-tiles/final-buildings-null/{z}/{x}/{y}.geojson`

Observed per-feature properties include:
- `h`
- `year`
- `address`
- `dongName`

### Local data already prepared in this repo

This project directory also contains a separate locally downloaded Seoul building-footprint dataset:

- [data/raw/seoul_buildings_v2_4326.parquet](./data/raw/seoul_buildings_v2_4326.parquet)

That dataset is not the primary render source for the current age-stack scene. It remains available for later versions that may focus on:
- present-day geometry
- urban-form analysis
- or a future UrbanCDNet-linked change layer

## Why this version exists

This is not a thesis figure.  
It is a portfolio-oriented visualization experiment built around a strong spatial metaphor.

The goal of this version is to establish:
- a visual language
- a cleaner map-first interaction model
- a recognizable Seoul-focused concept

before introducing more complex layers such as:
- change predictions
- before/after imagery
- or building-level model outputs

## Technical notes

The current app is built with:
- `Vite`
- `MapLibre GL JS`
- remote static GeoJSON tile fetches

The browser app loads only the currently needed visible age tiles and merges them client-side by bucket.

## Run locally

From `little_fan_project/`:

```bash
npm install
npm run dev
```

Then open:

```text
http://localhost:4173/
```

Production build:

```bash
npm run build
```

## Files

- [index.html](./index.html): app shell
- [src/main.js](./src/main.js): rendering, tile loading, hover logic
- [src/style.css](./src/style.css): visual system
- [REFERENCE_APP_AUDIT.md](./REFERENCE_APP_AUDIT.md): reverse-engineering notes on the source project
- [DATASET_AUDIT.md](./DATASET_AUDIT.md): local Seoul building-footprint source notes
