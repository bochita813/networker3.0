#!/usr/bin/env python3
"""NETWORKER: catálogo nacional abierto de establecimientos y profesionales.

Fuente: © OpenStreetMap contributors (ODbL 1.0); límites provinciales
geoBoundaries (ver metadatos públicos). No infiere edad, intención de
emprender ni el estado privado/público de cuentas de Instagram.
No entra a Instagram ni recopila seguidores.
"""
from __future__ import annotations

import argparse
import collections
import datetime as dt
import json
import os
import pathlib
import re
import sys
import tempfile
import unicodedata
from urllib.parse import urlparse

import osmium
import requests
from shapely.geometry import Point, shape
from shapely.prepared import prep
from shapely.strtree import STRtree

ROOT = pathlib.Path(__file__).resolve().parents[1]
DEST = ROOT / "scout" / "national"
PBF_URL = "https://download.geofabrik.de/south-america/argentina-latest.osm.pbf"
BORDERS_API = "https://www.geoboundaries.org/api/current/gbOpen/ARG/ADM1/"
LIMIT = 100_000
CHUNK = 2_500

AMENITIES = {
    "restaurant", "cafe", "bar", "fast_food", "pub", "ice_cream", "food_court",
    "clinic", "doctors", "dentist", "pharmacy", "veterinary", "physiotherapist",
    "bank", "bureau_de_change", "car_rental", "car_wash", "driving_school",
    "language_school", "music_school", "childcare", "training", "marketplace",
    "studio", "coworking_space", "internet_cafe", "fuel", "charging_station",
}
LEISURE = {"fitness_centre", "sports_centre", "dance", "sauna", "beauty_salon"}
TOURISM = {"hotel", "guest_house", "hostel", "motel", "apartment"}
PROFESSIONAL = {
    "lawyer", "accountant", "financial", "insurance", "architect",
    "consulting", "therapist", "physician", "medical", "employment_agency",
    "tax_advisor", "it", "company", "estate_agent", "real_estate_agent",
}
RESERVED = {
    "instagram", "accounts", "stories", "reels", "reel", "p", "tv",
    "explore", "about", "privacy", "login", "direct",
}
NAME_BAD = {"yes", "no", "unnamed", "unknown", "sin nombre", "local", "shop"}
SESSION = requests.Session()
SESSION.headers.update({"User-Agent": "NetworkerOpenDataResearch/1.0 (public OSM attribution)"})


def text(value, n=250):
    return re.sub(r"[\x00-\x1f]", " ", str(value or "")).strip()[:n]


def norm(value):
    return "".join(
        c for c in unicodedata.normalize("NFKD", str(value or "").casefold())
        if not unicodedata.combining(c)
    ).strip()


def url_field(v):
    v = text(v, 500).split(";")[0].strip()
    if v and not v.startswith(("http://", "https://")) and "." in v and " " not in v:
        v = "https://" + v
    if not v or urlparse(v).scheme not in ("https", "http"):
        return ""
    return v


def instagram(v):
    v = text(v, 260).split(";")[0].strip()
    if not v:
        return ""
    if v.startswith("@"):
        v = v[1:]
    if "instagram.com/" in v:
        try:
            part = urlparse(v if v.startswith("http") else "https://" + v)
            if part.hostname not in ("www.instagram.com", "instagram.com"):
                return ""
            path = [p for p in part.path.split("/") if p]
            if len(path) != 1:
                return ""
            v = path[0]
        except ValueError:
            return ""
    v = v.casefold()
    if not re.fullmatch(r"[a-z0-9._]{3,30}", v) or v in RESERVED or ".." in v:
        return ""
    return "https://www.instagram.com/" + v + "/"


def download(url, dest, minimum=100, timeout=120):
    dest = pathlib.Path(dest)
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and dest.stat().st_size >= minimum:
        print("Ya descargado:", dest, dest.stat().st_size, flush=True)
        return
    print("Descargando:", url, flush=True)
    with SESSION.get(url, stream=True, timeout=(35, timeout)) as response:
        response.raise_for_status()
        with dest.open("wb") as fp:
            for chunk in response.iter_content(chunk_size=1024*1024):
                if chunk:
                    fp.write(chunk)
    if dest.stat().st_size < minimum:
        raise RuntimeError("Descarga incompleta: " + str(dest.stat().st_size))


class Regions:
    """Índice espacial de 23 límites provinciales para no recorrer todos por cada POI."""
    def __init__(self, features):
        self.geometries = []
        self.names = []
        for f in features:
            name = text((f.get("properties") or {}).get("shapeName"), 100)
            if not name:
                continue
            if name == "La Roja":   # Error tipográfico en geoBoundaries ARG-ADM1 2006
                name = "La Rioja"
            geometry = shape(f["geometry"])
            self.geometries.append(geometry)
            self.names.append(name)
        if not self.geometries:
            raise RuntimeError("Faltan polígonos provinciales")
        self.tree = STRtree(self.geometries)
        self.prepared = [prep(g) for g in self.geometries]

    def province(self, latitude, longitude):
        if latitude is None or longitude is None:
            return ""
        point = Point(longitude, latitude)
        for index in self.tree.query(point):
            ix = int(index)
            if self.prepared[ix].covers(point):
                return self.names[ix]
        return ""

