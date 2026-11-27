// Nuevos Horizontes · ayudas.js
// Ayudas: solicitudes, dinero del mes, registro y edición, simuladores y WhatsApp de la simulación
// Parte de la app (versión en APP_VERSION, js/utilidades… se cargan en el orden de index.html).
// Solo declaraciones: no ejecuta nada al cargarse (el arranque está en js/arranque.js).
// v45.17: mes para el que se pide la ayuda (so.mes = "AAAA-MM", se otorga en el cierre de ese mes). Sin mes = la del mes actual.
function _solMesIdx(so){ if(!so||!so.mes)return -1e9; const [y,m]=so.mes.split("-").map(Number); return y*12+m-1; }
function _solEsAhora(so){ return _solMesIdx(so)<=_idxMes(DATA.reportMonth,DATA.reportYear); }
// v45.17: preferencia — primero asociados (y personas nuevas, que entran como asociados), después terceros; dentro, el orden que fija Ángel (▲▼)
function _solTipo(so){ const m=so.mid&&DATA.members.find(x=>x.id===so.mid); if(m)return m.type==="tercero"?1:0; return so.tipoNuevo==="tercero"?1:0; } // v45.18: cuenta cómo está hoy (AY-2); una persona nueva, según cómo entra
function _solEtqTipo(so,m){ return m?(m.type==="tercero"?"Tercero":"Asociado"+(aporteHabitualDe(m)>=REGLAS.APORTE_ALTO?" · aporta "+aporteHabitualDe(m)+" €":"")):(so.tipoNuevo==="tercero"?"Nuevo · tercero con aval":so.tipoNuevo==="asociado"?"Nuevo · asociado":"Nuevo"); }
// v46.52 (Maestro v18.75 · AY-9): la app PROPONE el orden: entre los asociados, primero el aporte habitual más alto y, a igualdad,
// por orden de llegada. Las que el coordinador ya ha colocado con ▲▼ (so.orden) van primero, en su orden: él decide siempre.
function _solAporte(so){ const m=so.mid&&DATA.members.find(x=>x.id===so.mid); return m&&m.type==="asociado"?aporteHabitualDe(m):0; }
function _solOrdenar(list){ const arr=_solsR(), k=so=>so.orden!=null?so.orden:1e6+(_solTipo(so)===0?(1000-_solAporte(so))*1e4:0)+arr.indexOf(so); return list.slice().sort((a,b)=>_solTipo(a)-_solTipo(b)||k(a)-k(b)); }
function _solGrupoDe(so){ const p=_solsR().filter(x=>x.estado==="pendiente"&&_solTipo(x)===_solTipo(so)); return _solEsAhora(so)?p.filter(_solEsAhora):p.filter(x=>!_solEsAhora(x)&&_solMesIdx(x)===_solMesIdx(so)); }
function solMover(id,dir){ const so=_sols().find(x=>x.id===id); if(!so)return; const L=_solOrdenar(_solGrupoDe(so)), i=L.indexOf(so), j=i+dir; if(j<0||j>=L.length)return; [L[i],L[j]]=[L[j],L[i]]; L.forEach((x,n)=>x.orden=n); save(); render(); }
// Reparto del dinero en el orden de preferencia: si una no cabe, se salta y se sigue con la siguiente
function _solReparto(list,dinero){ let r=_r2(dinero); const out={}; list.forEach(so=>{ if(so.capital<=r){ out[so.id]={ok:true}; r=_r2(r-so.capital); } else out[so.id]={ok:false,falta:_r2(so.capital-Math.max(0,r))}; }); return out; }
// Lee un mes sin dejar creado un mes vacío en los datos (render no escribe)
function _sinCrearMes(mi,fn){ const k=_keyDeIdx(mi), habia=!!(DATA.monthlyData&&DATA.monthlyData[k]); try{ return fn(); } finally { if(!habia&&DATA.monthlyData)delete DATA.monthlyData[k]; } }
function _solAlcanzaHTML(r){ return r?(r.ok?`<span style="color:#1B7A3D;font-weight:800">✅ Alcanza</span>`:`<span style="color:#8A4F12;font-weight:800">⚠️ Faltan ${fmtEur(r.falta)} €</span><span style="color:#8A4F12"> · busca un aporte temporal; si no se consigue, pasa al mes siguiente (AY-9)</span>`):""; }
function _solFlechas(so,L){ const i=L.indexOf(so), b=(d,t,on)=>`<button ${on?`onclick="solMover('${so.id}',${d})"`:"disabled"} style="width:26px;height:22px;padding:0;border-radius:6px;border:1px solid ${on?"#2D6A4F":"#E3DDD2"};background:#fff;color:${on?"#1B4332":"#D0C8BA"};font-size:11px;cursor:${on?"pointer":"default"}">${t}</button>`;
  return L.length>1?`<div style="display:flex;flex-direction:column;gap:3px;margin-top:4px">${b(-1,"▲",i>0)}${b(1,"▼",i<L.length-1)}</div>`:""; }
function _mesesSolOpts(sel){ const c=_idxMes(DATA.reportMonth,DATA.reportYear); let o=""; for(let i=c;i<=c+3;i++){ const k=_keyDeIdx(i), t=_txtIdx(i); o+=`<option value="${k}"${k===sel?" selected":""}>${t.charAt(0).toUpperCase()+t.slice(1)}</option>`; } return o; }
function _sols(){ if(!DATA.solicitudes)DATA.solicitudes=[]; return DATA.solicitudes; }
function _solsR(){ return DATA.solicitudes||[]; } // solo lectura (para pintar)
// v45.47: WhatsApp al responsable del grupo con las solicitudes de su grupo que están apuntadas
function solAvisarGrupo(gid){
  const g=gruposCierre().find(x=>x.id===gid); if(!g)return; const p=DATA.members.find(m=>m.id===g.principalId); if(!p)return;
  const lista=_solOrdenar(_solsR().filter(x=>x.estado==="pendiente"&&x.grupoGid===gid)); if(!lista.length)return;
  const nom=p.name.split(" ")[0], meses=[...new Set(lista.map(_solMesIdx))].sort((a,b)=>a-b);
  // v45.47 (a petición de Ángel): sin «se deciden…» ni «nueva, con tu aval»; cada una con sus cuotas mes a mes
  const una=lista.length===1, idxR=_idxMes(DATA.reportMonth,DATA.reportYear), mesDe=i=>MONTHS_FULL[((i%12)+12)%12].toLowerCase();
  const lst=a=>a.length<2?a.join(""):a.slice(0,-1).join(", ")+" y "+a[a.length-1];
  let t=`Hola ${nom} 👋\nTe confirmo que he apuntado ${una?"esta solicitud":"estas solicitudes"} de apoyo de tu grupo:\n`;
  meses.forEach(mi=>{ const mIdx=mi<-1e8?idxR:mi, del=lista.filter(x=>_solMesIdx(x)===mi);
    if(meses.length>1)t+=`\n*Para ${mesDe(mIdx)}:*`;
    del.forEach(so=>{ const {cuotas}=ayudaCuotas(so.capital,so.cuotas,DATA.rate), a=cuotas[0], u=cuotas[cuotas.length-1];
      // v45.48: con muchas cuotas, se agrupan las iguales: «6 cuotas: 217 € al mes de diciembre a marzo y 216 € en abril y mayo»
      // v45.49: siempre igual de claro, sea cual sea el nº de cuotas: periodo en una línea y lo que paga al mes en otra
      const ini=mIdx+1, fin=mIdx+cuotas.length, conA=i=>mesDe(i)+(Math.floor(i/12)!==Math.floor(mIdx/12)?" de "+Math.floor(i/12):"");
      const nU=cuotas.filter(v=>v===u).length;
      const linPer=cuotas.length===1?`📅 1 cuota, en ${conA(ini)}`:cuotas.length===2?`📅 2 cuotas, en ${mesDe(ini)} y ${conA(fin)}`:`📅 ${cuotas.length} cuotas, de ${mesDe(ini)} a ${conA(fin)}`;
      const linImp=cuotas.length===1?`💶 ${fmtEur(a)} €`:`💶 ${fmtEur(a)} € al mes`; // v45.49: sin el detalle de la última (está en su ficha)
      t+=`\n*${so.mid?so.nombre:nombreBonito(so.nombre)}* · ${fmtEur(so.capital)} €\n${linPer}\n${linImp}\n`; }); });
  t+=`\n${meses.length===1?`${una?"La tendrás":"Las tendrás"} en ${mesDe(meses[0]<-1e8?idxR:meses[0])}.`:`${una?"La tendrás":"Las tendrás"} en el mes que se indica.`} Te aviso en cuanto ${una?"la envíe":"las envíe"}.\n\nNuevos Horizontes · Construyendo un nuevo sistema`;
  const tel=_telWA(p.phone); if(tel){ window.open("https://wa.me/"+tel+"?text="+encodeURIComponent(t),"_blank"); return; }
  if(navigator.share){ navigator.share({text:t}).then(()=>toast("Compartido ✓")).catch(x=>{if(x.name!=="AbortError")window.open("https://wa.me/?text="+encodeURIComponent(t),"_blank");}); }
  else window.open("https://wa.me/?text="+encodeURIComponent(t),"_blank");
}
function solGuardar(otorgarYa){
  const mid=(document.getElementById("so-mid")||{}).value||"";
  const nom=nombreBonito((document.getElementById("so-nom")||{}).value); // v45.47
  const cap=numES((document.getElementById("so-cap")||{}).value);
  const n=parseInt((document.getElementById("so-n")||{}).value||"5");
  const m=mid?DATA.members.find(x=>x.id===mid):null;
  if(!m&&!nom){toast("Elige a la persona o escribe su nombre");return;}
  const tipoNuevo=m?null:((document.getElementById("so-tipo")||{}).value||""); // v45.18 (AY-9): una persona nueva entra como asociado o como tercero con aval
  if(!m&&!tipoNuevo){toast("Elige cómo entra: asociado o tercero con aval");return;}
  if(!m&&tipoNuevo==="tercero"&&!((document.getElementById("so-aval")||{}).value)){toast("Un tercero necesita aval (AY-8)");return;}
  if(!(cap>0)){toast("Escribe la cantidad que pide");return;}
  const avalId=(document.getElementById("so-aval")||{}).value||null, grupoGid=(document.getElementById("so-grupo")||{}).value||null;
  const mes=(document.getElementById("so-mes")||{}).value||getMesKey(DATA.reportMonth,DATA.reportYear); // v45.17
  if(m&&(m.type==="asociado"||m.type==="libre")&&ayPendienteAplica(_idxDeClave(mes))){ const pd=capitalPendienteDe(m), L=limiteAyudaNuevaDe(m,undefined,undefined,_idxDeClave(mes)); // v46.65 (Maestro v18.87)
    if(pd>0&&cap>L)toast(`⚠️ A ${m.name.split(" ")[0]} le quedan ${fmtEur(pd)} € por devolver: ahora puede recibir como mucho ${fmtEur(L)} €. Así no se podrá otorgar.`,7000); }
  const nid="S"+Date.now()+Math.random().toString(36).slice(2,6); // v45.45
  _sols().push({id:nid,mid:m?m.id:null,nombre:m?m.name:nom,capital:_r2(cap),cuotas:n,fecha:_hoyDMA(),estado:"pendiente",avalId,grupoGid,mes,...(tipoNuevo?{tipoNuevo}:{})});
  if(SOL_PREFILL&&SOL_PREFILL.simGid){ const a=CG_SIM[SOL_PREFILL.simGid]; if(a){ const i=a.indexOf(SOL_PREFILL.simRef); if(i>=0)a.splice(i,1); if(!a.length){delete CG_SIM[SOL_PREFILL.simGid];delete CG_SIM_MES[SOL_PREFILL.simGid];} } } // v45.17: sale de la simulación
  SOL_FORM=false; SOL_PREFILL=null; save(); render();
  if(!otorgarYa){ toast("Solicitud apuntada ✓"); return; }
  // v45.45: «Guardar y otorgar ya»: solo si es de este mes, no hay otras delante y el dinero alcanza
  const so=_sols().find(x=>x.id===nid), otras=_solsR().filter(x=>x.estado==="pendiente"&&x.id!==nid&&_solEsAhora(x)), disp=dineroAyudasMes().disponible;
  if(!_solEsAhora(so)){ toast("Apuntada para "+_txtIdx(_solMesIdx(so)).split(" ")[0]+": se otorga en el cierre de ese mes",4000); return; }
  if(otras.length){ toast("Apuntada en la lista: hay "+otras.length+(otras.length===1?" solicitud":" solicitudes")+" antes. Otórgalas en orden.",4500); return; }
  if(so.capital>disp){ toast("Apuntada en la lista: el dinero del mes no alcanza (faltan "+fmtEur(_r2(so.capital-Math.max(0,disp)))+" €)",4500); return; }
  solOtorgar(nid);
}
function soAvalCambio(){ const a=(document.getElementById("so-aval")||{}).value||"", g=document.getElementById("so-grupo"); if(g&&a){ const gid=_grupoDe(a); if(gid)g.value=gid; } }
// v46.68: las cuotas de «Nueva solicitud» según la persona (o cómo entra, si es nueva) y el mes en que se otorga (AY-10, AY-1)
function soCuotasAjustar(){
  const s=document.getElementById("so-n"); if(!s)return;
  const mid=(document.getElementById("so-mid")||{}).value||"", m=mid?DATA.members.find(x=>x.id===mid):null;
  const tipo=(document.getElementById("so-tipo")||{}).value||"", mes=(document.getElementById("so-mes")||{}).value||"";
  const max=cuotasMaxPara(m,mes?_idxDeClave(mes):null,0,tipo), ant=parseInt(s.value||"5");
  s.innerHTML=opcionesCuotasHTML(max,Math.min(ant,max),true); solPreview();
}
function soMidCambio(){
  const mid=(document.getElementById("so-mid")||{}).value||"", w=document.getElementById("so-nom-wrap"); if(w)w.style.display=mid?"none":"block";
  soCuotasAjustar(); // v46.68
  const m=mid&&DATA.members.find(x=>x.id===mid); if(!m)return;
  const av=m.type==="tercero"?m.ref:m.referidoPor, a=document.getElementById("so-aval"), g=document.getElementById("so-grupo");
  if(a&&av)a.value=av; if(g){ const gid=_grupoDe(mid)||(av?_grupoDe(av):""); if(gid)g.value=gid; }
}
function solPreview(){
  const cap=numES((document.getElementById("so-cap")||{}).value)||0, n=parseInt((document.getElementById("so-n")||{}).value||"5");
  const el=document.getElementById("so-prev"); if(!el)return;
  if(!(cap>0)){el.innerHTML="";return;}
  const {total,cuotas}=ayudaCuotas(cap,n,DATA.rate), a=cuotas[0], b=cuotas[cuotas.length-1];
  el.innerHTML=`<div style="background:#EEF7F1;border-radius:9px;padding:8px 10px;font-size:13.5px;margin-bottom:10px">${n} ${n===1?"cuota":"cuotas"} de <b>${fmtEur(a)} €</b>${a!==b?` (última ${fmtEur(b)} €)`:""} · total ${fmtEur(total)} €</div>`;
}
function solOtorgar(id){
  const so=_sols().find(x=>x.id===id); if(!so)return;
  if(!_solEsAhora(so)){ toast("Se otorga en el cierre de "+_txtIdx(_solMesIdx(so)).split(" ")[0]); return; } // v45.17
  const m=so.mid&&DATA.members.find(x=>x.id===so.mid);
  if(m){openModal('cierreloan',{sol:id});setTimeout(updateCierreLoanPreview,30);}
  else { const pr=so.tipoNuevo==="tercero"?"tercero":"asociado"; // v45.18: el alta se abre como entra (asociado o tercero con aval)
    openModal('member',{preset:pr,sol:id,solNombre:so.nombre,solAval:so.avalId||null}); if(so.avalId&&pr==="asociado")setTimeout(altaReferidoCambio,30); }
}
function _solTrasAlta(solId,m){ const so=_sols().find(x=>x.id===solId); if(!so||!m)return; so.mid=m.id; so.nombre=m.name; save(); setTimeout(()=>{openModal('cierreloan',{sol:solId});setTimeout(updateCierreLoanPreview,30);},150); }
// v45.16: «+ Nueva solicitud» desde la tarjeta de la persona: abre Solicitudes con la persona, su aval y su grupo ya puestos
function solDesdeGestion(mid){
  TAB="ayudas"; FICHA_ID=null; SOL_FORM=true; render(); // v45.39
  setTimeout(()=>{ const s=document.getElementById("so-mid"); if(!s)return; s.value=mid; soMidCambio();
    const c=document.getElementById("so-cap"); const h=document.getElementById("so-mid");
    if(h)h.scrollIntoView({behavior:"smooth",block:"start"}); if(c)setTimeout(()=>c.focus(),350); },40);
}
function solDesdeSim(gid,i){
  const x=(CG_SIM[gid]||[])[i]; if(!x)return;
  const mes=_keyDeIdx(_cgSimIdx(gid)), m=x.nombre?DATA.members.find(mm=>_normNom(mm.name)===_normNom(x.nombre)):null;
  SOL_PREFILL={simGid:gid,simRef:x}; TAB="ayudas"; FICHA_ID=null; SOL_FORM=true; render(); // v45.39
  setTimeout(()=>{ const sm=document.getElementById("so-mid"); if(!sm)return;
    if(m){ sm.value=m.id; soMidCambio(); } else { const n=document.getElementById("so-nom"); if(n)n.value=x.nombre||""; }
    const gr=document.getElementById("so-grupo"); if(gr)gr.value=gid;
    const c=document.getElementById("so-cap"); if(c)c.value=x.v; solPreview();
    const ms=document.getElementById("so-mes"); if(ms){ ms.value=mes; soCuotasAjustar(); } // v46.68
    const h=document.getElementById("so-mid"); if(h)h.scrollIntoView({behavior:"smooth",block:"start"});
    const f=document.getElementById(x.nombre?"so-n":"so-nom"); if(f)setTimeout(()=>f.focus(),350); },40);
}
// v45.16: desde Cierre se va a Solicitudes (una sola puerta para las ayudas nuevas)
function irSolicitudes(){ TAB="ayudas"; FICHA_ID=null; render(); window.scrollTo(0,0); } // v45.39: Solicitudes en la pestaña «Ayudas»
// v45.98: cambiar el importe (y las cuotas) de una solicitud pendiente sin tener que «no otorgarla» y apuntarla otra vez.
// Mantiene su fecha y su sitio en la cola; la cuenta con el responsable del grupo toma el importe nuevo.
function _solEditarHTML(so){
  const k="soled-"+so.id; if(!DESP[k])return "";
  return `<div style="margin-top:8px;padding:10px;border:1px solid var(--border);border-radius:10px;background:#F7F5F1">
    <label class="m-label" for="soed-cap-${so.id}" style="margin-top:0">Importe que pide (€)</label>
    <input id="soed-cap-${so.id}" type="number" inputmode="decimal" class="m-input" value="${so.capital}" style="font-size:16px;margin-bottom:8px">
    <label class="m-label" for="soed-n-${so.id}">Cuotas para devolverla</label>
    <select id="soed-n-${so.id}" class="m-select" style="font-size:16px">${opcionesCuotasHTML(cuotasMaxPara(so.mid?DATA.members.find(x=>x.id===so.mid):null,so.mes?_idxDeClave(so.mes):null,so.cuotas,so.tipoNuevo),so.cuotas)}</select><!-- v46.68: AY-10 y AY-1, sin tope fijo de 12 -->
    <div style="display:flex;gap:6px;margin-top:10px">
      <button onclick="DESP['${k}']=false;render()" style="flex:1;padding:10px;border-radius:9px;border:1px solid #D9C9B0;background:#fff;color:#6E6048;font-size:13.5px;font-weight:700;cursor:pointer">Cancelar</button>
      <button onclick="solCambiarImporte('${so.id}')" style="flex:2;padding:10px;border-radius:9px;border:none;background:#1B4332;color:#fff;font-size:13.5px;font-weight:800;cursor:pointer">Guardar</button>
    </div></div>`;
}
function solCambiarImporte(id){
  const so=_sols().find(x=>x.id===id); if(!so||so.estado!=="pendiente")return;
  const cap=numES((document.getElementById("soed-cap-"+id)||{}).value), n=parseInt((document.getElementById("soed-n-"+id)||{}).value||so.cuotas||"5");
  if(!(cap>0)){toast("Escribe el importe");return;}
  const antes=so.capital; so.capital=_r2(cap); so.cuotas=n; delete DESP["soled-"+id];
  save(); render(); toast(`Solicitud de ${so.nombre.split(" ")[0]}: ${fmtEur(antes)} € → ${fmtEur(so.capital)} € ✓`);
}
// ══ v46.54 · LISTA DE ESPERA (Maestro v18.80 · AY-9; encargo «lista de espera», 17/11/2026) ═══════════════════
// La que no alcanza ya no se pierde: «Pasar a <mes siguiente>» la deja apuntada para el mes siguiente, la primera de su
// grupo (asociados o terceros), con su fecha original, y guarda en so.historial en qué mes pasó y por qué. «Lo que se
// queda sin atender» se cuenta solo con ese historial. «Otorgar las N que alcanzan» registra, en el orden de la lista,
// las que caben con el dinero del mes: lo mismo que «Otorgar» en cada una (registrarAyudaAprobada, js/personas.js).
function _solPendAhora(){ return _solOrdenar(_solsR().filter(x=>x.estado==="pendiente"&&_solEsAhora(x))); }
function _solMesTxt(mi){ return _txtIdx(mi).split(" ")[0]; }
function _solHistHTML(so){ const h=(so.historial||[]).filter(x=>x&&x.motivo==="dinero"); if(!h.length)return "";
  const meses=h.map(x=>{ const [y,m]=String(x.mes).split("-").map(Number); return MONTHS_FULL[m-1].toLowerCase(); });
  return `<div style="font-size:12.5px;color:#8A4F12;margin-top:3px">↪ No alcanzó el dinero en ${meses.join(", ")}: sigue apuntada (AY-9)</div>`; }
