import maplibregl from "maplibre-gl";
import "./style.css";

const SEOUL_CENTER = [126.97813, 37.56704];
const SEOUL_BOUNDS = [
  [126.76, 37.43],
  [127.19, 37.70],
];

const TILE_BASE = "https://s3.amazonaws.com/odd-tiles";
const MIN_DATA_ZOOM = 15;
const MAX_DATA_ZOOM = 16;

const BUCKETS = [
  {
    id: "bedrock",
    label: "Bedrock · 1920s–1950s",
    sourceKey: "final-gz-2345",
    color: "#c7772f",
    accent: "#ffcb96",
    opacity: 0.92,
    phantom: false,
  },
  {
    id: "mid_a",
    label: "Mid-strata · 1960s–1980s",
    sourceKey: "final-gz-678",
    color: "#d58b3c",
    accent: "#f0c38f",
    opacity: 0.88,
    phantom: false,
  },
  {
    id: "mid_b",
    label: "Upper shelf · 1990s–2010s",
    sourceKey: "final-gz-901",
    color: "#9fb5ff",
    accent: "#dfe6ff",
    opacity: 0.82,
    phantom: false,
  },
  {
    id: "phantoms",
    label: "Phantoms · unregistered",
    sourceKey: "final-buildings-null",
    color: "#d8dfff",
    accent: "#fbfdff",
    opacity: 0.34,
    phantom: true,
  },
];

const appState = {
  spreadM: 120,
  focus: "all",
  fetchSeq: 0,
  tileCache: new Map(),
  currentFeatures: Object.fromEntries(BUCKETS.map((bucket) => [bucket.id, []])),
  hoveredFeature: null,
};

const els = {
  loading: document.getElementById("loading-badge"),
  tooltip: document.getElementById("tooltip"),
  needle: document.getElementById("needle"),
  spreadSlider: document.getElementById("spread-slider"),
  spreadValue: document.getElementById("spread-value"),
  focusButtons: [...document.querySelectorAll("[data-focus]")],
  infoTitle: document.getElementById("info-title"),
  infoSubtitle: document.getElementById("info-subtitle"),
  infoDong: document.getElementById("info-dong"),
  infoEra: document.getElementById("info-era"),
  infoYear: document.getElementById("info-year"),
  infoHeight: document.getElementById("info-height"),
  infoAddress: document.getElementById("info-address"),
  stackTotal: document.getElementById("stack-total"),
  stackBedrockCount: document.getElementById("stack-bedrock-count"),
  stackMidACount: document.getElementById("stack-mid-a-count"),
  stackMidBCount: document.getElementById("stack-mid-b-count"),
  stackPhantomsCount: document.getElementById("stack-phantoms-count"),
  stackBedrockBar: document.getElementById("stack-bedrock-bar"),
  stackMidABar: document.getElementById("stack-mid-a-bar"),
  stackMidBBar: document.getElementById("stack-mid-b-bar"),
  stackPhantomsBar: document.getElementById("stack-phantoms-bar"),
};

const map = new maplibregl.Map({
  container: "map",
  center: SEOUL_CENTER,
  zoom: 15.12,
  pitch: 67,
  bearing: -22,
  maxBounds: SEOUL_BOUNDS,
  minZoom: 14.85,
  maxZoom: 17.6,
  antialias: true,
  style: {
    version: 8,
    sources: {
      carto: {
        type: "raster",
        tiles: ["https://a.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png"],
        tileSize: 256,
        attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
      },
    },
    layers: [
      {
        id: "background",
        type: "background",
        paint: {
          "background-color": "#eef1ef",
        },
      },
      {
        id: "carto",
        type: "raster",
        source: "carto",
        paint: {
          "raster-opacity": 0.54,
          "raster-saturation": -0.75,
          "raster-contrast": -0.08,
        },
      },
    ],
  },
});

map.on("load", async () => {
  if (typeof map.setFog === "function") {
    map.setFog({
      range: [1.0, 7.5],
      color: "#f3f5f3",
      "high-color": "#e8eeef",
      "space-color": "#fbfdfd",
      "horizon-blend": 0.06,
    });
  }

  if (typeof map.setLight === "function") {
    map.setLight({
      anchor: "viewport",
      color: "#fff4e8",
      intensity: 0.38,
      position: [1.4, 185, 48],
    });
  }

  addSources();
  addLayers();
  bindUi();
  bindInteractions();
  updateSpreadLabel();
  updateLayerPaint();
  await refreshVisibleStrata(true);
});

