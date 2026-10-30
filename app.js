import { initializeApp } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js';
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendEmailVerification, sendPasswordResetEmail, signOut, reload, getIdToken
} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js';
import {
  getFirestore, collection, doc, getDoc, addDoc, updateDoc, deleteDoc,
  setDoc, onSnapshot, serverTimestamp, writeBatch
} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js';
import { firebaseConfig, TEAM_ID } from './firebase-config.js';

const $ = id => document.getElementById(id);
const PROVINCES = ['Álava','Albacete','Alicante','Almería','Asturias','Ávila','Badajoz','Barcelona','Burgos','Cáceres','Cádiz','Cantabria','Castellón','Ciudad Real','Córdoba','A Coruña','Cuenca','Girona','Granada','Guadalajara','Gipuzkoa','Huelva','Huesca','Illes Balears','Jaén','León','Lleida','Lugo','Madrid','Málaga','Murcia','Navarra','Ourense','Palencia','Las Palmas','Pontevedra','La Rioja','Salamanca','Santa Cruz de Tenerife','Segovia','Sevilla','Soria','Tarragona','Teruel','Toledo','Valencia','Valladolid','Bizkaia','Zamora','Zaragoza','Ceuta','Melilla'];
let auth, db, restaurantsRef, membersRef;
let places = [], editingId = null, activeUser = null, activeMember = null;
let stopPlaces = null, stopMembers = null, toastTimer = null;
let creatingAccount = false, busyAuth = false, busySave = false, sessionSerial = 0;