function solPasarMes(id){
  const so=_sols().find(x=>x.id===id); if(!so||so.estado!=="pendiente")return;
  const cur=_idxMes(DATA.reportMonth,DATA.reportYear), desde=Math.max(_solMesIdx(so),cur), sig=desde+1;
  const r=_solReparto(_solPendAhora(),dineroAyudasMes().disponible)[so.id];
  UNDO_SNAPSHOT=JSON.stringify(DATA);
  (so.historial=so.historial||[]).push({mes:_keyDeIdx(desde),a:_keyDeIdx(sig),motivo:"dinero",falta:r&&!r.ok?r.falta:null,t:Date.now()});
  const otras=_solsR().filter(x=>x!==so&&x.estado==="pendiente"&&_solTipo(x)===_solTipo(so)&&_solMesIdx(x)===sig);
  const ords=otras.map(x=>x.orden!=null?x.orden:0); so.orden=(ords.length?Math.min(...ords):0)-1; // la primera de su grupo
  so.mes=_keyDeIdx(sig);
  save(); render(); _avisoDeshacer(`${so.nombre.split(" ")[0]}: pasa a ${_solMesTxt(sig)}, la primera de su grupo`);
}
// Lo que se queda sin atender en un mes (por falta de dinero): solicitudes que pasaron de mes desde él
function sinAtenderMes(key){
  let eur=0, n=0;
  _solsR().forEach(so=>(so.historial||[]).forEach(h=>{ if(h&&h.mes===key&&h.motivo==="dinero"){ eur+=+so.capital||0; n++; } }));
  return {eur:_r2(eur),n};
}
function sinAtenderHTML(){
  const cur=_idxMes(DATA.reportMonth,DATA.reportYear), este=sinAtenderMes(_keyDeIdx(cur));
  let primero=null; _solsR().forEach(so=>(so.historial||[]).forEach(h=>{ if(h&&h.motivo==="dinero"){ const [y,m]=String(h.mes).split("-").map(Number); const i=y*12+m-1; if(primero==null||i<primero)primero=i; } }));
  const nMeses=primero==null?1:Math.max(1,Math.min(3,cur-primero+1));
  let tot=0; for(let i=cur-nMeses+1;i<=cur;i++)tot+=sinAtenderMes(_keyDeIdx(i)).eur;
  const fila=(l,v)=>`<div style="display:flex;justify-content:space-between;gap:10px;font-size:14.5px;padding:3px 0"><span>${l}</span><b style="white-space:nowrap">${v}</b></div>`;
  return `<div style="margin-top:14px;padding:12px;border:1px solid var(--border);border-radius:12px;background:#fff">
    <div style="font-size:15.5px;font-weight:800;color:#1B4332;margin-bottom:4px">Lo que se queda sin atender</div>
    ${fila("Este mes",este.n?`${fmtEur(este.eur)} € · ${este.n} ${este.n===1?"solicitud":"solicitudes"}`:"0 €")}
    ${fila(nMeses===1?"Media (solo hay datos de este mes)":`Media de los últimos ${nMeses} meses`,fmtEur(_r2(tot/nMeses))+" €")}
    <div style="font-size:12.5px;color:var(--muted);margin-top:4px;line-height:1.4">Se cuenta solo: cada solicitud que pasa de mes por falta de dinero. Sirve para saber cuántas ayudas más podrías dar si entrara más dinero.</div></div>`;
}
// «Otorgar las N que alcanzan»: cuáles sí y cuáles se quedan para hacerlas a mano
function _solVarias(){
  const pend=_solPendAhora(), rep=_solReparto(pend,dineroAyudasMes().disponible), cur=_idxMes(DATA.reportMonth,DATA.reportYear);
  const ini={m:MONTHS[(cur+1)%12],y:Math.floor((cur+1)/12)}, si=[], aMano=[];
  pend.forEach(so=>{ if(!rep[so.id]||!rep[so.id].ok)return;
    const m=so.mid&&DATA.members.find(x=>x.id===so.mid);
    if(!m){ aMano.push({so,motivo:"persona nueva: hay que darla de alta (Otorgar)"}); return; }
    const c=_condicionActual(m), v=validarApoyo(m,so.capital,so.cuotas,c.tipo,c.ciclo,ini,undefined,so.fecha,{sid:so.id}); // v46.65: esta solicitud no cuenta como pendiente
    if(v.bloqueo){ aMano.push({so,motivo:String(v.bloqueo).replace(/<[^>]+>/g,"")}); return; }
    si.push({so,m,aprob:so.capital>REGLAS.AYUDA_MAX_SIN_APROBACION||so.cuotas>REGLAS.CUOTAS_SIN_APROBACION});
  });
  return {si,aMano,total:_r2(si.reduce((a,x)=>a+x.so.capital,0))};
}
function solVariasBotonHTML(){
  const v=_solVarias(); if(!v.si.length)return "";
  return `<button onclick="DESP['solvar-arm']=false;openModal('solvarias')" style="width:100%;min-height:56px;margin:8px 0 4px;border:none;border-radius:14px;background:#1B4332;color:#fff;font-size:16px;font-weight:800;padding:10px;display:flex;flex-direction:column;align-items:center;gap:2px;cursor:pointer">
    <span>Otorgar ${v.si.length===1?"la que alcanza":`las ${v.si.length} que alcanzan`}</span><span style="font-size:13px;font-weight:600;opacity:.9">${fmtEur(v.total)} € · te enseña el resumen antes de confirmar</span></button>
    <div style="font-size:12.5px;color:var(--muted);padding:0 2px 4px">Orden propuesto por la app: primero asociados (antes quien aporta más), después terceros. Lo cambias con las flechas.</div>`;
}
function solVariasModalHTML(){
  const v=_solVarias(), arm=!!DESP["solvar-arm"];
  const ent=so=>{ const g=so.grupoGid&&gruposCierre().find(x=>x.id===so.grupoGid), p=g&&DATA.members.find(x=>x.id===g.principalId); return p?`la entrega ${escH(p.name.split(" ")[0])} (de su grupo)`:"la entregas tú"; };
  let h=`<div class="modal-title">Otorgar las que alcanzan</div>
    <div style="font-size:13px;color:var(--muted);margin:-4px 0 10px;line-height:1.45">Se registran en el orden de la lista, igual que con «Otorgar» en cada una. Revisa antes de confirmar.</div>`;
  v.si.forEach(({so,aprob})=>{ const {cuotas}=ayudaCuotas(so.capital,so.cuotas,DATA.rate);
    h+=`<div style="padding:9px 0;border-top:1px solid #EFEAE0"><div style="display:flex;justify-content:space-between;gap:8px"><b style="font-size:15px">${escH(so.nombre)}</b><b style="font-size:15px;white-space:nowrap">${fmtEur(so.capital)} €</b></div>
      <div style="font-size:13px;color:var(--muted)">${so.cuotas} ${so.cuotas===1?"cuota":"cuotas"} de ${fmtEur(cuotas[0])} € · ${ent(so)}</div>
      ${aprob?`<div style="font-size:13px;color:#8A4F12;font-weight:700;margin-top:2px">Más de ${_miles(REGLAS.AYUDA_MAX_SIN_APROBACION)} €: al confirmar, la apruebas tú (AY-5)</div>`:""}</div>`; });
  h+=`<div style="display:flex;justify-content:space-between;font-size:16px;font-weight:800;border-top:2px solid #2C2C2C;padding-top:8px;margin-top:4px"><span>Total</span><span>${fmtEur(v.total)} €</span></div>`;
  if(v.aMano.length)h+=`<div style="margin-top:10px;padding:9px 11px;border-radius:10px;background:#FFF4E5;color:#6B4210;font-size:13.5px;line-height:1.45"><b>Estas alcanzan pero se hacen a mano:</b>${v.aMano.map(x=>`<br>· ${escH(x.so.nombre)} (${fmtEur(x.so.capital)} €): ${escH(x.motivo)}`).join("")}</div>`;
  h+=`<button class="m-primary" style="margin-top:12px;${arm?"background:#A64B19":""}" onclick="solOtorgarVarias()">${arm?"¿Seguro? Toca otra vez para otorgarlas":`Otorgar ${v.si.length===1?"1 ayuda":v.si.length+" ayudas"} (${fmtEur(v.total)} €)`}</button>
    <div style="font-size:12px;color:var(--muted);margin-top:6px;line-height:1.4">Después puedes mandar el WhatsApp de cada una desde su ficha (Ayudas).</div>`;
  return h;
}
let _solVarT=null;
function solOtorgarVarias(){
  if(!DESP["solvar-arm"]){ DESP["solvar-arm"]=true; render(); clearTimeout(_solVarT); _solVarT=setTimeout(()=>{ if(DESP["solvar-arm"]){ DESP["solvar-arm"]=false; render(); } },5000); return; }
  clearTimeout(_solVarT); DESP["solvar-arm"]=false;
  const v=_solVarias(); if(!v.si.length){ closeModal(); return; }
  UNDO_SNAPSHOT=JSON.stringify(DATA);
  v.si.forEach(({so,m})=>registrarAyudaAprobada(m,so.capital,so.cuotas,so.grupoGid||"",so));
  save(); MODAL=null; render(); _avisoDeshacer(`${v.si.length} ${v.si.length===1?"ayuda registrada":"ayudas registradas"} · ${fmtEur(v.total)} €`);
}
// «Aporte temporal» desde la que no alcanza: elegir quién lo pone y abrir el aporte puntual con lo que falta (AT-1)
function solTemporalModalHTML(){
  const so=_sols().find(x=>x.id===MODAL.sol); if(!so)return "";
  const asoc=DATA.members.filter(m=>m.type==="asociado"&&activoEnReporte(m)).sort((a,b)=>a.name.localeCompare(b.name));
  return `<div class="modal-title">🏦 Aporte temporal para ${escH(so.nombre.split(" ")[0])}</div>
    <div style="font-size:13.5px;color:var(--muted);margin:-4px 0 10px;line-height:1.45">Faltan <b>${fmtEur(MODAL.falta||0)} €</b> para su ayuda de ${fmtEur(so.capital)} €. Un asociado deja ese dinero y a los 30 días lo recupera con un 5 % más (AT-1).</div>
    <label class="m-label">¿Quién lo pone?</label>
    <select id="st-mid" class="m-select" style="font-size:15px"><option value="">— Elegir —</option>${asoc.map(m=>`<option value="${esc(m.id)}">${escH(m.name)}</option>`).join("")}</select>
    <button class="m-primary" onclick="solTemporalSeguir()">Seguir</button>`;
}
function solTemporalSeguir(){ const v=(document.getElementById("st-mid")||{}).value||""; if(!v){ toast("Elige quién lo pone"); return; } openModal('puntual',{mid:v,prefill:Math.ceil(MODAL.falta||0)}); }
function solEstado(id,estado){ const so=_sols().find(x=>x.id===id); if(!so)return; so.estado=estado; if(estado==="pendiente"){delete so.lid;delete so.mesOtorgada;} delete DESP["solno-"+id]; save(); render(); }
function solBorrar(id){ DATA.solicitudes=_sols().filter(x=>x.id!==id); delete DESP["solbor-"+id]; save(); render(); }
// v45.23: «💰 Dinero del mes» — la MISMA cuenta en Asociados y en Solicitudes. Fase de crecimiento:
// lo que entra cada mes se usa en las ayudas del mes; no se arrastra nada al mes siguiente.
function dineroMesCuerpoHTML(d){
  const rm=DATA.reportMonth, ry=DATA.reportYear, idx=_idxMes(rm,ry);
  const fila=(signo,l,v,o={})=>`<div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;padding:6px 0;${o.total?"border-top:1.5px solid var(--border);margin-top:2px;":"border-bottom:1px solid #EFEAE0;"}">
      <span style="font-size:${o.total?14.5:14}px;color:var(--dark);${o.total?"font-weight:800":""}"><b style="display:inline-block;width:16px;color:var(--muted)">${signo}</b>${l}</span>
      <b style="font-size:${o.total?19:15}px;white-space:nowrap;${o.color?"color:"+o.color:""}">${fmtEur(v)} €</b></div>`;
  const ayN=[]; DATA.members.forEach(m=>[...(m.loans||[]),...(m.closedLoans||[])].forEach(l=>{ if(l.gMonth===rm&&l.gYear===ry)ayN.push({n:m.name,c:l.capital}); }));
  const porPagarL=salidasPrevistas(rm,ry).lista.filter(x=>x.clase==="comp"&&x.pagoIdx<=idx);
  const otras=_r2(d.salido-d.ayudasDadas-(d.gastos||0)), abA=!!DESP["dm-ay"], abS=!!DESP["dm-sal"];
  // v46.6: cada salida ya pagada con su nombre (antes «Otras salidas ya pagadas», sin detalle)
  const bajL=[],retL=[],devL=[];
  if(otras>0){
    DATA.members.forEach(m=>{ if(m.baja&&m.baja.pagada){ const p=mesPagoBaja(m.baja); if(p.mes===rm&&p.anio===ry)bajL.push([escH(m.name),m.baja.total||0]); }
      retiradasDe(m).forEach(r=>{ if(r.pagada&&pagoRetiradaIdx(r)===idx)retL.push([escH(m.name),importeRetirada(m,r)]); }); });
    Object.entries(DATA.aportesPuntuales||{}).forEach(([mid,arr])=>(arr||[]).forEach(a=>{ if(a.devuelto&&a.mesDev===rm&&a.anioDev===ry){ const m=DATA.members.find(x=>x.id===mid); devL.push([escH(m?m.name:"—"),a.total||0]); } }));
  }
  const lista=(arr)=>`<div style="margin:0 0 6px 16px;font-size:12.5px;color:var(--muted)">${arr.map(x=>`<div style="display:flex;justify-content:space-between;gap:8px;padding:2px 0"><span>${x[0]}</span><span>${x[1]}</span></div>`).join("")}</div>`;
  let h=fila("","Cobrado hasta hoy",d.cobrado,{color:"#2D6A4F"});
  if(d.ayudasDadas){ h+=`<div style="cursor:pointer" onclick="DESP['dm-ay']=!DESP['dm-ay'];render()">${fila("−",`Ayudas entregadas (${ayN.length}) <span class="mg-acc-fl ay-fl-in${abA?" ab":""}" aria-hidden="true"></span>`,d.ayudasDadas)}</div>`;
    if(abA)h+=lista(ayN.map(x=>[escH(x.n),fmtEur(x.c)+" €"])); } // v46.11 (Ángel 07/11/2026): vuelve a desplegarse con a quién y cuánto
  if(d.gastos)h+=fila("−","Gastos administrativos",d.gastos);
  const salD=(k,txt,arr)=>{ if(!arr.length)return ""; const ab=!!DESP[k], tot=_r2(arr.reduce((a,x)=>a+x[1],0));
    return `<div style="cursor:pointer" onclick="DESP['${k}']=!DESP['${k}'];render()">${fila("−",`${txt} (${arr.length}) <span class="mg-acc-fl ay-fl-in${ab?" ab":""}" aria-hidden="true"></span>`,tot)}</div>`+(ab?lista(arr.map(x=>[x[0],fmtEur(x[1])+" €"])):""); };
  h+=salD("dm-baj","Bajas pagadas",bajL)+salD("dm-ret","Beneficios retirados",retL)+salD("dm-dev","Aportes temporales devueltos",devL);
  { const resto=_r2(otras-[...bajL,...retL,...devL].reduce((a,x)=>a+x[1],0)); if(resto>0.005)h+=fila("−","Otras salidas ya pagadas",resto); }
  if(d.salido&&Math.abs(d.enCaja-d.disponible)>0.005)h+=fila("=","En caja hoy",d.enCaja,{total:true,color:d.enCaja>=0?"#1B4332":"#C0492C"});
  if(d.porPagar){ h+=`<div style="cursor:pointer" onclick="DESP['dm-sal']=!DESP['dm-sal'];render()">${fila("−",`Salidas por pagar este mes (${porPagarL.length}) <span style="font-size:11.5px;color:var(--muted)">${abS?"▲":"▼"}</span>`,d.porPagar)}</div>`;
    if(abS)h+=lista(porPagarL.map(x=>[`${escH(x.m.name)} · ${escH(x.txt.toLowerCase())}`,fmtEur(x.importe)+" €"])); }
  h+=fila("=","Disponible para ayudas",d.disponible,{total:true,color:d.disponible>=0?"#1B4332":"#C0492C"});
  if(d.porCobrar>0)h+=`<div style="margin-top:8px;padding:9px 11px;border-radius:10px;background:var(--bg);font-size:13px;color:var(--dark);line-height:1.45">
      Falta por cobrar <b>${fmtEur(d.porCobrar)} €</b>. Si se cobra todo, al cerrar el mes quedarán <b style="color:${d.alCierre>=0?"#1B4332":"#A63A20"}">${fmtEur(d.alCierre)} €</b>.</div>`;
  else h+=`<div style="margin-top:8px;font-size:12.5px;color:#1B7A3D;font-weight:700">✓ Ya está todo cobrado este mes.</div>`;
  if(d.alCierre<0)h+=`<div style="margin-top:6px;padding:9px 11px;border-radius:10px;background:#FFF4E5;border:1px solid #E0A040;color:#8A4F12;font-size:12.5px;font-weight:700;line-height:1.4">⚠️ Aunque se cobre todo, este mes faltan ${fmtEur(-d.alCierre)} €.</div>`;
  return h;
}
// v46.69 (Maestro v18.91 · GE-7, AY-9): lo que tienen los responsables sin entregar (no cuenta) y lo que entregan de meses anteriores (sí cuenta)
function retenidoInfoHTML(d){
  if(!(d&&(d.retenido>0||d.recuperado>0)))return "";
  const nom=x=>escH(x.p.name.split(" ")[0]);
  const r=d.grupos.filter(x=>x.ret>0).map(x=>`${nom(x)} ${fmtEur(x.ret)} €`).join(", "), c=d.grupos.filter(x=>x.cov>0).map(x=>`${nom(x)} ${fmtEur(x.cov)} €`).join(", ");
  return `<div class="cgc-tiene" style="margin-top:6px">${d.retenido>0?`👜 No cuentan <b>${fmtEur(d.retenido)} €</b> que tienen los responsables sin entregar (${r}): esas personas están al día.`:""}${d.retenido>0&&d.recuperado>0?"<br>":""}${d.recuperado>0?`✅ Incluye <b>${fmtEur(d.recuperado)} €</b> entregados este mes de meses anteriores (${c}).`:""}</div>`;
}
function origenCobradoHTML(d){
  const ab=!!DESP["ay-origen"];
  let h=`<button class="ay-desp" aria-expanded="${ab?"true":"false"}" onclick="DESP['ay-origen']=!DESP['ay-origen'];render()" style="display:flex;align-items:center;gap:10px;min-height:44px;background:none;border:none;color:#2D6A4F;font-size:14.5px;font-weight:700;cursor:pointer;padding:8px 0 0">¿De dónde viene lo cobrado? <span class="mg-acc-fl${ab?" ab":""}" aria-hidden="true"></span></button>`;
  if(ab){
    h+=`<div style="margin-top:6px">`;
    d.grupos.forEach(x=>{ const ok=x.cobrado>=x.total&&x.total>0; h+=`<div style="display:flex;justify-content:space-between;gap:8px;font-size:13.5px;padding:5px 0;border-bottom:1px solid #EFEAE0"><span>Grupo de ${escH(x.p.name.split(" ")[0])}</span><span style="white-space:nowrap"><b style="color:${ok?"#2D6A4F":"var(--dark)"}">${fmtEur(x.cobrado)} €</b> <span style="color:var(--muted);font-size:12px">de ${fmtEur(x.total)} €</span></span></div>`; });
    h+=`<div style="display:flex;justify-content:space-between;gap:8px;font-size:13.5px;padding:5px 0;border-bottom:1px solid #EFEAE0"><span>Resto (sin grupo)</span><span style="white-space:nowrap"><b style="color:#2D6A4F">${fmtEur(d.resto.cobrado)} €</b> <span style="color:var(--muted);font-size:12px">de ${fmtEur(d.resto.total)} €</span></span></div>`;
    if(d.puntIn)h+=`<div style="display:flex;justify-content:space-between;font-size:13.5px;padding:5px 0"><span>Aportes temporales</span><b style="color:#2D6A4F">${fmtEur(d.puntIn)} €</b></div>`;
    h+=`</div>`;
  }
  return h;
}
function ayudasTabHTML(){
  const rm=DATA.reportMonth, ry=DATA.reportYear, key=getMesKey(rm,ry), mesTxt=MONTHS_FULL[MONTHS.indexOf(rm)].toLowerCase();
  const pendT=_solsR().filter(x=>x.estado==="pendiente"), pend=_solOrdenar(pendT.filter(_solEsAhora)), fut=pendT.filter(x=>!_solEsAhora(x)), otor=_solsR().filter(x=>x.estado==="otorgada"&&x.mesOtorgada===key), noOt=_solsR().filter(x=>x.estado==="no");
  const d=dineroAyudasMes(), pedido=_r2(pend.reduce((a,x)=>a+x.capital,0)), dif=_r2(d.disponible-pedido);
  const fila=(l,v,st)=>`<div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;padding:4px 0;font-size:14px"><span>${l}</span><b style="white-space:nowrap;${st||""}">${v}</b></div>`;
  let h=`<div class="mes-card"><div class="mes-title" style="margin-bottom:8px">💰 Dinero del mes · ${mesTxt}</div>
    ${dineroMesCuerpoHTML(d)}
    ${retenidoInfoHTML(d)}
    ${pend.length?`${fila("Te han pedido en total",fmtEur(pedido)+" €")}
    <div style="margin-top:6px;padding:9px 11px;border-radius:10px;font-size:14px;font-weight:800;background:${dif>=0?"#E3F1E7":"#FFF4E5"};color:${dif>=0?"#1B7A3D":"#8A4F12"}">${dif>=0?"✅ Te alcanza para todas":"⚠️ No alcanza para todas: mira cada solicitud"}</div>`:""}`;
  h+=origenCobradoHTML(d); // v45.23
  h+=`</div>`;
  h+=peticionesAppHTML(); // v45.52: pedidas desde la app de asociados
  h+=solCambiosHTML(); // v46.55 · AY-9: cambiar o anular una solicitud, pedido desde la app
  // Solicitudes
  h+=`<div class="mes-card"><div class="mes-title" style="margin-bottom:6px">📝 Solicitudes de ayuda ${pend.length?`<span style="font-size:12px;font-weight:800;padding:3px 9px;border-radius:20px;background:#FFF4E5;color:#8A4F12;vertical-align:middle;white-space:nowrap">${pend.length} pendiente${pend.length>1?"s":""}</span>`:""}</div>`;
  if(!pend.length&&!SOL_FORM)h+=`<div style="color:var(--muted);font-size:13px;padding:6px 0">No hay solicitudes pendientes para ${mesTxt}.</div>`;
  const repA=_solReparto(pend,d.disponible); // v45.17: el dinero de la asociación, en orden de preferencia
  if(pend.length)h+=solVariasBotonHTML(); // v46.54 · AY-9: «Otorgar las N que alcanzan»
  const mesSigTxt=(t=>t.charAt(0).toUpperCase()+t.slice(1))(_solMesTxt(_idxMes(rm,ry)+1));
  pend.forEach((so,i)=>{
    const m=so.mid&&DATA.members.find(x=>x.id===so.mid), {cuotas}=ayudaCuotas(so.capital,so.cuotas,DATA.rate);
    const kno="solno-"+so.id, armNo=!!DESP[kno];
    if(_solTipo(so)===1&&(i===0||_solTipo(pend[i-1])===0))h+=`<div style="font-size:12.5px;font-weight:800;color:#94571A;margin-top:12px">🤝 Terceros <span style="font-weight:600;color:var(--muted)">· después de los asociados</span></div>`;
    h+=`<div style="display:flex;gap:10px;align-items:flex-start;border:1px solid var(--border);border-radius:12px;padding:10px;margin-top:8px;background:#fff">
      <div style="flex-shrink:0;display:flex;flex-direction:column;align-items:center"><span style="width:26px;height:26px;border-radius:50%;background:#1B4332;color:#fff;font-size:13px;font-weight:800;display:flex;align-items:center;justify-content:center">${i+1}</span>${_solFlechas(so,pend.filter(x=>_solTipo(x)===_solTipo(so)))}</div>
      <div style="flex:1;min-width:0">
        <div style="display:flex;justify-content:space-between;gap:8px"><b style="font-size:15px">${escH(so.nombre)}</b><b style="font-size:15.5px;color:#94571A;white-space:nowrap">${fmtEur(so.capital)} €</b></div>
        <div style="font-size:12px;color:var(--muted);margin-top:2px">${_solEtqTipo(so,m)} · ${escH(so.fecha||"")} · ${so.cuotas} ${so.cuotas===1?"cuota":"cuotas"} de ${fmtEur(cuotas[0])} €</div>
        ${(()=>{ const av=so.avalId&&DATA.members.find(x=>x.id===so.avalId), gg=so.grupoGid&&gruposCierre().find(x=>x.id===so.grupoGid), gp=gg&&DATA.members.find(x=>x.id===gg.principalId);
          return (av||gp)?`<div style="font-size:12px;color:#1B4332;margin-top:2px">${av?`🛡️ Aval: ${escH(av.name.split(" ")[0])}`:""}${av&&gp?" · ":""}${gp?`👥 Grupo de ${escH(gp.name.split(" ")[0])}`:""}</div>`:""; })()}
        ${_solHistHTML(so)}
        <div class="${repA[so.id]&&!repA[so.id].ok?"sol-falta":"sol-ok"}">${_solAlcanzaHTML(repA[so.id])}</div>
        ${repA[so.id]&&!repA[so.id].ok?`<div style="display:flex;gap:6px;margin-top:8px">
          <button onclick="solPasarMes('${so.id}')" style="flex:1;min-height:44px;padding:8px;border-radius:10px;border:1.5px solid #2D6A4F;background:#fff;color:#1B4332;font-size:13.5px;font-weight:800;cursor:pointer">Pasar a ${escH(mesSigTxt.toLowerCase())}</button>
          <button onclick="openModal('soltemporal',{sol:'${so.id}',falta:${repA[so.id].falta}})" style="flex:1;min-height:44px;padding:8px;border-radius:10px;border:1.5px solid #2D6A4F;background:#fff;color:#1B4332;font-size:13.5px;font-weight:800;cursor:pointer">Aporte temporal</button></div>`:""}
        <div class="sol-bot" style="display:flex;gap:6px;margin-top:8px">
          <button onclick="solOtorgar('${so.id}')" style="flex:2;padding:9px;border-radius:9px;border:none;background:#1B4332;color:#fff;font-size:13px;font-weight:800;cursor:pointer">Otorgar</button>
          <button onclick="DESP['soled-${so.id}']=!DESP['soled-${so.id}'];render()" aria-expanded="${DESP['soled-'+so.id]?"true":"false"}" style="flex:1;padding:9px;border-radius:9px;border:1px solid var(--border);background:#fff;color:#1B4332;font-size:12.5px;font-weight:800;cursor:pointer">Importe</button>
          <button onclick="${armNo?`solEstado('${so.id}','no')`:`DESP['${kno}']=true;render()`}" style="flex:1;padding:9px;border-radius:9px;border:1px solid #E8C9BE;background:${armNo?"#C0492C":"#fff"};color:${armNo?"#fff":"#A63A20"};font-size:12.5px;font-weight:800;cursor:pointer">${armNo?"¿Seguro?":"No otorgar"}</button>
        </div>${_solEditarHTML(so)}</div></div>`;
  });
  // v45.17: solicitudes para meses siguientes (se ven, pero se otorgan en el cierre de su mes)
  [...new Set(fut.map(_solMesIdx))].sort((a,b)=>a-b).forEach(mi=>{
    const lista=_solOrdenar(fut.filter(x=>_solMesIdx(x)===mi)), mt=_txtIdx(mi).split(" ")[0], tot=_r2(lista.reduce((a,x)=>a+x.capital,0));
    const pv=previstoMes(mi), repF=_solReparto(lista,pv.prev), dfF=_r2(pv.prev-tot);
    const fl=(l,v,st)=>`<div style="display:flex;justify-content:space-between;gap:8px;font-size:13.5px;padding:2px 0"><span>${l}</span><b style="white-space:nowrap;${st||""}">${v}</b></div>`;
    h+=`<div style="margin-top:14px;padding-top:10px;border-top:1.5px dashed #D5E3D9"><b style="font-size:14.5px;color:#1B4332">🗓️ Para ${mt}</b>
      <div style="background:#F4F9F6;border-radius:10px;padding:8px 10px;margin-top:6px">
      ${fl(`Aportes y cuotas de ${mt} (previsto)`,fmtEur(pv.ent)+" €","color:#2D6A4F")}
      ${pv.sal?fl("Salidas comprometidas","−"+fmtEur(pv.sal)+" €"):""}
      ${fl("<b>Previsto para ayudas</b>",fmtEur(pv.prev)+" €","color:#1B4332")}
      ${fl("Te han pedido",fmtEur(tot)+" €","color:#94571A")}
      <div style="margin-top:4px;font-size:13px;font-weight:800;color:${dfF>=0?"#1B7A3D":"#8A4F12"}">${dfF>=0?"✅ Alcanzaría para todas":`Faltarían ${fmtEur(-dfF)} € para darlas todas`}</div>
      <div style="font-size:11.5px;color:var(--muted);margin-top:2px">Es una previsión: en ${mt} se calcula con lo cobrado de verdad.</div></div></div>`;
    lista.forEach((so,i)=>{
      if(_solTipo(so)===1&&(i===0||_solTipo(lista[i-1])===0))h+=`<div style="font-size:12.5px;font-weight:800;color:#94571A;margin-top:10px">🤝 Terceros <span style="font-weight:600;color:var(--muted)">· después de los asociados</span></div>`;
      const m=so.mid&&DATA.members.find(x=>x.id===so.mid), {cuotas}=ayudaCuotas(so.capital,so.cuotas,DATA.rate), kno="solno-"+so.id, armNo=!!DESP[kno];
      const av=so.avalId&&DATA.members.find(x=>x.id===so.avalId), gg=so.grupoGid&&gruposCierre().find(x=>x.id===so.grupoGid), gp=gg&&DATA.members.find(x=>x.id===gg.principalId);
      h+=`<div style="display:flex;gap:10px;align-items:flex-start;border:1px dashed #C9D9CE;border-radius:12px;padding:10px;margin-top:8px;background:#FBFDFB">
        <div style="flex-shrink:0;display:flex;flex-direction:column;align-items:center"><span style="width:26px;height:26px;border-radius:50%;background:#7FA48D;color:#fff;font-size:13px;font-weight:800;display:flex;align-items:center;justify-content:center">${i+1}</span>${_solFlechas(so,lista.filter(x=>_solTipo(x)===_solTipo(so)))}</div>
        <div style="flex:1;min-width:0">
        <div style="display:flex;justify-content:space-between;gap:8px"><b style="font-size:15px">${escH(so.nombre)}</b><b style="font-size:15.5px;color:#94571A;white-space:nowrap">${fmtEur(so.capital)} €</b></div>
        <div style="font-size:12px;color:var(--muted);margin-top:2px">${_solEtqTipo(so,m)} · ${escH(so.fecha||"")} · ${so.cuotas} ${so.cuotas===1?"cuota":"cuotas"} de ${fmtEur(cuotas[0])} €</div>
        ${(av||gp)?`<div style="font-size:12px;color:#1B4332;margin-top:2px">${av?`🛡️ Aval: ${escH(av.name.split(" ")[0])}`:""}${av&&gp?" · ":""}${gp?`👥 Grupo de ${escH(gp.name.split(" ")[0])}`:""}</div>`:""}
        ${_solHistHTML(so)}
        <div class="${repF[so.id]&&!repF[so.id].ok?"sol-falta":"sol-ok"}">${_solAlcanzaHTML(repF[so.id])}</div>
        <div class="sol-bot" style="display:flex;gap:6px;align-items:center;margin-top:8px">
          <span style="flex:2;font-size:12.5px;color:#1B4332;font-weight:700">Se otorga en el cierre de ${mt}</span>
          <button onclick="DESP['soled-${so.id}']=!DESP['soled-${so.id}'];render()" aria-expanded="${DESP['soled-'+so.id]?"true":"false"}" style="flex:1;padding:8px;border-radius:9px;border:1px solid var(--border);background:#fff;color:#1B4332;font-size:12.5px;font-weight:800;cursor:pointer">Importe</button>
          <button onclick="${armNo?`solEstado('${so.id}','no')`:`DESP['${kno}']=true;render()`}" style="flex:1;padding:8px;border-radius:9px;border:1px solid #E8C9BE;background:${armNo?"#C0492C":"#fff"};color:${armNo?"#fff":"#A63A20"};font-size:12.5px;font-weight:800;cursor:pointer">${armNo?"¿Seguro?":"No otorgar"}</button></div>${_solEditarHTML(so)}</div></div>`;
    });
  });
  { // v45.47: avisar al responsable del grupo de que sus solicitudes están apuntadas
    const gids=[...new Set(pendT.map(x=>x.grupoGid).filter(Boolean))].filter(gid=>gruposCierre().some(g=>g.id===gid));
    if(gids.length&&!SOL_FORM)h+=`<div style="margin-top:14px;padding-top:10px;border-top:1px solid var(--border)"><div style="font-size:13.5px;font-weight:800;color:#1B4332;margin-bottom:6px">💬 Avisar a los responsables de que están apuntadas</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px">${gids.map(gid=>{ const g=gruposCierre().find(x=>x.id===gid), p=DATA.members.find(m=>m.id===g.principalId), n=pendT.filter(x=>x.grupoGid===gid).length;
        return p?`<button class="cgt-b" style="flex:1 1 45%;background:#15803D;border-color:#15803D;color:#fff;min-height:44px" onclick="solAvisarGrupo('${gid}')">💬 ${escH(p.name.split(" ")[0])} (${n})</button>`:""; }).join("")}</div></div>`; }
  h+=sinAtenderHTML(); // v46.54 · AY-9
  if(SOL_FORM){
    const asoc=DATA.members.filter(m=>m.type==="asociado"&&activoEnReporte(m)).sort((a,b)=>a.name.localeCompare(b.name)), terc=DATA.members.filter(m=>m.type==="tercero"&&activoEnReporte(m)).sort((a,b)=>a.name.localeCompare(b.name));
    h+=`<div style="border:1.5px solid #2D6A4F;border-radius:12px;padding:12px;margin-top:10px;background:#F4F9F6">
      <div style="font-size:15px;font-weight:800;color:#1B4332;margin-bottom:6px">Nueva solicitud</div>
      <label class="m-label">¿Quién la pide?</label>
      <select id="so-mid" class="m-select" style="font-size:15px" onchange="soMidCambio()"><option value="">— Elegir —</option>
        <optgroup label="Asociados">${asoc.map(m=>`<option value="${esc(m.id)}">${escH(m.name)}</option>`).join("")}</optgroup>
        <optgroup label="Terceros">${terc.map(m=>`<option value="${esc(m.id)}">${escH(m.name)}</option>`).join("")}</optgroup></select>
      <div id="so-nom-wrap"><div style="font-size:12px;color:var(--muted);margin:2px 0 6px">o, si aún no está en la app:</div>
      <input id="so-nom" type="text" class="m-input" placeholder="Nombre y apellidos" style="font-size:16px" oninput="tildeSugerir('so-nom','so-tilde')"><div id="so-tilde"></div><!-- v45.51 -->
      <label class="m-label">¿Cómo entra?</label>
      <select id="so-tipo" class="m-select" style="font-size:15px" onchange="soCuotasAjustar()"><option value="">— Elegir —</option><option value="asociado">Como asociado</option><option value="tercero">Como tercero con aval</option></select></div>
      <label class="m-label">¿Quién la avala?</label>
      <select id="so-aval" class="m-select" style="font-size:15px" onchange="soAvalCambio()"><option value="">— Sin aval / fundador —</option>${asoc.map(m=>`<option value="${esc(m.id)}">${escH(m.name)}</option>`).join("")}</select>
      <label class="m-label">¿En qué grupo va?</label>
      <select id="so-grupo" class="m-select" style="font-size:15px"><option value="">— Sin grupo —</option>${gruposCierre().map(g=>{const p=DATA.members.find(m=>m.id===g.principalId);return p?`<option value="${esc(g.id)}">Grupo de ${escH(p.name)}</option>`:"";}).join("")}</select>
      <label class="m-label">¿Cuánto pide? (€)</label>
      <input id="so-cap" type="number" inputmode="decimal" class="m-input" placeholder="Ej: 500" style="font-size:16px" oninput="solPreview()">
      <label class="m-label">¿En cuántas cuotas?</label>
      <select id="so-n" class="m-select" style="font-size:15px" onchange="solPreview()">${opcionesCuotasHTML(cuotasMaxPara(null),5,true)}</select><!-- v46.68: se ajusta a la persona y al mes (soCuotasAjustar) -->
      <label class="m-label">¿Para qué mes? <span style="font-weight:600;color:var(--muted)">(se otorga en el cierre de ese mes)</span></label>
      <select id="so-mes" class="m-select" style="font-size:15px" onchange="soCuotasAjustar()">${_mesesSolOpts(getMesKey(DATA.reportMonth,DATA.reportYear))}</select>
      <div id="so-prev"></div>
      <div style="display:flex;gap:6px"><button onclick="SOL_FORM=false;SOL_PREFILL=null;render()" style="flex:1;padding:11px;border-radius:9px;border:1.5px solid #D9C9B0;background:#fff;color:#6E6048;font-size:14px;font-weight:700;cursor:pointer">Cancelar</button>
      <button onclick="solGuardar()" style="flex:2;padding:11px;border-radius:9px;border:1.5px solid #1B4332;background:#fff;color:#1B4332;font-size:14px;font-weight:800;cursor:pointer">Guardar en la lista</button></div>
      <button onclick="solGuardar(true)" style="width:100%;margin-top:8px;min-height:48px;padding:11px;border-radius:9px;border:none;background:#1B4332;color:#fff;font-size:15px;font-weight:800;cursor:pointer">✅ Guardar y otorgar ya</button>
      <div style="font-size:12.5px;color:var(--muted);margin-top:5px;line-height:1.4">Se otorga en el momento si es para este mes, no hay otras solicitudes delante y el dinero alcanza. Si no, queda en la lista.</div></div>`; // v45.45
  } else h+=`<button onclick="SOL_FORM=true;render()" style="width:100%;margin-top:10px;padding:12px;border-radius:12px;border:1.5px dashed #2D6A4F;background:#fff;color:#1B4332;font-size:14px;font-weight:800;cursor:pointer">＋ Nueva solicitud</button>`;
  // Otorgadas este mes y no otorgadas
  const desp=(k,t,lista,fn)=>{ if(!lista.length)return ""; const o=!!DESP[k]; let x=`<button class="ay-desp" aria-expanded="${o?"true":"false"}" onclick="DESP['${k}']=!DESP['${k}'];render()" style="display:flex;align-items:center;gap:10px;min-height:44px;background:none;border:none;color:#2D6A4F;font-size:14.5px;font-weight:700;cursor:pointer;padding:8px 0 0">${t} (${lista.length}) <span class="mg-acc-fl${o?" ab":""}" aria-hidden="true"></span></button>`; if(o)x+=lista.map(fn).join(""); return x; };
  h+=desp("ay-otor",`Otorgadas en ${mesTxt}`,otor,so=>{ const gp=so.entregaGid&&gruposCierre().find(g=>g.id===so.entregaGid), pp=gp&&DATA.members.find(m=>m.id===gp.principalId);
    return `<div style="display:flex;justify-content:space-between;gap:8px;font-size:13.5px;padding:6px 0;border-bottom:1px solid #EFEAE0"><span>✅ ${escH(so.nombre)} <span style="color:var(--muted);font-size:12px">· ${so.cuotasOtorgadas||so.cuotas} cuotas${pp?` · la entrega ${escH(pp.name.split(" ")[0])}`:""}</span></span><b style="white-space:nowrap">${fmtEur(so.capitalOtorgado||so.capital)} €</b></div>`; });
  h+=desp("ay-no","No otorgadas",noOt,so=>{ const kb="solbor-"+so.id, arm=!!DESP[kb];
    return `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:13.5px;padding:6px 0;border-bottom:1px solid #EFEAE0"><span>${escH(so.nombre)} · ${fmtEur(so.capital)} €</span><span style="white-space:nowrap">
      <button onclick="solEstado('${so.id}','pendiente')" style="border:1px solid #2D6A4F;background:#fff;color:#1B4332;border-radius:8px;font-size:12px;font-weight:700;padding:5px 8px;cursor:pointer">Volver a la lista</button>
      <button onclick="${arm?`solBorrar('${so.id}')`:`DESP['${kb}']=true;render()`}" style="border:none;background:${arm?"#C0492C":"none"};color:${arm?"#fff":"#A63A20"};border-radius:7px;font-size:${arm?12:15}px;font-weight:800;padding:${arm?"4px 8px":"0 4px"};cursor:pointer">${arm?"¿Borrar?":"✕"}</button></span></div>`; });
  return h+`</div>`;
}
function cuotaToque(mid,lid,pi){
  if(_mesBloqueado(_mesDeCuota(mid,lid,pi)))return; // v45.46: mes cerrado
  const m=DATA.members.find(x=>x.id===mid), l=m&&[...(m.loans||[]),...(m.closedLoans||[])].find(x=>x.id===lid); if(!l||!l.pays[pi])return;
  const key=mid+"|"+lid+"|"+pi;
  if(!l.pays[pi].paid&&_cuotaArmada!==key){
    _cuotaArmada=key; render();
    toast(`Toca otra vez la cuota para marcarla pagada: ${fmtEur(cuotaDe(l,pi))} € de ${m.name.split(" ")[0]}`,4000);
    setTimeout(()=>{if(_cuotaArmada===key){_cuotaArmada=null;render();}},4000);
    return;
  }
  _cuotaArmada=null; togglePay(mid,lid,pi);
}
function delLoan(mid,lid){
  // Sin confirm() (se bloquea en móvil). Primer toque arma, segundo elimina.
  const key=mid+"|"+lid;
  if(_delLoanArmed!==key){
    _delLoanArmed=key;
    render();
    toast("Toca de nuevo ✕ para confirmar");
    setTimeout(()=>{if(_delLoanArmed===key){_delLoanArmed=null;render();}},4000);
    return;
  }
  _delLoanArmed=null;
  DATA.members.forEach(m=>{if(m.id===mid){
    m.loans=m.loans.filter(l=>l.id!==lid);
    // Eliminar la entrada de historial vinculada a este apoyo (si la tiene)
    if(Array.isArray(m.history))m.history=m.history.filter(h=>h.lid!==lid);
  }});
  save();toast("Ayuda eliminada ✓");render();
}
function _limAyudaTxt(c,m){ return "hasta "+_miles(limiteAyudaNuevaDe(m,c))+" € · "+cuotasMaxDe(m,c)+" cuotas"; } // v46.56: su límite con su aporte (AY-10)
function _permCorta(c){ return c===0?"Indefinida":c+" meses"; }
function simMensajeDatos(m){
  const cap=SIM.cap, n=SIM.n, cur=(m.ciclo!=null?m.ciclo:12), need=_simPermNecesaria(m,cap,n);
  const rep=_idxMes(DATA.reportMonth,DATA.reportYear), ini=rep+1, jIdx=m.joinMonth?_idxMes(m.joinMonth,m.joinYear):null;
  const {cuotas}=ayudaCuotas(cap,n,DATA.rate);
  const finDe=c=>(c===0||jIdx==null)?null:jIdx+c-1;
  const extras=[];
  if(need!=null&&need!==cur){
    extras.push(`Ayudas de hasta ${_miles(limiteAyudaNuevaDe(m,need))} € en hasta ${cuotasMaxDe(m,need)} cuotas`);
    if(jIdx!=null){ const mN=Object.assign({},m,{ciclo:need}), hasta=jIdx+(need===0?37:need);
      [[12,10],[15,12]].forEach(([lv,antes])=>{ for(let i=Math.max(rep+1,jIdx+1);i<=hasta;i++){ const k=_keyDeIdx(i);
        if(tarifaNivelMes(mN,k)===lv&&tarifaNivelMes(m,k)<lv){ extras.push(`Tu beneficio sube: desde ${_txtIdx(i-1)}, cada 50 € que aportas gana <b>${lv} €</b> en vez de ${antes} €`); break; } } }); }
  }
  return {cap,n,cur,need,rep,ini,cuotas,finCur:finDe(cur),finNeed:need==null?null:finDe(need),extras};
}
function _simTarjetaHTML(m,d){
  const nom=escH(m.name.split(" ")[0]), amplia=d.need!=null&&d.need!==d.cur;
  const ult=d.ini+d.n-1; // v45.28: una sola cifra de cuota (la mayor) para no confundir
  const cuotaTxt=d.n===1?`<b>1 cuota de ${_eurM(d.cuotas[0])} €</b> (${_txtIdx(d.ini)})`
    :`<b>${d.n} cuotas de ${_eurM(Math.max(...d.cuotas))} €</b> (${_txtIdx(d.ini)} – ${_txtIdx(ult)})`;
  const fin=amplia?d.finNeed:d.finCur, perm=(amplia?d.need:d.cur);
  const st="font-size:13px;line-height:1.5;margin:3px 0;color:#1f2a24";
  const box=(hoy)=>{ const c=hoy?d.cur:d.need, f=hoy?d.finCur:d.finNeed;
    return `<div style="flex:1;border-radius:10px;padding:9px 6px;text-align:center;${hoy?"background:#F4F2EE;color:#6b6f6c;border:1.5px dashed #C9C4BA":"background:#1B4332;color:#fff;box-shadow:0 2px 6px rgba(27,67,50,.35)"}">
      <div style="font-size:10px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;${hoy?"":"color:#BFE3CC"}">${hoy?"Tu permanencia hoy":"La que necesitas"}</div>
      <div style="font-size:16px;font-weight:800;margin:3px 0">${_permCorta(c)}</div>
      <div style="font-size:11px">${_limAyudaTxt(c,m)}</div>
      ${f!=null?`<div style="font-size:10.5px;opacity:.85">termina en ${_txtIdx(f)}</div>`:""}
      <div style="display:inline-block;font-size:11px;font-weight:800;padding:2px 8px;border-radius:20px;margin-top:6px;${hoy?"background:#FBE3DC;color:#B04A2C":"background:#2D8A5A;color:#fff"}">${hoy?"✗ "+_eurM(d.cap)+" € no caben":"✓ tus "+_eurM(d.cap)+" € caben"}</div></div>`; };
  return `<div style="width:380px;background:#fff;border-radius:14px;overflow:hidden;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif">
    <div style="background:#1B4332;color:#fff;padding:13px 15px"><div style="font-size:18px;font-weight:800">${amplia?`Tu ayuda de ${_eurM(d.cap)} € se puede aprobar ✅`:`Tu ayuda de ${_eurM(d.cap)} €`}</div>
      <div style="font-size:12px;opacity:.85;margin-top:2px">${amplia?`Solo falta un paso: ampliar tu permanencia ${d.cur!==0?"de "+d.cur+" ":""}a ${d.need===0?"indefinida":d.need+" meses"}`:`${nom}, así quedaría`}</div></div>
    ${amplia?`<div style="padding:11px 13px;border-bottom:1px solid #EEE9DF"><div style="font-size:12.5px;font-weight:800;color:#1B4332;margin-bottom:8px">Lo que puedes pedir con tu permanencia actual</div>
      <div style="display:flex;align-items:stretch;gap:4px">${box(true)}<div style="display:flex;align-items:center;font-size:20px;font-weight:900;color:#2D8A5A">→</div>${box(false)}</div></div>`:""}
    <div style="padding:11px 13px;border-bottom:${d.extras.length?"1px solid #EEE9DF":"none"}"><div style="font-size:12.5px;font-weight:800;color:#1B4332;margin-bottom:6px">Así quedaría tu ayuda</div>
      <div style="${st}">💶 Recibes: <b>${_eurM(d.cap)} €</b> en ${_txtIdx(d.rep)}</div>
      <div style="${st}">📅 Devuelves: ${cuotaTxt}</div>
      <div style="${st}">⏳ ${perm===0?"Tu permanencia es <b>indefinida</b>":`Tu permanencia termina en <b>${_txtIdx(fin)}</b>`}</div></div>
    ${d.extras.length?`<div style="padding:11px 13px;background:#FFFBEF"><div style="font-size:12.5px;font-weight:800;color:#7A5300;margin-bottom:6px">Y además, con ${d.need===0?"permanencia indefinida":d.need+" meses"}</div>
      ${d.extras.map(x=>`<div style="${st}">⭐ ${x}</div>`).join("")}</div>`:""}
  </div>`;
}
function _simTextoWA(m,d){
  const nom=m.name.split(" ")[0], amplia=d.need!=null&&d.need!==d.cur;
  return `Hola ${nom} 👋\nTe envío cómo quedaría tu ayuda de *${_eurM(d.cap)} €*.`+
    (amplia?` Si te parece bien, respóndeme «Sí, amplío a ${d.need===0?"indefinida":d.need+" meses"}» y lo dejamos listo.`:"")+`\nNuevos Horizontes`;
}
async function simEnviarWA(){
  const m=DATA.members.find(x=>x.id===(MODAL&&MODAL.mid)); if(!m||!SIM)return;
  const d=simMensajeDatos(m); if(d.need==null){ toast("⛔ Esta ayuda no cabe con ninguna permanencia",3500); return; }
  _compartirImagenWA(m,_simTarjetaHTML(m,d),_simTextoWA(m,d),`Ayuda_${m.name.split(" ")[0]}.png`);
}
// v45.31: imagen (con los iconos de la app) + texto corto por WhatsApp. Sin imagen posible, solo el texto.
async function _compartirImagenWA(m,html,txt,archivo){
  const loaded=await loadPDFLibs();
  const abrirTexto=()=>{ const t=_telWA(m.phone||""); window.open("https://wa.me/"+(t||"")+"?text="+encodeURIComponent(txt),"_blank"); };
  if(!loaded||typeof html2canvas==="undefined"){ toast("No se pudo crear la imagen: se envía solo el texto",3500); abrirTexto(); return; }
  const wrap=document.createElement("div"); wrap.style.cssText="position:fixed;left:-9999px;top:0;width:380px;background:#ECE5DD;padding:0";
  wrap.innerHTML=html; document.body.appendChild(wrap);
  try{ if(typeof iconizar==="function")iconizar(wrap); }catch(e){}
  _icFix(wrap); toast("📸 Preparando la imagen...",3000);
  try{
    const canvas=await html2canvas(wrap.firstElementChild,{backgroundColor:"#ffffff",scale:2.5,useCORS:true,logging:false,width:380,windowWidth:400});
    if(document.body.contains(wrap))document.body.removeChild(wrap);
    canvas.toBlob(async blob=>{
      if(!blob){ abrirTexto(); return; }
      const file=new File([blob],archivo,{type:"image/png"});
      if(navigator.canShare&&navigator.canShare({files:[file]})){
        try{ await navigator.share({files:[file],text:txt}); toast("Enviado ✓"); }
        catch(e){ if(e.name!=="AbortError"){ abrirTexto(); } }
      } else { const url=URL.createObjectURL(blob),a=document.createElement("a"); a.href=url; a.download=file.name; a.click(); URL.revokeObjectURL(url);
        toast("📸 Imagen descargada: adjúntala en el chat que se abre",4500); abrirTexto(); }
    },"image/png");
  }catch(e){ if(document.body.contains(wrap))document.body.removeChild(wrap); console.error(e); abrirTexto(); }
}
// Desde una ayuda bloqueada por la permanencia: abre el simulador con su importe y sus cuotas
function avisarDesdeAyuda(mid,cap,nn){
  const m=DATA.members.find(x=>x.id===mid); if(!m)return;
  const g=id=>(document.getElementById(id)||{}).value;
  const volver={sol:MODAL&&MODAL.sol||null,restore:{mid:g("cl-mid"),cap:g("cl-cap"),n:g("cl-n"),ent:g("cl-entrega")}};
  SIM={mid,tab:"ayuda",ciclo:(m.ciclo!=null?m.ciclo:12),cap,n:nn,ap:50};
  openModal('sim',{mid,volver});
}
function _avisoApoyoHTML(v){
  if(v.bloqueo)return `<div style="margin-top:10px;padding:10px 12px;border-radius:10px;background:#FDF0EE;border:1.5px solid #C0492C;color:#7A2418;font-size:13px;line-height:1.45">⛔ ${v.bloqueo}</div>`;
  if(v.aviso)return `<div style="margin-top:10px;padding:10px 12px;border-radius:10px;background:#FFF8F0;border:1px solid #F5D5B0;color:#7A4A1E;font-size:13px;line-height:1.45">⚠️ ${v.aviso}</div>`;
  return "";
}
function botonAmpliarAyudaHTML(m,cap,nn,ini,sin){
  const c=permNecesariaApoyo(m,cap,nn,ini,sin); if(c==null)return "";
  return `<button onclick="ampliarDesdeAyuda('${esc(m.id)}',${c})" style="width:100%;margin-top:8px;padding:11px;border-radius:10px;border:1.5px solid #2D6A4F;background:#2D6A4F;color:#fff;font-size:14px;font-weight:800;cursor:pointer">🔁 Ampliar su permanencia a ${c===0?"indefinida":c+" meses"}</button>
    ${cap<=SIM_MAX_AYUDA&&nn<=REGLAS.CUOTAS_MAX?`<button onclick="avisarDesdeAyuda('${esc(m.id)}',${cap},${nn})" style="width:100%;margin-top:6px;padding:10px;border-radius:10px;border:1.5px solid #25D366;background:#fff;color:#128C4A;font-size:13.5px;font-weight:800;cursor:pointer">📲 Avisar por WhatsApp</button>`:""}
    <div style="font-size:12px;color:var(--muted);margin:4px 0 10px;line-height:1.4">«Ampliar» abre la ventana de su permanencia; «Avisar» abre el simulador con esta ayuda para enviársela. En los dos casos vuelves aquí con la ayuda tal como está.</div>`;
}
function ampliarDesdeAyuda(mid,c){
  const g=id=>(document.getElementById(id)||{}).value;
  const volver={sol:MODAL&&MODAL.sol||null,restore:{mid:g("cl-mid"),cap:g("cl-cap"),n:g("cl-n"),ent:g("cl-entrega")}};
  openModal('ciclo',{mid,preCiclo:c,volver});
}
function volverAAyuda(v){ openModal('cierreloan',{sol:v.sol,restore:v.restore}); setTimeout(updateCierreLoanPreview,30); }
function addLoanSubmit(){
  const cap=parseInt(document.getElementById("l-cap").value)||0;if(cap<=0)return;
  const nn=parseInt(document.getElementById("l-n")?.value||"3");
  { const mV=DATA.members.find(x=>x.id===MODAL.mid), c=_condicionActual(mV),
      v=validarApoyo(mV,cap,nn,c.tipo,c.ciclo,{m:document.getElementById("l-sm").value,y:parseInt(document.getElementById("l-sy").value)});
    if(v.bloqueo){ const pv=document.getElementById("l-preview"); if(pv)updateLoanPreview(); toast("⛔ No se puede guardar: revisa el aviso",4000); return; } }
  let rate=parseFloat(document.getElementById("l-rate")?.value);
  if(isNaN(rate)||rate<0)rate=DATA.rate; // fallback a la tasa global del fondo
  const gm=document.getElementById("l-gm").value,gy=parseInt(document.getElementById("l-gy").value);
  const sm=document.getElementById("l-sm").value,sy=parseInt(document.getElementById("l-sy").value);
  const{total,cuotas}=ayudaCuotas(cap,nn,rate);
  const inst=cuotas[0]; // referencia visual (importe de la 1ª cuota); el cálculo real usa l.cuotas
  const pays=[];let mi=MONTHS.indexOf(sm),yr=sy;
  for(let i=0;i<nn;i++){pays.push({m:MONTHS[mi],y:yr,paid:false});mi++;if(mi>=12){mi=0;yr++;}}
  const mOr=DATA.members.find(x=>x.id===MODAL.mid);
  // Condición histórica de la ayuda en el momento de concederla (no se migra a las antiguas).
  const tipoEnConcesion=mOr?mOr.type:"asociado";
  const avalistaEnConcesion=(mOr&&mOr.type==="tercero")?avalistaNombre(mOr):null; // nombre resuelto desde el id, texto congelado
  const cicloEnConcesion=mOr&&mOr.ciclo!=null?mOr.ciclo:null; // v45: sin inventar (antes 0 = indefinida)
  DATA.members.forEach(m=>{if(m.id===MODAL.mid){const lid="l"+Date.now();m.loans.push({id:lid,gMonth:gm,gYear:gy,capital:cap,total,n:nn,inst,cuotas,rate,pays,tipoEnConcesion,avalistaEnConcesion,cicloEnConcesion,...condicionesConcesion(mOr,cap,nn)});if(!m.history)m.history=[];m.history.push({gMonth:gm,gYear:gy,capital:cap,lid});}});
  closeModal();toast("Ayuda añadida ✓");save();
}