function addSources() {
  for (const bucket of BUCKETS) {
    map.addSource(bucket.id, {
      type: "geojson",
      data: emptyFeatureCollection(),
      generateId: true,
    });
  }

  map.addSource("hovered-footprint", {
    type: "geojson",
    data: emptyFeatureCollection(),
  });
}

function addLayers() {
  for (let index = 0; index < BUCKETS.length; index += 1) {
    const bucket = BUCKETS[index];

    map.addLayer({
      id: `${bucket.id}-extrusion`,
      type: "fill-extrusion",
      source: bucket.id,
      minzoom: 14.85,
      paint: {
        "fill-extrusion-color": bucket.color,
        "fill-extrusion-height": 0,
        "fill-extrusion-base": 0,
        "fill-extrusion-opacity": bucket.opacity,
        "fill-extrusion-vertical-gradient": true,
      },
    });

    map.addLayer({
      id: `${bucket.id}-outline`,
      type: "line",
      source: bucket.id,
      minzoom: 14.85,
      paint: {
        "line-color": bucket.accent,
        "line-opacity": bucket.phantom ? 0.22 : 0.24,
        "line-width": 0.8,
      },
    });
  }

  map.addLayer({
    id: "hovered-extrusion",
    type: "fill-extrusion",
    source: "hovered-footprint",
    minzoom: 14.85,
    paint: {
      "fill-extrusion-color": "#fff3d8",
      "fill-extrusion-base": ["coalesce", ["to-number", ["get", "__base"]], 0],
      "fill-extrusion-height": ["coalesce", ["to-number", ["get", "__top"]], 20],
      "fill-extrusion-opacity": 0.38,
      "fill-extrusion-vertical-gradient": false,
    },
  });

  map.addLayer({
    id: "hovered-outline",
    type: "line",
    source: "hovered-footprint",
    minzoom: 14.85,
    paint: {
      "line-color": "#fff7ed",
      "line-width": 2.2,
      "line-opacity": 0.95,
    },
  });
}

function bindUi() {
  els.spreadSlider.addEventListener("input", () => {
    appState.spreadM = Number(els.spreadSlider.value);
    updateSpreadLabel();
    updateLayerPaint();
    if (appState.hoveredFeature) {
      drawHoveredFeature(appState.hoveredFeature);
    }
  });

  els.focusButtons.forEach((button) => {
    button.addEventListener("click", () => {
      appState.focus = button.dataset.focus;
      toggleActiveFocus(button.dataset.focus);
      updateLayerVisibility();
    });
  });
}

function bindInteractions() {
  map.on("moveend", () => {
    refreshVisibleStrata();
  });

  map.on("mousemove", (event) => {
    const features = map.queryRenderedFeatures(event.point, {
      layers: BUCKETS.map((bucket) => `${bucket.id}-extrusion`),
    });

    if (!features.length) {
      clearHover();
      return;
    }

    const feature = features[0];
    setHover(feature, event.point);
  });

  map.on("mouseout", () => {
    clearHover();
  });
}

function updateSpreadLabel() {
  els.spreadValue.textContent = `${appState.spreadM} m`;
}

function toggleActiveFocus(focus) {
  els.focusButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.focus === focus);
  });
}

function updateLayerVisibility() {
  for (const bucket of BUCKETS) {
    const visible = appState.focus === "all" || appState.focus === bucket.id;
    const visibility = visible ? "visible" : "none";
    map.setLayoutProperty(`${bucket.id}-extrusion`, "visibility", visibility);
    map.setLayoutProperty(`${bucket.id}-outline`, "visibility", visibility);
  }

  if (appState.hoveredFeature && appState.focus !== "all" && appState.focus !== appState.hoveredFeature.properties.__bucket) {
    clearHover();
  }
}

function updateLayerPaint() {
  for (let index = 0; index < BUCKETS.length; index += 1) {
    const bucket = BUCKETS[index];
    const base = index * appState.spreadM;
    const heightExpression = bucket.phantom
      ? [
          "+",
          base,
          [
            "max",
            34,
            ["*", 0.65, ["coalesce", ["to-number", ["get", "h"]], 12]],
          ],
        ]
      : [
          "+",
          base,
          [
            "max",
            10,
            ["*", 1.18, ["coalesce", ["to-number", ["get", "h"]], 0]],
          ],
        ];

    map.setPaintProperty(`${bucket.id}-extrusion`, "fill-extrusion-base", base);
    map.setPaintProperty(`${bucket.id}-extrusion`, "fill-extrusion-height", heightExpression);
  }
}

