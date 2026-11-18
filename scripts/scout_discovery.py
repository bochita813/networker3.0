#!/usr/bin/env python3
"""NETWORKER SCOUT: búsqueda conservadora de perfiles públicos indexados.
No abre Instagram, no inicia sesión, no extrae followers ni envía mensajes.
Fuentes: resultados RSS de buscadores públicos; pueden no devolver perfiles.
"""
from __future__ import annotations
import datetime as dt
import html
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path
from scout_directory_sources import discover as discover_directories

ROOT = Path(__file__).resolve().parents[1]
QUERIES = ROOT / "scout" / "queries.json"
OUTPUT = ROOT / "scout" / "candidates.json"
PATTERN = re.compile(
    r"(?:https?://)?(?:www\.)?instagram\.com/"
    r"(?!p/|reel/|reels/|tv/|stories/|explore/|accounts/|direct/|about/|developer/|tags/)"
    r"([A-Za-z0-9._]{1,30})(?=[/?#&\s\"'<]|$)",
    flags=re.IGNORECASE,
)
KEYWORDS = ("emprender", "emprendedor", "emprendedora", "negocios", "emprendimiento", "networking", "marca personal", "independiente")
SKIP = {"instagram", "reels", "reel", "p", "explore", "stories", "about", "accounts", "help", "tv", "direct", "business"}

# Configuraciones activas del panel SCOUT. Solo incluyen términos de búsqueda
# publicados; no contienen credenciales de Instagram ni datos de prospectos.
SEARCH_API="https://uhdkmgljczeuxzrimfaf.supabase.co/rest/v1/scout_search_rules"
SCOUT_PUBLISHABLE_KEY="sb_publishable_yNv3mtKgUqL6h-51n9QAgg_KLhmy1Ur"

def fetch_live_search_rules():
    params=urllib.parse.urlencode({
        "enabled":"eq.true",
        "select":"name,country,province,city,interests,keywords,focus,min_affinity",
        "order":"name.asc",
        "limit":"8",
    })
    # No se solicita updated_at; ordenar por una columna permitida funciona con RLS.
    request=urllib.request.Request(SEARCH_API+"?"+params,headers={
        "apikey":SCOUT_PUBLISHABLE_KEY,
        "Accept":"application/json",
    })
    try:
        with urllib.request.urlopen(request,timeout=14) as response:
            rows=json.loads(response.read(60_000).decode("utf-8"))
        return rows if isinstance(rows,list) else []
    except (urllib.error.URLError,TimeoutError,ValueError,OSError) as exc:
        print("Configuraciones online no disponibles; se usan las búsquedas base:",exc,file=sys.stderr)
        return []

def assemble_search_queries(base):
    rules=fetch_live_search_rules()
    suggested=[]
    for rule in rules:
        words=["site:instagram.com"]
        for field in ("focus","keywords","city","province","country"):
            value=rule.get(field,"")
            if isinstance(value,str) and value.strip():
                words.append(value.strip()[:85])
        interests=rule.get("interests",[])
        if isinstance(interests,list):
            words.extend(str(x)[:36] for x in interests[:2] if isinstance(x,str))
        suggested.append(" ".join(words)[:245])
    # Las fuentes RSS pueden no indexar perfiles; los directorios públicos se
    # siguen consultando completos y la geolocalización se filtra en el panel.
    queries=(suggested+base)[:12] if suggested else base[:12]
    return queries,len(rules)


def text(node, name):
    child = node.find(name)
    return "".join(child.itertext()).strip() if child is not None else ""

def fetch_feed(query):
    # Uso de buscador RSS público, nunca del sitio privado de Instagram.
    address = "https://www.bing.com/search?" + urllib.parse.urlencode({
        "format": "rss", "q": query, "count": 40, "setlang": "es"
    })
    request = urllib.request.Request(address, headers={
        "User-Agent": "Mozilla/5.0 (compatible; NetworkerScout/1.0; public RSS research)",
        "Accept": "application/rss+xml, application/xml, text/xml",
    })
    with urllib.request.urlopen(request, timeout=17) as response:
        data = response.read(900_000)
    root = ET.fromstring(data)
    for item in root.findall(".//item")[:45]:
        yield {
            "title": html.unescape(text(item, "title"))[:250],
            "snippet": re.sub(r"<[^>]+>", " ", html.unescape(text(item, "description")))[:800],
            "link": html.unescape(text(item, "link")),
        }

def candidates_from(item):
    haystack = "\n".join([item["link"], item["title"], item["snippet"]])
    for sample in (haystack, urllib.parse.unquote(haystack), urllib.parse.unquote(urllib.parse.unquote(haystack))):
        for match in PATTERN.finditer(sample):
            handle = match.group(1).lower().strip(".")
            if handle in SKIP or len(handle) < 3 or ".." in handle:
                continue
            yield handle

def score(item, search_query):
    joined = (item["title"] + " " + item["snippet"]).lower()
    n = sum(8 for word in KEYWORDS if word in joined)
    n += 14 if "argentina" in joined else 0
    n += 9 if "instagram.com" in item["link"].lower() else 0
    n += 5 if "instagram.com" in search_query.lower() else 0
    return min(90, n)