// ── EDITAR AYUDA: capital, plazo y meses ──
function histLoanFormHTML(){
  const m=DATA.members.find(x=>x.id===MODAL.mid);
  if(!m)return `<div class="modal-title">Historial</div><p>Asociado no encontrado.</p>`;
  const hist=m.history||[];
  const total=hist.reduce((s,x)=>s+(x.capital||0),0);
  let filas=hist.map((x,i)=>{
    const armed=(_delHistArmed===(m.id+"|"+i));
    return `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:10px;border:1px solid var(--border);border-radius:10px;margin-bottom:8px">
      <div><div style="font-weight:600;font-size:14px;color:var(--dark)">${escH(x.gMonth||"?")} ${x.gYear||""}</div><div style="font-size:12px;color:var(--muted)">${fmtEur(x.capital||0)} € de capital${x.lid?"":' · <span style="color:#A63A20">sin vincular</span>'}</div></div>
      <button class="del-btn ${armed?"armed":""}" style="padding:6px 10px;font-size:12px" onclick="delHistEntry('${esc(m.id)}',${i})">${armed?"¿Seguro?":"✕"}</button>
    </div>`;
  }).join("");
  if(hist.length===0)filas=`<p style="color:var(--muted);font-size:13px">Sin entradas en el historial.</p>`;
  return `<div class="modal-title">📋 Historial de ayudas — ${escH(m.name)}</div>
  <p style="font-size:12px;color:var(--muted);margin-bottom:12px">Cada entrada es una ayuda registrada. Elimina las que sobren (por ejemplo, registros de prueba). Esto solo corrige el historial acumulado; no afecta a las ayudas activas.</p>
  <div style="display:flex;justify-content:space-between;padding:8px 10px;background:var(--cream);border-radius:8px;margin-bottom:12px"><span style="font-weight:700;color:var(--dark)">Total historial</span><span style="font-weight:700;color:var(--warm-txt)">${fmtEur(total)} €</span></div>
  ${filas}
  <button class="m-primary" onclick="closeModal()" style="margin-top:6px">Cerrar</button>`;
}
function delHistEntry(mid,idx){
  const key=mid+"|"+idx;
  if(_delHistArmed!==key){
    _delHistArmed=key; render(); toast("Toca de nuevo ✕ para eliminar esta entrada");
    setTimeout(()=>{if(_delHistArmed===key){_delHistArmed=null;render();}},4000);
    return;
  }
  _delHistArmed=null;
  const m=DATA.members.find(x=>x.id===mid);
  if(m&&Array.isArray(m.history)){m.history.splice(idx,1);}
  save();toast("Entrada eliminada ✓");render();
}
function editLoanFormHTML(){
  const m=DATA.members.find(x=>x.id===MODAL.mid);
  const l=m&&m.loans.find(x=>x.id===MODAL.lid);
  if(!l)return `<div class="modal-title">Ayuda no encontrada</div>`;
  const sm=l.pays[0]?l.pays[0].m:l.gMonth;
  const sy=l.pays[0]?l.pays[0].y:l.gYear;
  return`<div class="modal-title">✏️ Editar ayuda — ${escH(m.name)}</div>
<p style="font-size:12px;color:var(--muted);margin-bottom:12px">Se conservan los pagos ya marcados que sigan existiendo.</p>
<label class="m-label">Capital (€)</label>
<input id="el-cap" class="m-input" type="number" value="${l.capital}" style="font-size:20px;font-weight:700" oninput="updateEditPreview()">
<label class="m-label">Nº cuotas</label>
<select id="el-n" class="m-select" style="margin-bottom:12px;font-size:16px;font-weight:700" onchange="updateEditPreview()">${opcionesCuotasHTML(cuotasMaxPara(m,_idxMes(l.gMonth,l.gYear),l.n),l.n)}</select><!-- v46.68: AY-10 y AY-1 desde el mes en que se otorgó -->
<div style="display:flex;gap:8px;margin-bottom:12px">
<div style="flex:1"><label class="m-label">Mes otorgada</label><select id="el-gm" class="m-select">${MONTHS.map(mm=>`<option${mm===l.gMonth?" selected":""}>${mm}</option>`).join("")}</select></div>
<div style="flex:1"><label class="m-label">Año</label><select id="el-gy" class="m-select">${["2025","2026","2027"].map(y=>`<option${parseInt(y)===l.gYear?" selected":""}>${y}</option>`).join("")}</select></div>
</div>
<div style="display:flex;gap:8px;margin-bottom:16px">
<div style="flex:1"><label class="m-label">1ª cuota mes</label><select id="el-sm" class="m-select">${MONTHS.map(mm=>`<option${mm===sm?" selected":""}>${mm}</option>`).join("")}</select></div>
<div style="flex:1"><label class="m-label">Año</label><select id="el-sy" class="m-select">${["2025","2026","2027"].map(y=>`<option${parseInt(y)===sy?" selected":""}>${y}</option>`).join("")}</select></div>
</div>
<div id="el-preview"></div>
<div style="border-top:1px dashed var(--muted);margin:16px 0 12px;padding-top:14px">
  <div style="font-weight:700;font-size:14px;color:var(--dark);margin-bottom:4px">⏸️ Aplazar una cuota</div>
  <p style="font-size:12px;color:var(--muted);margin-bottom:8px">El asociado paga solo el retorno del mes (5% del capital). El capital de esa cuota pasa al final: se añade un mes. Las demás cuotas no cambian.</p>
  ${(()=>{
    const pend=l.pays.map((p,i)=>({p,i})).filter(o=>!o.p.paid&&!o.p.aplazada);
    if(pend.length===0)return `<div style="font-size:12px;color:var(--muted)">No hay cuotas pendientes para aplazar.</div>`;
    const retorno=Math.round(l.capital*(DATA.rate/100));
    return `<select id="el-aplazar-mes" class="m-select" style="margin-bottom:8px">
      <option value="">— Elegir mes a aplazar —</option>
      ${pend.map(o=>`<option value="${o.i}">${o.p.m} ${o.p.y} · ${o.i+1}/${l.pays.length}</option>`).join("")}
    </select>
    <div style="font-size:12px;color:var(--warm-txt);font-weight:600;margin-bottom:8px">Se cobrará solo ${retorno} € este mes · el capital se recupera en una cuota extra al final.</div>
    <button class="edit-btn" style="width:100%;padding:11px;font-size:13px;background:#E8A04B;color:#fff;font-weight:700" onclick="aplazarDesdeEditor()">Aplicar aplazamiento</button>`;
  })()}
  ${l.pays.some(p=>p.aplazada)?`<div style="margin-top:12px;padding-top:10px;border-top:1px dashed var(--muted)"><div style="font-weight:700;font-size:13px;color:var(--dark);margin-bottom:6px">Cuotas aplazadas</div>${l.pays.map((p,i)=>p.aplazada?`<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:8px;border:1px solid var(--border);border-radius:8px;margin-bottom:6px"><span style="font-size:13px;color:var(--dark)">${escH(p.m)} ${p.y} · ${(p.instAplazada||recargoPorCuota(l))}€ (solo retorno)</span><button class="edit-btn" style="padding:5px 9px;font-size:11px;background:#D9C7A8" onclick="quitarAplazamiento(${i})">↩︓ Quitar</button></div>`:"").join("")}<p style="font-size:11px;color:var(--muted);margin-top:2px">Al quitar un aplazamiento, esa cuota vuelve a normal y el plazo se reduce en un mes.</p></div>`:""}
</div>
<button id="btnSaveEditLoan" class="m-primary" onclick="saveEditLoan()">Guardar cambios</button>`;
}
function updateEditPreview(){
  const cap=parseInt(document.getElementById("el-cap")?.value)||0;
  const nn=parseInt(document.getElementById("el-n")?.value||"3");
  if(cap<=0){document.getElementById("el-preview").innerHTML="";return;}
  const{total,cuotas}=ayudaCuotas(cap,nn,DATA.rate);
  const base=cuotas[0],ultima=cuotas[cuotas.length-1];
  const cuotaTxt=(cuotas.length>1&&base!==ultima)?`${fmtEur(base)} € (última ${fmtEur(ultima)} €)`:`${fmtEur(base)} €`;
  document.getElementById("el-preview").innerHTML=`<div class="m-summary"><div style="font-size:13px;color:var(--muted);margin-bottom:4px">Resumen</div><div style="display:flex;justify-content:space-between;font-size:15px"><span>Total (${DATA.rate}% × ${nn})</span><span style="font-weight:700">${fmtEur(total)} €</span></div><div style="display:flex;justify-content:space-between;font-size:15px;margin-top:4px"><span>Cuota mensual</span><span style="font-weight:700;color:var(--warm-txt)">${cuotaTxt}</span></div></div>`;
}
function quitarAplazamiento(idx){
  const m=DATA.members.find(x=>x.id===MODAL.mid);
  const l=m&&m.loans.find(x=>x.id===MODAL.lid);
  if(!l||!l.pays[idx]||!l.pays[idx].aplazada){toast("Esa cuota no está aplazada");return;}
  UNDO_SNAPSHOT=JSON.stringify(DATA);
  clearTimeout(UNDO_TIMER);
  // 1) Devolver la cuota a normal
  delete l.pays[idx].aplazada;
  delete l.pays[idx].instAplazada;
  // 2) Quitar UNA cuota extra del final que esté sin pagar y sin aplazar
  //    (la que se había añadido al aplazar). Se busca desde el final.
  for(let i=l.pays.length-1;i>=0;i--){
    if(!l.pays[i].paid && !l.pays[i].aplazada && i!==idx){ l.pays.splice(i,1); break; }
  }
  // 3) Recalcular respetando las aplazadas que queden
  recalcularApoyo(l);
  save();
  toast("↩︎ Aplazamiento retirado · plazo "+l.n+" cuotas");
  render();
}
function aplazarDesdeEditor(){
  const sel=document.getElementById("el-aplazar-mes");
  const idx=sel?parseInt(sel.value):NaN;
  if(isNaN(idx)){toast("Elige primero el mes a aplazar");return;}
  const m=DATA.members.find(x=>x.id===MODAL.mid);
  const l=m&&m.loans.find(x=>x.id===MODAL.lid);
  if(!l){closeModal();return;}
  const p=l.pays[idx];
  if(!p||p.paid||p.aplazada){toast("Esa cuota no se puede aplazar");return;}
  UNDO_SNAPSHOT=JSON.stringify(DATA);
  clearTimeout(UNDO_TIMER);
  // 1) Marcar como aplazada (solo retorno)
  p.aplazada=true;
  // 2) Añadir una cuota nueva al final (capital recuperado + su retorno)
  const ultima=l.pays[l.pays.length-1];
  let mi=MONTHS.indexOf(ultima.m), yr=ultima.y;
  mi++; if(mi>=12){mi=0;yr++;}
  l.pays.push({m:MONTHS[mi],y:yr,paid:false});
  // 3) Recalcular respetando aplazadas
  recalcularApoyo(l);
  save();
  toast("✓ "+p.m+" "+p.y+" aplazada · plazo "+l.n+" cuotas");
  render(); // reabre el modal con el estado actualizado
}
function saveEditLoan(){
  const btn=document.getElementById("btnSaveEditLoan");
  if(!_saveEditArmed){
    _saveEditArmed=true;
    if(btn){btn.textContent="✓ Confirmar guardado";btn.style.background="#E07A3A";}
    toast("Toca de nuevo para confirmar los cambios");
    setTimeout(()=>{_saveEditArmed=false;if(btn){btn.textContent="Guardar cambios";btn.style.background="";}},4000);
    return;
  }
  _saveEditArmed=false;
  const m=DATA.members.find(x=>x.id===MODAL.mid);
  const l=m&&m.loans.find(x=>x.id===MODAL.lid);
  if(!l){closeModal();return;}
  const cap=parseInt(document.getElementById("el-cap").value)||0;if(cap<=0){alert("Capital inválido");return;}
  const nn=parseInt(document.getElementById("el-n")?.value||"3");
  { // v44.21: se valida con la condición que tenía al concederse
    const tipo=l.tipoEnConcesion!=null?l.tipoEnConcesion:m.type, ciclo=l.cicloEnConcesion!=null?l.cicloEnConcesion:(m.ciclo!=null?m.ciclo:12);
    const nApl=(l.pays||[]).filter(p=>p.aplazada).length,
      v=validarApoyo(m,cap,nn-nApl,tipo,ciclo,{m:document.getElementById("el-sm").value,y:parseInt(document.getElementById("el-sy").value)},{m:l.gMonth,y:l.gYear},undefined,{lid:l.id}); // v46.65: esta ayuda no cuenta como pendiente
    if(v.bloqueo){ toast("⛔ "+v.bloqueo.replace(/<[^>]+>/g,""),7000); return; } }
  const gm=document.getElementById("el-gm").value,gy=parseInt(document.getElementById("el-gy").value);
  const sm=document.getElementById("el-sm").value,sy=parseInt(document.getElementById("el-sy").value);
  // Preservar estado 'paid' Y 'aplazada' por mes-año al reconstruir
  const prev={};
  l.pays.forEach(p=>{prev[p.m+"-"+p.y]={paid:!!p.paid,aplazada:!!p.aplazada,fecha:p.fecha};}); // v45.37: también la fecha del cobro
  const pays=[];let mi=MONTHS.indexOf(sm),yr=sy;
  for(let i=0;i<nn;i++){
    const k=MONTHS[mi]+"-"+yr;
    const st=prev[k]||{};
    pays.push({m:MONTHS[mi],y:yr,paid:!!st.paid,...(st.aplazada?{aplazada:true}:{}),...(st.paid&&st.fecha?{fecha:st.fecha}:{})});
    mi++;if(mi>=12){mi=0;yr++;}
  }
  l.capital=cap;l.gMonth=gm;l.gYear=gy;l.pays=pays;
  // Recalcular respetando cuotas aplazadas (no reparte parejo si hay aplazadas)
  recalcularApoyo(l);
  closeModal();save();toast("Ayuda actualizada ✓");render();
}
const SIM_MAX_AYUDA=REGLAS.SIMULADOR_MAX_AYUDA; // js/maestro.js: la barra del simulador guiado llega al tope AY-5 (2.000 €)
// ══ v46.56 · SIMULADOR GUIADO (Maestro v18.82 · AY-10; diseño «Simulador guiado» del lienzo de Ángel, 17/11/2026) ══
// Arriba «Lo que puedes pedir hoy» (plegable). Debajo: 1. permanencia, 2. aporte (50 / 100 €), el cuadro verde con lo
// que podría pedir y en cuántas cuotas, «Para conseguirlo» (en la app de asociados con los botones «Quiero…», que son
// peticiones al coordinador) y 3. «¿Necesitas otra cantidad?» con los caminos para llegar. A los terceros: «Sin
// asociarme» (una sola ayuda, hasta 500 €). Mismas reglas que todo lo demás: limiteAyudaCon y cuotasMaxCon (js/reglas.js).
function _simgFuera(m){ return m.type==="tercero"||m.type==="libre"; } // v46.58: sin permanencia de asociado (tercero o Asociado Libre)
function _simgHoy(m){ const t=_simgFuera(m); return {p:t?"T":(m.ciclo!=null?m.ciclo:12), a:t?0:(aporteQueCuenta(m)>=REGLAS.APORTE_ALTO?100:50)}; }
function _simgLim(p,a,m){ const L=p==="T"?REGLAS.AYUDA_MAX_CORTA:limiteAyudaCon(p,a); // v46.65 (Maestro v18.87): menos el capital pendiente (asociado o Asociado Libre)
  if(!m||(m.type!=="asociado"&&m.type!=="libre")||!ayPendienteAplica(_idxMes(DATA.reportMonth,DATA.reportYear)))return L;
  return Math.max(0,_r2(L-capitalPendienteDe(m))); }