async function refreshVisibleStrata(force = false) {
  const seq = ++appState.fetchSeq;
  const sourceZoom = clamp(Math.floor(map.getZoom()), MIN_DATA_ZOOM, MAX_DATA_ZOOM);
  const tileKeys = collectVisibleTileKeys(map.getBounds(), map.getCenter(), sourceZoom);
  if (!tileKeys.length) return;

  setLoading(true);

  const mergedByBucket = await Promise.all(
    BUCKETS.map(async (bucket, bucketIndex) => {
      const tileResults = await Promise.all(
        tileKeys.map((key) => getTileFeatures(bucket, bucketIndex, sourceZoom, key.x, key.y)),
      );
      const features = tileResults.flat();
      return [bucket.id, features];
    }),
  );

  if (seq !== appState.fetchSeq && !force) {
    return;
  }

  for (const [bucketId, features] of mergedByBucket) {
    appState.currentFeatures[bucketId] = features;
    map.getSource(bucketId).setData({
      type: "FeatureCollection",
      features,
    });
  }

  setLoading(false);
}

async function getTileFeatures(bucket, bucketIndex, z, x, y) {
  const cacheKey = `${bucket.id}:${z}:${x}:${y}`;
  if (appState.tileCache.has(cacheKey)) {
    return appState.tileCache.get(cacheKey);
  }

  const url = `${TILE_BASE}/${bucket.sourceKey}/${z}/${x}/${y}.geojson`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      appState.tileCache.set(cacheKey, []);
      return [];
    }

    const geojson = await response.json();
    const features = (geojson.features || []).map((feature, featureIndex) => ({
      ...feature,
      properties: {
        ...feature.properties,
        __bucket: bucket.id,
        __bucket_index: bucketIndex,
        __feature_key: `${cacheKey}:${featureIndex}`,
      },
    }));

    appState.tileCache.set(cacheKey, features);
    return features;
  } catch (error) {
    console.error("Failed to load tile", url, error);
    appState.tileCache.set(cacheKey, []);
    return [];
  }
}

function setHover(feature, point) {
  appState.hoveredFeature = feature;
  drawHoveredFeature(feature);
  positionNeedle(point);
  renderTooltip(feature, point);
  renderInfoPanel(feature);
}

function clearHover() {
  appState.hoveredFeature = null;
  map.getSource("hovered-footprint").setData(emptyFeatureCollection());
  els.tooltip.hidden = true;
  els.needle.hidden = true;
  resetInfoPanel();
}

function drawHoveredFeature(feature) {
  const bucketIndex = Number(feature.properties.__bucket_index || 0);
  const base = bucketIndex * appState.spreadM;
  const h = Number(feature.properties.h || 0);
  const top = BUCKETS[bucketIndex].phantom
    ? base + Math.max(34, h * 0.65 || 12)
    : base + Math.max(10, h * 1.18 || 0);

  map.getSource("hovered-footprint").setData({
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {
          __base: base,
          __top: top,
        },
        geometry: feature.geometry,
      },
    ],
  });
}

function positionNeedle(point) {
  els.needle.hidden = false;
  els.needle.style.left = `${point.x}px`;
  els.needle.style.top = `${Math.max(34, point.y - 210)}px`;
}

function renderTooltip(feature, point) {
  const props = feature.properties;
  const bucket = getBucket(props.__bucket);
  const approval = formatApprovalYear(props.year);
  els.tooltip.hidden = false;
  els.tooltip.style.left = `${point.x}px`;
  els.tooltip.style.top = `${point.y}px`;
  els.tooltip.innerHTML = `
    <div class="title">${escapeHtml(props.dongName || "Unknown neighborhood")}</div>
    <div class="sub">${escapeHtml(bucket.label)} · ${escapeHtml(approval)}</div>
  `;
}

