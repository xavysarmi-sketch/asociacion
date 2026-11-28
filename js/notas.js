// ══ v46.67 · NOTAS PERSONALES DEL COORDINADOR (Ángel 26/11/2026) ══════════════════════════════════════════════
// Una nota por grupo (debajo de la cuenta con el jefe) y una por persona (📝 junto a su nombre en Cobros). Con fecha;
// se pueden editar y archivar. FUERA DE LA CONTABILIDAD: no van en DATA, sino en Firebase privado/notas (solo las lee y
// escribe la cuenta del administrador; reglas: match /privado/{doc}), con copia en este móvil. Así NUNCA entran en las
// cuentas, la auditoría, el Excel, sync_nh.py ni nh_balance.py (leen nh/data), ni en las fichas de la app de asociados.
// La app de asociados no carga este archivo (NO_ASOCIADOS en verificar_app.js).
// Solo declaraciones: el estado (NOTAS, NOTAS_EST, NOTA_ED) está en arranque.js. Leer las notas no escribe en DATA.
const NOTAS_LS="nh-notas-v1", NOTAS_PEND="nh-notas-pend";
function _notasLS(){ try{ return JSON.parse(localStorage.getItem(NOTAS_LS)||"null"); }catch(e){ return null; } }
function _notasGuardaLS(){ try{ localStorage.setItem(NOTAS_LS,JSON.stringify(NOTAS||{})); }catch(e){} }
function _notasPend(){ try{ return JSON.parse(localStorage.getItem(NOTAS_PEND)||"[]"); }catch(e){ return []; } }
function _notasSetPend(a){ try{ if(a.length)localStorage.setItem(NOTAS_PEND,JSON.stringify(a)); else localStorage.removeItem(NOTAS_PEND); }catch(e){} }
async function _notasSubir(op){ if(!window._fbNotas)throw new Error("sin nube"); await window._fbNotas.guardar(op.tipo,op.id,op.nota,op.arch||null); }
// Se leen de la nube la primera vez que se pinta una nota (y se reintenta como mucho cada 30 s si no hay conexión)
function _notasCargar(){
  if(NOTAS===null)NOTAS=_notasLS()||{};
  if(NOTAS_EST==="ok"||NOTAS_EST==="cargando")return;
  if(NOTAS_EST.indexOf("err:")===0&&Date.now()-(+NOTAS_EST.slice(4))<30000)return;
  if(!window._fbNotas){ NOTAS_EST="err:"+Date.now(); return; }
  NOTAS_EST="cargando";
  (async()=>{
    try{
      const pend=_notasPend(); for(const op of pend)await _notasSubir(op); _notasSetPend([]); // lo que se guardó sin conexión
      const d=await window._fbNotas.leer(); NOTAS={grupos:d.grupos||{},personas:d.personas||{},archivo:d.archivo||[]};
      NOTAS_EST="ok"; _notasGuardaLS();
    }catch(e){ NOTAS_EST="err:"+Date.now(); console.warn("[NH] Notas: no se han podido leer de la nube (se ve la copia de este móvil)",e); }
    if(typeof render==="function")render();
  })();
}
function _notaHoy(){ const d=new Date(); return String(d.getDate()).padStart(2,"0")+"/"+String(d.getMonth()+1).padStart(2,"0")+"/"+d.getFullYear(); }
function _nota(tipo,id){ _notasCargar(); return (NOTAS&&NOTAS[tipo]&&NOTAS[tipo][id])||null; }
function _notaAplicar(op){
  if(!NOTAS)NOTAS={}; NOTAS[op.tipo]=NOTAS[op.tipo]||{};
  if(op.nota)NOTAS[op.tipo][op.id]=op.nota; else delete NOTAS[op.tipo][op.id];
  if(op.arch)(NOTAS.archivo=NOTAS.archivo||[]).push(op.arch);
  _notasGuardaLS();
  _notasSubir(op).catch(()=>{ _notasSetPend([..._notasPend(),op]); toast("⚠️ Sin conexión: la nota queda en este móvil y se subirá al volver a abrirla",5000); });
}
function notaEditar(tipo,id){ NOTA_ED={tipo,id}; render(); setTimeout(()=>{ const t=document.getElementById("nota-txt"); if(t)t.focus(); },60); }
function notaGuardar(tipo,id){
  const t=String((document.getElementById("nota-txt")||{}).value||"").trim().slice(0,1000);
  if(!t){ toast("Escribe la nota o toca Cancelar"); return; }
  const ant=_nota(tipo,id), nota=ant?{t,f:ant.f,e:_notaHoy()}:{t,f:_notaHoy()};
  _notaAplicar({tipo,id,nota}); NOTA_ED=null; render(); toast("Nota guardada · no cuenta en las cuentas");
}
function notaArchivar(tipo,id){
  const n=_nota(tipo,id); if(!n)return; delete DESP["notaarch-"+tipo+"-"+id];
  _notaAplicar({tipo,id,nota:null,arch:Object.assign({tipo,id,a:_notaHoy()},n)}); render(); toast("Nota archivada");
}
// Caja de la nota (borde de rayas: no es dinero)
function _notaCajaHTML(tipo,id,tit){
  const n=_nota(tipo,id), ed=!!(NOTA_ED&&NOTA_ED.tipo===tipo&&NOTA_ED.id===id), k=esc(id);
  const cab=`<div class="nota-cab"><b>📝 ${tit}</b><span class="nota-aviso">No cuenta en las cuentas</span></div>`;
  if(ed)return `<div class="nota-caja">${cab}
    <textarea id="nota-txt" class="nota-txt" rows="3" maxlength="1000" placeholder="Escribe lo que quieras recordar…">${escH(n?n.t:"")}</textarea>
    <div class="nota-btns"><button class="nota-b" onclick="NOTA_ED=null;render()">Cancelar</button><button class="nota-b pri" onclick="notaGuardar('${tipo}','${k}')">Guardar nota</button></div></div>`;
  if(!n)return tipo==="grupos"?`<button class="nota-nueva" onclick="notaEditar('grupos','${k}')">📝 ＋ Nota del grupo <small>· no cuenta en las cuentas</small></button>`:"";
  const ka="notaarch-"+tipo+"-"+id, arm=!!DESP[ka];
  return `<div class="nota-caja">${cab}
    <div class="nota-texto">${escH(n.t).replace(/\n/g,"<br>")}</div>
    <div class="nota-pie"><span class="nota-fecha">${n.e?"Cambiada el "+n.e:"Escrita el "+n.f}</span>
      <span class="nota-btns"><button class="nota-b" onclick="notaEditar('${tipo}','${k}')">✏️ Editar</button><button class="nota-b${arm?" arm":""}" onclick="${arm?`notaArchivar('${tipo}','${k}')`:`DESP['${esc(ka)}']=true;render()`}">${arm?"¿Archivar? Toca otra vez":"🗄 Archivar"}</button></span></div></div>`;
}
function notaGrupoHTML(g){ return `<div style="margin-top:12px">${_notaCajaHTML("grupos",g.id,"Nota del grupo")}</div>`; }
// v46.71 (Ángel 28/11/2026): la nota del grupo, en una línea (icono + inicio del texto); al tocarla se abre para editar o archivar
function notaGrupoLineaHTML(g){
  const n=_nota("grupos",g.id), ed=!!(NOTA_ED&&NOTA_ED.tipo==="grupos"&&NOTA_ED.id===g.id), k="notaab-grupos-"+g.id;
  if(!n||ed)return notaGrupoHTML(g); // sin nota: «📝 ＋ Nota del grupo» (ya es una línea) · escribiendo: el cuadro de siempre
  if(DESP[k])return `<div style="margin-top:12px">${_notaCajaHTML("grupos",g.id,"Nota del grupo")}<button class="nota-cerrar" onclick="DESP['${esc(k)}']=false;render()">Cerrar la nota</button></div>`;
  const t=String(n.t||"").replace(/\s+/g," ").trim(), corto=t.length>46?t.slice(0,44).trim()+"…":t;
  return `<button class="nota-linea" onclick="DESP['${esc(k)}']=true;render()"><span class="nota-linea-t">📝 ${escH(corto)}</span><span class="nota-aviso">No cuenta en las cuentas</span></button>`;
}
function notaPersonaBotonHTML(mid){ const n=_nota("personas",mid);
  return ` <button class="nota-ico${n?" con":""}" onclick="notaEditar('personas','${esc(mid)}')" aria-label="${n?"Cambiar la nota":"Añadir una nota"}" title="Nota personal (no cuenta en las cuentas)">📝</button>`; }
function notaPersonaHTML(mid){ const n=_nota("personas",mid), ed=!!(NOTA_ED&&NOTA_ED.tipo==="personas"&&NOTA_ED.id===mid);
  return (n||ed)?`<div style="margin:6px 0 2px 10px">${_notaCajaHTML("personas",mid,"Nota")}</div>`:""; }
