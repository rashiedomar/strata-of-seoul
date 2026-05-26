#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, List

import geopandas as gpd
import pandas as pd
import requests


SERVICE_ROOT = "https://portal.esrikr.com/arcgis/rest/services/MOIS_KR_Buildings_v2/FeatureServer/0"
SEOUL_PREFIX = "11"

DISTRICT_NAMES: Dict[str, str] = {
    "11110": "Jongno-gu",
    "11140": "Jung-gu",
    "11170": "Yongsan-gu",
    "11200": "Seongdong-gu",
    "11215": "Gwangjin-gu",
    "11230": "Dongdaemun-gu",
    "11260": "Jungnang-gu",
    "11290": "Seongbuk-gu",
    "11305": "Gangbuk-gu",
    "11320": "Dobong-gu",
    "11350": "Nowon-gu",
    "11380": "Eunpyeong-gu",
    "11410": "Seodaemun-gu",
    "11440": "Mapo-gu",
    "11470": "Yangcheon-gu",
    "11500": "Gangseo-gu",
    "11530": "Guro-gu",
    "11545": "Geumcheon-gu",
    "11560": "Yeongdeungpo-gu",
    "11590": "Dongjak-gu",
    "11620": "Gwanak-gu",
    "11650": "Seocho-gu",
    "11680": "Gangnam-gu",
    "11710": "Songpa-gu",
    "11740": "Gangdong-gu",
}


def request_json(url: str, params: Dict[str, str], timeout: int = 180) -> dict:
    response = requests.get(url, params=params, timeout=timeout)
    response.raise_for_status()
    payload = response.json()
    if "error" in payload:
        raise RuntimeError(f"ArcGIS service returned error: {payload['error']}")
    return payload


def fetch_seoul_district_counts() -> List[dict]:
    params = {
        "where": f"sig_cd like '{SEOUL_PREFIX}%'",
        "groupByFieldsForStatistics": "sig_cd",
        "outStatistics": '[{"statisticType":"count","onStatisticField":"objectid","outStatisticFieldName":"cnt"}]',
        "orderByFields": "sig_cd",
        "f": "json",
    }
    payload = request_json(f"{SERVICE_ROOT}/query", params, timeout=60)
    rows = []
    for feat in payload.get("features", []):
        attr = feat["attributes"]
        code = str(attr["sig_cd"])
        rows.append(
            {
                "sig_cd": code,
                "district_name_en": DISTRICT_NAMES.get(code, code),
                "count": int(attr["cnt"]),
            }
        )
    return rows


def fetch_district_geojson(sig_cd: str) -> dict:
    params = {
        "where": f"sig_cd='{sig_cd}'",
        "outFields": "*",
        "returnGeometry": "true",
        "outSR": "4326",
        "f": "geojson",
    }
    response = requests.get(f"{SERVICE_ROOT}/query", params=params, timeout=180)
    response.raise_for_status()
    payload = response.json()
    if payload.get("type") != "FeatureCollection":
        raise RuntimeError(f"Unexpected payload for district {sig_cd}: {payload.keys()}")
    return payload


def main() -> None:
    project_root = Path(__file__).resolve().parents[1]
    raw_root = project_root / "data" / "raw"
    districts_dir = raw_root / "buildings_v2_districts"
    districts_dir.mkdir(parents=True, exist_ok=True)

    counts = fetch_seoul_district_counts()
    manifest = {
        "source_name": "Korea Building Footprints v2",
        "source_service": SERVICE_ROOT,
        "source_item": "https://www.arcgis.com/home/item.html?id=b2c7a37bac8d4e40a85435b3f3d96d05",
        "spatial_reference": "EPSG:4326",
        "license_note": (
            "Source item states that the layer is intended for online visualization and analysis; "
            "users are not permitted to export data for offline use outside Korea."
        ),
        "districts": counts,
    }

    (raw_root / "seoul_buildings_v2_manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    parquet_paths: List[Path] = []
    total_features = 0

    for row in counts:
        sig_cd = row["sig_cd"]
        district_name = row["district_name_en"]
        safe_name = district_name.lower().replace(" ", "_")
        geojson_path = districts_dir / f"{sig_cd}_{safe_name}.geojson"
        parquet_path = districts_dir / f"{sig_cd}_{safe_name}.parquet"

        if parquet_path.exists():
            print(f"[skip] {sig_cd} {district_name} already exists")
            parquet_paths.append(parquet_path)
            continue

        print(f"[download] {sig_cd} {district_name} ({row['count']} features)")
        payload = fetch_district_geojson(sig_cd)
        geojson_path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")

        gdf = gpd.GeoDataFrame.from_features(payload["features"], crs="EPSG:4326")
        gdf["sig_cd"] = gdf["sig_cd"].astype(str)
        gdf.to_parquet(parquet_path, index=False)
        parquet_paths.append(parquet_path)
        total_features += len(gdf)
        print(f"[saved] {parquet_path} ({len(gdf)} rows)")

    if not parquet_paths:
        raise RuntimeError("No district parquet files were created.")

    print("[merge] building combined Seoul GeoParquet")
    frames = [gpd.read_parquet(path) for path in parquet_paths]
    combined = gpd.GeoDataFrame(pd.concat(frames, ignore_index=True), crs="EPSG:4326")
    combined_path = raw_root / "seoul_buildings_v2_4326.parquet"
    combined.to_parquet(combined_path, index=False)

    summary = {
        "district_count": len(counts),
        "feature_count": int(len(combined)),
        "output_parquet": str(combined_path.relative_to(project_root)),
        "district_dir": str(districts_dir.relative_to(project_root)),
    }
    (raw_root / "seoul_buildings_v2_summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print("[done]", json.dumps(summary, ensure_ascii=False))


if __name__ == "__main__":
    main()
