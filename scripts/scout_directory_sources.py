"""Extrae exclusivamente cuentas IG mencionadas en directorios públicos de emprendedores.
Sin login, sin llamadas a la API de Instagram, sin recolección de seguidores ni DMs.
No verifica que el perfil siga existiendo en Instagram: siempre requiere revisión.
"""
from __future__ import annotations

from html.parser import HTMLParser
from urllib.parse import urlparse
import re
import urllib.request
import urllib.error

DIRECTORIES = [
    # CreatorReach no permite lectura automatizada (HTTP 403); se respeta su bloqueo.
    ("Famadex · Emprendedores Argentina", "https://famadex.com/en/ranking/instagram/people/argentina/entrepreneurship/", "famadex"),
    ("Infloo · Negocios Argentina", "https://infloo.io/es/influencers/ar/all/business", "infloo"),
    ("Climaps · Emprendimientos Argentina", "https://www.climaps.org/emprendimientos/", "climaps"),
    ("ADULP · Catálogo emprendedor La Plata", "https://www.adulp.org.ar/index.php?Itemid=118&id=45&option=com_content&view=article", "catalog"),
    ("Comunidad de Emprendedorxs · Argentina", "https://comunidademprendedorxs.jimdofree.com/emprendimientos/", "catalog"),
    ("UNL · Feria de emprendimientos Santa Fe", "https://www.unl.edu.ar/test/wp-unl/bienal/feria/", "catalog"),
    ("EmprenZona · Directorio de ferias Argentina", "https://www.emprenzona.com.ar/emprende", "emprenzona"),
    ("EmprenZona · Emprendedores de Córdoba", "https://anime.emprenzona.com.ar/ferias/cordoba", "emprenzona_cordoba"),
    ("Ágora · Estética Córdoba Capital", "https://market.agora.red/directorio/0x9432a3d17a9c6a5b%3A0x11a66a668128ae2", "agora_cordoba"),
    ("Ágora · Estética Córdoba Capital", "https://market.agora.red/directorio/0x9432a3eea07ef057%3A0xb3dc17506fe68cc6", "agora_cordoba"),
    ("Ágora · Estética Córdoba Capital", "https://market.agora.red/directorio/0x94329197e72bbcbd%3A0xec98e6ba96cfe1c8", "agora_cordoba"),
    ("Ágora · Estética Córdoba Capital", "https://market.agora.red/directorio/0x94329f33ad95c857%3A0x67930abe2484fba3", "agora_cordoba"),
    ("Ágora · Estética Córdoba Capital", "https://market.agora.red/directorio/0x9432a3b1d59e5a4f%3A0x563262606d2cddea", "agora_cordoba"),
    ("Ágora · Estética Córdoba Capital", "https://market.agora.red/directorio/0x9432a1e6bb7bbe4b%3A0xc8e5260e4586ba3f", "agora_cordoba"),
    ("Ágora · Estética Córdoba Capital", "https://market.agora.red/directorio/0x943299eacaec5f95%3A0x8b8b5b321dd5235b", "agora_cordoba"),
    ("Ágora · Estética Córdoba Capital", "https://market.agora.red/directorio/0x9432a3e5e7d0d64b%3A0x417815a712c195c2", "agora_cordoba"),
    ("Ágora · Estética Córdoba Capital", "https://market.agora.red/directorio/0x9432a1003653bd8f%3A0x187002a4c3e63142", "agora_cordoba"),
    ("Ágora · Estética Córdoba Capital", "https://market.agora.red/directorio/0x9432bd034d749a49%3A0x96301b9835b1c5cd", "agora_cordoba"),
    ("Ágora · Estética Córdoba Capital", "https://market.agora.red/directorio/0x943299002bc5beb9%3A0x67c418519278b741", "agora_cordoba"),
    ("Ágora · Estética Córdoba Capital", "https://market.agora.red/directorio/0x943299002c813f6f%3A0x3068af4e93dccf58", "agora_cordoba"),
    ("Ágora · Estética Córdoba Capital", "https://market.agora.red/directorio/0x943299002bc281a3%3A0xbf4bbf98383dffc3", "agora_cordoba"),
    ("Ágora · Estética Córdoba Capital", "https://market.agora.red/directorio/0x9432a3fa150fe481%3A0xe23b299aaf8c5958", "agora_cordoba"),
    ("Ágora · Peluquería Córdoba Capital", "https://market.agora.red/directorio/0x9432a30a41b4ea25%3A0x1484f5f192d41f0f", "agora_cordoba"),
    ("Ágora · Peluquería Córdoba Capital", "https://market.agora.red/directorio/0x9432a35cf6a254c3%3A0x3e9afe9e59927465", "agora_cordoba"),
]
HANDLE = re.compile(r"^[a-z0-9._]{3,30}$", flags=re.I)
RESERVED = {"instagram", "explore", "accounts", "reel", "reels", "tv", "p", "stories", "direct", "web", "about", "developers", "api"}

