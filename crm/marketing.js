window.createNetworkerMarketing=function({getClient,getLeads,isSignedIn,notify,dateToday}){
const $=id=>document.getElementById(id);let rows=[],busy=false,epoch=0,loaded=false;
const status=t=>{$('marketingStatus').textContent=t};
const topics=[
['Una pregunta para empezar','¿Qué parte de tu rutina elegís y qué parte simplemente repetís? Reservá diez minutos para pensar qué querés conservar y qué te gustaría cambiar.'],
['El valor de una conversación','Una conversación no necesita terminar en un acuerdo para valer la pena. Probá escuchar a alguien sin preparar tu respuesta mientras habla.'],
['El tiempo que sí tenemos','No siempre podemos sumar horas. Identificá una tarea de tu semana que podrías simplificar.'],
['Tu experiencia vale','Lo que aprendiste en tu profesión no desaparece al iniciar algo nuevo. ¿Qué habilidad podrías llevar a otro contexto?'],
['El primer paso pequeño','Elegí una acción que puedas completar hoy en quince minutos y que te acerque a algo que te entusiasme.'],
['Conocer gente distinta','Buscá una conversación con alguien que tenga una experiencia diferente a la tuya.'],
['Un mate y una pregunta','Si pudiéramos tomar un mate hoy, ¿qué tema elegirías para conversar?'],
['Aprender haciendo','Elegí una habilidad, practicá un poco y observá qué mejorarías mañana.'],
['Una oportunidad no es una obligación','Antes de aceptar una propuesta, preguntá por las tareas, los costos y las condiciones.'],
['El activo que no se ve','La confianza se construye cuando nuestras acciones coinciden con nuestras palabras. Pensá en una pequeña promesa que puedas cumplir hoy.'],
['Tu marca no es un logo','¿Qué te gustaría que alguien diga después de conversar con vos?'],
['La curiosidad es una habilidad','Reemplazá una afirmación automática por una pregunta. Tal vez descubras una perspectiva nueva.'],
['Movimiento o avance','Definí un resultado concreto que puedas evaluar al terminar el día.'],
['Un punto aparte','¿Qué actividad te gustaría explorar sin abandonar tus responsabilidades?'],
['Escuchar antes de ofrecer','Antes de presentar una idea, entendé qué necesita la otra persona.'],
['El valor de la constancia','Elegí una actividad que puedas repetir sin depender de un día perfecto.'],
['Tu red de relaciones','Pensá en alguien a quien podrías aportar una idea o una escucha atenta.'],
['Un proyecto a tu medida','El tiempo disponible, tus intereses y tus responsabilidades importan. No existe un único camino para todos.'],
['Lo que te entusiasma','¿Cuándo fue la última vez que aprendiste algo por pura curiosidad?'],
['Preguntar por los números','Si evaluás una actividad comercial, distinguí ingresos, gastos, inversión y tiempo.'],
['Una pausa productiva','Revisá qué funcionó esta semana. Elegí algo para repetir y algo para modificar.'],
['La confianza no se exige','Mostrar cómo trabajamos y admitir lo que todavía no sabemos construye relaciones.'],
['Aprender a decir que no','No todas las oportunidades encajan en tu momento. Decidir con claridad también es valioso.'],
['El próximo contacto','¿Con quién te gustaría conversar esta semana? Escribile con una pregunta genuina.'],
['Cambiar de perspectiva','Si una idea no funcionó, preguntate qué aprendiste y qué podrías probar diferente.'],
['Liderar es acompañar','Un buen equipo deja espacio para las preguntas y las decisiones individuales.'],
['Tu presencia digital','Compartí algo que hayas aprendido y que le pueda servir a otra persona.'],
['Evaluar sin apuro','Antes de iniciar un proyecto, revisá qué tiempo, recursos y compromisos requiere.'],
['Una decisión informada','¿Qué condiciones necesitarías para sentirte cómodo explorando algo nuevo?'],
['¿Seguimos conversando?','Gracias por compartir este espacio. ¿Qué tema te gustaría que profundicemos?']
];
const welcome=[
['Qué bueno que llegaste','Gracias por elegir seguir en contacto. Este espacio es para compartir ideas sobre relaciones, aprendizaje y nuevas posibilidades.'],
['Hablemos de vos','¿Qué te gustaría que pasara en esta etapa de tu vida? Si te sirve, respondeme con una idea que estés explorando.'],
['Una herramienta para conocerte','Te invito a hacer el diagnóstico orientativo: https://networker3.netlify.app/propuesta-microcta.html#diagnostico'],
['Una idea para llevarte','Elegí una habilidad que quieras mejorar y dedicále quince minutos hoy.'],
['Preguntas que vale la pena hacer','Conocé las tareas, costos y condiciones antes de decidir: https://networker3.netlify.app/propuesta-microcta.html#detalles'],
['Punto Aparte','Te comparto mi espacio de contenidos: https://networker3.netlify.app/punto-aparte.html'],
['¿Tomamos un mate?','Si te interesa conversar sobre tu situación, escribime sin compromiso: https://wa.me/5492920596695']
];
function suffix(){return '\n\nHernán Bocci · Punto Aparte\nSi preferís no recibir más contenidos, respondé solicitando la baja.'}
function dateOffset(i){const d=new Date(dateToday()+'T12:00:00');d.setDate(d.getDate()+i);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')}
function audienceCount(){const ch=$('mkChannel').value,seg=$('mkSegment').value,perm=ch==='email'?'email_marketing':'whatsapp_marketing',groups=new Map(),leads=getLeads();for(const l of leads){const v=ch==='email'?String(l.email||'').trim().toLowerCase():String(l.phone||'').replace(/\D/g,'');if(!(ch==='email'?/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v):/^\d{9,15}$/.test(v)))continue;if(!groups.has(v))groups.set(v,[]);groups.get(v).push(l)}const n=[...groups.values()].filter(a=>a.every(l=>l[perm]===true&&l.marketing_opt_in_at)&&a.some(l=>seg==='Todos'||l.interest===seg)).length;$('mkAudience').textContent=leads.length>=1000?'Base limitada; audiencia no verificable en su totalidad.':'Audiencia autorizada en el segmento: '+n}
function sync(){const w=$('mkKind').value==='welcome';$('mkDateLabel').hidden=w;$('mkDelayLabel').hidden=!w;$('mkDate').required=!w&&$('mkStatus').value==='planned';audienceCount()}
function reset(){$('marketingForm').reset();$('mkId').value='';$('mkDate').value=dateToday();sync()}
function edit(r){for(const [id,v] of Object.entries({mkId:r.id,mkKind:r.kind,mkChannel:r.channel,mkSegment:r.segment,mkDate:r.planned_date||dateToday(),mkDelay:r.delay_days??0,mkTime:(r.planned_time||'09:00').slice(0,5),mkStatus:r.status,mkSubject:r.subject,mkBody:r.body}))$(id).value=v;sync();$('mkSubject').focus();$('marketingForm').scrollIntoView({block:'start'})}
function draw(){const list=$('mkList');list.replaceChildren();const type=$('mkFilter').value,ch=$('mkFilterChannel').value;const items=rows.filter(r=>(!type||r.kind===type)&&(!ch||r.channel===ch)).sort((a,b)=>a.kind.localeCompare(b.kind)||(a.kind==='welcome'?a.delay_days-b.delay_days:String(a.planned_date||'9999').localeCompare(String(b.planned_date||'9999'))));if(!items.length){list.textContent='No hay contenidos guardados.';return}for(const r of items){const row=document.createElement('article');row.className='mk-row';const info=document.createElement('div'),title=document.createElement('strong'),meta=document.createElement('p');title.textContent=r.subject;meta.textContent=[r.kind==='welcome'?'Día '+r.delay_days:r.planned_date||'Sin fecha',String(r.planned_time).slice(0,5),r.channel,r.segment,({draft:'Borrador',planned:'Planificado · sin envío',paused:'Pausado'})[r.status]].join(' · ');info.append(title,meta);const actions=document.createElement('div');actions.className='actions';for(const [label,fn] of [['Editar',()=>edit(r)],['Pausar / reanudar',()=>change(r,r.status==='paused'?'draft':'paused')],['Eliminar',()=>remove(r)]]){const b=document.createElement('button');b.type='button';b.className='btn';b.textContent=label;b.onclick=fn;actions.append(b)}row.append(info,actions);list.append(row)}}
async function load(){if(!isSignedIn())return false;const ticket=++epoch;loaded=false;const {data,error}=await getClient().from('crm_campaign_plans').select('*').order('created_at',{ascending:false}).limit(1000);if(ticket!==epoch||!isSignedIn())return false;if(error){status('No se pudo cargar el calendario: '+error.message);return false}rows=data||[];loaded=true;draw();audienceCount();return true}
async function task(fn){if(!isSignedIn()||busy)return;busy=true;for(const id of ['mkSave','marketingSeed','marketingWelcome'])$(id).disabled=true;try{await fn()}catch(e){status('No se completó: '+(e.message||'error'));}finally{busy=false;for(const id of ['mkSave','marketingSeed','marketingWelcome'])$(id).disabled=false}}
async function write(payload,id){const q=id?getClient().from('crm_campaign_plans').update(payload).eq('id',id):getClient().from('crm_campaign_plans').insert(payload);const {data,error}=await q.select('id');if(error||data?.length!==1)throw Error(error?.message||'No se confirmó el guardado.')}
$('marketingForm').addEventListener('submit',e=>{e.preventDefault();task(async()=>{const kind=$('mkKind').value,subject=$('mkSubject').value.trim(),body=$('mkBody').value.trim();if(!subject||!body)throw Error('Completá el asunto y mensaje.');await write({kind,channel:$('mkChannel').value,segment:$('mkSegment').value,subject,body,planned_date:kind==='calendar'?$('mkDate').value||null:null,delay_days:kind==='welcome'?Number($('mkDelay').value):null,planned_time:$('mkTime').value,status:$('mkStatus').value,updated_at:new Date().toISOString()},$('mkId').value);status('Guardado. No se envió ningún mensaje.');reset();await load()})});
function change(r,next){task(async()=>{await write({status:next,updated_at:new Date().toISOString()},r.id);await load();status('Estado actualizado.')})}
function remove(r){if(!confirm('¿Eliminar este contenido?'))return;task(async()=>{const {data,error}=await getClient().from('crm_campaign_plans').delete().eq('id',r.id).select('id');if(error||data?.length!==1)throw Error(error?.message||'No se confirmó la eliminación.');await load();status('Contenido eliminado.')})}
async function seed(kind){if(!await load()||rows.length>=1000)throw Error('No se pudo verificar el calendario completo.');const entries=(kind==='calendar'?topics:welcome).map(([subject,body],i)=>({kind,channel:'email',segment:'Todos',subject,body:body+suffix(),planned_date:kind==='calendar'?dateOffset(i+1):null,delay_days:kind==='welcome'?i:null,planned_time:'09:00',status:'draft'}));const fresh=entries.filter(r=>!rows.some(x=>x.kind===r.kind&&x.channel===r.channel&&(kind==='calendar'?(x.planned_date===r.planned_date||x.subject===r.subject):x.delay_days===r.delay_days)));if(!fresh.length){status('Ya existe esta planificación. No se duplicaron contenidos.');return}const {data,error}=await getClient().from('crm_campaign_plans').insert(fresh).select('id');if(error||data?.length!==fresh.length)throw Error(error?.message||'No se confirmó el lote.');await load();status('Se guardaron '+fresh.length+' borradores nuevos. Revisalos antes de planificar. No se enviaron mensajes.')}
$('marketingSeed').onclick=()=>task(()=>seed('calendar'));$('marketingWelcome').onclick=()=>task(()=>seed('welcome'));$('mkNew').onclick=reset;$('mkCopy').onclick=async()=>{try{await navigator.clipboard.writeText($('mkSubject').value+'\n\n'+$('mkBody').value);status('Texto copiado.')}catch(e){$('mkBody').focus();$('mkBody').select();status('Copiá el texto seleccionado.')}};['mkKind','mkChannel','mkSegment','mkStatus'].forEach(id=>$(id).addEventListener('change',sync));['mkFilter','mkFilterChannel'].forEach(id=>$(id).addEventListener('change',draw));reset();
return {load,refresh:audienceCount,clear(){epoch++;loaded=false;rows=[];draw();reset();status('')}};
};