def main():
    config = json.loads(QUERIES.read_text(encoding="utf-8"))
    queries, enabled_searches = assemble_search_queries(config.get("queries", []))
    if not isinstance(queries, list) or not all(isinstance(s, str) and len(s) < 250 for s in queries):
        raise ValueError("scout/queries.json debe contener una lista de hasta 12 búsquedas cortas.")
    prior = {"profiles": [], "last_scan": None}
    if OUTPUT.exists():
        try:
            prior = json.loads(OUTPUT.read_text(encoding="utf-8"))
        except Exception as exc:
            print("Archivo anterior inválido; iniciamos limpio:", exc, file=sys.stderr)
    result = {p["handle"]: p for p in prior.get("profiles", []) if isinstance(p, dict) and "handle" in p and p["handle"] not in ("emprenzona", "agora.red")}
    new_count, feeds_ok, errors = 0, 0, []
    feed_inspection = []
    for query in queries:
        print("BUSCAR:", query)
        try:
            items = list(fetch_feed(query))
            feeds_ok += 1
            report = {'query': query, 'rss_items': len(items), 'instagram_direct_links': 0, 'instagram_text_mentions': 0, 'handles_matched': 0, 'instagram_path_examples': []}
            for item in items:
                if 'instagram.com/' in item['link'].lower():
                    report['instagram_direct_links'] += 1
                    if len(report['instagram_path_examples']) < 5:
                        url = urllib.parse.urlsplit(item['link'])
                        report['instagram_path_examples'].append(url.path[:110])
                if 'instagram.com/' in (item['title'] + ' ' + item['snippet']).lower():
                    report['instagram_text_mentions'] += 1
                for handle in candidates_from(item):
                    report['handles_matched'] += 1
                    # Solo cuentas públicas indexadas; no verificamos si la cuenta permanece pública.
                    score_value = score(item, query)
                    if handle in result:
                        if score_value > result[handle].get("score", 0):
                            result[handle].update(score=score_value, headline=item["title"], snippet=item["snippet"], source_query=query)
                    else:
                        result[handle] = {
                            "handle": handle,
                            "url": f"https://www.instagram.com/{handle}/",
                            "headline": item["title"],
                            "snippet": item["snippet"],
                            "score": score_value,
                            "source_query": query,
                            "first_seen": dt.datetime.now(dt.timezone.utc).date().isoformat(),
                        }
                        new_count += 1
            feed_inspection.append(report)
        except (urllib.error.URLError, TimeoutError, ET.ParseError, ValueError, OSError) as exc:
            errors.append(f"{query}: {type(exc).__name__}: {exc}")
    # Fuente nueva: directorios públicos con cuentas explícitas, más útil que RSS.
    directory_profiles, directory_inspection, directory_errors = discover_directories()
    for listing in directory_profiles:
        handle = listing["handle"]
        if handle in result:
            previous = result[handle]
            if listing["score"] > int(previous.get("score", 0)):
                first_seen = previous.get("first_seen", dt.datetime.now(dt.timezone.utc).date().isoformat())
                previous.update(listing, first_seen=first_seen)
            else:
                # Conservar la mejor fuente, pero completar los nuevos metadatos
                # explícitos (ciudad/rubro) desde los directorios públicos.
                for field in ("country", "province", "city", "category", "location_evidence"):
                    # Actualizar categoría si la ficha original es la misma.
                    if listing.get(field) and (not previous.get(field) or
                      (field == "category" and listing.get("source_page") == previous.get("source_page"))):
                        previous[field] = listing[field]
        else:
            result[handle] = dict(listing, first_seen=dt.datetime.now(dt.timezone.utc).date().isoformat())
            new_count += 1
    errors.extend(directory_errors)

    # No inventar perfiles; no eliminar los anteriores ante fallos o feeds sin resultados.
    profiles = sorted(result.values(), key=lambda x: (-int(x.get("score", 0)), x["handle"]))[:2400]
    output = {
        "schema": 1,
        "description": "Perfiles públicos potencialmente relevantes, de búsquedas RSS indexadas. Verificar antes de contactar; sin garantías de afinidad.",
        "last_scan": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds") if feeds_ok else prior.get("last_scan"),
        "feeds_ok": feeds_ok,
        "queries_attempted": len(queries),
        "configured_searches": enabled_searches,
        "new_profiles": new_count,
        "feed_inspection": feed_inspection,
        "directory_inspection": directory_inspection,
        "directories_ok": len(directory_inspection),
        "errors": errors[:12],
        "profiles": profiles,
    }
    OUTPUT.parent.mkdir(exist_ok=True)
    OUTPUT.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"SCOUT: {len(profiles)} candidatos; {new_count} nuevos; {feeds_ok} feeds; {len(errors)} errores.")
    if errors:
        print("\n".join(errors), file=sys.stderr)
    # Si fallan todos los feeds, notificar fallos en Actions sin borrar los datos.
    if feeds_ok == 0 and not directory_inspection:
        sys.exit("Ningún RSS ni directorio público respondió. No se actualizaron candidatos.")

if __name__ == "__main__":
    main()