function renderInfoPanel(feature) {
  const props = feature.properties;
  const bucket = getBucket(props.__bucket);
  const stack = summarizeNeighborhood(props.dongName);
  const total = stack.bedrock + stack.mid_a + stack.mid_b + stack.phantoms;
  const maxCount = Math.max(1, stack.bedrock, stack.mid_a, stack.mid_b, stack.phantoms);

  els.infoTitle.textContent = props.dongName || "Unknown neighborhood";
  els.infoSubtitle.textContent =
    "The hovered footprint anchors a vertical slice through the currently visible age layers.";
  els.infoDong.textContent = props.dongName || "—";
  els.infoEra.textContent = bucket.label.replace(" · ", " / ");
  els.infoYear.textContent = formatApprovalYear(props.year);
  els.infoHeight.textContent = formatPressure(props.h);
  els.infoAddress.textContent = props.address || "Unregistered";
  els.stackTotal.textContent = `${total} visible buildings`;

  renderStackRow(els.stackBedrockBar, els.stackBedrockCount, stack.bedrock, maxCount);
  renderStackRow(els.stackMidABar, els.stackMidACount, stack.mid_a, maxCount);
  renderStackRow(els.stackMidBBar, els.stackMidBCount, stack.mid_b, maxCount);
  renderStackRow(els.stackPhantomsBar, els.stackPhantomsCount, stack.phantoms, maxCount);
}

function resetInfoPanel() {
  els.infoTitle.textContent = "Move over a building";
  els.infoSubtitle.textContent =
    "A vertical needle marks the hovered footprint and reveals its neighborhood stack.";
  els.infoDong.textContent = "—";
  els.infoEra.textContent = "—";
  els.infoYear.textContent = "—";
  els.infoHeight.textContent = "—";
  els.infoAddress.textContent = "—";
  els.stackTotal.textContent = "—";

  renderStackRow(els.stackBedrockBar, els.stackBedrockCount, 0, 1);
  renderStackRow(els.stackMidABar, els.stackMidACount, 0, 1);
  renderStackRow(els.stackMidBBar, els.stackMidBCount, 0, 1);
  renderStackRow(els.stackPhantomsBar, els.stackPhantomsCount, 0, 1);
}

function renderStackRow(barEl, countEl, count, maxCount) {
  countEl.textContent = String(count);
  barEl.style.width = `${(count / maxCount) * 100}%`;
}

function summarizeNeighborhood(dongName) {
  const counts = { bedrock: 0, mid_a: 0, mid_b: 0, phantoms: 0 };
  if (!dongName) return counts;

  for (const bucket of BUCKETS) {
    for (const feature of appState.currentFeatures[bucket.id]) {
      if (feature.properties.dongName === dongName) {
        counts[bucket.id] += 1;
      }
    }
  }

  return counts;
}

function collectVisibleTileKeys(bounds, center, zoom) {
  const west = bounds.getWest();
  const east = bounds.getEast();
  const north = bounds.getNorth();
  const south = bounds.getSouth();

  const centerX = long2tile(center.lng, zoom);
  const centerY = lat2tile(center.lat, zoom);
  const xMin = Math.max(long2tile(west, zoom), centerX - 2);
  const xMax = Math.min(long2tile(east, zoom), centerX + 2);
  const yMin = Math.max(lat2tile(north, zoom), centerY - 2);
  const yMax = Math.min(lat2tile(south, zoom), centerY + 2);
  const keys = [];

  for (let x = xMin; x <= xMax; x += 1) {
    for (let y = yMin; y <= yMax; y += 1) {
      keys.push({ x, y });
    }
  }
  return keys;
}

function long2tile(lon, zoom) {
  return Math.floor(((lon + 180) / 360) * 2 ** zoom);
}

function lat2tile(lat, zoom) {
  return Math.floor(
    ((1 - Math.asinh(Math.tan((lat * Math.PI) / 180)) / Math.PI) / 2) * 2 ** zoom,
  );
}

function setLoading(isLoading) {
  els.loading.hidden = !isLoading;
}

function getBucket(id) {
  return BUCKETS.find((bucket) => bucket.id === id) ?? BUCKETS[0];
}

function formatApprovalYear(rawYear) {
  if (!rawYear) return "Unregistered";
  if (rawYear.length !== 8) return rawYear;
  return `${rawYear.slice(0, 4)}-${rawYear.slice(4, 6)}-${rawYear.slice(6, 8)}`;
}

function formatPressure(rawHeight) {
  const h = Number(rawHeight || 0);
  if (!Number.isFinite(h) || h <= 0) return "low rise";
  return `${h.toFixed(1)} m`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function emptyFeatureCollection() {
  return { type: "FeatureCollection", features: [] };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