function _simgK(m,p,a){ // cuotas máximas; con su permanencia, nunca después de su último mes (AY-1)
  if(p==="T")return REGLAS.CUOTAS_MAX_CORTA;
  let k=cuotasMaxCon(p,a);
  if(p!==0&&!_simgFuera(m)&&m.joinMonth){ const ini=_idxMes(DATA.reportMonth,DATA.reportYear)+1; k=Math.min(k,Math.max(0,_finCon(m,p)-ini+1)); }
  return k;
}
function _simgPerms(m){ return _simgFuera(m)?[12,24,36,"T"]:_simPermOpciones(m); }
function _simgInit(m){
  if(SIM.p!==undefined&&(SIM.p==="T"?_simgFuera(m):_simgPerms(m).indexOf(SIM.p)>=0))return;
  const H=_simgHoy(m), L=_simgLim(H.p,H.a,m), k=_simgK(m,H.p,H.a);
  // v46.58: el paso 3 arranca en lo que puede pedir hoy, con sus cuotas máximas (antes 500 € y 5 cuotas)
  SIM.p=H.p; SIM.a=H.a||50; SIM.cap=_simgTercYa(m)?limiteAyudaCon(12,REGLAS.APORTE_MINIMO):L; SIM.n=Math.max(1,k||1);
}
function _simgTercYa(m){ return m.type==="tercero"&&terceroYaTuvoSuAyuda(m); } // AY-8: ya recibió su ayuda como tercero
function _simgCuota(cap,n){ return Math.max(...ayudaCuotas(cap,n,DATA.rate).cuotas); }
function _simgPermTxt(p,m){ return p==="T"?(m&&m.type==="libre"?"Como ahora":"Sin asociarme"):p===0?"Indefinida":p+" meses"; }
function simgElige(o){ // botones del simulador: permanencia, aporte, cantidad, caminos
  if(!SIM)return; const m=DATA.members.find(x=>x.id===SIM.mid); if(!m)return;
  if(o.p!==undefined)SIM.p=o.p; if(o.a!==undefined)SIM.a=o.a;
  if(o.cap!==undefined){ SIM.cap=o.cap; SIM.tocCap=true; SIM.tocN=true; }
  const k=Math.max(1,_simgK(m,SIM.p,SIM.p==="T"?0:SIM.a));
  SIM.n=Math.max(1,Math.min(o.cap!==undefined||o.max?k:SIM.n,k));
  simPintar(); _simgAnunciar(_simgResumen(m));
}
function simgCuotas(d){ if(!SIM)return; const m=DATA.members.find(x=>x.id===SIM.mid); if(!m)return;
  const k=Math.max(1,_simgK(m,SIM.p,SIM.p==="T"?0:SIM.a)); SIM.n=Math.max(1,Math.min(k,SIM.n+d)); SIM.tocN=true; simPintar(); _simgAnunciar(_simgResumen(m)); }
