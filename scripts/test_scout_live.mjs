import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";
const html=fs.readFileSync("scout/live.html","utf8");
const m=html.match(/<script>\s*([\s\S]*?)<\/script>\s*<\/body>/i);
assert.ok(m,"Falta script principal de la búsqueda en vivo");
new vm.Script(m[1],{filename:"scout/live.html (inline)"});
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
const seen=new Set();
for(const id of ids){assert.ok(!seen.has(id),"ID duplicado: "+id);seen.add(id)}
for(const ref of m[1].matchAll(/\$\("#([a-zA-Z0-9_-]+)"\)/g))assert.ok(seen.has(ref[1]),"Elemento no encontrado: "+ref[1]);
for(const id of ["searchForm","provider","country","province","city","keywords","progress","liveCards","dbCards","dbProvince","dbCity","dbCategory","dbCountry","dbFrom","dbProvider","dbFocus","dbVerification","exportDb","exportLive","stop","loadMore"]){assert.ok(seen.has(id),"Falta filtro/botón: "+id)}
assert.ok(html.includes('db.functions.invoke("scout-live-search"'),"Falta consulta de función remota");
assert.ok(html.includes('<option value="serper" selected>'),"El buscador automático necesita un proveedor gratuito confiable por defecto");
assert.ok(html.includes('id="webLink"'),"Debe ofrecer un enlace de búsqueda manual cuando no se conecta una API");
assert.ok(html.includes('id="advancedSearch"'),"Debe abrirse el bloque de conexión cuando falte clave");
assert.ok(html.includes('["serper","tavily","serpapi"].includes(provider)'),"Debe exigir clave antes de llamar al buscador");
assert.ok(html.includes('apiKey:["serper","tavily","serpapi"].includes(p)'),"Debe remitir clave al proveedor correcto");
assert.equal([...html.matchAll(/<label for="keywords">/g)].length,1,"Debe haber una única palabra o actividad");
assert.ok(!html.includes('<label for="focus">Persona o actividad</label>'),"No mostrar la selección confusa de tipo de persona");
assert.ok(!html.includes('id="topics"'),"No mostrar filtros de interés adicionales que cruzan rubros");
assert.ok(html.includes('const needed=form.keywords.split'),"Los resultados deben filtrarse por palabra solicitada");

assert.ok(html.includes('db.from("scout_live_profiles")'),"Falta tabla acumulativa");
assert.ok(html.includes('db.from("crm_scout_profiles")'),"Falta vínculo con radar CRM");
assert.ok(html.includes("source_provider"),"Falta traza de fuente");
assert.ok(html.includes("location_confirmed"),"Falta distinción de evidencia geográfica");
assert.ok(html.includes("networker-base-segmentada.csv"),"Falta exportación");
assert.ok(html.includes("@media(max-width:560px)"),"Faltan controles mobile");
for(const name of ["searchName","saveRule","ruleMessage","apiKey"]){assert.ok(seen.has(name),"Falta campo de búsqueda o persistencia: "+name)}
assert.ok(html.includes("name:$(\"#searchName\").value.trim()"),"La búsqueda no transmite el nombre editado por el administrador");
assert.ok(html.includes('db.from("scout_search_rules").insert'),"No se pueden guardar configuraciones escritas a mano");
const backend=fs.readFileSync("supabase/functions/scout-live-search/index.ts","utf8");
assert.ok(backend.includes('engine:"google"'),"El proveedor debe consultar Google, no un RSS irrelevante");
assert.ok(backend.includes("function fromBraveResults"),"El buscador gratuito debe extraer perfiles de resultados públicos");
assert.ok(backend.includes('provider==="serper"||provider==="tavily"'),"Deben existir proveedores gratuitos estables");
assert.ok(backend.includes("https://google.serper.dev/search"),"Falta Serper");
assert.ok(backend.includes("https://api.tavily.com/search"),"Falta Tavily");
assert.ok(backend.includes('if(!needles.some(k=>searchable.includes(k)))continue;'),"No se deben mezclar actividades");

assert.ok(backend.includes('provider==="web"'),"La búsqueda web gratuita debe estar conectada a la función remota");
assert.ok(backend.includes('if(!keys.some(k=>relevant.includes(k)))continue;'),"No debe guardar cuentas de rubros que no coincidan");
assert.ok(backend.includes('start:String((batch%3)*10)'),"No existe paginación real del buscador externo");
assert.ok(backend.includes("entrepreneur-card"),"Falta extracción por ficha individual del directorio");
assert.ok(backend.includes("p.handle,p.headline,p.snippet"),"La coincidencia de palabra debe buscar en @usuario y nombre");
assert.ok(backend.includes("biografía")||html.includes("biografías"),"Debe advertirse que las biografías no están verificadas");
assert.ok(!html.includes("BRAVE_SEARCH_API_KEY"),"Proveedor no permitido por términos en este caso");
console.log("SCOUT LIVE QA OK: script, "+ids.length+" controles, búsquedas, filtros y exportación.");