function show(screen) {
  for (const id of ['setupScreen','authScreen','verifyScreen','notMemberScreen','appScreen']) $(id).classList.toggle('hidden',id!==screen);
}
function sync(label, kind='') {
  $('syncText').textContent=label;
  $('syncStatus').className='status '+kind;
}
function toast(message) {
  $('toast').textContent=message;
  $('toast').classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),3600);
}
function errorText(err) {
  switch (err?.code) {
    case 'auth/invalid-email': return 'Revisá la dirección de correo.';
    case 'auth/invalid-credential': return 'Correo o contraseña incorrectos.';
    case 'auth/email-already-in-use': return 'Ese correo ya tiene una cuenta. Iniciá sesión.';
    case 'auth/weak-password': return 'La contraseña debe tener al menos 6 caracteres.';
    case 'auth/too-many-requests': return 'Demasiados intentos. Probá más tarde.';
    case 'auth/operation-not-allowed': return 'Hay que activar Correo/contraseña en Firebase Authentication.';
    case 'auth/unauthorized-domain': return 'Agregá el dominio de esta web a los dominios autorizados en Firebase Authentication.';
    case 'permission-denied': return 'No tenés permiso: revisá la invitación o las reglas de Firestore.';
    case 'unavailable': return 'No se pudo conectar. Revisá internet e intentá otra vez.';
    default: return 'No se pudo completar la operación. Revisá la conexión y la configuración.';
  }
}
function normalize(value) { return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' '); }
function option(select, value, label) { const e=document.createElement('option');e.value=value;e.textContent=label;select.append(e); }
function el(tag,cls,text) { const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e; }
function validMapsUrl(input) {
  try {
    const u=new URL(String(input).trim());
    if (u.protocol!=='https:') return null;
    const h=u.hostname.toLowerCase();
    const validShort=h==='maps.app.goo.gl'||(h==='goo.gl'&&u.pathname.startsWith('/maps'));
    const validGoogle=/^(?:www\.|maps\.)?google\.(?:com|es|pt|fr|co\.uk)$/.test(h)
      && (u.pathname.startsWith('/maps')||h.startsWith('maps.'));
    return validShort||validGoogle ? u.href : null;
  } catch { return null; }
}
function keyOf(p) { return [p.province,p.town,p.restaurant].map(normalize).join(' / '); }
function resetSubscriptions() {
  if(stopPlaces) { stopPlaces();stopPlaces=null; }
  if(stopMembers) { stopMembers();stopMembers=null; }
  places=[]; activeMember=null;
  $('statPlaces').textContent='—';$('statTowns').textContent='—';
}
function resetForm() {
  editingId=null;$('restaurantForm').reset();$('province').value='Badajoz';
  $('formTitle').textContent='Guardar un restaurante';$('saveBtn').textContent='＋ Guardar restaurante';
  $('cancelEdit').classList.add('hidden');
}
function renderPlaces() {
  $('statPlaces').textContent=String(places.length);
  $('statTowns').textContent=String(new Set(places.map(p=>normalize(p.province)+'/'+normalize(p.town))).size);
  const query=normalize($('search').value), prov=$('filter').value;
  const filtered=places.filter(p=>(!prov||p.province===prov)&&(!query||normalize([p.province,p.town,p.restaurant,p.note].join(' ')).includes(query)))
    .sort((a,b)=>a.province.localeCompare(b.province,'es')||a.town.localeCompare(b.town,'es')||a.restaurant.localeCompare(b.restaurant,'es'));
  $('countText').textContent=filtered.length+' '+(filtered.length===1?'lugar':'lugares');
  const container=$('places');container.replaceChildren();
  if(!filtered.length) {
    container.append(el('div','empty',places.length?'No hay resultados para esa búsqueda.':'🍽️ Todavía no hay restaurantes. ¡Agreguen el primero!'));
    return;
  }
  for (const place of filtered) {
    const card=el('article','place');card.append(el('span','tag',place.province));
    card.append(el('h3','',place.restaurant),el('div','where','⌖ '+place.town));
    if(place.note)card.append(el('div','note',place.note));
    if(place.authorEmail)card.append(el('div','by','Guardado por '+place.authorEmail));
    const buttons=el('div','place-actions');
    const go=el('a','btn primary','↗ Cómo llegar');
    // Se vuelve a validar el enlace antes de utilizarlo.
    const safe=validMapsUrl(place.url);
    if(safe) { go.href=safe;go.target='_blank';go.rel='noopener noreferrer';buttons.append(go); }
    const edit=el('button','btn secondary','Editar');edit.type='button';edit.addEventListener('click',()=>startEdit(place.id));buttons.append(edit);
    const del=el('button','btn ghost danger','Eliminar');del.type='button';del.addEventListener('click',()=>removePlace(place.id));buttons.append(del);
    card.append(buttons);container.append(card);
  }
}
function startEdit(id) {
  const p=places.find(item=>item.id===id);if(!p)return;
  editingId=p.id;
  $('province').value=p.province;$('town').value=p.town;$('restaurant').value=p.restaurant;
  $('maps').value=p.url;$('note').value=p.note||'';
  $('formTitle').textContent='Editar restaurante';$('saveBtn').textContent='✓ Guardar cambios';
  $('cancelEdit').classList.remove('hidden');
  $('formPanel').scrollIntoView({behavior:'smooth',block:'start'});
}
async function removePlace(id) {
  const p=places.find(item=>item.id===id);if(!p)return;
  if(!confirm('¿Eliminar «'+p.restaurant+'» de la lista de TODOS los compañeros?'))return;
  try { await deleteDoc(doc(restaurantsRef,id));if(editingId===id)resetForm();toast('Restaurante eliminado del equipo'); }
  catch(e) { toast(errorText(e)); }
}
async function saveRestaurant(event) {
  event.preventDefault();if(busySave)return;
  if(!navigator.onLine) {toast('Necesitás conexión a internet para guardar y sincronizar.');return;}
  const province=$('province').value, town=$('town').value.trim(), restaurant=$('restaurant').value.trim(),
    url=validMapsUrl($('maps').value), note=$('note').value.trim();
  if(!province||!town||!restaurant) {toast('Completá provincia, pueblo y restaurante.');return;}
  if(!url) {toast('Pegá un enlace válido de Google Maps (https://maps.app.goo.gl/…).');$('maps').focus();return;}
  const candidate={province,town,restaurant,url,note};
  if(places.some(p=>p.id!==editingId&&keyOf(p)===keyOf(candidate))) {toast('Ese restaurante ya está guardado. Podés editarlo.');return;}
  busySave=true;$('saveBtn').disabled=true;
  try {
    const data={...candidate,updatedAt:serverTimestamp(),updatedBy:activeUser.email};
    if(editingId) {
      await updateDoc(doc(restaurantsRef,editingId),data);
      toast('Cambios sincronizados con el equipo ✓');
    } else {
      await addDoc(restaurantsRef,{...data,createdAt:serverTimestamp(),authorEmail:activeUser.email});
      toast('Restaurante compartido con el equipo ✓');
    }
    resetForm();
  } catch(e) {toast(errorText(e));}
  finally {busySave=false;$('saveBtn').disabled=false;}
}
function renderMembers(members) {
  const container=$('membersList');container.replaceChildren();
  for(const m of members) {
    const line=el('div','member');const info=el('span');
    info.append(el('strong','',m.email+' '),el('small','',m.role==='admin'?' · Administrador':' · Compañero'));
    line.append(info);
    if(m.role==='member') {
      const remove=el('button','btn tiny ghost danger','Quitar');remove.type='button';
      remove.addEventListener('click',async()=>{
        if(!confirm('¿Quitar acceso a '+m.email+'?'))return;
        try{await deleteDoc(doc(membersRef,m.email));toast('Acceso retirado');}
        catch(e){toast(errorText(e));}
      });
      line.append(remove);
    }
    container.append(line);
  }
}
async function invite(event) {
  event.preventDefault();if(!activeMember||activeMember.role!=='admin')return;
  const email=$('inviteEmail').value.trim().toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {toast('Escribí un correo válido.');return;}
  $('inviteBtn').disabled=true;
  try {
    if((await getDoc(doc(membersRef,email))).exists()){toast('Ese correo ya está invitado.');return;}
    await setDoc(doc(membersRef,email),{email,role:'member',addedAt:serverTimestamp()});
    $('inviteEmail').value='';toast('Compañero invitado. Ya puede crear una cuenta y verificar su correo.');
  } catch(e) {toast(errorText(e));}
  finally {$('inviteBtn').disabled=false;}
}
function listenData() {
  stopPlaces=onSnapshot(restaurantsRef,{includeMetadataChanges:true},snapshot=>{
    places=snapshot.docs.map(d=>({id:d.id,...d.data()}));renderPlaces();
    sync(snapshot.metadata.hasPendingWrites?'Guardando cambios…':snapshot.metadata.fromCache?'Sin sincronizar':'Sincronizado',
      snapshot.metadata.hasPendingWrites||snapshot.metadata.fromCache?'pending':'good');
  },e=>{sync('Error de acceso','error');toast(errorText(e));});
  if(activeMember?.role==='admin') {
    $('membersPanel').classList.remove('hidden');
    stopMembers=onSnapshot(membersRef,snap=>renderMembers(snap.docs.map(d=>d.data()).sort((a,b)=>a.email.localeCompare(b.email))),
      e=>toast(errorText(e)));
  } else {$('membersPanel').classList.add('hidden');}
}
async function checkMembership() {
  const serial=++sessionSerial;
  const user=auth.currentUser;resetSubscriptions();
  if(!user) { activeUser=null;show('authScreen');sync('Sin conectar');return; }
  activeUser=user;
  if(!user.emailVerified) {
    $('verifyEmail').textContent=user.email;show('verifyScreen');sync('Correo por verificar','pending');return;
  }
  try {
    const member=await getDoc(doc(membersRef,user.email.toLowerCase()));
    if(serial!==sessionSerial || auth.currentUser?.uid!==user.uid)return;
    if(!member.exists()) {
      $('waitingEmail').textContent=user.email;show('notMemberScreen');sync('Sin invitación','pending');return;
    }
    activeMember=member.data();$('currentEmail').textContent=user.email;
    resetForm();show('appScreen');sync('Conectando…','pending');listenData();
  } catch(e) {
    if(serial!==sessionSerial || auth.currentUser?.uid!==user.uid)return;
    $('waitingEmail').textContent=user.email;show('notMemberScreen');sync('Sin acceso','error');toast(errorText(e));
  }
}
function changeAuthMode() {
  creatingAccount=!creatingAccount;
  $('authTitle').textContent=creatingAccount?'Crear cuenta':'Entrar a Paradas';
  $('authSubmit').textContent=creatingAccount?'Crear cuenta y verificar email':'Entrar';
  $('toggleAuth').textContent=creatingAccount?'Ya tengo cuenta: entrar':'¿Primera vez? Crear una cuenta';
  $('authPassword').autocomplete=creatingAccount?'new-password':'current-password';
  $('authError').classList.add('hidden');
}
async function submitAuth(event) {
  event.preventDefault();if(busyAuth)return;
  const email=$('authEmail').value.trim().toLowerCase(),password=$('authPassword').value;
  busyAuth=true;$('authSubmit').disabled=true;$('authError').classList.add('hidden');
  try {
    if(creatingAccount) {
      const created=await createUserWithEmailAndPassword(auth,email,password);
      await sendEmailVerification(created.user);
      toast('Te enviamos un correo para verificar tu cuenta.');
    } else await signInWithEmailAndPassword(auth,email,password);
    $('authPassword').value='';
  } catch(e) {
    $('authError').textContent=errorText(e);$('authError').classList.remove('hidden');
  } finally {busyAuth=false;$('authSubmit').disabled=false;}
}
async function checkVerification() {
  try {
    await reload(auth.currentUser);
    await getIdToken(auth.currentUser,true);
    if(auth.currentUser.emailVerified)await checkMembership();
    else toast('Todavía falta verificar el correo. Revisá tu bandeja de entrada y spam.');
  } catch(e) {toast(errorText(e));}
}
function downloadBackup() {
  const payload={app:'Paradas para comer',version:2,exportedAt:new Date().toISOString(),places:places.map(p=>({
    province:p.province,town:p.town,restaurant:p.restaurant,url:p.url,note:p.note||'',createdAt:p.createdAt?.toDate?.()?.toISOString?.()||''
  }))};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;
  link.download='paradas-equipo-'+new Date().toISOString().slice(0,10)+'.json';document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),2500);toast('Respaldo descargado.');
}
async function importBackup(event) {
  const file=event.target.files?.[0];event.target.value='';if(!file)return;
  if(!navigator.onLine){toast('Necesitás conexión a internet para importar.');return;}
  if(file.size>2*1024*1024){toast('Archivo demasiado grande (máximo 2 MB).');return;}
  try {
    const parsed=JSON.parse(await file.text());const entries=Array.isArray(parsed)?parsed:parsed.places;
    if(!Array.isArray(entries))throw new Error('formato');
    const known=new Set(places.map(keyOf)),fresh=[];
    for(const item of entries.slice(0,400)) {
      if(!item||typeof item!=='object')continue;
      const obj={province:String(item.province||'').trim(),town:String(item.town||'').trim(),
        restaurant:String(item.restaurant||'').trim(),url:validMapsUrl(item.url),note:String(item.note||'').trim().slice(0,600)};
      if(!PROVINCES.includes(obj.province)||!obj.town||obj.town.length>90||!obj.restaurant||obj.restaurant.length>130||!obj.url)continue;
      const key=keyOf(obj);if(known.has(key))continue;known.add(key);fresh.push(obj);
    }
    if(!fresh.length){toast('No hay restaurantes nuevos válidos para importar.');return;}
    if(!confirm('¿Importar '+fresh.length+' restaurantes a la lista compartida del equipo?'))return;
    const batch=writeBatch(db);
    for(const p of fresh)batch.set(doc(restaurantsRef),{...p,createdAt:serverTimestamp(),updatedAt:serverTimestamp(),authorEmail:activeUser.email,updatedBy:activeUser.email});
    await batch.commit();toast(fresh.length+' restaurantes importados para todos ✓');
  } catch(e) {toast(e.message==='formato'?'La copia JSON no tiene el formato esperado.':errorText(e));}
}
function bindEvents() {
  for(const province of PROVINCES) {option($('province'),province,province);option($('filter'),province,province);}
  $('province').value='Badajoz';
  $('search').addEventListener('input',renderPlaces);$('filter').addEventListener('change',renderPlaces);
  $('restaurantForm').addEventListener('submit',saveRestaurant);$('cancelEdit').addEventListener('click',resetForm);
  $('authForm').addEventListener('submit',submitAuth);$('toggleAuth').addEventListener('click',changeAuthMode);
  $('resetPassword').addEventListener('click',async()=>{
    const email=$('authEmail').value.trim();if(!email){toast('Escribí tu correo electrónico primero.');return;}
    try{await sendPasswordResetEmail(auth,email);toast('Si la cuenta existe, recibirás un correo para restablecer la contraseña.');}
    catch(e){toast(errorText(e));}
  });
  $('checkVerified').addEventListener('click',checkVerification);
  $('resendVerification').addEventListener('click',async()=>{
    try{await sendEmailVerification(auth.currentUser);toast('Correo de verificación reenviado.');}
    catch(e){toast(errorText(e));}
  });
  $('retryMember').addEventListener('click',checkMembership);
  document.querySelectorAll('.logout').forEach(btn=>btn.addEventListener('click',async()=>{try{await signOut(auth);}catch(e){toast(errorText(e));}}));
  $('inviteForm').addEventListener('submit',invite);
  $('exportBtn').addEventListener('click',downloadBackup);
  $('importBtn').addEventListener('click',()=>$('importFile').click());
  $('importFile').addEventListener('change',importBackup);
  window.addEventListener('offline',()=>sync('Sin conexión','error'));
}
function main() {
  bindEvents();
  if(!firebaseConfig.apiKey||firebaseConfig.apiKey.includes('PEGAR_')||!firebaseConfig.appId||firebaseConfig.appId.includes('PEGAR_')||!firebaseConfig.projectId||firebaseConfig.projectId.includes('PEGAR_')) {
    show('setupScreen');sync('Falta configuración','pending');return;
  }
  try {
    const app=initializeApp(firebaseConfig);auth=getAuth(app);db=getFirestore(app);
    restaurantsRef=collection(db,'teams',TEAM_ID,'restaurants');membersRef=collection(db,'teams',TEAM_ID,'members');
    sync('Conectando…','pending');
    onAuthStateChanged(auth,()=>checkMembership().catch(e=>{sync('Error de inicio','error');toast(errorText(e));}),e=>{sync('Error de sesión','error');toast(errorText(e));});
  } catch(e) {show('setupScreen');sync('Error de configuración','error');toast(errorText(e));}
}
main();
