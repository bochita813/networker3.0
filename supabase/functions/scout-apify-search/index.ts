import { createClient } from "npm:@supabase/supabase-js@2.95.0";

const headers={
 "Access-Control-Allow-Origin":"*",
 "Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info",
 "Access-Control-Allow-Methods":"POST,OPTIONS",
 "Content-Type":"application/json;charset=utf-8"
};
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
const clean=(x:unknown,max=140)=>String(x??"").replace(/[\u0000-\u001f<>]/g," ").trim().slice(0,max);
const norm=(x:unknown)=>clean(x,1500).toLocaleLowerCase("es").normalize("NFKD").replace(/[\u0300-\u036f]/g,"");
const validHandle=(h:string)=>/^[a-z0-9._]{3,30}$/.test(h)&&!h.includes("..")&&!new Set(["instagram","accounts","explore","reel","stories","login","about","p"]).has(h);
const validRun=(id:string)=>/^[A-Za-z0-9]{10,35}$/.test(id);
const isJson=(x:unknown):x is Record<string,any>=>Boolean(x)&&typeof x==="object"&&!Array.isArray(x);

function extractPublicMatches(records:unknown[],keyword:string,place:string){
 const matches:any[]=[],seen=new Set<string>();
 const activity=norm(keyword),region=norm(place);
 let privateExcluded=0,unknownPrivacyExcluded=0,keywordExcluded=0,placeExcluded=0;
 for(const raw of records.slice(0,250)){
  if(!isJson(raw))continue;
  const handle=clean(raw.username||raw.userName||raw.handle,35).replace(/^@/,"").toLowerCase();
  if(!validHandle(handle)||seen.has(handle)||raw.error)continue;
  seen.add(handle);
  const isPrivate=raw.private??raw.isPrivate??raw.is_private;
  if(isPrivate!==false){if(isPrivate===true)privateExcluded++;else unknownPrivacyExcluded++;continue;}
  const title=clean(raw.fullName||raw.full_name||raw.name,240);
  const bio=clean(raw.biography??raw.bio??raw.description,900);
  const activityEvidence=norm(handle+" "+title+" "+bio);
  if(!activityEvidence.includes(activity)){keywordExcluded++;continue;}
  const businessAddress=isJson(raw.businessAddress)?JSON.stringify(raw.businessAddress).slice(0,600):clean(raw.businessAddress,500);
  const locationEvidence=norm([title,bio,businessAddress].join(" "));
  // Solo lugares mencionados en el propio perfil: la región elegida no prueba residencia.
  if(!locationEvidence.includes(region)){placeExcluded++;continue;}
  const foundIn=norm(handle).includes(activity)?"@usuario":norm(title).includes(activity)?"nombre":"biografía";
  const checkedAt=clean(raw.scrapedAt||new Date().toISOString(),50);
  const checkedDate=Number.isNaN(Date.parse(checkedAt))?new Date().toISOString():new Date(checkedAt).toISOString();
  const category=clean(raw.businessCategoryName||raw.category||"Sin clasificar",120);
  const row={
   handle,profile_url:"https://www.instagram.com/"+handle+"/",
   headline:title||"@"+handle,snippet:bio,
   source_page:"https://www.instagram.com/"+handle+"/",
   source_provider:"Apify · Instagram",country:"",province:"",city:"",
   category,location_evidence:place+" aparece en el perfil; residencia no confirmada",
   location_confirmed:false,search_country:"Argentina",search_province:place,search_city:"",
   search_focus:"Todos los rubros",match_keywords:[keyword],
   searches:["Instagram público · "+keyword+" · "+place],
   score:bio?85:70,bio_verified:typeof raw.biography==="string"||typeof raw.bio==="string",
   public_account_verified:true,profile_checked_at:checkedDate,
   match_evidence:"Cuenta pública comprobada por proveedor; «"+keyword+"» en "+foundIn+
    "; «"+place+"» mencionado en nombre, biografía o dirección comercial. Residencia personal no verificada."
  };
  matches.push(row);
 }
 return {profiles:matches,counts:{source:records.length,privateExcluded,unknownPrivacyExcluded,keywordExcluded,placeExcluded,matching:matches.length}};
}

