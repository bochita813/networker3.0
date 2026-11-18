/**
 * Pruebas de regresión de NETWORKER SCOUT 2.0.
 * Se ejecutan con Node.js sin paquetes externos en GitHub Actions.
 */
import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const html=fs.readFileSync("scout/configurar.html","utf8");
const data=JSON.parse(fs.readFileSync("scout/candidates.json","utf8"));
const match=html.match(/<script>\s*([\s\S]*?)<\/script>\s*<\/body>/i);
assert.ok(match,"Falta script principal del configurador");
const script=match[1];
new vm.Script(script,{filename:"scout/configurar.html [script]"});

const ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]));
for(const x of script.matchAll(/\$\('#([^']+)'\)/g)){
  assert.ok(ids.has(x[1]),"Falta elemento #"+x[1]);
}
assert.ok(html.includes("@media(max-width:550px)"),"Faltan estilos para celulares");
assert.ok(ids.has("filterDiagnosis"),"Falta diagnóstico del embudo de filtros");
assert.ok(ids.has("coverage"),"Falta medidor de cobertura geográfica");

const start=script.indexOf("const TOPICS=");
const end=script.indexOf("function formSet(f)");
assert.ok(start>=0&&end>start,"No se encontró la lógica de filtros");
const context=vm.createContext({});
vm.runInContext(script.slice(start,end)+";this.logic={fits,info,geoFits,interestFits,termsFit};",context);
const {fits,info}=context.logic;
const query=(province,city,focus="Todos los rubros",interests=[])=>({
 country:"Argentina",province,city,focus,interests,keywords:"",min_affinity:0
});
const cordobaBeauty={
 handle:"test.cordoba",headline:"Centro de estética integral",
 snippet:"Tratamientos faciales y belleza",category:"Estética y belleza",
 country:"Argentina",province:"Córdoba",city:"Córdoba Capital",
 source_query:"Ágora · Estética Córdoba Capital"
};
const cordobaInterior={
 handle:"test.cruzdeleje",headline:"Feria de emprendimientos",
 snippet:"Emprendimiento artesanal",category:"Emprendimiento",
 country:"Argentina",province:"Córdoba",city:"Cruz del Eje",
 source_query:"EmprenZona · Emprendedores de Córdoba"
};
assert.equal(fits(cordobaBeauty,query("Córdoba","Cordoba","Estética y belleza",["Cosmética"])),true,
  "Córdoba Capital + Cosmética no encuentra ficha validada");
assert.equal(fits(cordobaBeauty,query("Cordoba","","Estética y belleza",["Estética"])),true,
  "La provincia no acepta grafía sin tilde");
assert.equal(fits(cordobaInterior,query("Córdoba","","Todos los rubros")),true,
  "Cruz del Eje no aparece al filtrar provincia Córdoba");
assert.equal(fits(cordobaInterior,query("Córdoba","Cordoba","Todos los rubros")),false,
  "El interior de Córdoba se está mezclando con Córdoba Capital");
assert.equal(fits(cordobaBeauty,query("Córdoba","Jesús María","Todos los rubros")),false,
  "El filtro de ciudad no respeta localidades diferentes");
assert.equal(info(cordobaBeauty).province,"Córdoba","No se conserva provincia explícita");

const handles=new Set();
for(const p of data.profiles||[]){
 assert.ok(typeof p.handle==="string"&&/^[a-z0-9._]{1,30}$/.test(p.handle)&&!p.handle.includes(".."),"Handle inválido: "+p.handle);
 assert.ok(!handles.has(p.handle),"Handle repetido: "+p.handle);
 handles.add(p.handle);
 assert.equal(p.url,"https://www.instagram.com/"+p.handle+"/","URL no canónica: "+p.handle);
 assert.ok(!["emprenzona","agora.red"].includes(p.handle),"Cuenta del propio directorio mal clasificada: "+p.handle);
}
console.log("SCOUT QA OK:",data.profiles.length,"candidatos sin duplicados, lógica geográfica, Córdoba capital, afinidad, DOM y estilos.");