def valid(handle):
    return bool(HANDLE.fullmatch(handle)) and handle.lower() not in RESERVED and ".." not in handle

class DirectoryHTML(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.skip = 0
        self.heading = ""
        self.country = ""
        self.titles = []
        self.tokens = []
        self.links = []
        self.capture = None
        self.buffer = []
        self.anchor_url = None
        self.anchor_text = []
        self.source_position = 0

    def handle_starttag(self, tag, attrs):
        data = dict(attrs)
        if tag in ("script", "style", "noscript"):
            self.skip += 1
        if self.skip:
            return
        if tag in ("h3", "h4", "h5"):
            self.capture = tag
            self.buffer = []
        if tag == "a":
            self.anchor_url = data.get("href", "")
            self.anchor_text = []
        if tag in ("meta",):
            return

    def handle_data(self, data):
        if self.skip:
            return
        txt = re.sub(r"\s+", " ", data).strip()
        if not txt:
            return
        self.tokens.append((txt, self.heading, self.country))
        if self.capture is not None:
            self.buffer.append(txt)
        if self.anchor_url is not None:
            self.anchor_text.append(txt)

    def handle_endtag(self, tag):
        if tag in ("script", "style", "noscript"):
            self.skip = max(self.skip - 1, 0)
            return
        if self.skip:
            return
        if self.capture == tag:
            title = " ".join(self.buffer).strip()[:160]
            if tag == "h3":
                self.heading = title
            elif tag in ("h4", "h5") and title.casefold() in ("argentina", "argentine republic"):
                self.country = "Argentina"
            elif tag in ("h4", "h5"):
                self.country = title
            self.capture = None
            self.buffer = []
        if tag == "a" and self.anchor_url is not None:
            self.links.append((self.anchor_url, " ".join(self.anchor_text)[:180], self.heading, self.country))
            self.anchor_url = None
            self.anchor_text = []

def instagram_handle(url):
    if url.startswith("//"):
        url = "https:" + url
    try:
        url_parts = urlparse(url)
    except ValueError:
        return None
    if (url_parts.hostname or "").lower() not in ("instagram.com", "www.instagram.com"):
        return None
    pieces = [p for p in url_parts.path.split("/") if p]
    if len(pieces) != 1 and not (len(pieces) == 2 and pieces[1] == "profilecard"):
        return None
    return pieces[0].lower() if valid(pieces[0]) else None

def record(handle, title, summary, source, source_page, score):
    return {
        "handle": handle.lower(),
        "url": f"https://www.instagram.com/{handle.lower()}/",
        "headline": (title or f"@{handle} · Cuenta listada en directorio público")[:250],
        "snippet": (summary or f"Listado público en {source}. Revisá la biografía y autenticidad antes de considerarlo prospecto.")[:650],
        "score": score,
        "source_query": source,
        "source_page": source_page,
        "discovery_method": "directorio_publico"
    }

def parse_directory(markup, url, label, kind):
    parser = DirectoryHTML()
    parser.feed(markup)
    found = {}
    if kind == "creatorreach":
        for i, (text, heading, country) in enumerate(parser.tokens):
            m = re.fullmatch(r"@([a-z0-9._]{3,30})", text, flags=re.I)
            if m and valid(m.group(1)) and heading:
                # El handle es una etiqueta aislada después del nombre del creador.
                prev = parser.tokens[max(0, i-2):i]
                if not (prev and any("@" in t[0] for t in prev)):
                    handle = m.group(1).lower()
                    snippet = " ".join(t[0] for t in parser.tokens[i+1:i+3])[:270]
                    found[handle] = record(handle, heading, snippet, label, url, 38)
    elif kind == "famadex":
        for link, title, heading, country in parser.links:
            for m in re.finditer(r"@([a-z0-9._]{3,30})\s*·\s*(?:Content creator|Public figure)", title, flags=re.I):
                handle = m.group(1).lower()
                if valid(handle):
                    display = title.split("@")[0].strip(" ·")
                    found[handle] = record(handle, display, "Ranking público de emprendedores argentinos. Puede incluir perfiles muy grandes; validar adecuación.", label, url, 28)
    elif kind == "infloo":
        for link, title, heading, country in parser.links:
            handle = instagram_handle(link)
            if handle:
                found[handle] = record(handle, title or f"@{handle}", "Perfil listado en ranking de negocios y emprendimiento de Argentina.", label, url, 34)
    elif kind == "climaps":
        for link, title, heading, country in parser.links:
            handle = instagram_handle(link)
            if handle and country.casefold() == "argentina":
                found[handle] = record(handle, heading, "Emprendimiento listado en directorio de proyectos de Argentina.", label, url, 45)
    elif kind == "emprenzona":
        # El listado público muestra fichas de marcas con título h3 y @usuario visible.
        # Se toma sólo la cadena @handle completa que figura expresamente en el HTML,
        # nunca el nombre del negocio convertido en usuario hipotético.
        for i, (token, heading, country) in enumerate(parser.tokens):
            m = re.fullmatch(r"@([a-z0-9._]{3,30})", token, flags=re.I)
            if not m or not valid(m.group(1)):
                continue
            handle = m.group(1).lower()
            # El nombre de la marca precede al @usuario en la ficha HTML.
            # Las líneas cercanas aportan descripción del emprendimiento.
            previous = parser.tokens[max(0, i-6):i]
            title = heading if heading and len(heading) <= 130 else "Emprendimiento @" + handle
            if not previous or not any(t[0] == title for t in previous):
                # Diferentes tarjetas pueden usar títulos duplicados, pero
                # sin encabezado cercano no atribuimos el @usuario al negocio.
                continue
            next_words = []
            for line, next_heading, _ in parser.tokens[i+1:i+5]:
                if next_heading != heading or line.startswith("@"):
                    break
                if len(line) > 15 and not line.startswith(("Ver emprendimiento", "Ver perfil")):
                    next_words.append(line)
            summary = " ".join(next_words)[:580]
            entry = record(
                handle, title,
                summary or "Emprendimiento publicado en el directorio argentino de ferias.",
                label, url, 47
            )
            # El directorio declara explícitamente rubro y ubicación por ficha.
            category = ""
            categories = ("Gastronomía","Indumentaria","Accesorios","Artesanías","Decoración","Repostería","Cosmética","Librería","Velas Y Aromas","Arte Y Diseño","Impresión 3D","Bebidas","Juegos","Bijouterie","Emprendimiento")
            for pos, (near, _, _) in enumerate(previous):
                if near == title and pos > 0 and previous[pos-1][0] in categories:
                    category = previous[pos-1][0]
                    break
            city = ""
            for line, following_heading, _ in parser.tokens[i+1:i+13]:
                if following_heading != heading:
                    break
                if line.startswith("⌖"):
                    city = line.lstrip("⌖").strip()[:100]
                    break
            if category:
                entry["category"] = category
            if city:
                entry["city"] = city if city.casefold() != "argentina" else ""
                entry["location_evidence"] = "Ubicación publicada en directorio" if city.casefold() != "argentina" else "Directorio: país Argentina"
            entry["country"] = "Argentina"
            found[handle] = entry
    elif kind == "emprenzona_cordoba":
        # Landing pública específica de la provincia de Córdoba.
        # Solo usa enlaces explícitos a instagram.com/<usuario> en la ficha.
        # En particular, "Córdoba - Cruz del Eje" NO equivale a Córdoba Capital.
        for link, title, heading, country in parser.links:
            handle = instagram_handle(link)
            # Solo cuentas de emprendedores publicadas como @usuario, no links
            # genéricos del sitio ni sus propios perfiles corporativos.
            if not handle or title.strip().lower().lstrip("@") != handle or handle == "emprenzona":
                continue
            near = [t for t, h, _ in parser.tokens if h == heading]
            city = ""
            for item in near:
                match = re.search(r"Córdoba\s*[-–]\s*([A-Za-zÁÉÍÓÚáéíóúÑñÜü ]{3,75})", item)
                if match:
                    city = match.group(1).strip()[:90]
                    break
            entry = record(
                handle, heading or ("Emprendimiento @" + handle),
                "Cuenta enlazada desde el directorio provincial de emprendedores de Córdoba.",
                label, url, 62
            )
            entry.update(country="Argentina", province="Córdoba", category="Emprendimiento",
                         location_evidence="Directorio provincial explícito: Córdoba")
            if city:
                entry["city"] = city
                entry["location_evidence"] = "Directorio provincial: Córdoba - " + city
            found[handle] = entry
    elif kind == "agora_cordoba":
        # Solo enlaces a perfiles publicados por fichas de negocios cordobeses.
        # Córdoba Capital está verificada en la URL y encabezado de cada ficha.
        title_match = re.search(r"<title[^>]*>(.*?)</title>", markup, flags=re.I | re.S)
        display = re.sub(r"<[^>]+>", " ", title_match.group(1)).strip() if title_match else label
        display = display.split("·")[0].strip()[:130]
        for link, title, heading, country in parser.links:
            handle = instagram_handle(link)
            # Excluir Instagram del propio directorio, que aparece en cada ficha.
            if not handle or handle == "agora.red":
                continue
            rec = record(handle, display, label + ". Cuenta de Instagram enlazada directamente desde una ficha pública.", label, url, 67)
            rec.update(country="Argentina", province="Córdoba", city="Córdoba Capital",
                       category="Peluquería y belleza" if "Peluquería" in label else "Estética y belleza",
                       location_evidence="Ficha pública de negocio ubicado en Córdoba Capital")
            found[handle] = rec
    elif kind == "catalog":
        for link, title, heading, country in parser.links:
            handle = instagram_handle(link)
            if handle:
                display = title.strip() if title and not title.lower().startswith(("http", "www.", "@")) and len(title) <= 90 else "Emprendimiento @" + handle
                # El catálogo está dedicado a proyectos argentinos; el perfil puede cambiar con el tiempo.
                found[handle] = record(handle, display, "Cuenta de Instagram enlazada explícitamente desde un catálogo de emprendimientos argentinos. Revisar actividad actual.", label, url, 43)
    return list(found.values()), {"directory": label, "kind": kind, "handles_found": len(found), "html_chars": len(markup)}

def fetch_directory(url):
    req = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0 (compatible; NetworkerScout/1.2; public directory discovery)",
        "Accept": "text/html,application/xhtml+xml",
    })
    with urllib.request.urlopen(req, timeout=18) as res:
        content_type = res.headers.get("content-type", "").lower()
        if "html" not in content_type and content_type:
            raise ValueError("Respuesta no HTML: " + content_type)
        raw = res.read(8_000_000)
        charset = res.headers.get_content_charset() or "utf-8"
    return raw.decode(charset, errors="replace")

def discover():
    profiles = []
    reports = []
    errors = []
    for label, url, kind in DIRECTORIES:
        try:
            markup = fetch_directory(url)
            records, report = parse_directory(markup, url, label, kind)
            profiles.extend(records)
            reports.append(report)
            print("DIRECTORIO:", label, "→", len(records), "cuentas listadas")
        except (OSError, urllib.error.URLError, ValueError, TimeoutError, UnicodeError) as exc:
            errors.append(f"{label}: {type(exc).__name__}: {exc}")
            print("DIRECTORIO FALLÓ:", label, type(exc).__name__, str(exc)[:180])
    return profiles, reports, errors

if __name__ == "__main__":
    for profile in discover()[0][:5]:
        print(profile)