function simgBarra(v){ // la barra: solo se repinta la parte de abajo (si se repintara la barra, se cortaría el gesto)
  if(!SIM)return; const m=DATA.members.find(x=>x.id===SIM.mid); if(!m)return;
  SIM.cap=+v; SIM.tocCap=true; SIM.tocN=true; SIM.n=Math.max(1,_simgK(m,SIM.p,SIM.p==="T"?0:SIM.a));
  _simgRefrescarAbajo(m,"barra");
}
// v46.59 (Ángel 18/11/2026 20:08): cantidad exacta. Campo con teclado numérico y − / + de 50 en 50, junto a la barra y los
// botones rápidos. Mientras se escribe solo se repinta la parte de abajo (si se repintara el campo, se perdería el teclado).
function _simgRefrescarAbajo(m,desde){
  const el=document.getElementById("simg-abajo"); if(el)el.innerHTML=_simgAbajoHTML(m);
  const t=document.getElementById("simg-cap-in"); if(t&&desde!=="campo")t.value=SIM.cap;
  const r=document.getElementById("simg-rango"); if(r&&desde!=="barra")r.value=Math.min(SIM.cap,SIM_MAX_AYUDA);
  if(typeof nhaPedirActualizar==="function")nhaPedirActualizar();
  _simgAnunciar(_simgResumen(m));
}
function simgEscribe(v){
  if(!SIM)return; const m=DATA.members.find(x=>x.id===SIM.mid); if(!m)return;
  const n=parseInt(String(v).replace(/[^0-9]/g,""),10); if(!(n>=0))return;
  SIM.cap=Math.min(n,99950); SIM.tocCap=true; SIM.tocN=true; SIM.n=Math.max(1,_simgK(m,SIM.p,SIM.p==="T"?0:SIM.a));
  _simgRefrescarAbajo(m,"campo");
}
function simgFijaCampo(){ // al salir del campo: nunca por debajo del mínimo (AY-1)
  if(!SIM)return; const m=DATA.members.find(x=>x.id===SIM.mid); if(!m)return;
  if(!(SIM.cap>=REGLAS.AYUDA_MIN)){ SIM.cap=REGLAS.AYUDA_MIN; _simgRefrescarAbajo(m); }
}
function simgPaso(d){ // − / + de 50 en 50 (desde una cantidad suelta, al múltiplo de 50 de al lado)
  if(!SIM)return; const m=DATA.members.find(x=>x.id===SIM.mid); if(!m)return;
  const c=SIM.cap, nv=d>0?Math.floor(c/50)*50+50:Math.ceil(c/50)*50-50;
  SIM.cap=Math.max(REGLAS.AYUDA_MIN,Math.min(nv,99950)); SIM.tocCap=true; SIM.tocN=true; SIM.n=Math.max(1,_simgK(m,SIM.p,SIM.p==="T"?0:SIM.a));
  _simgRefrescarAbajo(m);
}
// v46.59: el resultado se anuncia al lector de pantalla (VoiceOver) en una zona aria-live que no se repinta
function _simgAnunciar(txt){
  try{ let z=document.getElementById("nh-anuncio");
    if(!z){ z=document.createElement("div"); z.id="nh-anuncio"; z.setAttribute("aria-live","polite"); z.setAttribute("role","status");
      z.style.cssText="position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0"; document.body.appendChild(z); }
    z.textContent=""; setTimeout(()=>{ z.textContent=txt||""; },60);
  }catch(e){}
}
function _simgCaminos(m,cap){ // los caminos para llegar a una cantidad que no cabe
  const p=SIM.p, a=p==="T"?0:SIM.a, cam=[], A=REGLAS.APORTE_ALTO, can=(P,AA)=>_simgLim(P,AA,m)>=cap&&_simgK(m,P,AA)>=1;
  if(p==="T"){ const f=[[12,50],[24,50],[12,A],[36,50],[24,A],[36,A]].find(([P,AA])=>can(P,AA));
    if(f)cam.push({t:`${m.type==="libre"?"Pasar a asociado":"Asociarme"} con ${f[0]} meses y ${f[1]} € al mes`,o:`{p:${f[0]},a:${f[1]},max:true}`}); }
  else{ const P=[24,36].find(x=>(p!==0&&x>p)&&can(x,a));
    if(P)cam.push({t:`Ampliar mi permanencia a ${P} meses`,o:`{p:${P},max:true}`});
    if(a<A&&can(p,A))cam.push({t:`Aumentar mi aporte a ${A} € al mes`,o:`{a:${A},max:true}`});
    if(!cam.length){ const Q=[24,36].find(x=>(p===0?false:x>=p)&&can(x,A)); if(Q)cam.push({t:`Ampliar a ${Q} meses y aportar ${A} € al mes`,o:`{p:${Q},a:${A},max:true}`}); } }
  return cam;
}
function _simgResumen(m){ // lo que dice el lector de pantalla tras cada cambio
  const p=SIM.p, a=p==="T"?0:SIM.a, L=_simgLim(p,a,m), k=_simgK(m,p,a), cap=SIM.cap;
  if(cap<REGLAS.AYUDA_MIN)return `El mínimo de una ayuda es ${REGLAS.AYUDA_MIN} euros.`;
  if(cap<=L&&k>=1&&!(p==="T"&&_simgTercYa(m))){ const n=Math.max(1,Math.min(SIM.n,k));
    return `Recibes ${fmtEur(cap)} euros. Pagas ${n} ${n===1?"cuota":"cuotas"} de ${fmtEur(_simgCuota(cap,n))} euros.`+(cap>REGLAS.AYUDA_MAX_SIN_APROBACION||n>REGLAS.CUOTAS_SIN_APROBACION?" Esta ayuda la revisa antes el coordinador.":""); }
  const cam=_simgCaminos(m,cap);
  return cam.length?`Para ${fmtEur(cap)} euros puedes: ${cam.map(c=>c.t).join("; ")}.`:`${fmtEur(cap)} euros no caben. El tope de una ayuda es ${_miles(REGLAS.AYUDA_MAX)} euros.`;
}
function _simgResumenHoy(m){ // el cuadro «Puedes pedir hoy», al abrirlo
  const H=_simgHoy(m), hL=_simgLim(H.p,H.a,m), hK=_simgK(m,H.p,H.a);
  if(m.type==="tercero"&&terceroYaTuvoSuAyuda(m))return "Ya recibiste tu ayuda como tercero. Para la siguiente, asóciate.";
  return `Puedes pedir hasta ${fmtEur(hL)} euros`+(hK>=1?`, en hasta ${hK} ${hK===1?"cuota":"cuotas"} de ${fmtEur(_simgCuota(hL,hK))} euros al mes. Terminas de pagar en ${_txtIdx(_idxMes(DATA.reportMonth,DATA.reportYear)+hK)}.`:". Tu permanencia ya termina.");
}
function simgHoyToque(){
  DESP["simg-hoy"]=!DESP["simg-hoy"]; simPintar();
  if(DESP["simg-hoy"]){ const m=DATA.members.find(x=>x.id===SIM.mid); if(m)_simgAnunciar(_simgResumenHoy(m)); }
}
const _simgBox=(sel,fs)=>`flex:1;min-width:0;min-height:58px;border-radius:12px;border:2px solid ${sel?"#1B4332;background:#1B4332;color:#fff":"#D5D0C8;background:#fff;color:#1A1A1A"};font-size:${fs||15}px;font-weight:800;cursor:pointer;padding:4px 2px;line-height:1.2`;
function _simgAbajoHTML(m){ // chips de cantidad + cuotas, o los caminos para llegar
  const p=SIM.p, a=p==="T"?0:SIM.a, L=_simgLim(p,a,m), k=_simgK(m,p,a), cap=SIM.cap, cabe=cap<=L&&k>=1&&!(p==="T"&&_simgTercYa(m));
  const chip=v=>`<button onclick="simgElige({cap:${v}})" aria-pressed="${v===cap}" style="flex:1 1 72px;white-space:nowrap;min-height:48px;border-radius:10px;border:2px solid ${v===cap?"#1B4332;background:#1B4332;color:#fff":"#D5D0C8;background:#fff;color:#1A1A1A"};font-size:15px;font-weight:800;cursor:pointer">${_miles(v)}&nbsp;€</button>`;
  let h=`<div style="display:flex;flex-wrap:wrap;gap:6px">${[300,500,700,1000,1500,2000].filter(v=>v<=SIM_MAX_AYUDA).map(chip).join("")}</div>`;
  if(cap<REGLAS.AYUDA_MIN)return h+`<div style="background:#EDF5EF;border-radius:12px;padding:12px;margin-top:12px;font-size:15px;color:#1B4332">El mínimo de una ayuda es ${REGLAS.AYUDA_MIN}&nbsp;€.</div>`; // v46.59
  if(cabe){ const n=Math.max(1,Math.min(SIM.n,k)), bt=`width:48px;height:48px;border-radius:24px;border:2px solid #1B4332;background:#fff;color:#1B4332;font-size:20px;font-weight:800;cursor:pointer`;
    h+=`<div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:6px 10px;margin-top:12px"><span style="font-size:15px">¿En cuántas cuotas?</span>
        <div style="display:flex;align-items:center;gap:10px"><button onclick="simgCuotas(-1)" style="${bt}" aria-label="Menos cuotas">−</button><b id="simg-n" style="font-size:20px;min-width:24px;text-align:center">${n}</b><button onclick="simgCuotas(1)" style="${bt}" aria-label="Más cuotas">+</button></div></div>
      <div style="background:#EDF5EF;border-radius:12px;padding:12px;margin-top:10px">
        <div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:2px 8px;font-size:16px;padding:3px 0"><span>Recibes</span><b style="margin-left:auto;white-space:nowrap">${fmtEur(cap)}&nbsp;€</b></div>
        <div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:2px 8px;font-size:16px;padding:3px 0"><span>Pagas</span><b style="text-align:right;margin-left:auto">${n} ${n===1?"cuota":"cuotas"} de <span style="white-space:nowrap">${fmtEur(_simgCuota(cap,n))}&nbsp;€</span></b></div>
        ${cap>REGLAS.AYUDA_MAX_SIN_APROBACION||n>REGLAS.CUOTAS_SIN_APROBACION?`<div style="font-size:14px;color:#2D6A4F;margin-top:6px">Esta ayuda la revisa antes el coordinador.</div>`:""}</div>`; // v46.58: AY-5
    return h; }
  const cam=_simgCaminos(m,cap); // v46.59: los mismos caminos para la pantalla y el lector de pantalla
  h+=`<div style="background:#EDF5EF;border-radius:12px;padding:12px;margin-top:12px"><div style="font-size:16px;font-weight:800;color:#1B4332;margin-bottom:8px">${cam.length?`Para ${fmtEur(cap)} € puedes:`:`${fmtEur(cap)} € no caben${k<1?": tu permanencia termina antes de la primera cuota":""}`}</div>
    ${cam.map(c=>`<button onclick="simgElige(${c.o})" style="width:100%;min-height:50px;border:2px solid #1B4332;border-radius:12px;background:#fff;color:#1B4332;font-size:15px;font-weight:800;text-align:left;padding:8px 12px;margin-bottom:8px;cursor:pointer">${c.t}</button>`).join("")}
    <div style="font-size:13px;color:#5F5A55">${cam.length?"Tócalo y arriba verás cómo queda.":`Prueba con menos cantidad. El tope de una ayuda es ${_miles(REGLAS.AYUDA_MAX)} €.`}</div></div>`;
  return h;
}
// v46.56 (Ángel 18/11/2026): cuotas recortadas por el final de la permanencia, dicho en positivo. Con 12 o 24 meses,
// cuántas cuotas tendría ampliándola al siguiente paso (mismo aporte); con 36 o indefinida, solo la primera frase.
function _simgAvisoFinHTML(m,p,a,k){
  let t=`Tus cuotas terminan con tu permanencia, en ${_txtIdx(_finCon(m,p))}.`;
  const sig=p===12?24:p===24?36:null;
  if(sig){ const k2=_simgK(m,sig,a); if(k2>k)t+=` Si la amplías a ${sig} meses, puedes tener hasta ${k2} ${k2===1?"cuota":"cuotas"}.`; }
  return `<div style="font-size:13.5px;opacity:.9;margin-top:6px">${t}</div>`;
}
function simGuiadoHTML(m){
  _simgInit(m);
  const R=REGLAS, H=_simgHoy(m), esT=m.type==="tercero", esL=m.type==="libre", fuera=esT||esL, p=SIM.p, a=p==="T"?0:SIM.a;
  const L=_simgLim(p,a,m), k=_simgK(m,p,a), hL=_simgLim(H.p,H.a,m), hK=_simgK(m,H.p,H.a), ab=!!DESP["simg-hoy"];
  const yaTuvo=esT&&terceroYaTuvoSuAyuda(m);
  const asoc=!!window.NH_APP_ASOCIADOS&&typeof nhaCamPedir==="function"&&!fuera; // los «Quiero…», solo en la app de asociados
  // Lo que puedes pedir hoy
  // v46.59 (Ángel 18/11, 20:01 y 20:03): cada dato debajo de su nombre y cajas que bajan de línea si no caben (letra grande, pantallas estrechas)
  const caja=(t,v,larga)=>`<div style="flex:1 1 130px;min-width:0;background:#F5F0EB;border-radius:10px;padding:10px"><div style="font-size:12.5px;color:#5F5A55">${t}</div><b style="display:block;font-size:16px;${larga?"overflow-wrap:anywhere":"white-space:nowrap"}">${v}</b></div>`;
  const dato=(t,v)=>`<div style="flex:1 1 100%;min-width:0"><div style="font-size:13px;color:#2D6A4F">${t}</div><b style="display:block;font-size:16px;overflow-wrap:anywhere">${v}</b></div>`;
  let h=`<div style="background:#fff;border-radius:16px;border-left:6px solid #2D6A4F;box-shadow:0 2px 6px rgba(0,0,0,.08);overflow:hidden;margin-bottom:14px">
    <button onclick="simgHoyToque()" aria-expanded="${ab}" style="width:100%;border:none;background:#fff;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;text-align:left;cursor:pointer;color:inherit">
      <span><span style="display:block;font-size:12.5px;font-weight:700;color:#2D6A4F;letter-spacing:.3px">${yaTuvo?"TU PRÓXIMA AYUDA, COMO ASOCIADO":"PUEDES PEDIR HOY"}</span>
      <span style="display:block;font-size:clamp(21px,6.5vw,26px);font-weight:800;color:#1B4332">${yaTuvo?`Desde ${fmtEur(limiteAyudaCon(12,R.APORTE_MINIMO))} €`:`Hasta ${fmtEur(hL)} €`}</span></span>
      <span style="width:34px;height:34px;border-radius:17px;background:#EDF5EF;color:#1B4332;font-size:16px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0">${ab?"▲":"▼"}</span></button>`;
  if(ab){
    h+=`<div style="padding:0 16px 16px">${yaTuvo?"":`<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px">${fuera?caja("Cómo pides",esL?"Como Asociado Libre":"Con aval, sin asociarte",true):caja("Permanencia",H.p===0?"Indefinida":H.p+" meses")+caja("Aporte",(H.a>=R.APORTE_ALTO?aporteQueCuenta(m):R.APORTE_MINIMO)+" € al mes")}</div>`}`;
    if(yaTuvo)h+=`<div style="background:#EDF5EF;border-radius:10px;padding:10px 12px;font-size:15px;line-height:1.45">Ya recibiste tu ayuda como tercero. Para la siguiente, asóciate.</div>`;
    else h+=`<div style="background:#EDF5EF;border-radius:10px;padding:10px 12px"><div style="display:flex;flex-wrap:wrap;gap:10px 14px">${dato("Puedes pedir","hasta "+fmtEur(hL)+"&nbsp;€")}${hK>=1?dato("Cuotas","hasta "+hK)+dato("Cada cuota",fmtEur(_simgCuota(hL,hK))+"&nbsp;€ al mes"):dato("Cuotas","tu permanencia ya termina")}</div>${hK>=1?`<div style="font-size:13.5px;color:#2D6A4F;margin-top:8px">Terminas de pagar en ${_txtIdx(_idxMes(DATA.reportMonth,DATA.reportYear)+hK)}</div>`:""}</div>`;
    if(!fuera&&aporteAltoPendiente(m))h+=`<div style="font-size:13.5px;color:#7A5300;margin-top:8px">Tu aporte de ${aporteHabitualDe(m)} € cuenta desde que pagues tu primer mes a ${R.APORTE_ALTO} €.</div>`;
    { const pd=!esT&&ayPendienteAplica(_idxMes(DATA.reportMonth,DATA.reportYear))?capitalPendienteDe(m):0; // v46.65 (Maestro v18.87)
      if(pd>0)h+=`<div style="font-size:13.5px;color:#7A5300;margin-top:8px">Te quedan ${fmtEur(pd)}&nbsp;€ por devolver de tus ayudas y solicitudes: ya están restados de lo que puedes pedir.</div>`; }
    if(!yaTuvo)h+=`<div style="font-size:13.5px;color:#2D6A4F;margin-top:8px">¿Quieres pedir más o menos, o en otras cuotas? Pruébalo en el simulador de abajo.</div>`;
    h+=`</div>`;
  }
  h+=`</div><div style="font-size:clamp(21px,6.5vw,26px);font-weight:800;font-family:Georgia,serif;color:#1B4332;margin-bottom:10px">Simular una ayuda</div>
    <div style="font-size:16px;font-weight:700;margin-bottom:8px"><span style="color:#2D6A4F">1.</span> Con permanencia de</div>
    <div style="display:flex;gap:8px">${_simgPerms(m).map(v=>`<button onclick="simgElige({p:${v==="T"?"'T'":v}})" style="${_simgBox(p===v,_simgPerms(m).length>3?13:15)}${v==="T"?";flex:1.35":""}">${v==="T"?(esL?"Como<br>ahora":"Sin<br>asociarme"):_simgPermTxt(v)}</button>`).join("")}</div>`;
  if(p!=="T")h+=`<div style="font-size:16px;font-weight:700;margin:12px 0 8px"><span style="color:#2D6A4F">2.</span> Con aporte de</div>
    <div style="display:flex;gap:8px">${[R.APORTE_MINIMO,R.APORTE_ALTO].map(v=>`<button onclick="simgElige({a:${v}})" style="${_simgBox(SIM.a===v,22)}">${v} €</button>`).join("")}</div>`;
  // Cuadro verde
  h+=`<div style="background:#1B4332;color:#fff;border-radius:16px;padding:18px;margin-top:14px">`+(p==="T"&&yaTuvo
    ?`<div style="font-size:17px;font-weight:700;line-height:1.45">Ya recibiste tu ayuda como tercero. Para la siguiente, asóciate.</div>`
    :k>=1&&p===H.p&&(p==="T"||SIM.a===H.a) // v46.58: con su permanencia y su aporte, no repite la cifra de «Lo que puedes pedir hoy»
    ?`<div style="font-size:17px;font-weight:700;line-height:1.45">Cambia la permanencia o el aporte y mira hasta dónde llegas.</div>`
    :k>=1
    ?`<div style="font-size:15px">Podrías pedir hasta</div><div style="font-size:clamp(28px,9vw,38px);font-weight:800;line-height:1.15">${fmtEur(L)} €</div>
      <div style="font-size:16px">y tienes hasta <b>${k} ${k===1?"cuota":"cuotas"}</b> para devolverlo</div>
      <div style="font-size:15px;opacity:.9">(${k} ${k===1?"cuota":"cuotas"} de ${fmtEur(_simgCuota(L,k))} € al mes)</div>${k<cuotasMaxCon(p,a)&&p!=="T"?_simgAvisoFinHTML(m,p,a,k):""}`
    :`<div style="font-size:16px;line-height:1.45">Con esta permanencia ya no da tiempo a devolver una ayuda antes de que termine. Amplíala para poder pedir.</div>`)+`</div>`;
  // Para conseguirlo
  const pasos=[], pedir=[];
  if(p==="T"){ if(!yaTuvo)h+=`<div style="background:#fff;border:2px solid #1B4332;border-radius:14px;padding:14px;margin-top:14px;font-size:16px;font-weight:800;color:#1B4332">${esL?`Como Asociado Libre puedes pedir hasta ${R.AYUDA_MAX_CORTA} €, en hasta ${R.CUOTAS_MAX_CORTA} cuotas, cada vez que lo necesites.`:`Sin asociarte puedes pedir una sola ayuda, de hasta ${R.AYUDA_MAX_CORTA} €.`}</div>`; }
  else{
    if(fuera)pasos.push({t:`${esL?"Pasar a asociado":"Asociarte"} con ${p} meses y ${SIM.a} € al mes`,d:esL?"Tu aporte gana más beneficio cada mes.":"Tu aporte gana beneficio cada mes."});
    else{
      if(p!==H.p&&H.p!==0&&p>H.p){ pasos.push({t:`Ampliar tu permanencia a ${p} meses`,d:`Desde el mes ${H.p===12?13:25}, tu beneficio sube.`}); pedir.push({tipo:"perm",v:p,t:`Quiero ampliar a ${p} meses`}); }
      if(SIM.a>H.a){ pasos.push({t:`Aportar ${SIM.a} € al mes`,d:aporteAltoPendiente(m)?`Ya lo tienes pedido: cuenta desde que pagues tu primer mes a ${SIM.a} €.`:"Tu beneficio de cada mes es el doble."}); if(!aporteAltoPendiente(m))pedir.push({tipo:"aporte",v:SIM.a,t:`Quiero aportar ${SIM.a} € al mes`}); }
    }
    if(pasos.length){
      h+=`<div style="background:#fff;border:2px solid #1B4332;border-radius:14px;padding:14px;margin-top:14px"><div style="font-size:16px;font-weight:800;color:#1B4332;margin-bottom:10px">Para conseguirlo:</div>
        ${pasos.map(x=>`<div style="display:flex;gap:10px;align-items:flex-start;margin-bottom:10px"><span style="margin-top:6px;width:10px;height:10px;border-radius:5px;background:#1B4332;flex-shrink:0"></span><div><b style="font-size:15px">${x.t}</b><div style="font-size:14px;color:#2D6A4F">${x.d}</div></div></div>`).join("")}
        ${asoc?pedir.map(b=>nhaQuieroHTML(m,b)).join("")+`<div style="font-size:13.5px;color:#5F5A55;margin-top:4px">Es una petición: no cambia nada hasta que el coordinador la apruebe.</div>`:""}</div>`;
    }
  }
  // 3. ¿Necesitas otra cantidad?
  SIM.cap=Math.min(Math.max(R.AYUDA_MIN,SIM.cap),99950); // v46.59: se puede escribir más del tope; entonces sale «no caben»
  h+=`<div style="background:#fff;border-radius:16px;padding:16px;margin-top:14px;border:1px solid #EFEAE0">
    <div style="font-size:17px;font-weight:800;margin-bottom:10px"><span style="color:#2D6A4F">3.</span> ¿Necesitas otra cantidad?</div>
    <label for="simg-cap-in" style="display:block;font-size:15px;margin-bottom:6px">Cantidad</label>
    <div style="display:flex;align-items:center;gap:4px">
      <button onclick="simgPaso(-1)" aria-label="50 euros menos" style="width:48px;height:48px;border-radius:24px;border:2px solid #1B4332;background:#fff;color:#1B4332;font-size:22px;font-weight:800;cursor:pointer;flex:none">−</button>
      <span style="flex:1 1 auto;min-width:0;display:flex;align-items:center;justify-content:center;gap:2px;border:2px solid #1B4332;border-radius:12px;padding:0 6px;min-height:48px;background:#fff">
        <input id="simg-cap-in" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" value="${SIM.cap}" oninput="simgEscribe(this.value)" onchange="simgFijaCampo()" onblur="simgFijaCampo()" style="flex:1 1 auto;width:100%;min-width:2.5em;max-width:6em;border:none;background:transparent;font-size:clamp(15px,5vw,24px);font-weight:800;color:#1B4332;text-align:right;padding:0;font-family:inherit">
        <b style="font-size:clamp(15px,5vw,24px);color:#1B4332;flex:none">€</b></span>
      <button onclick="simgPaso(1)" aria-label="50 euros más" style="width:48px;height:48px;border-radius:24px;border:2px solid #1B4332;background:#fff;color:#1B4332;font-size:22px;font-weight:800;cursor:pointer;flex:none">+</button></div>
    <input id="simg-rango" type="range" min="${R.AYUDA_MIN}" max="${SIM_MAX_AYUDA}" step="50" value="${Math.min(SIM.cap,SIM_MAX_AYUDA)}" oninput="simgBarra(this.value)" aria-label="Cantidad" class="sim-range" style="width:100%;accent-color:#1B4332;margin:10px 0 10px">
    <div id="simg-abajo">${_simgAbajoHTML(m)}</div></div>`;
  return h;
}

