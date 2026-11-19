
import { createClient } from "npm:@supabase/supabase-js@2.95.0";
const H={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info","Access-Control-Allow-Methods":"POST,OPTIONS","Content-Type":"application/json;charset=utf-8"};
const respond=(data:any,status=200)=>new Response(JSON.stringify(data),{status,headers:H});
const clean=(x:any,n=150)=>String(x??"").replace(/[\u0000-\u001f<>]/g," ").trim().slice(0,n);
const norm=(x:any)=>clean(x,500).toLocaleLowerCase("es").normalize("NFKD").replace(/[\u0300-\u036f]/g,"");
const blocked=new Set(["instagram","stories","explore","accounts","reel","reels","p","tv","direct","about","developers","privacy","terms","web","api","help","tags","download","challenge","audio","login","signup","profilecard"]);
const sources=[
 ["Modash · Córdoba · Fitness","https://www.modash.io/find-influencers/argentina/c%C3%B3rdoba/fitness","cordoba"],
 ["Modash · Córdoba · Belleza","https://www.modash.io/find-influencers/argentina/c%C3%B3rdoba/beauty","cordoba"],
 ["Modash · Córdoba · General","https://www.modash.io/find-influencers/argentina/c%C3%B3rdoba","cordoba"],
 ["Modash · Argentina · Salud","https://www.modash.io/find-influencers/argentina/health","general"],
 ["Modash · Argentina · Fitness","https://www.modash.io/find-influencers/argentina/fitness","general"],
 ["Modash · Argentina · Gastronomía","https://www.modash.io/find-influencers/argentina/food","general"],
 ["Modash · Argentina · Moda","https://www.modash.io/find-influencers/argentina/fashion","general"],
 ["Modash · Buenos Aires · General","https://www.modash.io/find-influencers/argentina/buenos-aires","buenos aires"],
 ["Modash · Buenos Aires · Fitness","https://www.modash.io/find-influencers/argentina/buenos-aires/fitness","buenos aires"],
 ["Modash · Buenos Aires · Belleza","https://www.modash.io/find-influencers/argentina/buenos-aires/beauty","buenos aires"],
 ["Modash · Buenos Aires · Gastronomía","https://www.modash.io/find-influencers/argentina/buenos-aires/food","buenos aires"],
 ["Modash · Rosario · General","https://www.modash.io/find-influencers/argentina/rosario","santa fe"],
 ["Modash · Mendoza · General","https://www.modash.io/find-influencers/argentina/mendoza","mendoza"],
 ["Modash · Santa Fe · General","https://www.modash.io/find-influencers/argentina/santa-fe","santa fe"],
 ["Modash · Fitness Córdoba","https://www.modash.io/find-influencers/argentina/c%C3%B3rdoba/fitness","cordoba"],
 ["Famadex · Emprendedores Argentina","https://famadex.com/en/ranking/instagram/people/argentina/entrepreneurship/","general"],
 ["Infloo · Negocios Argentina","https://infloo.io/es/influencers/ar/all/business","general"],
 ["Climaps · Emprendimientos Argentina","https://www.climaps.org/emprendimientos/","general"],
 ["ADULP · La Plata","https://www.adulp.org.ar/index.php?Itemid=118&id=45&option=com_content&view=article","buenos aires"],
 ["Comunidad Emprendedorxs","https://comunidademprendedorxs.jimdofree.com/emprendimientos/","general"],
 ["UNL · Santa Fe","https://www.unl.edu.ar/test/wp-unl/bienal/feria/","santa fe"],
 ["EmprenZona · Argentina","https://www.emprenzona.com.ar/emprende","general"],
 ["EmprenZona · Córdoba","https://anime.emprenzona.com.ar/ferias/cordoba","cordoba"],
 ["Ágora · Estética Córdoba","https://market.agora.red/directorio/0x9432a3d17a9c6a5b%3A0x11a66a668128ae2","cordoba"],
 ["Ágora · Estética Córdoba","https://market.agora.red/directorio/0x9432a3eea07ef057%3A0xb3dc17506fe68cc6","cordoba"],
 ["Ágora · Estética Córdoba","https://market.agora.red/directorio/0x94329197e72bbcbd%3A0xec98e6ba96cfe1c8","cordoba"],
 ["Ágora · Estética Córdoba","https://market.agora.red/directorio/0x94329f33ad95c857%3A0x67930abe2484fba3","cordoba"],
 ["Ágora · Estética Córdoba","https://market.agora.red/directorio/0x9432a3b1d59e5a4f%3A0x563262606d2cddea","cordoba"],
 ["Ágora · Estética Córdoba","https://market.agora.red/directorio/0x9432a1e6bb7bbe4b%3A0xc8e5260e4586ba3f","cordoba"],
 ["Ágora · Estética Córdoba","https://market.agora.red/directorio/0x943299eacaec5f95%3A0x8b8b5b321dd5235b","cordoba"],
 ["Ágora · Estética Córdoba","https://market.agora.red/directorio/0x9432a3e5e7d0d64b%3A0x417815a712c195c2","cordoba"],
 ["Ágora · Estética Córdoba","https://market.agora.red/directorio/0x9432a1003653bd8f%3A0x187002a4c3e63142","cordoba"],
 ["Ágora · Estética Córdoba","https://market.agora.red/directorio/0x9432bd034d749a49%3A0x96301b9835b1c5cd","cordoba"],
 ["Ágora · Estética Córdoba","https://market.agora.red/directorio/0x943299002bc5beb9%3A0x67c418519278b741","cordoba"],
 ["Ágora · Estética Córdoba","https://market.agora.red/directorio/0x943299002c813f6f%3A0x3068af4e93dccf58","cordoba"],
 ["Ágora · Estética Córdoba","https://market.agora.red/directorio/0x943299002bc281a3%3A0xbf4bbf98383dffc3","cordoba"],
 ["Ágora · Estética Córdoba","https://market.agora.red/directorio/0x9432a3fa150fe481%3A0xe23b299aaf8c5958","cordoba"],
 ["Ágora · Peluquería Córdoba","https://market.agora.red/directorio/0x9432a30a41b4ea25%3A0x1484f5f192d41f0f","cordoba"],
 ["Ágora · Peluquería Córdoba","https://market.agora.red/directorio/0x9432a35cf6a254c3%3A0x3e9afe9e59927465","cordoba"]
] as const;
function getHandle(raw:string){
 try{
  const u=new URL(raw.startsWith("//")?"https:"+raw:raw.replaceAll("&amp;","&"));
  if(!/^(www\.)?instagram\.com$/i.test(u.hostname))return "";
  const parts=u.pathname.split("/").filter(Boolean);
  if(parts.length!==1)return "";
  const h=parts[0].toLowerCase();
  return /^[a-z0-9._]{3,30}$/.test(h)&&!h.includes("..")&&!blocked.has(h)?h:"";
 }catch{return ""}
}
const provinceOfCity:Record<string,string>={"cordoba capital":"Córdoba","cordoba":"Córdoba","cruz del eje":"Córdoba","lanus":"Buenos Aires","quilmes":"Buenos Aires","avellaneda":"Buenos Aires","lomas de zamora":"Buenos Aires","vicente lopez":"Buenos Aires","san isidro":"Buenos Aires","la plata":"Buenos Aires","viedma":"Río Negro","rosario":"Santa Fe"};
function category(s:string){const n=norm(s);return /estetic|belleza|cosmetic|peluquer|maquill|spa/.test(n)?"Estética y belleza":/salud|nutric|bienestar|medic|kinesi|fitness|yoga/.test(n)?"Salud y bienestar":/emprend|negocio|comerc|venta|tienda/.test(n)?"Comercio y emprendimiento":/coach|lider|marca personal|marketing/.test(n)?"Marca personal":"Sin clasificar"}
function profile(h:string,title:string,snippet:string,url:string,label:string,f:any,evidence:{city?:string,province?:string,country?:string}={}){
 const text=norm(h+" "+title+" "+snippet);
 const keywords=clean(f.keywords,300).split(",").map(x=>x.trim()).filter(Boolean);
 const matched=keywords.filter(k=>text.includes(norm(k)));
 const confirmed=Boolean(evidence.city||evidence.province||evidence.country);
 return {handle:h,profile_url:"https://www.instagram.com/"+h+"/",headline:clean(title,250)||"@"+h,
  snippet:clean(snippet,950),source_page:clean(url,1000),source_provider:clean(label,80),
  country:evidence.country||"",province:evidence.province||"",city:evidence.city||"",category:category(title+" "+snippet),
  location_evidence:confirmed?"Ubicación indicada en directorio público":"",location_confirmed:confirmed,
  search_country:clean(f.country,80),search_province:clean(f.province,100),search_city:clean(f.city,100),search_focus:clean(f.focus,100),
  match_keywords:matched,searches:[label,...(f.name?[clean(f.name,90)]:[])],score:Math.min(90,25+15*matched.length+(confirmed?25:0))};
}
const strip=(s:string)=>s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi," ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/&nbsp;|&#160;/g," ").replace(/&amp;/g,"&").replace(/\s+/g," ").trim();
// Perfiles con ficha propia publicada en el catálogo: nunca asociar la biografía de una tarjeta a otra.
// Cada tarjeta se aísla antes de atribuir nombre, @usuario y descripción a una cuenta.
function fromModash(html:string,label:string,url:string,f:any){
 const seen=new Map<string,any>();
 const cards=html.split('<div class="relative w-full" country="Argentina">').slice(1);
 const words=clean(f.keywords,300).split(",").map(x=>norm(x.trim())).filter(Boolean);
 const cityWanted=norm(f.city).replace(/ capital$/,"").trim();
 const region=label.includes("Córdoba")?"Córdoba":label.includes("Buenos Aires")?"Buenos Aires":
  label.includes("Rosario")||label.includes("Santa Fe")?"Santa Fe":label.includes("Mendoza")?"Mendoza":"";
 for(const card of cards.slice(0,25)){
  const anchor=card.match(/<a\b[^>]*href=["'](https:\/\/www\.instagram\.com\/([a-z0-9._]{3,30}))["'][^>]*>\s*@\2\s*<\/a>/i);
  if(!anchor)continue;
  const h=getHandle(anchor[1]);if(!h||seen.has(h))continue;
  const name=strip((card.match(/<h2\b[^>]*>\s*<span>([\s\S]*?)<\/span>/i)||[])[1]||"")
    .replace(/^\d+\.\s*/,"").slice(0,190);
  const bio=strip((card.match(/<p\b[^>]*class=["'][^"']*line-clamp-3[^"']*["'][^>]*>([\s\S]*?)<\/p>/i)||[])[1]||"").slice(0,850);
  if(!name||!bio)continue;
  const searchable=norm(h+" "+name+" "+bio);
  if(words.length&&!words.some(k=>searchable.includes(k)))continue;
  if(cityWanted&&!searchable.includes(cityWanted))continue;
  const hasRegion=region!==""&&searchable.includes(norm(region));
  const confirmed=hasRegion?{country:"Argentina",province:region}:{};
  const row=profile(h,name,bio,url,label,f,confirmed);
  row.category=label.includes("Belleza")?"Belleza":label.includes("Salud")?"Salud":
   label.includes("Fitness")?"Fitness y entrenamiento":label.includes("Gastronomía")?"Gastronomía":
   label.includes("Moda")?"Moda":"Profesionales y creadores";
  row.search_province=region||clean(f.province,100);
  row.match_evidence=hasRegion?
   "Nombre y biografía publicados por catálogo; la biografía menciona "+region+" pero la privacidad de Instagram no está verificada":
   "Nombre, Instagram y biografía publicados por catálogo; región de audiencia, no domicilio verificado";
  if(!hasRegion)row.location_evidence="Catálogo por región/audiencia; residencia personal sin verificar";
  seen.set(h,row);
 }
 return [...seen.values()];
}
function fromDirectory(html:string,label:string,url:string,f:any){
 if(label.startsWith("Modash"))return fromModash(html,label,url,f);
 const found=new Map<string,any>();
 const anchors=/<a\b([^>]*href\s*=\s*["']([^"']+)["'][^>]*)>([\s\S]*?)<\/a>/gi;
 for(const m of html.matchAll(anchors)){
  const h=getHandle(m[2]);if(!h||found.has(h))continue;
  const title=strip(m[3]).slice(0,250);
  const window=strip(html.slice(Math.max(0,m.index-500),Math.min(html.length,m.index+m[0].length+500))).slice(0,900);
  const c=label.includes("Córdoba")?"Córdoba":label.includes("Santa Fe")?"Santa Fe":label.includes("La Plata")?"Buenos Aires":"";
  const city=label.includes("Ágora")?"Córdoba Capital":label.includes("La Plata")?"La Plata":"";
  found.set(h,profile(h,title||h,window.slice(0,600),url,label,f,city?{country:"Argentina",province:c,city}:c?{country:"Argentina",province:c}:{}));
 }
 // La ficha HTML ofrece nombre, rubro, descripción y ciudad como campos separados.
 // No atribuir al perfil textos cercanos de otras fichas, encabezados ni banners.
 if(label.startsWith("EmprenZona")){
  const articles=html.match(/<article\b[^>]*class=["'][^"']*entrepreneur-card[^"']*["'][\s\S]*?<\/article>/gi)||[];
  for(const article of articles.slice(0,4000)){
   const field=(key:string)=>{const m=article.match(new RegExp('data-'+key+'=["\\x27]([^"\\x27]*)["\\x27]','i'));return m?strip(m[1]):""};
   const hh=(article.match(/<div\b[^>]*class=["'][^"']*\bhandle\b[^"']*["'][^>]*>\s*@([a-z0-9._]{3,30})\s*<\/div>/i)||[])[1];
   const h=(hh||"").toLowerCase();if(!h||blocked.has(h)||h.includes(".."))continue;
   const name=field("nombre")||strip((article.match(/<h3\b[^>]*>([\s\S]*?)<\/h3>/i)||[])[1]||"");
   const rubric=field("rubro");
   const descr=strip((article.match(/<p\b[^>]*class=["'][^"']*\bdescription\b[^"']*["'][^>]*>([\s\S]*?)<\/p>/i)||[])[1]||"");
   const geoText=field("zona")||strip((article.match(/<span\b[^>]*class=["'][^"']*(?:location|zone)[^"']*["'][^>]*>([\s\S]*?)<\/span>/i)||[])[1]||"");
   let city="",province="";
   if(label.includes("Córdoba")){province="Córdoba";const mm=geoText.match(/(?:córdoba\s*[-–])?\s*([a-zA-ZÁÉÍÓÚÜÑáéíóúüñ ]{3,70})/i);if(mm)city=clean(mm[1],70);}
   else {
    const part=geoText.replace(/^⌖/,"").trim();
    city=clean(part,80);province=provinceOfCity[norm(city)]||"";
   }
   const place=province?{country:"Argentina",province,city}:city?{country:"Argentina",city}:{};
   const row=profile(h,name||"@"+h,descr,url,label,f,place);
   if(rubric)row.category=clean(rubric,100);
   row.match_evidence="Directorio: nombre, rubro y descripción comercial; biografía de Instagram no consultada";
   found.set(h,row);
  }
 }

 return [...found.values()];
}
const terms:Record<string,string[]>={
"Emprendedores":["emprendedor","emprendimiento","emprendedora","negocio"],
"Estética y belleza":["estética","centro de estética","cosmética","peluquería"],
"Salud y bienestar":["nutricionista","bienestar","salud","kinesiología"],
"Profesionales":["profesionales","consultor","independiente"],
"Comercio y ventas":["tienda","comercio","negocio"],
"Marca personal y liderazgo":["marca personal","coach","liderazgo"],
"Todos los rubros":["emprendimiento","comercio","profesional"]};
function queryFor(f:any,b:number){
 const keywords=clean(f.keywords,300).split(",").map(x=>x.trim()).filter(Boolean);
 const interestTerms=Array.isArray(f.interests)?f.interests:[];
 const alternatives=keywords.length?keywords:[...interestTerms,...(terms[f.focus]||terms.Emprendedores)];
 const term=alternatives[Math.floor(b/3)%alternatives.length]||"emprendedores";
 const loc=[f.city,f.province,f.country].filter(Boolean).map(x=>'"'+clean(x,75)+'"').join(" ");
 return ['site:instagram.com','"'+clean(term,80)+'"',loc,'-inurl:/p/','-inurl:/reel/','-inurl:/stories/'].join(" ").trim();
}
function matchesDirectory(p:any,f:any){
 const a=(x:any)=>norm(x).replace(/ capital$/,"").replace(/^ciudad de /,"");
 if(f.country && a(f.country)!=="argentina")return false;
 const sourceRegion=Boolean(p.source_provider?.startsWith("Modash ·") && p.search_province && a(p.search_province)===a(f.province));
 if(f.province && (!p.location_confirmed || a(p.province)!==a(f.province))&&!sourceRegion)return false;
 if(f.city && (!p.location_confirmed || !p.city || !(a(p.city)===a(f.city)||a(p.city).includes(a(f.city)))))return false;
 const hay=a([p.handle,p.headline,p.snippet,p.category].filter(Boolean).join(" "));
 const keys=clean(f.keywords,300).split(",").map(x=>a(x)).filter(Boolean);
 if(keys.length&&!keys.some(k=>hay.includes(k)))return false;
 const desired=Array.isArray(f.interests)?f.interests.map(a):[];
 if(desired.length&&!desired.some(k=>hay.includes(k)))return false;
 const focus=a(f.focus);
 if(focus==="todos los rubros"||focus==="emprendedores")return true;
 if(focus==="estetica y belleza")return a(p.category)==="estetica y belleza"||/cosmet|pestañ|peluquer/.test(hay);
 if(focus==="salud y bienestar")return a(p.category)==="salud y bienestar";
 if(focus==="comercio y ventas")return a(p.category)==="comercio y emprendimiento";
 if(focus==="marca personal y liderazgo")return a(p.category)==="marca personal";
 if(focus==="profesionales")return a(p.category)==="profesionales";
 return true;
}
async function fetchResource(url:string,head:Record<string,string>={},timeout=15000){
 const ctrl=new AbortController(),t=setTimeout(()=>ctrl.abort(),timeout);
 try{return await fetch(url,{headers:{"User-Agent":"NETWORKERScout/2.2 (+manual profile research; no Instagram access)","Accept":"text/html,application/json",...head},signal:ctrl.signal});}
 finally{clearTimeout(t)}
}

function cleanWebTitle(s:string){return clean(strip(s).replace(/\s*[•·]\s*Instagram.*$/i,"").replace(/\s*[-–]\s*Instagram.*$/i,""),250)}
// Cada bloque es un resultado individual, no palabras tomadas del resto de la página.
function fromBraveResults(html:string,f:any,sourceUrl:string){
 const parts=html.split(/<div\s+class=["']snippet\s+/i).slice(1);
 const rows:any[]=[];
 const keys=clean(f.keywords,300).split(",").map(x=>norm(x.trim())).filter(Boolean);
 const wantedCity=norm(f.city).replace(/ capital$/,"").trim(), wantedProvince=norm(f.province);
 const cityNeedle=(s:string)=>s&&norm(s).replace(/ capital$/,"").trim();
 for(const part of parts.slice(0,45)){
  if(!/^.{0,190}data-type=["']web["']/is.test(part))continue;
  const block=part.slice(0,9000);
  const anchor=block.match(/<a\s+href=["'](https?:\/\/(?:www\.)?instagram\.com\/[a-z0-9._]{3,30}\/?(?:[?#][^"']*)?)["'][^>]*>([\s\S]*?)<\/a>/i);
  if(!anchor)continue;
  const h=getHandle(anchor[1]);if(!h)continue;
  const titleMatch=anchor[2].match(/<div\s+class=["'][^"']*search-snippet-title[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
  const attr=anchor[2].match(/<div\s+class=["'][^"']*search-snippet-title[^"']*["']\s+title=["']([^"']+)["']/i);
  const title=cleanWebTitle(titleMatch?.[1]||attr?.[1]||h);
  const snippetMatch=block.match(/<div\s+class=["'][^"']*line-clamp-dynamic[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
  const snippet=clean(strip(snippetMatch?.[1]||""),850);
  const relevant=norm(h+" "+title+" "+snippet);
  if(!keys.some(k=>relevant.includes(k)))continue;
  // Si se pide ciudad, exigimos que figure explícitamente en esta ficha.
  // Si sólo se pide provincia, exigimos su mención explícita. La query no verifica domicilio.
  if(wantedCity && !relevant.includes(wantedCity))continue;
  if(!wantedCity && wantedProvince && !relevant.includes(wantedProvince))continue;
  const row=profile(h,title,snippet,sourceUrl,"Brave Search · web pública",f);
  row.match_evidence="La palabra aparece en el @usuario, título o fragmento indexado; ubicación mencionada, sin confirmar";
  row.location_evidence="Mención textual en buscador; no es domicilio verificado";
  rows.push(row);
 }
 return [...new Map(rows.map(r=>[r.handle,r])).values()];
}

/** Búsqueda de una persona o actividad en páginas de enlaces públicos, no en cuentas privadas. */
function queryLinked(f:any,b:number){
 const hosts=["linktr.ee","beacons.ai","bio.site","carrd.co","solo.to","taplink.cc","about.me","lnk.bio"];
 const word=clean(f.keywords,140).split(",").map(x=>x.trim()).filter(Boolean)[b%Math.max(1,clean(f.keywords,140).split(",").filter(Boolean).length)]||"";
 const place=[f.city,f.province,f.country].filter(Boolean).map(x=>'"'+clean(x,75)+'"').join(" ");
 return ['site:'+hosts[b%hosts.length],'"'+clean(word,100)+'"',place,'instagram'].join(" ").trim();
}
const linkedHosts=new Set(["linktr.ee","beacons.ai","bio.site","carrd.co","solo.to","taplink.cc","about.me","lnk.bio"]);
async function fromLinkedGooglePages(results:any[],f:any,providerLabel:string){
 const rows:any[]=[];const problems:string[]=[];
 const keys=clean(f.keywords,300).split(",").map(x=>norm(x.trim())).filter(Boolean);
 const city=norm(f.city).replace(/ capital$/,""),province=norm(f.province);
 // Sólo páginas de enlaces personales identificadas y un único usuario de Instagram asociado.
 for(const hit of results.slice(0,8)){
  if(rows.length>=5)break;
  let page:URL;
  try{page=new URL(String(hit.link||hit.url||""))}catch{continue}
  const domain=page.hostname.toLowerCase().replace(/^www\./,"");
  if(page.protocol!=="https:"||!linkedHosts.has(domain)||page.username||page.password||!page.pathname||page.pathname==="/")continue;
  let html="";
  try{
   const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),8500);
   try{
    // Sin redirecciones para evitar saltos a direcciones no autorizadas.
    const response=await fetch(page.href,{redirect:"error",headers:{Accept:"text/html"},signal:ctl.signal});
    if(!response.ok)continue;
    html=(await response.text()).slice(0,450000);
   }finally{clearTimeout(timer)}
  }catch(e){problems.push(domain+": no fue posible leer la página");continue}
  const normalized=html.replace(/\\u002[fF]/g,"/").replace(/\\\//g,"/").replaceAll("&amp;","&");
  const handles=new Set<string>();
  for(const m of normalized.matchAll(/https?:\/\/(?:www\.)?instagram\.com\/([a-z0-9._]{3,30})(?=$|[/?#"'<\s\\])/gi)){
   const handle=getHandle("https://www.instagram.com/"+m[1]+"/");
   if(handle)handles.add(handle);
  }
  if(handles.size!==1)continue;
  const handle=[...handles][0];
  const pageTitle=clean(strip((html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)||[])[1]||""),200);
  const snippet=clean(hit.snippet||"",450);
  const hay=norm(handle+" "+pageTitle+" "+snippet);
  if(!keys.some(k=>hay.includes(k)))continue;
  // La ubicación se usa en la búsqueda, no como domicilio acreditado.
  const geoMention=[city,province].filter(Boolean).some(k=>hay.includes(k));
  const row=profile(handle,pageTitle||clean(hit.title,200),snippet,page.href,providerLabel,f);
  row.match_evidence="Instagram enlazado desde página personal pública; actividad en título o extracto. "+
   (geoMention?"El lugar figura en el texto de la fuente.":"La ubicación personal no está comprobada.");
  row.bio_verified=false;row.public_account_verified=false;
  rows.push(row);
 }
 return {rows,problems};
}
/** Comprobación opcional con el proveedor de datos públicos de perfiles (consume créditos). */
async function checkActualInstagramProfile(handle:string,key:string){
 const params=new URLSearchParams({engine:"instagram_profile",profile_id:handle,api_key:key});
 const res=await fetchResource("https://serpapi.com/search.json?"+params.toString(),{"Accept":"application/json"},15000);
 if(!res.ok)return {error:"Consulta de perfil "+handle+": HTTP "+res.status};
 const body=await res.json();
 if(body.error)return {error:"Perfil "+handle+": "+clean(body.error,140)};
 const actual=body.profile_results;
 if(!actual||actual.is_private!==false||typeof actual.biography!=="string")
  return {error:"Perfil "+handle+": privacidad o biografía no verificable",private:actual?.is_private===true};
 return {bio:clean(actual.biography,1000),name:clean(actual.full_name||handle,250),is_public:true};
}

function queryWeb(f:any,b:number){
 const keys=clean(f.keywords,300).split(",").map(x=>x.trim()).filter(Boolean);
 const word=keys[b%keys.length]||"";
 const loc=[f.city,f.province,f.country].filter(Boolean).map(x=>'"'+clean(x,80)+'"').join(" ");
 return 'site:instagram.com/ "'+clean(word,80)+'" '+loc;
}
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:H});
 if(req.method!=="POST")return respond({error:"Solo POST"},405);
 try{
  const jwt=req.headers.get("authorization")?.replace(/^Bearer\s+/i,"")||"";
  if(!jwt||jwt.startsWith("sb_"))return respond({error:"Acceso autenticado requerido"},401);
  const base=Deno.env.get("SUPABASE_URL")||"",key=Deno.env.get("SUPABASE_ANON_KEY")||"";
  if(!base||!key)return respond({error:"Supabase no está configurado"},500);
  const db=createClient(base,key,{global:{headers:{Authorization:"Bearer "+jwt}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error:authError}=await db.auth.getUser(jwt);
  if(authError||!user)return respond({error:"Sesión caducada"},401);
  const {data:admin,error:adminError}=await db.from("crm_admins").select("user_id").eq("user_id",user.id).maybeSingle();
  if(adminError||!admin)return respond({error:"Acceso reservado a administradores"},403);
  const input=await req.json(),raw=input.filters||{};
  const f={mode:["catalogs","google","linked","bio"].includes(raw.mode)?raw.mode:"catalogs",name:clean(raw.name,90),country:clean(raw.country||"Argentina",80),province:clean(raw.province,100),city:clean(raw.city,100),focus:clean(raw.focus||"Todos los rubros",100),keywords:clean(raw.keywords,300),interests:Array.isArray(raw.interests)?raw.interests.slice(0,12).map((x:any)=>clean(x,80)):[]};
  if(!f.keywords.trim())return respond({error:"Escribí una palabra o actividad para buscar perfiles."},400);
  if(f.mode==="bio"&&String(input.provider)!=="serpapi")
   return respond({error:"Para verificar la biografía y privacidad real elegí SerpApi y conectá su clave.",code:"KEY_REQUIRED"},422);
  if(f.mode==="linked"&&String(input.provider)!=="serper")
   return respond({error:"Para descubrir Instagram desde páginas personales elegí Serper (Google).",code:"KEY_REQUIRED"},422);
  const batch=Number(input.batch),provider=["serpapi","serper","tavily","web","directories"].includes(String(input.provider))?String(input.provider):"web";
  if(!Number.isInteger(batch)||batch<0||batch>39)return respond({error:"Lote inválido"},400);
  const searchId=clean(input.searchId,50);
  if(!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(searchId))return respond({error:"Identificador inválido"},400);
  let items:any[]=[],query="",details="",rawCount=0,errors:string[]=[];
  if(provider==="serper"||provider==="tavily"){
   const keyName=provider==="serper"?"SERPER_API_KEY":"TAVILY_API_KEY";
   const key=clean(input.apiKey,240)||Deno.env.get(keyName)||"";
   if(!key)return respond({error:"Para una búsqueda automática estable, conectá tu clave gratuita de "+(provider==="serper"?"Serper":"Tavily")+".",code:"KEY_REQUIRED"},422);
   query=f.mode==="linked"?queryLinked(f,batch):provider==="serper"?queryFor(f,batch):queryWeb(f,batch);
   const gl:Record<string,string>={Argentina:"ar",Uruguay:"uy",Chile:"cl",Paraguay:"py",Bolivia:"bo",Perú:"pe",Colombia:"co",México:"mx",España:"es",Brasil:"br"};
   const payload=provider==="serper"?
     {q:query,gl:gl[f.country]||"ar",hl:"es",num:10,page:Math.min(10,batch+1)}:
     {query,search_depth:"basic",max_results:20,include_domains:["instagram.com"],include_answer:false};
   const endpoint=provider==="serper"?"https://google.serper.dev/search":"https://api.tavily.com/search";
   const headers=provider==="serper"?{"X-API-KEY":key,"Content-Type":"application/json"}:{"Authorization":"Bearer "+key,"Content-Type":"application/json"};
   const ctrl=new AbortController(),timeout=setTimeout(()=>ctrl.abort(),22000);
   let external:Response;
   try{external=await fetch(endpoint,{method:"POST",headers,body:JSON.stringify(payload),signal:ctrl.signal});}
   finally{clearTimeout(timeout)}
   if(!external.ok){
    const status=external.status;
    const code=status===429?"RATE_LIMITED":status===401||status===403?"KEY_INVALID":"SEARCH_UNAVAILABLE";
    return respond({error:status===429?"El proveedor agotó las consultas gratuitas o limitó temporalmente las búsquedas.":status===401||status===403?"La clave de "+(provider==="serper"?"Serper":"Tavily")+" no fue aceptada.":"El proveedor de búsqueda respondió HTTP "+status,code},status===429?429:502);
   }
   const result=await external.json();
   if(result.error||result.message&&(!Array.isArray(result.organic)&&!Array.isArray(result.results)))return respond({error:clean(result.error||result.message,300),code:"SEARCH_UNAVAILABLE"},502);
   const hits=(provider==="serper"?result.organic:result.results)||[];
   rawCount=hits.length;
   if(f.mode==="linked"){
    const found=await fromLinkedGooglePages(hits,f,"Serper · Web personal → Instagram");
    items=found.rows;errors.push(...found.problems);details="Cuentas encontradas como enlace de Instagram en páginas personales públicas; privacidad no confirmada.";
   }else{
   const seen=new Set<string>();
   const needles=clean(f.keywords,300).split(",").map(x=>norm(x.trim())).filter(Boolean);
   const city=norm(f.city).replace(/ capital$/,""),province=norm(f.province);
   for(const hit of hits){
    const url=String(hit.link||hit.url||"");
    const h=getHandle(url);
    if(!h||seen.has(h))continue;
    const name=clean(hit.title,250),excerpt=clean(hit.snippet||hit.content,850);
    const searchable=norm(h+" "+name+" "+excerpt);
    if(!needles.some(k=>searchable.includes(k)))continue;
    if(city&&!searchable.includes(city))continue;
    if(!city&&province&&!searchable.includes(province))continue;
    seen.add(h);
    const row=profile(h,name,excerpt,url,provider==="serper"?"Serper · Google":"Tavily · búsqueda web",f);
    row.match_evidence="Coincidencia en Google: "+(needles.some(k=>norm(h).includes(k))?"@usuario":needles.some(k=>norm(name).includes(k))?"nombre":"texto indexado")+". Biografía y privacidad por verificar.";
    items.push(row);
   }
   details="Búsqueda nueva en un índice web profesional. Coincidencias en nombre, usuario o texto indexado; biografía y privacidad pendientes.";
   }
  }else if(provider==="web"){
   // Sólo se intenta una consulta en cada ejecución. Si el buscador aplica límites,
   // se informa el error en lugar de inventar usuarios o recurrir a fichas irrelevantes.
   query=queryWeb(f,batch);
   const requestUrl="https://search.brave.com/search?"+new URLSearchParams({q:query,source:"web"}).toString();
   const response=await fetchResource(requestUrl,{"Accept":"text/html"},16000);
   if(response.status===429)return respond({error:"El buscador público limitó temporalmente las consultas. Reintentá más tarde o activá la alternativa con clave SerpApi.",code:"RATE_LIMITED"},429);
   if(!response.ok)return respond({error:"El buscador externo no respondió: HTTP "+response.status,code:"SEARCH_UNAVAILABLE"},502);
   const html=(await response.text()).slice(0,2000000);
   if(!html.includes('data-type="web"'))return respond({error:"El buscador web no devolvió fichas interpretables en este momento. No se añadieron resultados de otros rubros.",code:"SEARCH_UNAVAILABLE"},503);
   items=fromBraveResults(html,f,requestUrl);
   rawCount=(html.match(/data-type="web"/g)||[]).length;
   details="Resultados públicos indexados; la palabra debe aparecer en el usuario, nombre o extracto. La mención de una ciudad no confirma el domicilio ni que la cuenta siga activa.";
  }else if(provider==="serpapi"){
   const apiKey=clean(input.apiKey,150)||Deno.env.get("SERPAPI_API_KEY")||"";
   if(!apiKey)return respond({error:"Agregá una clave SerpApi para búsquedas web en vivo.",code:"KEY_REQUIRED"},422);
   query=queryFor(f,batch);
   const gl:Record<string,string>={Argentina:"ar",Uruguay:"uy",Chile:"cl",Paraguay:"py",Bolivia:"bo",Perú:"pe",Colombia:"co",México:"mx",España:"es",Brasil:"br"};
   const params=new URLSearchParams({engine:"google",q:query,api_key:apiKey,gl:gl[f.country]||"ar",hl:"es",num:"10",start:String((batch%3)*10),filter:"0"});
   const response=await fetchResource("https://serpapi.com/search.json?"+params.toString(),{"Accept":"application/json"},21000);
   if(!response.ok)return respond({error:"SerpApi devolvió HTTP "+response.status,query},502);
   const data=await response.json();
   if(data.error)return respond({error:clean(data.error,250),query},502);
   const results=data.organic_results||data.organic||[];
   rawCount=results.length;
   const seen=new Set<string>();
   for(const r of results){
    const h=getHandle(String(r.link||r.url||""));if(!h||seen.has(h))continue;seen.add(h);
    const title=clean(r.title,250),snippet=clean(r.snippet,850);
    const combined=norm(h+" "+title+" "+snippet);
    const keys=clean(f.keywords,300).split(",").map(x=>norm(x.trim())).filter(Boolean);
    if(f.mode!=="bio"&&keys.length&&!keys.some(x=>combined.includes(x)))continue;
    const place=norm(h+" "+title+" "+snippet);
    const city=norm(f.city).replace(/ capital$/,"");
    if(f.mode!=="bio"&&city&&!place.includes(city))continue;
    if(f.mode!=="bio"&&!city&&f.province&&!place.includes(norm(f.province)))continue;
    const row=profile(h,title,snippet,String(r.link||r.url), "SerpApi · Google",f);
    row.match_evidence="Coincidencia en Google: "+(keys.some(x=>norm(h).includes(x))?"@usuario":keys.some(x=>norm(title).includes(x))?"nombre":"texto indexado")+". Biografía y privacidad no comprobadas.";
    items.push(row);
   }
   if(f.mode==="bio"){
    const publicVerified:any[]=[];
    const limited=items.slice(0,5);
    for(const item of limited){
     try{
      const check=await checkActualInstagramProfile(item.handle,apiKey);
      if("error" in check){errors.push(check.error||"No se pudo verificar un perfil");continue}
      const name=check.name||item.handle,bio=check.bio||"";
      const hayHandle=norm(item.handle),hayName=norm(name),hayBio=norm(bio);
      const k=clean(f.keywords,300).split(",").map(x=>norm(x.trim())).filter(Boolean);
      const field=k.some(x=>hayBio.includes(x))?"biografía":k.some(x=>hayName.includes(x))?"nombre":k.some(x=>hayHandle.includes(x))?"usuario":"";
      if(!field)continue;
      const location=norm([name,bio].join(" "));
      const city=norm(f.city).replace(/ capital$/,""),province=norm(f.province);
      // Una mención territorial en la biografía no equivale a domicilio verificado.
      const geoEvidence=[city,province].filter(Boolean).every(x=>location.includes(x));
      item.headline=name;item.snippet=bio;item.category=category(name+" "+bio);
      item.match_keywords=clean(f.keywords,300).split(",").map(x=>x.trim()).filter(x=>x&&norm([item.handle,name,bio].join(" ")).includes(norm(x)));
      item.bio_verified=true;item.public_account_verified=true;
      item.profile_checked_at=new Date().toISOString();
      item.match_evidence="Cuenta pública verificada por proveedor. Coincidencia en "+field+
       (geoEvidence?". Lugar mencionado en perfil, residencia no confirmada.":". Ubicación sin comprobar.");
      item.source_provider="SerpApi · Instagram verificado";item.score=Math.min(100,(item.score||50)+22);
      publicVerified.push(item);
     }catch(e){errors.push("No se pudo verificar un perfil: "+String(e).slice(0,130))}
    }
    items=publicVerified;
    details="Se consultaron hasta 5 perfiles de Instagram; sólo se incluyen cuentas con privacidad pública explícita y palabra en biografía, nombre o usuario. Cada perfil consume una consulta adicional.";
   }else{
    details="Resultados web públicos indexados. La coincidencia puede estar en el nombre o fragmento indexado; ni la biografía ni la privacidad están verificadas.";
   }
  }else{
   if(f.country&&norm(f.country)!=="argentina")return respond({profiles:[],fetched:0,query:"Fuentes abiertas argentinas",batch,done:true,message:"Los directorios gratuitos actuales cubren Argentina. Para otro país conectá un buscador externo.",total_saved:0});
   const selected=sources.filter(s=>!f.province||s[2]==="general"||s[2]===norm(f.province)).sort((a,b)=>{
    const priority=(s:readonly [string,string,string])=>
      (f.province&&s[2]===norm(f.province)?30:0)+
      (f.city&&norm(s[0]).includes(norm(f.city))?18:0)+
      (norm(f.focus).includes("estetica")&&s[0].includes("Ágora")?16:0)+
      (s[0].startsWith("Modash")?25:0)+
      (s[0].startsWith("Modash")&&/medic|salud|nutri|doctor|bienestar|odont|kinesi|enfermer/i.test(norm(f.keywords))&&s[0].includes("Salud")?95:0)+
      (s[0].startsWith("Modash")&&/educacion fisica|fitness|entren|preparador fisico|profesor|personal trainer|deporte|gimnasio|musculacion/i.test(norm(f.keywords))&&s[0].includes("Fitness")?85:0)+
      (s[0].startsWith("Modash")&&/estetic|belleza|maquill|cosmet|peluquer/i.test(norm(f.keywords))&&s[0].includes("Belleza")?85:0)+
      (s[0].startsWith("Modash")&&/gastronom|chef|cocin|restaur|aliment/i.test(norm(f.keywords))&&s[0].includes("Gastronomía")?80:0)+
      (s[0].startsWith("Modash")&&/contador|contable|emprend|negoci|comerc|influenc|profesional/i.test(norm(f.keywords))&&s[0].includes("General")?85:0)+
      (s[0].startsWith("EmprenZona")?12:0)+
      (s[0].startsWith("Infloo")?4:0);
    return priority(b)-priority(a);
   });
   const start=batch*3,pages=selected.slice(start,start+3);
   if(!pages.length)return respond({profiles:[],fetched:0,query:"Directorios públicos",batch,done:true,message:"Se terminaron de consultar los directorios disponibles en este escaneo.",total_saved:0});
   query="Directorios públicos, lote "+(batch+1);
   const reads=await Promise.all(pages.map(async src=>{
     try{
      const res=await fetchResource(src[1],{},15500);
      if(!res.ok){errors.push(src[0]+": HTTP "+res.status);return []}
      const html=(await res.text()).slice(0,4500000);
      return fromDirectory(html,src[0],src[1],f);
     }catch(e){errors.push(src[0]+": "+String(e).slice(0,110));return []}
   }));
   rawCount=reads.reduce((n,rows)=>n+rows.length,0);
   items=[...new Map(reads.flat().map(x=>[x.handle,x])).values()].filter(p=>matchesDirectory(p,f));
   details=pages.map(x=>x[0]).join(" · ");
  }
  // No se infiere lugar o afinidad sólo porque la búsqueda lo pidió.
  // Conservamos resultados sin ubicación confirmada con la etiqueta de procedencia y el filtro solicitado.
  let stored=0;
  // Lotes de hasta 250 para no superar los límites de escritura y preservar todos los hallazgos.
  for(let offset=0;offset<items.length;offset+=250){
   const portion=items.slice(offset,offset+250);
   const {data:count,error:saveError}=await db.rpc("scout_merge_live_profiles",{payload:portion});
   if(saveError)return respond({error:"Encontramos "+items.length+" cuentas externas, pero el guardado falló en el lote "+(Math.floor(offset/250)+1)+": "+saveError.message,
      profiles:items,query,save_failed:true,already_stored:stored},500);
   stored+=Number(count)||0;
  }
  const {data:existing,error:exerr}=await db.from("scout_live_searches").select("id,found_count,search_batches,query_log").eq("id",searchId).maybeSingle();
  if(exerr)return respond({error:exerr.message,profiles:items,query},500);
  const run={id:searchId,created_by:user.id,filters:f,provider,found_count:(existing?.found_count||0)+items.length,
     search_batches:Math.max(batch+1,existing?.search_batches||0),
     query_log:[...(Array.isArray(existing?.query_log)?existing.query_log:[]),{batch,query,profiles:items.length,raw:rawCount,errors}].slice(-40)};
  const {error:logError}=await db.from("scout_live_searches").upsert(run,{onConflict:"id"});
  if(logError)return respond({error:"Se guardaron los perfiles, pero falló el historial: "+logError.message,profiles:items,query},500);
  for(let offset=0;offset<items.length;offset+=250){
   const batchMatches=items.slice(offset,offset+250).map(x=>({search_id:searchId,handle:x.handle,query_text:query}));
   const {error:matchErr}=await db.from("scout_live_search_matches").upsert(batchMatches,{onConflict:"search_id,handle",ignoreDuplicates:true});
   if(matchErr)errors.push("Historial de coincidencias: "+matchErr.message);
  }
  return respond({profiles:items,fetched:rawCount,stored,query,batch,provider,details,errors,done:provider==="web"||provider==="tavily"?true:provider==="directories"?(batch+1)*3>=sources.filter(s=>!f.province||s[2]==="general"||s[2]===norm(f.province)).length:batch>=9,
     message:"Resultados obtenidos en esta consulta externa; no se inventaron usuarios ni se verificó su existencia en Instagram."});
 }catch(e){return respond({error:"Consulta fallida: "+String(e).slice(0,300)},500)}
});
