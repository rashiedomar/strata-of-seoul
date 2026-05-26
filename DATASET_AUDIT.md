# Seoul Urban Change Explorer - Dataset Audit

Date: 2026-05-18

## Goal

Select datasets that are technically realistic for a **3D, hover-first Seoul urban change explorer** with:

- building-level interaction
- optional before/after preview
- change metadata from model outputs
- strong portfolio presentation quality

The target product is **not** a thesis figure dashboard. It is a city-scale interactive visualization whose data model can later be connected to UrbanCDNet outputs.

---

## Decision Summary

### Use now

1. **Korea Building Footprints v2 (ArcGIS Feature Service)**
   - Use as the **main geometry layer**
   - Best current option for 3D buildings and hover interaction

### Use later / optional

2. **Korean national land cover map**
   - Use only as an **optional contextual layer**
   - Good for district or neighborhood context, not the main product layer

3. **National Land Satellite Center imagery**
   - Use only for **curated before/after image previews**
   - Not the best first-choice base layer for the web app

### Do not use as core product data

4. **NYU Seoul urban land cover raster (2000)**
   - Downloadable, but too old and too coarse for the intended product

---

## 1. Korea Building Footprints v2

### Source

- ArcGIS item:
  https://www.arcgis.com/home/item.html?id=b2c7a37bac8d4e40a85435b3f3d96d05
- Feature service:
  https://portal.esrikr.com/arcgis/rest/services/MOIS_KR_Buildings_v2/FeatureServer

### What it provides

- nationwide building footprint polygons
- public feature service
- KGD2002 / EPSG:5179-based geometry
- useful attributes including:
  - `BUILDING_ID`
  - `BUILDING_NAME`
  - `GRO_FLO_CO` (ground floors)
  - `UND_FLO_CO` (underground floors)
  - district and road-name fields

### Technical fit for our project

**Very good.**

This is the strongest source for the MVP because:

- the service is already live
- it supports polygon geometry
- it supports `JSON`, `GeoJSON`, and `PBF`
- it supports advanced queries
- it can be filtered by district code
- floor count can be converted into approximate 3D extrusion height

### Verified facts

- service type: `Feature Layer`
- geometry type: `esriGeometryPolygon`
- supported query formats: `JSON, geoJSON, PBF`
- max record count: `20,000,000`
- Seoul query works:
  - `sig_cd like '11%'`
  - returned count: `593625`
- Gangnam-gu sample query works:
  - `sig_cd = '11680'`

### Best use

- main 3D building layer
- hover target
- click target
- per-building metadata attachment

### Caution

The item license text explicitly states:

- intended for **online visualization and analysis**
- **not permitted** to export data for offline use outside Korea

### Practical interpretation

This is still usable for the project **if we treat it as a live service layer** rather than downloading and redistributing the whole dataset.

### Recommendation

**Adopt as the primary geometry source.**

Do not bulk-export the nationwide dataset into the repo.

Use live district queries or a limited derived layer for Korean-side development.

---

## 2. National Land Cover Map (Environment Spatial Information Service)

### Source

- Service landing page:
  https://aid.mcee.go.kr/intro/land.do

### What it provides

Official Korean land cover mapping with:

- large class: 7 classes
- medium class: 22 classes
- detailed class: 41 classes

The site states that the detailed map is:

- **1 m spatial resolution**
- **1:5,000 scale**
- suitable for local areas such as cities and districts

The page also states that final results are provided as:

- **PDF**
- **GIS SHP**

It also exposes:

- online data application
- map Open API / map service pathways

### Technical fit for our project

**Moderate, but not ideal as the main layer.**

This is useful if the story becomes:

- urban land-use change
- urban form context
- district classification context

It is **not** the best main layer for the product we described because:

- the interaction object should be buildings, not land-cover cells
- the layer is semantically broader than the product concept
- it is likely heavier to prepare and style for the first MVP

### Best use

- optional district context
- optional low-opacity thematic overlay
- optional filter for “urban fabric type”

### Recommendation

**Do not use as the first dataset for the MVP core.**

Keep it as a second-phase contextual layer.

---

## 3. National Land Satellite Center Imagery

### Source

- National Land Satellite Center:
  https://www.ngii.go.kr/nlsc/eng/nsoutput/ouputintro2

### What it provides

The site clearly describes:

- surface reflectance images (ARD)
- mosaic images
- satellite image maps

It explicitly states:

- mosaic service is available for **8 major cities including Seoul**
- district-based service exists for **Seoul**
- orthorectified image files can be very large:
  - approximately **10 GB**
- the newest image maps can be viewed directly on the webpage without downloading

### Technical fit for our project

**Good for curated preview imagery, not ideal as the first core web layer.**

Why:

- imagery is valuable for before/after inspection
- however, large file sizes and service workflow make it inconvenient as the first product foundation
- the product does not need citywide imagery streaming to look good

### Best use

- before/after preview panel
- selected AOI crops
- hero comparison view

### Recommendation

**Use later for preview panels or curated snapshots.**

Do not block the MVP on full imagery ingestion.

---

## 4. NYU Seoul Urban Land Cover Raster (2000)

### Source

- NYU / Stanford-hosted catalog entry:
  https://geo.nyu.edu/catalog/stanford-qr253jg4301

### What it provides

- public GeoTIFF download
- year: **2000**
- raster land cover
- broad urban land categories

### Technical fit for our project

**Poor for the intended product.**

Why:

- too old
- too coarse semantically
- not building-centric
- not suitable for hover-first 3D urban interaction

### Recommendation

Do not use it for the MVP.

It is only useful if a future side story is:

- long-term Seoul expansion
- coarse urban growth history

---

## Final Recommendation

### MVP data stack

Use:

1. **Korea Building Footprints v2**
   - primary city geometry
2. **our own per-building change metadata**
   - changed / unchanged
   - change area
   - confidence
   - time labels
3. **curated before/after preview images**
   - selected AOIs only

### Optional phase-2 context

Add later:

4. **national land cover map**
   - as a contextual overlay
5. **official imagery services**
   - for richer preview or map modes

---

## What still needs user help

### Needed from you

1. Decide the **first study area**
   - one district or one curated redevelopment area

2. Decide whether the portfolio should be:
   - a **single curated area MVP**
   - or a broader Seoul explorer from the start

3. If you want official before/after imagery in the product,
   you will likely need to help with:
   - portal login
   - dataset request
   - selecting the exact image years / AOI

### Not needed from you yet

- building geometry download
- nationwide bulk export
- land-cover integration

The building service is already sufficient to start frontend prototyping.
