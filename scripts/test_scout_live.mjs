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
for(const id of ["searchForm","provider","country","province","city","focus","keywords","topics","progress","liveCards","dbCards","dbProvince","dbCity","dbCategory","dbCountry","dbFrom","dbProvider","dbFocus","dbVerification","exportDb","exportLive","stop","loadMore"]){assert.ok(seen.has(id),"Falta filtro/botón: "+id)}
assert.ok(html.includes('db.functions.invoke("scout-live-search"'),"Falta consulta de función remota");
assert.ok(html.includes('db.from("scout_live_profiles")'),"Falta tabla acumulativa");
assert.ok(html.includes('db.from("crm_scout_profiles")'),"Falta vínculo con radar CRM");
assert.ok(html.includes("source_provider"),"Falta traza de fuente");
assert.ok(html.includes("location_confirmed"),"Falta distinción de evidencia geográfica");
assert.ok(html.includes("networker-base-segmentada.csv"),"Falta exportación");
assert.ok(html.includes("@media(max-width:560px)"),"Faltan controles mobile");
assert.ok(!html.includes("BRAVE_SEARCH_API_KEY"),"Proveedor no permitido por términos en este caso");
console.log("SCOUT LIVE QA OK: script, "+ids.length+" controles, búsquedas, filtros y exportación.");
