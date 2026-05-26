#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path

import geopandas as gpd


DISTRICT_CODE = "11680"
DISTRICT_NAME = "Gangnam-gu"


def main() -> None:
    project_root = Path(__file__).resolve().parents[1]
    src_path = project_root / "data" / "raw" / "buildings_v2_districts" / f"{DISTRICT_CODE}_{DISTRICT_NAME.lower()}.parquet"
    out_dir = project_root / "public" / "data"
    out_dir.mkdir(parents=True, exist_ok=True)

    gdf = gpd.read_parquet(src_path)

    keep = [
        "building_id",
        "building_name",
        "gro_flo_co",
        "und_flo_co",
        "sig_cd",
        "street_name",
        "house_number",
        "Shape__Area",
        "geometry",
    ]
    gdf = gdf[keep].copy()
    gdf["building_name"] = gdf["building_name"].fillna("").astype(str)
    gdf["street_name"] = gdf["street_name"].fillna("").astype(str)
    gdf["house_number"] = gdf["house_number"].fillna("").astype(str)
    gdf["gro_flo_co"] = gdf["gro_flo_co"].fillna(1).clip(lower=1).astype(int)
    gdf["und_flo_co"] = gdf["und_flo_co"].fillna(0).clip(lower=0).astype(int)
    gdf["footprint_area_m2"] = gdf["Shape__Area"].fillna(0).round(1)
    gdf["height_m"] = (gdf["gro_flo_co"] * 3.2).round(1)
    gdf["estimated_volume_m3"] = (gdf["footprint_area_m2"] * gdf["height_m"]).round(1)
    gdf["display_name"] = gdf["building_name"].where(
        gdf["building_name"].str.strip().ne(""),
        "Unnamed Building",
    )
    gdf["is_named"] = gdf["display_name"].ne("Unnamed Building")
    gdf["height_band"] = gdf["gro_flo_co"].map(
        lambda floors: (
            "low-rise"
            if floors <= 4
            else "mid-rise"
            if floors <= 14
            else "high-rise"
            if floors <= 29
            else "tower"
        )
    )
    gdf["footprint_band"] = gdf["footprint_area_m2"].map(
        lambda area: "compact" if area < 150 else "medium" if area < 600 else "large"
    )
    gdf["address_label"] = gdf.apply(
        lambda row: f"{row['street_name']} {row['house_number']}".strip(),
        axis=1,
    )
    centroid_series = gdf.to_crs(5186).geometry.centroid
    centroids_wgs84 = gpd.GeoSeries(centroid_series, crs=5186).to_crs(gdf.crs)
    gdf["centroid_lng"] = centroids_wgs84.x.round(7)
    gdf["centroid_lat"] = centroids_wgs84.y.round(7)

    # Mild simplification keeps the MVP responsive without visibly damaging shapes.
    gdf["geometry"] = gdf.geometry.simplify(0.000001, preserve_topology=True)

    out_geojson = out_dir / "gangnam_buildings_mvp.geojson"
    gdf[
        [
            "building_id",
            "display_name",
            "gro_flo_co",
            "und_flo_co",
            "height_m",
            "footprint_area_m2",
            "estimated_volume_m3",
            "is_named",
            "height_band",
            "footprint_band",
            "address_label",
            "centroid_lng",
            "centroid_lat",
            "geometry",
        ]
    ].to_file(out_geojson, driver="GeoJSON")

    summary = {
        "district_code": DISTRICT_CODE,
        "district_name": DISTRICT_NAME,
        "feature_count": int(len(gdf)),
        "bounds_wgs84": [float(v) for v in gdf.total_bounds],
        "source_parquet": str(src_path.relative_to(project_root)),
        "output_geojson": str(out_geojson.relative_to(project_root)),
    }
    (out_dir / "gangnam_buildings_mvp_summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