// v46.39 (Ángel 12/11/2026): «Si sales hoy», UN solo cálculo (salidaV18, Maestro SA) y un solo cuadro para el simulador,
// Preguntas frecuentes y «Mis aportes y beneficios» de la app de asociados. Enseña también el beneficio que dejaría
// y cuántos aportes le faltan para no perderlo (completar el bloque de 12 o llegar al final de su permanencia).
function siSalesHoyHTML(m){
  const rep=_idxMes(DATA.reportMonth,DATA.reportYear), s=salidaV18(m,rep); if(!(s.capital>0))return "";
  const fila=(l,v,o={})=>`<div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:baseline;gap:2px 10px;font-size:${o.big?15.5:13.5}px;padding:${o.big?"6px 0 0":"2px 0"};${o.top?"border-top:1px solid #E3DDD2;margin-top:6px;":""}"><span style="${o.big?"font-weight:800;color:#1B4332":"color:#4A4A4A"}">${l}</span><b style="white-space:nowrap;${o.color?`color:${o.color}`:""};font-size:${o.big?18:13.5}px">${v}</b></div>`;
  const fin=finPermanenciaIdx(m); let x=0;
  if(s.perdido>0){ const b=12-(s.nPagados%12), f=(fin!=null&&fin>=rep)?fin-rep+(_aportePagadoKey(m,_keyDeIdx(rep))?0:1):Infinity; x=Math.min(b,f); if(!isFinite(x))x=0; }
  return `<div style="border:1.5px dashed #B5A88F;border-radius:14px;padding:12px 14px;margin-bottom:10px;background:#FAF8F3;text-align:left">
      <div style="font-size:15px;font-weight:800;color:#5C5242">Si sales hoy</div>
      <div style="font-size:12.5px;color:var(--muted);margin:2px 0 6px">Con tu último aporte en ${_txtIdx(rep)}</div>
      ${fila(`Tus aportes (${s.nPagados} ${s.nPagados===1?"mes":"meses"})`,fmtEur(s.capital)+" €")}
      ${s.aPagar?fila("Beneficio que ya es tuyo","+"+fmtEur(s.aPagar)+" €",{color:"#2D6A4F"}):""}
      ${s.ayuda&&s.ayuda.importe?fila("Lo que te queda de tu ayuda","−"+fmtEur(s.ayuda.importe)+" €",{color:"#A63A20"}):""}
      ${s.total>=0?fila("Recibirías",fmtEur(s.total)+" €",{big:true,top:true}):fila("Tendrías que pagar",fmtEur(-s.total)+" €",{big:true,top:true,color:"#A63A20"})}
      ${s.perdido>0?`<div style="margin-top:8px;padding:8px 10px;border-radius:10px;background:#EEF7F1;font-size:13px;line-height:1.4;color:#1B4332">${x>0?`<b>Te ${x===1?"falta":"faltan"} ${x} ${x===1?"aporte":"aportes"} para sumar ${fmtEur(s.perdido)} € de beneficio.</b>`:`<b>Tienes ${fmtEur(s.perdido)} € de beneficio de un tramo que aún no has completado.</b>`} Si sales antes, no se suman.</div>`:""}
      <div style="font-size:12.5px;color:var(--muted);margin-top:8px">Para salir hay que avisar con ${REGLAS.AVISO_MESES} mes de antelación, hasta el día ${REGLAS.AVISO_DIA_CORTE}.</div>
    </div>`;
}
function abrirSimulador(mid,tab){
  const m=DATA.members.find(x=>x.id===mid); if(!m)return;
  SIM={mid,tab:m.type==="tercero"?"ayuda":(tab||"ayuda"),ciclo:(m.ciclo!=null?m.ciclo:12),cap:500,n:Math.max(1,Math.min(5,m.type==="tercero"?REGLAS.CUOTAS_MAX_CORTA:_simMaxCuotas(m))),ap:50};
  openModal('sim',{mid,yScroll:window.scrollY||0});
  // v46.68: una entrada en el historial, para que «atrás» (gesto o botón del iPhone) cierre el simulador y no salga de la app
  // La app NUNCA llama a history.back(): uno de más (abrir y cerrar seguidos, o tras recargar) sacaría de la app. Si se cierra
  // con «← Volver» o tocando fuera, la entrada se queda y se reutiliza la próxima vez (pulsar «atrás» entonces no hace nada).
  try{ if(!(history.state&&history.state.nhSim))history.pushState({nhSim:1},""); }catch(e){}
}
// v46.68 (Ángel 26/11/2026): «← Volver» arriba del simulador. Deja donde estabas (la ficha o la lista de la que venías,
// o el formulario de la ayuda si se abrió desde ahí) y quita la entrada del historial que puso abrirSimulador.
function _simDejar(){ const v=MODAL&&MODAL.volver, y=MODAL&&MODAL.yScroll; if(v)volverAAyuda(v); else { MODAL=null; render(); if(y!=null)window.scrollTo(0,y); } }
function simVolver(){ _simDejar(); }
function simAtrasNavegador(){ if(MODAL&&MODAL.type==="sim")_simDejar(); }
// v45.53 (decisión de Ángel 25/10/2026): el simulador ya no ofrece la permanencia indefinida (llega hasta 36 meses);
// quien ya la tiene la sigue viendo como la suya.
function _simPermOpciones(m){ const c=(m.ciclo!=null?m.ciclo:12); return PERM_OPCIONES.filter(v=>c===0?v===0:(v!==0&&v>=c)); }
// Límites de la ayuda con la permanencia simulada. ini = mes de la 1.ª cuota (el siguiente al actual).
function _simLimitesAyuda(m,ciclo){
  const rep=_idxMes(DATA.reportMonth,DATA.reportYear), ini=rep+1;
  let maxCap=limiteAyudaNuevaDe(m,ciclo), maxN=cuotasMaxDe(m,ciclo), porFin=false; // v46.56: AY-10 · v46.65: menos lo pendiente
  if(ciclo!==0&&m.joinMonth){ const fin=_finCon(m,ciclo)+1; const k=fin-ini+1; if(k<maxN){maxN=Math.max(0,k);porFin=true;} }
  return {ini,maxCap,maxN,porFin};
}
function simuladorHTML(){
  const m=DATA.members.find(x=>x.id===MODAL.mid); if(!m||!SIM)return "";
  const tabBtn=(id,t)=>`<button onclick="SIM.tab='${id}';render()" style="flex:1;padding:10px;border:none;border-radius:10px;font-size:14px;font-weight:800;cursor:pointer;background:${SIM.tab===id?"#1B4332":"transparent"};color:${SIM.tab===id?"#fff":"var(--muted)"}">${t}</button>`;
  const chip=(sel,v,txt,fn)=>`<button onclick="${fn}" style="flex:1;min-width:0;padding:10px 4px;border-radius:10px;border:1.5px solid ${sel?"#1B4332":"#E3DDD2"};background:${sel?"#1B4332":"#fff"};color:${sel?"#fff":"#3B3B3B"};font-size:13.5px;font-weight:700;cursor:pointer">${txt}</button>`;
  const perm=_simPermOpciones(m);
  if(perm.indexOf(SIM.ciclo)<0)SIM.ciclo=perm[0];
  let h=`<button class="sim-volver" onclick="simVolver()" aria-label="Volver a la pantalla anterior">← Volver</button>
    <div class="modal-title">🧮 Simulador — ${escH(m.name.split(" ")[0])}</div>
    ${m.type==="tercero"?`<div></div>`:`<div style="display:flex;gap:4px;background:#EFEAE0;border-radius:12px;padding:4px;margin-bottom:14px">${tabBtn("ayuda","Ayuda")}${tabBtn("ben","Beneficio")}</div>`}`;
  if(m.type==="tercero")SIM.tab="ayuda"; // v46.56: un tercero solo simula su ayuda (y lo que podría asociándose)
  if(SIM.tab==="ben")return h+`<div id="sim-res">${simBenResHTML(m)}</div>
    <div style="font-size:11.5px;color:var(--muted);margin-top:12px;line-height:1.4">Es solo una simulación: no cambia nada de tu ficha.</div>`;
  // v46.56: la pestaña Ayuda es el simulador guiado (Maestro v18.82 · AY-10)
  if(SIM.tab==="ayuda")h+=`<div id="sim-guiado">${simGuiadoHTML(m)}</div>`;
  const _adm=!READONLY_ID&&!ES_MODO_GRUPO&&!VISTA_ASOC; // v45.28: enviar por WhatsApp solo desde la app del administrador
  return h+`${SIM.tab==="ayuda"?"":`<div id="sim-res">${simBenResHTML(m)}</div>`}
    ${_adm&&SIM.tab==="ayuda"&&m.type!=="tercero"?`<button onclick="simEnviarWA()" style="width:100%;margin-top:12px;padding:12px;border-radius:12px;border:none;background:#25D366;color:#fff;font-size:15px;font-weight:800;cursor:pointer">💬 Enviar por WhatsApp</button>
      <div style="font-size:11.5px;color:var(--muted);margin-top:4px;line-height:1.4">Se envía una imagen con esta ayuda (y, si hace falta, la permanencia que necesita) y un mensaje corto.</div>`:""}
    ${_adm&&MODAL.volver?`<button onclick="simVolver()" style="width:100%;margin-top:8px;padding:10px;border:none;background:transparent;color:var(--muted);font-size:13px;text-decoration:underline;cursor:pointer">← Volver a la ayuda</button>`:""}
    <div style="font-size:11.5px;color:var(--muted);margin-top:12px;line-height:1.4">Es solo una simulación: no cambia nada de tu ficha.</div>`;
}
// ¿Qué permanencia hace falta para esta ayuda? (AY-1 y AY-6). Devuelve la primera que vale, desde la actual.
function _simPermNecesaria(m,cap,n){
  const ini=_idxMes(DATA.reportMonth,DATA.reportYear)+1, cur=(m.ciclo!=null?m.ciclo:12);
  const cand=[cur,24,36].filter((c,i,a)=>a.indexOf(c)===i&&(cur===0?c===0:c>=cur)); // v45.53: sin ofrecer la indefinida
  for(const c of cand){
    if(cap>limiteAyudaNuevaDe(m,c)||n>cuotasMaxDe(m,c))continue; // v46.56: AY-10 (permanencia y aporte que cuenta) · v46.65: menos lo pendiente
    if(c!==0&&m.joinMonth){ const fin=_finCon(m,c); if(ini+n-1>fin)continue; } // v45.7: como máximo en el último mes de permanencia
    return c;
  }
  return null;
}
function simPintar(){
  if(VISTA_ASOC&&!simPintar._dentro){ simPintar._dentro=true; try{ return _conMesAsociados(simPintar); } finally { simPintar._dentro=false; } } // v45.23
  const m=DATA.members.find(x=>x.id===(MODAL&&MODAL.mid)); if(!m||!SIM)return;
  const g=document.getElementById("sim-guiado"); if(g&&SIM.tab==="ayuda"){ g.innerHTML=simGuiadoHTML(m); return; } // v46.56
  const a=document.getElementById("sim-cap-v"), b=document.getElementById("sim-n-v"), r=document.getElementById("sim-res");
  if(a)a.textContent=SIM.tocCap===false?"—":fmtEur(SIM.cap)+" €"; if(b)b.textContent=SIM.tocN===false?"—":SIM.n+" "+(SIM.n===1?"mes":"meses");
  if(r)r.innerHTML=SIM.tab==="ayuda"?simAyudaResHTML(m):simBenResHTML(m);
  const av=document.getElementById("sim-aviso"); if(av&&SIM.tab==="ayuda")av.innerHTML=simAvisoAyudaHTML(m);
}
// v45.7: el aviso va entre la cantidad y la barra, para que se vea al moverla
function _simMaxCuotas(m){ // con su permanencia actual: 5 o 12, y nunca más allá del último mes de permanencia
  const cur=(m.ciclo!=null?m.ciclo:12); let k=cuotasMaxDe(m,cur); // v46.56: AY-10
  if(cur!==0&&m.joinMonth){ const ini=_idxMes(DATA.reportMonth,DATA.reportYear)+1, fin=_finCon(m,cur); k=Math.min(k,fin-ini+1); }
  return k;
}
function simAvisoAyudaHTML(m){
  if(SIM.tocCap===false||SIM.tocN===false)return "";
  const cap=SIM.cap, n=SIM.n, need=_simPermNecesaria(m,cap,n), cur=(m.ciclo!=null?m.ciclo:12), k=_simMaxCuotas(m);
  const lim="hasta "+fmtEur(limiteAyudaNuevaDe(m,cur))+" €"+" en "+k+" "+(k===1?"cuota":"cuotas");
  if(need===cur)return ""; // v45.10: sin cuadro cuando la ayuda cabe (decisión de Ángel 04/10/2026); solo se avisa si hay que ampliar
  return `<div style="margin:2px 0 8px;padding:10px 12px;border-radius:10px;background:#FFF4E5;border:1.5px solid #E0A040;color:#6B4210;font-size:13.5px;line-height:1.5">⚠️ Con tu permanencia de ${_permTxt(cur).toLowerCase()} ${k<1?"ya no da tiempo a devolver una ayuda antes de que termine":"puedes pedir "+lim}.<br><b>Para esta ayuda tienes que ampliar tu permanencia a ${need===0?"indefinida":need===24?"24 meses o más":need+" meses o más"}.</b></div>`;
}
const _simCaja=(t,body)=>`<div style="background:linear-gradient(135deg,#1B4332,#2D6A4F);color:#fff;border-radius:16px;padding:14px 16px;margin-top:6px">${t}${body}</div>`;
const _simFila=(l,v,big)=>`<div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:baseline;gap:2px 10px;padding:4px 0"><span style="font-size:13.5px;opacity:.85">${l}</span><b style="font-size:${big?20:15}px;white-space:nowrap">${v}</b></div>`;
function simAyudaResHTML(m){
  // v45.55: en la app de asociados el simulador empieza sin cifras (tocCap/tocN = false hasta mover cada barra)
  if(SIM.tocCap===false||SIM.tocN===false)return _simCaja("",`<div style="font-size:15px;font-weight:700;padding:4px 0">${SIM.tocCap===false&&SIM.tocN===false?"Mueve las dos barras":SIM.tocCap===false?"Ahora elige cuánto necesitas":"Ahora elige en cuántos meses lo devuelves"}</div><div style="font-size:13.5px;opacity:.9">y aquí verás lo que recibes y lo que pagas cada mes.</div>`);
  const L={ini:_idxMes(DATA.reportMonth,DATA.reportYear)+1}, cap=SIM.cap, n=SIM.n;
  const {total,cuotas}=ayudaCuotas(cap,n,DATA.rate);
  const rep=_idxMes(DATA.reportMonth,DATA.reportYear);
  let h=_simCaja("",_simFila(`Recibes en ${_txtIdx(rep)}`,fmtEur(cap)+" €",true)
    +_simFila(`Devuelves en ${n} ${n===1?"cuota":"cuotas"}`,`${fmtEur(Math.max(...cuotas))} € al mes`) // v45.55: una sola cifra (la mayor); el importe exacto de cada mes está en el calendario
    +`<div style="font-size:12.5px;opacity:.85;margin-top:4px">La primera cuota se paga en ${_txtIdx(L.ini)}.</div>`);
  // v46.9: si ya paga otra ayuda, lo que pagaría en total ese mes (dos ayudas a la vez están permitidas)
  { let ya=0, hasta=-1; (m&&m.loans||[]).forEach(l=>(l.pays||[]).forEach((p,i)=>{ const pi=_idxMes(p.m,p.y); if(!p.paid&&pi===L.ini)ya+=cuotaDe(l,i); if(!p.paid&&pi>hasta)hasta=pi; }));
    ya=_r2(ya); if(ya>0)h+=`<div style="margin-top:10px;padding:10px 12px;border-radius:10px;background:#FFF4E5;border:1.5px solid #E0A040;color:#6B4210;font-size:13.5px;line-height:1.45">Ya pagas <b>${fmtEur(ya)} €</b> al mes de tu ayuda en curso (hasta ${_txtIdx(hasta)}). Con esta, en ${_txtIdx(L.ini)} pagarías <b>${fmtEur(_r2(ya+cuotas[0]))} €</b>.</div>`; }
  const igu=cuotas.every(c=>c===cuotas[0]), abC=!!DESP["sim-cal"];
  h+=`<button onclick="DESP['sim-cal']=!DESP['sim-cal'];render()" style="width:100%;display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:12px;padding:10px 12px;border-radius:10px;border:1px solid #E3DDD2;background:#fff;color:var(--dark);font-size:13.5px;text-align:left;cursor:pointer"><span><b>${n} ${n===1?"cuota":"cuotas"}${igu?` de ${fmtEur(cuotas[0])} €`:""}</b> · ${_txtIdx(L.ini)}${n>1?" → "+_txtIdx(L.ini+n-1):""}</span><span style="white-space:nowrap;font-weight:700;color:#2D6A4F">${abC?"Ocultar":"Ver calendario"} ›</span></button>`; // v46.9: plegado
  if(abC)h+=`<div style="margin-top:4px">${cuotas.map((c,i)=>`<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #EFEAE0;font-size:13.5px"><span>${MONTHS_FULL[((L.ini+i)%12+12)%12]} ${Math.floor((L.ini+i)/12)}${i===n-1&&n>1?" · 🏁 última":""}</span><b>${fmtEur(c)} €</b></div>`).join("")}</div>`;
  return h;
}
// Beneficio: lo que ya tiene + lo que ganaría aportando SIM.ap € cada mes hasta el final de la permanencia simulada.
function _simProyeccion(m,ciclo,ap){
  const rep=_idxMes(DATA.reportMonth,DATA.reportYear), ini=_idxMes(m.joinMonth,m.joinYear);
  const desde=_aportePagadoKey(m,_keyDeIdx(rep))?rep+1:rep;
  const fin=ciclo===0?Math.max(desde+11,ini+35):ini+ciclo-1+mesesPausaTotal(m); // indefinida: como mínimo 12 meses más y hasta el mes 36
  const mm=Object.assign({},m,{ciclo});
  const yaAp=totalAportadoMiembro(m), yaBen=_r2(aportesConBeneficio(m,rep).reduce((s,a)=>s+a.ben,0)), ret=beneficioRetirado(m);
  let nAp=0,nBen=0; const porAnio={};
  for(let i=desde;i<=fin;i++){ if(enPausaIdx(m,i))continue; const t=tarifaNivelMes(mm,_keyDeIdx(i+1)), b=(ap/50)*t, an=Math.floor((i-ini)/12)+1;
    nAp+=ap; nBen+=b; if(!porAnio[an])porAnio[an]={an,meses:0,ben:0,t,i0:i}; porAnio[an].meses++; porAnio[an].ben+=b; }
  return {desde,fin,yaAp,yaBen,ret,nAp,nBen:_r2(nBen),porAnio:Object.values(porAnio),
    totalAp:_r2(yaAp+nAp),totalBen:_r2(yaBen+nBen-ret),recibe:_r2(yaAp+nAp+yaBen+nBen-ret)};
}
function simBenResHTML(m){
  // v45.9: «Tu situación hoy» (datos de la persona) en un desplegable; debajo, ejemplos generales por permanencia y un ejemplo de aporte variable
  if(!m.joinMonth)return "";
  const rep=_idxMes(DATA.reportMonth,DATA.reportYear), fin=finPermanenciaIdx(m);
  const tHoy=tarifaNivelMes(m,_keyDeIdx(rep+1)), pagadoHoy=_aportePagadoKey(m,_keyDeIdx(rep)), apHoy=aporteBrutoKey(m,_keyDeIdx(rep));
  const aportes=totalAportadoMiembro(m), guardado=beneficioGuardado(m);
  const pend=pagadoHoy?_r2((apHoy/50)*tHoy):0;   // beneficio del aporte de este mes: se guarda el mes que viene (BE-3)
  const yaTienes=_r2(aportes+guardado+pend);
  const mesTxt=MONTHS_FULL[((rep%12)+12)%12].toLowerCase(), sigTxt=MONTHS_FULL[(((rep+1)%12)+12)%12].toLowerCase();
  // v45.11: nota del final (Maestro v18.6 · PE-5: se decide en el último mes, el del último aporte, qué hace el mes siguiente; PE-7: indefinida)
  const notaDecision=m.ciclo===0?"Cada 12 meses puedes retirar tu beneficio guardado."
    :fin==null?""
    :rep<fin?`En ${_txtIdx(fin)}, con tu último aporte, decides si en ${_txtIdx(fin+1)} amplías tu permanencia o te retiras.`
    :rep===fin?`Este mes es tu último aporte: decides si en ${_txtIdx(fin+1)} amplías tu permanencia o te retiras.`
    :"Tu permanencia ha terminado: habla con el administrador para ampliarla o retirarte.";
  // 1) Tu situación hoy (desplegable)
  const abierto=!!DESP["sim-hoy"];
  let h=`<button onclick="DESP['sim-hoy']=!DESP['sim-hoy'];render()" style="width:100%;display:flex;align-items:center;gap:10px;text-align:left;cursor:pointer;margin:0 0 ${abierto?0:16}px;padding:12px 14px;border-radius:${abierto?"12px 12px 0 0":"12px"};border:1.5px solid #2D6A4F;background:#EEF7F1;color:#1B4332">
      <span style="font-size:22px">📍</span><span style="flex:1;font-size:14.5px;font-weight:800">${window.NH_ES_APP_ASOCIADOS?"Lo que tienes hoy, "+escH(String(m.name||"").trim().split(/\s+/)[0]):"Tu situación hoy"} <span style="font-weight:600;font-size:12.5px;opacity:.8">Toca aquí para ${window.NH_ES_APP_ASOCIADOS?"verlo":"verla"}</span></span>
      <span style="font-size:18px;transform:rotate(${abierto?90:0}deg)">›</span></button>`;
  if(abierto)h+=`<div style="margin-bottom:16px">`+_simCaja(`<div style="font-size:12.5px;opacity:.85;margin-bottom:4px">Tu permanencia actual es ${m.ciclo===0?"indefinida":`de ${m.ciclo} meses`}</div>`,
       _simFila("Tus aportes",fmtEur(aportes)+" €")
      +_simFila("Tu beneficio guardado",fmtEur(guardado)+" €")
      +(pend?_simFila(`Beneficio de ${mesTxt} (se guarda en ${sigTxt})`,"+"+fmtEur(pend)+" €"):"")
      +_simFila("Llevas acumulado",fmtEur(yaTienes)+" €",true)
      +(notaDecision?`<div style="font-size:12.5px;opacity:.9;margin-top:6px;padding-top:6px;border-top:1px solid rgba(255,255,255,.2)">${notaDecision}</div>`:""))+`</div>`;
  // 2) v45.53 (decisión de Ángel 25/10/2026): con SUS números, no con ejemplos de alguien que empieza de cero.
  //    Lo que ya tiene + lo que aporta desde hoy hasta su último aporte (y el beneficio que eso genera), para su
  //    permanencia y para cada una a la que puede ampliar. Cálculo: _simProyeccion (mismas tarifas BE-2 y pausas).
  const ab2=!!DESP["sim-var"];
  h+=`<div style="font-size:15px;font-weight:800;color:var(--dark);margin:0 0 4px">🌱 ¿Cuánto te llevarás?</div>
    <div style="font-size:13px;color:var(--muted);margin:0 0 8px;line-height:1.4">Ejemplos empezando de cero, aportando cada mes:</div>`;
  h+=`<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px">${APORTE_OPCIONES.map(v=>`<button onclick="SIM.ap=${v};render()" style="flex:1 1 56px;min-width:0;padding:10px 4px;border-radius:10px;border:1.5px solid ${SIM.ap===v?"#1B4332":"#E3DDD2"};background:${SIM.ap===v?"#1B4332":"#fff"};color:${SIM.ap===v?"#fff":"#3B3B3B"};font-size:13.5px;font-weight:700;cursor:pointer">${v} €</button>`).join("")}</div>`;
  const fila=(l,v,o={})=>`<div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:baseline;gap:2px 10px;font-size:${o.big?15.5:13.5}px;padding:${o.big?"6px 0 0":"2px 0"};${o.top?"border-top:1px solid #E3DDD2;margin-top:6px;":""}"><span style="${o.big?"font-weight:800;color:#1B4332":"color:#4A4A4A"}">${l}</span><b style="white-space:nowrap;${o.color?`color:${o.color}`:""};font-size:${o.big?18:13.5}px">${v}</b></div>`;
  const cur=(m.ciclo!=null?m.ciclo:12);
  // v46.10 (Ángel 07/11/2026): ejemplos generales de cada permanencia empezando de cero (lo suyo está arriba, en «Lo que tienes hoy»)
  const TB=[REGLAS.BENEFICIO_ANIO1,REGLAS.BENEFICIO_ANIO2,REGLAS.BENEFICIO_ANIO3], ord=["1.er","2.º","3.er"];
  [12,24,36].forEach(c=>{
    const anios=c/12, apT=SIM.ap*c, ben=TB.slice(0,anios).reduce((x,t)=>x+12*(SIM.ap/50)*t,0), suya=m.ciclo===c;
    const tasas=TB.slice(0,anios).map((t,k)=>`${t} € el ${ord[k]} año`).join(" · ");
    h+=`<div style="border:1.5px solid ${suya?"#2D6A4F":"#E3DDD2"};border-radius:14px;padding:12px 14px;margin-bottom:10px;background:#fff">
      <div style="display:flex;flex-wrap:wrap;align-items:center;gap:4px 8px;font-size:15px;font-weight:800;color:#1B4332"><span style="overflow-wrap:anywhere">Permanencia de ${c} meses</span>${suya?`<span style="flex:none;white-space:nowrap;font-size:11px;font-weight:800;letter-spacing:.5px;padding:3px 8px;border-radius:20px;background:#1B4332;color:#fff">LA TUYA</span>`:""}</div>
      <div style="margin:4px 0 6px;font-size:13px;line-height:1.45;color:#1B7A3D"><b>Por cada 50 € ganas:</b> ${tasas}</div>
      ${fila(`Aportas ${c} meses × ${SIM.ap} €`,fmtEur(apT)+" €")}
      ${fila("Ganas de beneficio","+"+fmtEur(ben)+" €",{color:"#2D6A4F"})}
      ${fila("Al terminar recibes",fmtEur(apT+ben)+" €",{big:true,top:true})}
    </div>`;
  });
  // v46.10 (Ángel 07/11/2026): «Si sales ahora», con la misma cuenta que la salida real (salidaV18, Maestro SA)
  h+=siSalesHoyHTML(m); // v46.39: el mismo cuadro que en Preguntas y en «Mis aportes y beneficios»
  // v45.10: «¿Tengo que aportar siempre lo mismo?» va al final, después de los cuadros
  h+=`<button onclick="DESP['sim-var']=!DESP['sim-var'];render()" style="width:100%;display:flex;align-items:center;gap:10px;text-align:left;cursor:pointer;margin:0 0 ${ab2?0:12}px;padding:11px 14px;border-radius:${ab2?"12px 12px 0 0":"12px"};border:1.5px solid #C9A227;background:#FFF8E1;color:#5C4A00">
      <span style="font-size:20px">🔀</span><span style="flex:1;font-size:14px;font-weight:800">¿Tengo que aportar siempre lo mismo? <span style="font-weight:600;font-size:12.5px;opacity:.8">Toca aquí</span></span>
      <span style="font-size:18px;transform:rotate(${ab2?90:0}deg)">›</span></button>`;
  if(ab2){
    const ej=[50,100,50,50,200,50,100,50,150,50,50,100], tot=ej.reduce((a,b)=>a+b,0), ben=ej.reduce((a,b)=>a+(b/50)*10,0);
    h+=`<div style="border:1.5px solid #C9A227;border-top:none;border-radius:0 0 12px 12px;padding:10px 14px 12px;margin-bottom:12px;font-size:13.5px;color:#3B3B3B;line-height:1.5;background:#fff">
      <b>No.</b> Lo mínimo es <b>50 €</b> y cada mes eliges: 50, 100, 150 o 200 €. Cada 50 € que aportas ese mes gana su parte.
      <div style="margin:8px 0 4px;font-weight:800;color:#1B4332">Ejemplo de un año (cada 50 € gana 10 €):</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;border:1px solid #E3DDD2;border-radius:10px;overflow:hidden;font-size:13px">
        <div style="background:#1B4332;color:#fff;padding:5px 8px;font-weight:700">Mes</div><div style="background:#1B4332;color:#fff;padding:5px 8px;font-weight:700;text-align:right">Aportas</div><div style="background:#1B4332;color:#fff;padding:5px 8px;font-weight:700;text-align:right">Ganas</div>
        ${ej.map((v,k)=>{const bg=k%2?"background:#F7F4EE;":"";return `<div style="${bg}padding:4px 8px">${k+1}</div><div style="${bg}padding:4px 8px;text-align:right">${v} €</div><div style="${bg}padding:4px 8px;text-align:right;color:#2D6A4F;font-weight:700">+${(v/50)*10} €</div>`;}).join("")}
        <div style="background:#EEF7F1;padding:6px 8px;font-weight:800">Total</div><div style="background:#EEF7F1;padding:6px 8px;text-align:right;font-weight:800">${fmtEur(tot)} €</div><div style="background:#EEF7F1;padding:6px 8px;text-align:right;font-weight:800;color:#2D6A4F">+${fmtEur(ben)} €</div>
      </div>
      <div style="margin-top:8px">Al terminar recibes <b>${fmtEur(tot+ben)} €</b>: tus aportes de ${fmtEur(tot)} € y ${fmtEur(ben)} € de beneficio.</div></div>`;
  }
  // v45.10: «¿Puedo cobrar mi beneficio sin irme?» (Maestro PE-5) — ejemplo de 12 a 24 meses con el aporte elegido arriba
  const ab3=!!DESP["sim-ret"], ap=SIM.ap, b1=(ap/50)*10, b2=(ap/50)*12;
  h+=`<button onclick="DESP['sim-ret']=!DESP['sim-ret'];render()" style="width:100%;display:flex;align-items:center;gap:10px;text-align:left;cursor:pointer;margin:0 0 ${ab3?0:12}px;padding:11px 14px;border-radius:${ab3?"12px 12px 0 0":"12px"};border:1.5px solid #2D6A4F;background:#EEF7F1;color:#1B4332">
      <span style="font-size:20px">💶</span><span style="flex:1;font-size:14px;font-weight:800">¿Puedo cobrar mi beneficio sin irme? <span style="font-weight:600;font-size:12.5px;opacity:.8">Toca aquí</span></span>
      <span style="font-size:18px;transform:rotate(${ab3?90:0}deg)">›</span></button>`;
  if(ab3){
    // v45.10: línea de tiempo (decisión de Ángel 04/10/2026)
    const parada=(tit,cuerpo,ult)=>`<div style="position:relative;margin-bottom:${ult?0:12}px"><span style="position:absolute;left:-23px;top:2px;width:14px;height:14px;border-radius:50%;background:#1B4332"></span>
      <div style="font-size:12px;font-weight:800;color:#94571A;text-transform:uppercase;letter-spacing:.2px">${tit}</div>
      <div style="background:#F4F9F6;border-radius:10px;padding:8px 10px;margin-top:4px">${cuerpo}</div></div>`;
    const lin=(l,v,c)=>`<div style="display:flex;justify-content:space-between;padding:2px 0"><span>${l}</span><b style="${c?"color:#2D6A4F":""}">${v}</b></div>`;
    h+=`<div style="border:1.5px solid #2D6A4F;border-top:none;border-radius:0 0 12px 12px;padding:10px 14px 14px;margin-bottom:12px;font-size:13.5px;color:#2B2B2B;line-height:1.45;background:#fff">
      <div style="margin-bottom:10px"><b>Sí.</b> Ejemplo con <b>${ap} € al mes</b>, de 12 a 24 meses:</div>
      <div style="border-left:3px solid #2D6A4F;margin-left:8px;padding-left:15px">
        ${parada("Mes 12 · amplías a 24",lin("Tus aportes",fmtEur(ap*12)+" €")+lin("Tu beneficio",fmtEur(b1*12)+" €",1)
          +`<div style="margin-top:4px">👉 <b>Retiras tus ${fmtEur(b1*12)} €</b></div><div>Tus ${fmtEur(ap*12)} € se quedan.</div>`)}
        ${parada("Meses 13 a 24",`Sigues aportando ${ap} € y ahora ganas <b>${fmtEur(b2)} € al mes</b> (antes ${fmtEur(b1)} €).`)}
        ${parada("Mes 24 · tú decides",lin("Tus aportes",fmtEur(ap*24)+" €")+lin("Tu beneficio",fmtEur(b2*12)+" €",1)
          +`<div style="display:flex;gap:6px;margin-top:6px">
              <div style="flex:1;background:#fff;border:1px solid #D5E3D9;border-radius:8px;padding:7px;font-size:12.5px">🌱 <b>Si decides ampliar a 36:</b> te llevas <b>${fmtEur(b2*12)} €</b> y quedan ${fmtEur(ap*24)} €</div>
              <div style="flex:1;background:#fff;border:1px solid #D5E3D9;border-radius:8px;padding:7px;font-size:12.5px">🚪 <b>Si decides retirarte:</b> te llevas <b>${fmtEur(ap*24+b2*12)} €</b></div>
            </div>`,1)}
      </div></div>`;
  }
  h+=`<div style="font-size:12px;color:var(--muted);line-height:1.4">Puedes ampliar tu permanencia cuando quieras; nunca se puede bajar.</div>`;
  return h;
}