def get_regions():
    info = SESSION.get(BORDERS_API, timeout=(20, 40))
    info.raise_for_status()
    meta = info.json()
    link = meta["simplifiedGeometryGeoJSON"]
    resp = SESSION.get(link, timeout=(25, 60), headers={"Accept": "application/geo+json,application/json"})
    resp.raise_for_status()
    geo = resp.json()
    reg = Regions(geo.get("features", []))
    if len(reg.items) < 20:
        raise RuntimeError("GeoBoundaries no entregó suficientes polígonos provinciales")
    print("Provincias geográficas:", len(reg.items), "Licencia:", meta.get("boundaryLicense"))
    return reg


def tags_kind(tags):
    if tags.get("shop") not in (None, "", "no"):
        return ("Comercio", "shop:" + tags["shop"], "business")
    if tags.get("office") and tags.get("office") not in ("government", "diplomatic", "political_party"):
        kind = tags["office"]
        return ("Servicios profesionales" if kind in PROFESSIONAL else "Servicios", "office:" + kind,
                "professional" if kind in PROFESSIONAL else "business")
    if tags.get("craft") and tags.get("craft") not in ("", "no"):
        return ("Oficios y emprendimientos", "craft:" + tags["craft"], "business")
    if tags.get("healthcare") and tags["healthcare"] not in ("no", "yes"):
        return ("Salud y bienestar", "healthcare:" + tags["healthcare"], "professional")
    a = tags.get("amenity", "")
    if a in AMENITIES:
        sector = ("Gastronomía" if a in {"restaurant","cafe","bar","fast_food","pub","ice_cream","food_court"}
                  else "Salud y bienestar" if a in {"clinic","doctors","dentist","pharmacy","veterinary","physiotherapist"}
                  else "Educación y formación" if a in {"driving_school","language_school","music_school","childcare","training"}
                  else "Servicios y comercio")
        return (sector, "amenity:" + a,
                "professional" if a in {"doctors","dentist","physiotherapist"} else "business")
    if tags.get("leisure") in LEISURE:
        return ("Deporte, bienestar y estética", "leisure:" + tags["leisure"], "business")
    if tags.get("tourism") in TOURISM:
        return ("Turismo y alojamiento", "tourism:" + tags["tourism"], "business")
    return None


class Collector(osmium.SimpleHandler):
    def __init__(self, regions):
        super().__init__()
        self.regions = regions
        self.data = {}
        self.num = 0
        self.skipped = 0

    def record(self, obj, kind, latitude, longitude):
        tags = dict(obj.tags)
        name = text(tags.get("name") or tags.get("brand"), 250)
        if len(name) < 3 or norm(name) in NAME_BAD:
            self.skipped += 1
            return
        classified = tags_kind(tags)
        if not classified:
            return
        sector, activity, lead_kind = classified
        if latitude is None or longitude is None:
            self.skipped += 1
            return
        if latitude > -21 or latitude < -56 or longitude < -75 or longitude > -52:
            return
        province = self.regions.province(latitude, longitude)
        addr_prov = text(tags.get("addr:province") or tags.get("addr:state") or tags.get("is_in:state"),100)
        if not province and addr_prov:
            province = addr_prov
        city = text(tags.get("addr:city") or tags.get("is_in:city"), 120)
        street = text(tags.get("addr:street"), 160)
        number = text(tags.get("addr:housenumber"), 20)
        address = " ".join((street, number)).strip()
        ig = instagram(tags.get("contact:instagram") or tags.get("instagram") or "")
        website = url_field(tags.get("contact:website") or tags.get("website") or "")
        phone = text(tags.get("contact:phone") or tags.get("phone"),100)
        email = text(tags.get("contact:email") or tags.get("email"),250)
        if email and not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+",email):
            email = ""
        facebook = url_field(tags.get("contact:facebook") or tags.get("facebook") or "")
        source_id = f"osm:{kind}:{obj.id}"
        self.data[source_id] = {
            "source_id":source_id,"lead_kind":lead_kind,"name":name,
            "activity":activity,"sector":sector,"province":province,"city":city,
            "address":address,"region_hint":"","location_basis":"osm_poi_coordinate_in_province",
            "lat":round(latitude,6),"lon":round(longitude,6),
            "instagram":ig,"website":website,"public_business_phone":phone,
            "public_business_email":email,"facebook":facebook,
            "source_name":"OpenStreetMap · establecimiento público",
            "source_url":f"https://www.openstreetmap.org/{kind}/{obj.id}",
            "source_license":"© OpenStreetMap contributors · ODbL 1.0",
        }
        self.num += 1
        if self.num % 50_000 == 0:
            print("Establecimientos clasificados:",self.num,"distintos:",len(self.data),flush=True)

    def node(self, n):
        if not n.location.valid():
            return
        if not any(t.k in ("name","brand") for t in n.tags):
            return
        if not any(t.k in ("shop","office","craft","healthcare","amenity","leisure","tourism") for t in n.tags):
            return
        self.record(n,"node",n.location.lat,n.location.lon)

    def way(self, w):
        if not any(tag.k in ("name","brand") for tag in w.tags):
            return
        if not any(tag.k in ("shop","office","craft","healthcare","amenity","leisure","tourism") for tag in w.tags):
            return
        positions = []
        try:
            for n in w.nodes:
                if n.location.valid():
                    positions.append((n.location.lat,n.location.lon))
        except (RuntimeError,ValueError):
            return
        if not positions:
            return
        lat=sum(x for x,_ in positions)/len(positions)
        lon=sum(y for _,y in positions)/len(positions)
        self.record(w,"way",lat,lon)