async function apify(url:string,token:string,method="GET",body?:unknown){
 const ctl=new AbortController(),tm=setTimeout(()=>ctl.abort(),25000);
 try{
  const res=await fetch(url,{method,headers:{
   "Authorization":"Bearer "+token,"Accept":"application/json",
   ...(body===undefined?{}:{"Content-Type":"application/json"})
  },body:body===undefined?undefined:JSON.stringify(body),signal:ctl.signal});
  let data:any=null;
  try{data=await res.json()}catch{}
  if(!res.ok)return {error:clean(data?.error?.message||data?.error?.type||"HTTP "+res.status,260),status:res.status};
  return {data};
 }finally{clearTimeout(tm)}
}
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers});
 if(req.method!=="POST")return reply({error:"Solo POST"},405);
 try{
  const bearer=req.headers.get("authorization")?.replace(/^Bearer\s+/i,"")||"";
  if(!bearer||bearer.startsWith("sb_"))return reply({error:"Ingresá a tu cuenta del CRM"},401);
  const supabaseUrl=Deno.env.get("SUPABASE_URL")||"",anon=Deno.env.get("SUPABASE_ANON_KEY")||"";
  if(!supabaseUrl||!anon)return reply({error:"Supabase no está configurado"},500);
  const db=createClient(supabaseUrl,anon,{global:{headers:{Authorization:"Bearer "+bearer}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error:userErr}=await db.auth.getUser(bearer);
  if(userErr||!user)return reply({error:"Sesión caducada"},401);
  const {data:admin,error:adminErr}=await db.from("crm_admins").select("user_id").eq("user_id",user.id).maybeSingle();
  if(adminErr||!admin)return reply({error:"Acceso reservado al administrador"},403);

  const input=await req.json().catch(()=>({}));
  const action=String(input?.action||"status");
  // Configuración única: Supabase Vault cifra el token. La web nunca puede leerlo.
  let token=Deno.env.get("APIFY_API_TOKEN")||"";
  if(!token){
   const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
   if(serviceKey){
    const backend=createClient(supabaseUrl,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data:stored,error:secretError}=await backend.rpc("scout_backend_apify_token");
    if(!secretError&&typeof stored==="string")token=stored;
   }
  }
  if(action==="configure"){
   const supplied=clean(input?.token,500);
   if(supplied.length<22)return reply({error:"Pegá el token de API de Apify completo."},400);
   const test=await apify("https://api.apify.com/v2/users/me",supplied);
   if(test.error)return reply({error:"Apify no aceptó la conexión: "+test.error,code:"API_KEY_INVALID"},422);
   const {error:saveError}=await db.rpc("scout_admin_store_apify_token",{new_token:supplied});
   if(saveError)return reply({error:"No se pudo guardar la clave cifrada: "+saveError.message},500);
   return reply({connected:true,message:"Apify conectado. Las siguientes búsquedas funcionarán sin volver a ingresar el token."});
  }
  if(action==="status")return reply({connected:token.length>15,provider:"Apify · Instagram Search",
   actor:"apify/instagram-search-scraper",maxCostUsdPerSearch:0.35});
  if(!token||token.length<16)return reply({error:"Conectá Apify una sola vez desde SCOUT para activar la búsqueda real de Instagram.",code:"SETUP_REQUIRED"},424);

  if(action==="start"){
   const word=clean(input.word,100),place=clean(input.place,100);
   if(word.length<3||place.length<3||/[\r\n<>]/.test(word+place))return reply({error:"Escribí una palabra y una ciudad o provincia válidas."},400);
   // Reutilizar una ejecución reciente con los mismos filtros evita cargos duplicados.
   const {data:recent}=await db.from("scout_instagram_live_jobs").select("*")
    .eq("created_by",user.id).eq("keyword",word).eq("place",place)
    .gte("created_at",new Date(Date.now()-15*60_000).toISOString())
    .order("created_at",{ascending:false}).limit(1).maybeSingle();
   if(recent&&!["FAILED","ABORTED","TIMED-OUT"].includes(recent.provider_state))
    return reply({jobId:recent.id,state:recent.provider_state,reused:true});
   const {count,error:countError}=await db.from("scout_instagram_live_jobs").select("id",{head:true,count:"exact"})
    .eq("created_by",user.id).gte("created_at",new Date(Date.now()-24*60*60_000).toISOString());
   if(countError)return reply({error:"No se pudo verificar el límite de consultas"},500);
   if((count||0)>=15)return reply({error:"Alcanzaste el límite de seguridad de 15 consultas por día para evitar cargos inesperados.",code:"DAILY_LIMIT"},429);
   const actorInput={
    search:word+" "+place,searchType:"user",searchLimit:70,liveSearch:true,
    enhanceUserSearchWithFacebookPage:false
   };
   const endpoint="https://api.apify.com/v2/acts/apify~instagram-search-scraper/runs?maxTotalChargeUsd=0.35&maxItems=70&timeout=210";
   const started=await apify(endpoint,token,"POST",actorInput);
   if(started.error)return reply({error:"El servicio de Instagram rechazó iniciar la búsqueda: "+started.error,
     code:started.status===401||started.status===403?"API_KEY_INVALID":"PROVIDER_UNAVAILABLE"},502);
   const id=String(started.data?.data?.id||""),datasetId=String(started.data?.data?.defaultDatasetId||"");
   if(!validRun(id)||!validRun(datasetId))return reply({error:"El proveedor no entregó un identificador de ejecución válido."},502);
   const {data:job,error:saveErr}=await db.from("scout_instagram_live_jobs").insert({
     created_by:user.id,keyword:word,place,provider_run_id:id,dataset_id:datasetId,
     provider_state:"RUNNING"
   }).select("id").single();
   if(saveErr)return reply({error:"La búsqueda se inició en el proveedor, pero no se pudo guardar su seguimiento: "+saveErr.message},500);
   return reply({jobId:job.id,state:"RUNNING",reused:false});
  }

  if(action==="poll"){
   const jobId=String(input.jobId||"");
   if(!/^[a-f0-9-]{36}$/i.test(jobId))return reply({error:"Identificador inválido"},400);
   const {data:job,error:jobErr}=await db.from("scout_instagram_live_jobs").select("*")
    .eq("id",jobId).eq("created_by",user.id).maybeSingle();
   if(jobErr||!job)return reply({error:"No se encontró esta búsqueda"},404);
   const status=await apify("https://api.apify.com/v2/actor-runs/"+encodeURIComponent(job.provider_run_id),token);
   if(status.error)return reply({error:"No se pudo consultar el progreso: "+status.error,code:"PROVIDER_UNAVAILABLE"},502);
   const state=String(status.data?.data?.status||"RUNNING");
   const terminal=["SUCCEEDED","FAILED","ABORTED","TIMED-OUT"].includes(state);
   if(!terminal)return reply({jobId,state:"RUNNING",message:"Instagram sigue procesando la búsqueda",elapsedSeconds:Math.round((Date.now()-Date.parse(job.created_at))/1000)});
   if(state!=="SUCCEEDED"){
    await db.from("scout_instagram_live_jobs").update({provider_state:state,updated_at:new Date().toISOString(),finished_at:new Date().toISOString()}).eq("id",job.id);
    return reply({jobId,state:"FAILED",error:"El proveedor finalizó sin resultados verificables ("+state+")."});
   }
   const dataset=await apify("https://api.apify.com/v2/datasets/"+encodeURIComponent(job.dataset_id)+"/items?format=json&limit=200&clean=true",token);
   if(dataset.error||!Array.isArray(dataset.data))return reply({error:"No pude leer los perfiles del proveedor: "+(dataset.error||"Formato inesperado")},502);
   const scanned=extractPublicMatches(dataset.data,job.keyword,job.place);
   let stored=0;
   if(scanned.profiles.length){
    const {data:saved,error:saveError}=await db.rpc("scout_merge_live_profiles",{payload:scanned.profiles});
    if(saveError)return reply({error:"Se encontraron "+scanned.profiles.length+" perfiles, pero no se pudieron guardar: "+saveError.message},500);
    stored=Number(saved)||0;
   }
   await db.from("scout_instagram_live_jobs").update({
    provider_state:"SUCCEEDED",source_items:scanned.counts.source,matches_found:scanned.counts.matching,
    updated_at:new Date().toISOString(),finished_at:new Date().toISOString()
   }).eq("id",job.id);
   return reply({jobId,state:"SUCCEEDED",profiles:scanned.profiles,counts:scanned.counts,
    stored,source:"Apify · Instagram Search",message:"Solo se incluyen cuentas que el proveedor marca expresamente públicas, que mencionan la actividad y la ubicación en el propio perfil. No garantiza todas las cuentas de Instagram."});
  }
  return reply({error:"Acción desconocida"},400);
 }catch(e){return reply({error:"No se completó la búsqueda: "+clean(String(e),240)},500)}
});
