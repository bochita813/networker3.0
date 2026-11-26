(()=>{'use strict';
const conf=window.NETWORKER_CRM_CONFIG||{};
const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const stages=['Nuevo','Conversación','Interés confirmado','Presentación','Evaluación','Socio','Descartado'];
const dateToday=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
const fmtDate=s=>s?new Date(s+'T12:00:00').toLocaleDateString('es-AR'):'Sin fecha';
const phone=s=>String(s||'').replace(/\D/g,'');
const isDue=l=>!!(l.follow_up&&l.follow_up<=dateToday()&&!['Socio','Descartado'].includes(l.stage));
const logError=err=>{console.error('CRM:',err);notify('Ocurrió un problema. Revisá la conexión y volvé a intentar.')};
let client=null,leads=[],tab='tablero',signedIn=false,signupMode=false;
let toastTimer;
function notify(msg){const e=$('#toast');e.textContent=msg;e.style.display='block';clearTimeout(toastTimer);toastTimer=setTimeout(()=>e.style.display='none',4600)}
function notice(msg){const e=$('#notice');e.textContent=msg||'';e.hidden=!msg}
function setTab(next){
 tab=next;
 $$('.navbutton').forEach(e=>e.classList.toggle('active',e.dataset.tab===tab));
 render();
}
function filtered(){
 const q=$('#search').value.trim().toLocaleLowerCase('es'),src=$('#filterSource').value,pr=$('#filterPriority').value;
 return leads.filter(l=>(!src||l.source===src)&&(!pr||l.priority===pr)&&(!q||[l.name,l.phone,l.email,l.note,l.interest,l.entry_content,l.campaign,l.entry_channel].join(' ').toLocaleLowerCase('es').includes(q)));
}
function render(){
 $('#pageTitle').textContent=tab==='tablero'?'Tablero comercial':tab==='contactos'?'Todos los contactos':tab==='conversion'?'Conversión y campañas':'Agenda de seguimiento';
 $('#sectionTitle').textContent=tab==='tablero'?'Embudo de reclutamiento':tab==='contactos'?'Base de prospectos':'Próximas conversaciones';
 $('#statTotal').textContent=leads.length;
 $('#statActive').textContent=leads.filter(l=>!['Nuevo','Socio','Descartado'].includes(l.stage)).length;
 $('#statDue').textContent=leads.filter(isDue).length;
 $('#statWon').textContent=leads.filter(l=>l.stage==='Socio').length;
 $('#board').hidden=tab!=='tablero';$('#tablePanel').hidden=tab!=='contactos';$('#followPanel').hidden=tab!=='seguimientos';
 $('#conversionPanel').hidden=tab!=='conversion';$('#sectionTitle').hidden=tab==='conversion';$('.filters').hidden=tab==='conversion';if(tab==='conversion')drawConversion();
 const items=filtered();
 if(tab==='tablero')drawBoard(items);
 if(tab==='contactos')drawTable(items);
 if(tab==='seguimientos')drawFollow(items);
}
function audience(channel){const key=channel==='email'?'email':'phone',permission=channel==='email'?'email_marketing':'whatsapp_marketing',groups=new Map();for(const l of leads){const val=channel==='email'?String(l.email||'').trim().toLowerCase():phone(l.phone);if(!val)continue;if(!groups.has(val))groups.set(val,[]);groups.get(val).push(l)}return [...groups.entries()].filter(([v,rows])=>rows.every(l=>l[permission]===true&&l.marketing_opt_in_at)&& (channel==='email'?/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v):/^\d{9,15}$/.test(v))).map(([v,rows])=>({name:rows[0].name,[key]:v,permission:'true',opt_in_at:rows[0].marketing_opt_in_at}));}
function exportAudience(channel){if(!signedIn)return;if(leads.length>=1000){notify('La base supera el límite de carga; no se puede garantizar una exportación completa.');return}const rows=audience(channel);if(!rows.length){notify('No hay contactos autorizados para este canal.');return}const keys=['name',channel==='email'?'email':'phone','permission','opt_in_at'];const cell=v=>{let s=String(v??'');if(/^[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"'};const blob=new Blob(['\ufeff'+[keys.join(','),...rows.map(r=>keys.map(k=>cell(r[k])).join(','))].join('\r\n')],{type:'text/csv;charset=utf-8'});const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download='audiencia-'+channel+'-'+dateToday()+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}
$('#exportEmailAudience').onclick=()=>exportAudience('email');$('#exportWaAudience').onclick=()=>exportAudience('whatsapp');
function drawConversion(){
 $('#audEmail').textContent=audience('email').length;$('#audWa').textContent=audience('whatsapp').length;
 const total=leads.length,active=leads.filter(l=>['Conversación','Interés confirmado','Presentación','Evaluación','Socio'].includes(l.stage)).length,qualified=leads.filter(l=>['Interés confirmado','Presentación','Evaluación','Socio'].includes(l.stage)).length,presented=leads.filter(l=>['Presentación','Evaluación','Socio'].includes(l.stage)).length,won=leads.filter(l=>l.stage==='Socio').length;const rate=(n,d)=>d?((n/d)*100).toFixed(1)+'%':'—';
 const stats=[['Contactos registrados',total],['Conversación o etapa posterior',active],['Interés confirmado o posterior',qualified],['Presentación o posterior',presented],['Socios',won],['Socios / contactos',rate(won,total)]];
 $('#conversionMetrics').innerHTML=stats.map(([label,n])=>'<div class="stat"><small>'+escape(label)+'</small><b>'+escape(n)+'</b></div>').join('');
 const grouped=new Map();for(const l of leads){const source=l.source||'Landing',campaign=l.campaign||'Sin campaña',key=JSON.stringify([source,campaign]);if(!grouped.has(key))grouped.set(key,{source,campaign,count:0,active:0,won:0});const g=grouped.get(key);g.count++;if(['Conversación','Interés confirmado','Presentación','Evaluación','Socio'].includes(l.stage))g.active++;if(l.stage==='Socio')g.won++}
 $('#campaignMetrics').innerHTML='<table><thead><tr><th>Origen</th><th>Campaña</th><th>Contactos</th><th>Conversación o posterior</th><th>Socios</th></tr></thead><tbody>'+[...grouped.values()].sort((a,b)=>b.count-a.count).map(g=>'<tr><td>'+escape(g.source)+'</td><td>'+escape(g.campaign)+'</td><td>'+g.count+'</td><td>'+g.active+'</td><td>'+g.won+'</td></tr>').join('')+'</tbody></table>';
 $('#conversionCoverage').textContent='Métricas de '+total+' contactos cargados. Las etapas representan el estado actual, no un historial de conversiones. Los descartados no permiten reconstruir etapas previas.'+(total>=1000?' Se alcanzó el límite de 1.000 contactos.':'');
}
function generateCampaign(){try{const base='https://networker3.netlify.app',raw=$('#campaignCustom').value.trim()||$('#campaignDestination').value,u=new URL(raw,base);if(u.origin!==base||!['/','/propuesta-microcta.html','/punto-aparte.html'].includes(u.pathname))throw Error('Usá un enlace de la landing o de Punto Aparte.');if(u.pathname==='/')u.pathname='/propuesta-microcta.html';u.searchParams.set('utm_source',$('#campaignSource').value);u.searchParams.set('utm_medium',$('#campaignMedium').value);const campaign=$('#campaignName').value.trim(),content=$('#campaignContent').value.trim();if(campaign)u.searchParams.set('utm_campaign',campaign);else u.searchParams.delete('utm_campaign');if(content)u.searchParams.set('utm_content',content);else u.searchParams.delete('utm_content');$('#campaignUrl').value=u.href;$('#campaignStatus').textContent='Enlace listo para compartir.';return u.href}catch(e){$('#campaignStatus').textContent=e.message;return ''}}
$('#campaignGenerate').onclick=generateCampaign;
$('#campaignCopy').onclick=async()=>{const url=generateCampaign();if(!url)return;try{await navigator.clipboard.writeText(url);$('#campaignStatus').textContent='¡Enlace copiado!'}catch(e){$('#campaignUrl').focus();$('#campaignUrl').select();$('#campaignStatus').textContent='Copiá el enlace seleccionado.'}};

function drawBoard(items){
 const root=$('#board');root.replaceChildren();
 for(const stage of stages){
  const lane=document.createElement('section');lane.className='lane';
  const subset=items.filter(l=>l.stage===stage);
  lane.innerHTML='<div class="laneheading"><span>'+escape(stage)+'</span><span class="counter">'+subset.length+'</span></div>';
  for(const l of subset){
   const article=document.createElement('article');article.className='lead';article.draggable=true;
   article.innerHTML='<strong>'+escape(l.name)+'</strong><div class="leadnote">'+escape(l.source)+' · '+escape(l.interest)+'</div>'+(l.entry_content?'<div class="leadnote">'+escape(l.entry_content)+'</div>':'')
   +'<span class="pill'+(l.priority==='Alta'?' hot':'')+'">'+escape(l.priority)+'</span>'
   +(isDue(l)?'<span class="pill late">Pendiente</span>':'')
   +'<div class="leadfoot"><span>'+escape(fmtDate(l.follow_up))+'</span><span>Editar ↗</span></div>';
   article.addEventListener('click',()=>edit(l.id));
   article.addEventListener('dragstart',e=>{e.dataTransfer.setData('text/plain',l.id);e.dataTransfer.effectAllowed='move'});
   lane.appendChild(article);
  }
  if(!subset.length){const empty=document.createElement('div');empty.className='blank';empty.textContent='Sin prospectos';lane.appendChild(empty)}
  lane.addEventListener('dragover',e=>{e.preventDefault();lane.classList.add('over')});
  lane.addEventListener('dragleave',()=>lane.classList.remove('over'));
  lane.addEventListener('drop',async e=>{e.preventDefault();lane.classList.remove('over');const id=e.dataTransfer.getData('text/plain');if(id)await moveLead(id,stage)});
  root.appendChild(lane);
 }
}
function drawTable(items){
 const root=$('#tablePanel');
 if(!items.length){root.textContent='Todavía no hay contactos para mostrar.';return}
 root.innerHTML='<table><thead><tr><th>Nombre</th><th>Origen</th><th>Etapa</th><th>Prioridad</th><th>Seguimiento</th></tr></thead><tbody></tbody></table>';
 const tbody=root.querySelector('tbody');
 for(const l of items){
  const tr=document.createElement('tr');
  tr.innerHTML='<td><strong>'+escape(l.name)+'</strong></td><td>'+escape(l.source)+'</td><td>'+escape(l.stage)+'</td><td>'+escape(l.priority)+'</td><td>'+escape(fmtDate(l.follow_up))+'</td>';
  tr.addEventListener('click',()=>edit(l.id));tbody.appendChild(tr);
 }
}
function drawFollow(items){
 const root=$('#followPanel');root.replaceChildren();
 const list=items.filter(l=>l.follow_up&&!['Socio','Descartado'].includes(l.stage)).sort((a,b)=>a.follow_up.localeCompare(b.follow_up));
 if(!list.length){root.textContent='Todavía no hay seguimientos programados.';return}
 for(const l of list){
  const row=document.createElement('div');row.className='followrow';
  const text=document.createElement('div');
  text.innerHTML='<strong>'+escape(l.name)+'</strong><small>'+escape(l.stage)+' · '+escape(l.source)+'</small>';
  const actions=document.createElement('div');
  const when=document.createElement('span');when.className='pill'+(isDue(l)?' late':'');when.textContent=fmtDate(l.follow_up);
  const btn=document.createElement('button');btn.className='btn';btn.type='button';btn.textContent='Abrir';btn.addEventListener('click',()=>edit(l.id));
  actions.append(when,btn);row.append(text,actions);root.appendChild(row);
 }
}
function closeEditor(){$('#editorOverlay').classList.remove('open')}
function edit(id){
 const l=leads.find(x=>x.id===id);
 const set=(key,value)=>{$('#'+key).value=value??''};
 set('leadId',l?.id||'');set('name',l?.name||'');set('phone',l?.phone||'');
 set('source',l?.source||'Landing');set('interest',l?.interest||'Explorando');
 set('stage',l?.stage||'Nuevo');set('priority',l?.priority||'Media');
 set('follow_up',l?.follow_up||'');set('last_contact',l?.last_contact||'');
 set('contact_email',l?.email||'');set('note',l?.note||'');set('entry_channel',l?.entry_channel||'');set('campaign',l?.campaign||'');set('entry_content',l?.entry_content||'');$('#email_marketing').checked=!!l?.email_marketing;$('#whatsapp_marketing').checked=!!l?.whatsapp_marketing;
 $('#editorTitle').textContent=l?'Editar contacto':'Nuevo contacto';
 $('#deleteLead').hidden=!l;
 const p=phone(l?.phone);const wa=$('#waLink');
 wa.hidden=!p; if(p)wa.href='https://wa.me/'+p+'?text='+encodeURIComponent('Hola '+(l?.name?.split(' ')[0]||'')+', ¿cómo estás?');
 $('#editorOverlay').classList.add('open');$('#name').focus();
}
async function saveLead(e){
 e.preventDefault();if(!signedIn)return;
 const id=$('#leadId').value;
 const p=phone($('#phone').value);
 if(p.length<9||p.length>15){notify('Revisá WhatsApp: usá 9 a 15 dígitos, con código de país.');return}
 const prior=leads.find(x=>x.id===id);const em=$('#email_marketing').checked,wm=$('#whatsapp_marketing').checked;if(em&&!$('#contact_email').value.trim()){notify('Ingresá un email antes de activar su permiso.');return;}
 const payload={
  name:$('#name').value.trim(),phone:p,source:$('#source').value,
  interest:$('#interest').value,stage:$('#stage').value,priority:$('#priority').value,
  follow_up:$('#follow_up').value||null,last_contact:$('#last_contact').value||null,
  email:$('#contact_email').value.trim()||null,note:$('#note').value.trim(),entry_channel:$('#entry_channel').value.trim(),campaign:$('#campaign').value.trim(),entry_content:$('#entry_content').value.trim(),email_marketing:em,whatsapp_marketing:wm,marketing_opt_in_at:(em||wm)?((prior?.email_marketing===em&&prior?.whatsapp_marketing===wm&&prior?.marketing_opt_in_at)||new Date().toISOString()):null,
  updated_at:new Date().toISOString()
 };
 if(payload.name.length<2){notify('Ingresá un nombre válido.');return}
 $('#saveLead').disabled=true;
 try{
  const query=id?client.from('crm_leads').update(payload).eq('id',id):client.from('crm_leads').insert(payload);
  const {data,error}=await query.select('id');
  if(error)throw error;
  if(!data||data.length!==1)throw Error('No se confirmó la operación.');
  closeEditor();notify(id?'Contacto actualizado':'Contacto incorporado');await load();
 }catch(err){console.error(err);notify('No se pudo guardar: '+(err.message||'error desconocido'))}
 finally{$('#saveLead').disabled=false}
}
async function moveLead(id,stage){
 if(!stages.includes(stage))return;
 const l=leads.find(x=>x.id===id);if(!l||l.stage===stage)return;
 const {data,error}=await client.from('crm_leads').update({stage,updated_at:new Date().toISOString()}).eq('id',id).select('id');
 if(error||!data?.length){notify('No se pudo cambiar la etapa');return}
 l.stage=stage;render();notify('Etapa actualizada');
}
async function deleteLead(){
 const id=$('#leadId').value;if(!id)return;
 if(!confirm('¿Eliminar definitivamente este contacto?'))return;
 $('#deleteLead').disabled=true;
 try{const {data,error}=await client.from('crm_leads').delete().eq('id',id).select('id');if(error)throw error;if(!data?.length)throw Error('No se encontró el contacto');closeEditor();notify('Contacto eliminado');await load()}catch(e){notify('No se pudo eliminar: '+e.message)}
 finally{$('#deleteLead').disabled=false}
}
function exportCSV(){
 if(!leads.length){notify('No hay contactos para exportar');return}
 const keys=['name','phone','email','source','entry_channel','campaign','entry_content','interest','stage','priority','note','follow_up','last_contact','created_at'];
 const csvCell=v=>{let s=String(v??'');if(/^[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};
 const rows=[keys.join(',')].concat(leads.map(l=>keys.map(k=>csvCell(l[k])).join(',')));
 const blob=new Blob(['\ufeff'+rows.join('\r\n')],{type:'text/csv;charset=utf-8'});
 const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='networker-3-crm-'+dateToday()+'.csv';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function load(){
 if(!signedIn)return;
 const {data,error}=await client.from('crm_leads').select('*').order('created_at',{ascending:false}).limit(1000);
 if(error){notice('No se pudieron cargar los datos: '+error.message);return}
 leads=data||[];
 notice(leads.length>=1000?'Se muestran hasta 1.000 contactos; el próximo paso será agregar paginación.':'');
 render();
}
async function checkAuth(){
 const {data,error}=await client.auth.getUser();
 const user=data?.user;
 if(error||!user){signedIn=false;$('#loginOverlay').classList.add('open');return}
 const {data:admin,error:adminErr}=await client.from('crm_admins').select('user_id').eq('user_id',user.id).maybeSingle();
 if(adminErr||!admin){signedIn=false;$('#loginOverlay').classList.add('open');$('#loginError').textContent='Cuenta creada, pero todavía no autorizada. Avisá que ya registraste y confirmaste tu correo para habilitarte como administrador.';return}
 signedIn=true;$('#sessionEmail').textContent=user.email||'';$('#loginOverlay').classList.remove('open');$('#loginError').textContent='';await load();
}
async function login(e){
 e.preventDefault();
 const email=$('#loginEmail').value.trim(),password=$('#loginPassword').value;
 $('#loginAction').disabled=true;$('#loginError').textContent='';
 try{
  const result=signupMode?await client.auth.signUp({email,password,options:{emailRedirectTo:location.origin+'/crm/'}}):await client.auth.signInWithPassword({email,password});
  if(result.error)throw result.error;
  if(signupMode){
   if(!result.data?.session){$('#loginError').textContent='Revisá tu correo y confirmá la cuenta. Después iniciá sesión para solicitar autorización.';return}
   $('#loginError').textContent='Usuario creado. Falta autorización de administrador.';
  }
  await checkAuth();
 }catch(err){$('#loginError').textContent=err.message||'No se pudo ingresar.'}
 finally{$('#loginAction').disabled=false}
}
$$('.navbutton').forEach(el=>el.addEventListener('click',()=>setTab(el.dataset.tab)));
['search','filterSource','filterPriority'].forEach(id=>$('#'+id).addEventListener('input',render));
$('#add').addEventListener('click',()=>edit(null));
$('#refresh').addEventListener('click',load);
$('#export').addEventListener('click',exportCSV);
$('#leadForm').addEventListener('submit',saveLead);
$('#cancelEditor').addEventListener('click',closeEditor);
$('#closeEditor').addEventListener('click',closeEditor);
$('#editorOverlay').addEventListener('click',e=>{if(e.target===$('#editorOverlay'))closeEditor()});
$('#deleteLead').addEventListener('click',deleteLead);
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeEditor()});
$('#logout').addEventListener('click',async e=>{e.preventDefault();if(client){await client.auth.signOut();leads=[];signedIn=false;render();$('#loginOverlay').classList.add('open')}});
$('#loginForm').addEventListener('submit',login);
$('#switchAuth').addEventListener('click',()=>{
 signupMode=!signupMode;$('#loginAction').textContent=signupMode?'Crear cuenta':'Ingresar';
 $('#switchAuth').textContent=signupMode?'Ya tengo cuenta: ingresar':'Crear usuario por primera vez';
 $('#loginTitle').textContent=signupMode?'Creá tu usuario':'Ingresá a tu CRM';
 $('#loginError').textContent=signupMode?'Usá tu correo personal. Es necesario confirmarlo y que se autorice tu acceso.':'';
});
if(!conf.url||!conf.publishableKey||!window.supabase){
 $('#loginError').textContent='No se pudo cargar la conexión del CRM. Actualizá la página o consultá con el administrador.';
 $('#loginAction').disabled=true;return;
}
client=window.supabase.createClient(conf.url,conf.publishableKey,{auth:{persistSession:true,autoRefreshToken:true}});
checkAuth().catch(logError);
})();