def priority(row):
    return (
        8 * bool(row["instagram"]) + 5 * bool(row["public_business_email"]) +
        5 * bool(row["public_business_phone"]) + 3 * bool(row["website"]) +
        2 * (row["lead_kind"]=="professional") + bool(row["city"])
    )


def select_balanced(rows):
    # Deduplicar un mismo local dibujado como nodo y polígono casi coincidente.
    taken_by_physical = set()
    lists = collections.defaultdict(list)
    for row in rows:
        key=(norm(row["name"]),round(row["lat"],3),round(row["lon"],3))
        if key in taken_by_physical:
            continue
        taken_by_physical.add(key)
        lists[row["province"] or "Sin provincia verificada"].append(row)
    for province in lists:
        lists[province].sort(key=lambda r:(-priority(r),r["source_id"]))
    result = []
    used = set()
    # Cobertura federal mínima antes de dar prioridad a las regiones grandes.
    for province in sorted(lists):
        if province == "Sin provincia verificada":
            continue
        for row in lists[province][:600]:
            result.append(row)
            used.add(row["source_id"])
    remaining=[row for group in lists.values() for row in group if row["source_id"] not in used]
    remaining.sort(key=lambda r:(-bool(r["province"]),-priority(r),r["province"],r["source_id"]))
    result.extend(remaining[:max(0,LIMIT-len(result))])
    return result[:LIMIT]


def main():
    global LIMIT
    arg=argparse.ArgumentParser()
    arg.add_argument("--pbf", default="")
    arg.add_argument("--target",type=int,default=LIMIT)
    arg.add_argument("--check-only",action="store_true")
    args=arg.parse_args()
    LIMIT=min(100_000,max(1,args.target))
    with tempfile.TemporaryDirectory(prefix="networker-osm-") as temp:
        pbf=args.pbf or str(pathlib.Path(temp)/"argentina.osm.pbf")
        download(PBF_URL,pbf,minimum=50_000_000,timeout=120)
        provinces=get_regions()
        handler=Collector(provinces)
        handler.apply_file(pbf,locations=True,idx="flex_mem")
        selected=select_balanced(list(handler.data.values()))
    if not selected:
        raise RuntimeError("Sin entidades verificables en OpenStreetMap")
    by_region=collections.Counter(row["province"] for row in selected)
    by_sector=collections.Counter(row["sector"] for row in selected)
    contactable=sum(bool(row["instagram"] or row["website"] or row["public_business_phone"] or row["public_business_email"]) for row in selected)
    print("Resultado:",len(selected),"de",len(handler.data),"prospectos OSM; con algún contacto empresarial:",contactable)
    print("Regiones:",dict(by_region))
    if args.check_only:
        return
    DEST.mkdir(parents=True,exist_ok=True)
    for old in DEST.glob("lead-*.json"):
        old.unlink()
    files=[]
    for i in range(0,len(selected),CHUNK):
        filename=f"lead-{i//CHUNK:03d}.json"
        rows=selected[i:i+CHUNK]
        (DEST/filename).write_text(json.dumps({"schema":1,"records":rows},ensure_ascii=False,separators=(",",":"))+"\n",encoding="utf-8")
        files.append(filename)
    manifest={
        "schema":1,"built_at":dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        "source":"OpenStreetMap Argentina via Geofabrik","source_url":PBF_URL,
        "source_license":"© OpenStreetMap contributors · ODbL 1.0",
        "province_boundaries":"geoBoundaries gbOpen Argentina ADM1",
        "count":len(selected),"business_contacts_available":contactable,
        "provinces":dict(sorted(by_region.items())),"sectors":dict(sorted(by_sector.items())),
        "age_policy":"unknown unless separately verified","opportunity_interest_policy":"unknown unless explicitly evidenced",
        "shards":files
    }
    (DEST/"manifest.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print("Publicados",len(files),"fragmentos y manifest; total",len(selected))


if __name__=="__main__":
    main()
