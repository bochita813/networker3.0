import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const html=fs.readFileSync("scout/live.html","utf8");
const script=html.match(/<script>\s*([\s\S]*?)<\/script><\/body>/i);
assert.ok(script,"Falta script principal");
new vm.Script(script[1],{filename:"scout/live.html"});
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]), unique=new Set(ids);
assert.equal(ids.length,unique.size,"IDs HTML repetidos");
for(const r of script[1].matchAll(/\$\("#([A-Za-z0-9_-]+)"\)/g))assert.ok(unique.has(r[1]),"Elemento DOM ausente "+r[1]);
for(const id of ["word","where","search","searchForm","results","count","export","connectBox","connectForm","apifyToken","status","stop","loginForm"])
 assert.ok(unique.has(id),"Falta "+id);
for(const id of ["provider","matchMode","advancedSearch","batches","apiKey"])
 assert.ok(!unique.has(id),"La interfaz simple no debe mostrar "+id);
assert.ok(html.includes('callProvider("start"'),"No se inicia una búsqueda real");
assert.ok(html.includes('callProvider("poll"'),"No se espera el resultado de proveedor");
assert.ok(html.includes('callProvider("abort"'),"No se detiene proveedor al cancelar");
assert.ok(html.includes('callProvider("configure"'),"No se puede conectar el proveedor una vez");
assert.ok(html.includes("scout-apify-search"),"La web no consulta el backend real");
assert.ok(html.includes("public_account_verified!==true"),"No debe mostrar cuentas de privacidad desconocida");
assert.ok(!html.includes("localStorage.setItem"),"No guardar la clave de proveedor en navegador");
assert.ok(html.includes("networker-perfiles-instagram.csv"),"Debe exportar CSV");

const edge=fs.readFileSync("supabase/functions/scout-apify-search/index.ts","utf8");
for(const s of [
 "scout_backend_apify_token","scout_admin_store_apify_token","maxTotalChargeUsd=0.35",
 "apify~instagram-search-scraper","searchType:\"user\"","action===\"configure\"",
 "action===\"start\"","action===\"poll\"","action===\"abort\"",
 "isPrivate!==false","locationEvidence.includes(region)","scout_merge_live_profiles"
])assert.ok(edge.includes(s),"Falta control de backend: "+s);

const start=edge.indexOf("function extractPublicMatches("),end=edge.indexOf("\nasync function apify(",start);
assert.ok(start>=0&&end>start,"No se encuentra el clasificador real");
const code=edge.slice(start,end)
 .replace("records:unknown[],keyword:string,place:string","records,keyword,place")
 .replace("const matches:any[]=[]","const matches=[]")
 .replace("new Set<string>()","new Set()");
const clean=(x,n=140)=>String(x??"").replace(/[\u0000-\u001f<>]/g," ").trim().slice(0,n);
const norm=x=>clean(x,1500).toLocaleLowerCase("es").normalize("NFKD").replace(/[\u0300-\u036f]/g,"");
const validHandle=h=>/^[a-z0-9._]{3,30}$/.test(h)&&!h.includes("..");
const isJson=x=>!!x&&typeof x==="object"&&!Array.isArray(x);
const extract=new vm.Script(code+"; extractPublicMatches",{}).runInNewContext({clean,norm,validHandle,isJson,Date,JSON,Set});
const fixture=[
 {username:"sofi.administrativo",fullName:"Sofia | Córdoba",biography:"Soy administrativo - Córdoba Argentina",private:false,scrapedAt:"2026-11-19T00:00:00Z"},
 {username:"lucia.admin",fullName:"Lucia Cordoba",biography:"Administrativo en Córdoba",private:true},
 {username:"cba.admins",fullName:"Administrativo Cordoba",biography:"Servicios administrativos"},
 {username:"admin.salta",fullName:"Administrativo",biography:"Salta Argentina",private:false},
 {username:"tucu.nutri",fullName:"Nutricionista Córdoba",biography:"Nutri",private:false}
];
const tested=extract(fixture,"administrativo","Córdoba");
assert.equal(tested.profiles.length,1,"Debe existir una sola cuenta pública que coincida");
assert.equal(tested.profiles[0].handle,"sofi.administrativo");
assert.equal(tested.profiles[0].public_account_verified,true);
assert.equal(tested.profiles[0].bio_verified,true);
assert.equal(tested.profiles[0].location_confirmed,false,"Una localidad mencionada no prueba domicilio");
assert.equal(tested.counts.privateExcluded,1);
assert.equal(tested.counts.unknownPrivacyExcluded,1);
assert.equal(tested.counts.keywordExcluded,1);
assert.equal(tested.counts.placeExcluded,1);
console.log("SCOUT QA OK: interfaz de 2 campos, guardado seguro, límites y coincidencia pública estricta.");
