# Reference App Audit: Seoul Building Explorer

Reference app:
- https://hanbyul-here.github.io/seoul-building-explorer/
- Repo: https://github.com/hanbyul-here/seoul-building-explorer

## What the reference app is

The reference app is a map of Seoul building approval ages. It is not a dashboard in the modern React sense. It is a thin Leaflet/Tangram client over pre-generated static GeoJSON tiles.

Its core interaction model is:
- zoomed out: aggregate by `dong` polygons
- mid zoom: render building centroids
- zoomed in: render full building polygons with extrusion
- click: show tooltip with building metadata
- side legend: filter by decade

## Frontend stack

The deployed HTML is very small and loads:
- `Leaflet` via `Mapzen.js`
- `Tangram` scene files for rendering
- `chroma.js`
- a tiny custom JS layer for UI and tooltips

Main page shell:
- `index.html`
- `js/main.js`
- `assets/date.yaml`

The key technical choice is Tangram scene logic in YAML instead of React component state.

## Data sources used by the reference app

### 1. Building age explorer

Raw source, per README:
- NSDI / National Spatial Data Infrastructure Portal
- link used in the app attribution:
  `http://openapi.nsdi.go.kr/nsdi/eios/ServiceDetail.do?svcSe=F&svcId=F010`

The Mapzen article and README state:
- the original building data was a shapefile
- it contained more than 700,000 Seoul buildings
- it included shape, height, neighborhood, and approval date

### 2. Neighborhood aggregation

The app also ships a local GeoJSON file:
- `assets/final-dong.geojson`

This contains aggregated neighborhood-level statistics.

Observed properties:
- `en_name`
- `kr_name`
- `average`
- `numberWData`
- `numberWOdata`

This layer is used at lower zoom levels.

## How the data was prepared

From the repo README and Mapzen article:

1. Original shapefile was opened in QGIS.
2. Encoding was fixed from `euc-kr` to `utf-8`.
3. Projection was corrected and exported to GeoJSON.
4. The full GeoJSON was over 300 MB, so it was tiled.
5. Static GeoJSON tiles were generated with `TileStache`.
6. Tiles were hosted on S3.
7. Building centroids were generated for mid zoom.
8. Building ages were aggregated to `dong` polygons with a simple Node script.

This is an old but still clean pattern:
- preprocess everything offline
- serve static tiles
- keep the browser client thin

## Tile endpoints used by the app

### Full building polygons

The age explorer uses three separate S3 tile sets, split by approval-year groups:

- `https://s3.amazonaws.com/odd-tiles/final-gz-2345/{z}/{x}/{y}.geojson`
- `https://s3.amazonaws.com/odd-tiles/final-gz-678/{z}/{x}/{y}.geojson`
- `https://s3.amazonaws.com/odd-tiles/final-gz-901/{z}/{x}/{y}.geojson`

There is also:
- `https://s3.amazonaws.com/odd-tiles/final-buildings-null/{z}/{x}/{y}.geojson`

Observed polygon properties in these tiles:
- `h`
- `dongCode`
- `year`
- `address`
- `dongName`

Example:
```json
{
  "h": 0.0,
  "dongCode": "1111011600",
  "year": "19540301",
  "address": "150-1",
  "dongName": "서울특별시 종로구 도렴동"
}
```

### Mid-zoom centroids

The app swaps to centroids at lower zoom using:

- `https://s3.amazonaws.com/odd-tiles/final-centroid-gz-2345/{z}/{x}/{y}.geojson`
- `https://s3.amazonaws.com/odd-tiles/final-centroid-gz-678/{z}/{x}/{y}.geojson`
- `https://s3.amazonaws.com/odd-tiles/final-centroid-gz-901/{z}/{x}/{y}.geojson`

Observed centroid properties:
- `year`

### Detailed building explorer

The repo also contains a second scene:
- `assets/detailed-building.yaml`
- `js/detailed-building.js`

This uses:
- `https://s3.amazonaws.com/odd-tiles/detailed-buildings/{z}/{x}/{y}.geojson`

This more detailed dataset exposes many coded NSDI attributes:
- `A13` approval date
- `A14` floor area
- `A15` land area
- `A16` height
- `A17` coverage ratio
- `A18` floor area ratio
- plus building use / structure / district codes

This scene is a property explorer, not just an age explorer.

## Rendering logic

The important logic lives in `assets/date.yaml`.

Observed scene behavior:
- import base map style from Nextzen / Mapzen
- define global filter function inside Tangram scene
- color buildings by decade using a fixed viridis palette
- extrude buildings only above zoom 16
- hide full polygons at lower zoom and switch to centroids
- use dong polygons at the lowest active zoom band

So the visual continuity is driven by:
- one metric
- three geometry representations
- one stable color system

This is the strongest idea in the project.

## UI model

The UI is deliberately small:
- title + short description
- decade color blocks
- reset button
- click tooltip
- geocoder

It avoids a big side dashboard. The map stays primary.

## What is good for our project

These ideas are worth reusing:

1. `One metric, multiple geometry representations`
   - same story persists across zoom

2. `Thin interface`
   - no heavy side panel by default

3. `Offline preprocessing, lightweight client`
   - the browser only consumes prepared tiles

4. `Stable palette and limited controls`
   - the map remains legible

5. `Context-aware zoom transitions`
   - polygon -> centroid -> aggregate is still a strong pattern

## What we should not copy directly

These parts are outdated for our use case:

1. `Mapzen / Tangram stack`
   - Mapzen is gone
   - Nextzen/Tangram-style scenes are still possible, but this exact stack is legacy

2. `Raw S3 GeoJSON tiles as the final architecture`
   - workable, but not ideal for a modern portfolio app
   - PMTiles or vector tiles would be cleaner

3. `Click-only tooltip workflow`
   - we want richer hover / lens interaction

4. `Age-only single-variable story`
   - our app should support richer urban-form or change-related layers

## How this maps onto our current project

Our current local project already differs in an important way:

- reference app data: building age tiles from old NSDI workflow
- our data: `Korea Building Footprints v2` live/derived data, downloaded locally

Current local source:
- `little_fan_project/data/raw/seoul_buildings_v2_4326.parquet`

Observed current fields in our raw data:
- `building_id`
- `building_name`
- `buld_nm_dc`
- `buld_se_cd`
- `bdtyp_cd`
- `gro_flo_co`
- `und_flo_co`
- `sig_cd`
- `emd_cd`
- `li_cd`
- `rn_cd`
- `street_name`
- `house_number`
- `lot_number`
- `bsi_zon_no`
- `Shape__Area`
- `Shape__Length`
- `geometry`

This means our dataset is stronger for:
- present-day building geometry
- floor-based urban form
- footprint-based analysis
- possible future joins with external metadata

It is weaker for now in:
- historical age / time metadata
- explicit change labels
- before/after imagery

## Practical conclusion

For our little project, the correct lesson from the reference app is:

- copy the `map-first`, `thin UI`, and `zoom-sensitive representation` ideas
- do not copy the old Leaflet/Mapzen/Tangram architecture literally

Our likely modern path should be:

1. preprocess Seoul/Gangnam building data offline
2. generate lightweight map-ready tiles or shards
3. keep the browser app thin
4. use one strong visual variable at a time
5. add richer interaction only after the visual grammar is correct

## Immediate design implication for us

If we continue the MVP, the strongest adaptation is:

- flat vector or restrained 3D base
- one clear metric mode at a time
- hover/lens-driven local summary
- optional building detail on demand
- later, attach UrbanCDNet-derived change metadata as a second story layer
