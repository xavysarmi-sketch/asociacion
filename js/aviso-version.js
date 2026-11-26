// Nuevos Horizontes · aviso-version.js
// Aviso de «Nueva versión disponible» y número de versión visible.
// v46.66 (26/11/2026): la versión publicada se lee del propio index.html (el ?v= de sus archivos, que siempre es igual a
// APP_VERSION; verificar_app.js lo comprueba), como hace la app de asociados con NH_APP_V. Antes se comparaba una «huella»
// de las cabeceras ETag/Last-Modified, y GitHub Pages las da distintas según el servidor que conteste aunque el archivo sea
// el mismo (comprobado el 26/11/2026: «…f2f» 20:03:59 desde un servidor y «…f2e» 20:03:58 desde otro), así que el aviso
// salía al abrir la app aunque ya estuviera al día.
window.APP_UPDATE = (function(){
  var CHECK_INTERVAL_MS = 3 * 60 * 1000; // Comprueba cada 3 minutos
  var publicada = null;      // versión publicada más nueva que la de esta pantalla (p. ej. "46.67")
  var dismissed = false;
  var banner = document.getElementById('updateBanner');
  var versionTag = document.getElementById('appVersionTag');
  if(versionTag && typeof APP_VERSION!=="undefined"){ versionTag.textContent = APP_VERSION; }

  // Memoria persistente: de qué versión ya cerró el aviso el usuario (✕), para no volver a avisar de esa misma.
  function getSeen(){ try{ return localStorage.getItem('nh_update_seen')||''; }catch(e){ return ''; } }
  function setSeen(v){ try{ localStorage.setItem('nh_update_seen', v||''); }catch(e){} }

  // "46.66" o "v46.66" → [46, 66]
  function numVersion(s){ var m=String(s||'').match(/(\d+)\.(\d+)/); return m?[+m[1],+m[2]]:null; }
  function esMasNueva(a,b){ return !!(a&&b&&(a[0]>b[0]||(a[0]===b[0]&&a[1]>b[1]))); }

  // Lee el index.html publicado (sin caché) y devuelve su versión: el primer ?v= de sus archivos.
  function fetchPublicada(){
    var url = location.href.split('#')[0].split('?')[0] + '?_check=' + Date.now();
    return fetch(url, { cache: 'no-store' })
      .then(function(r){ return r.ok ? r.text() : ''; })
      .then(function(t){ var m=String(t).match(/\?v=(\d+\.\d+)/); return m ? m[1] : null; })
      .catch(function(){ return null; });
  }

  // Marca visualmente (sello ✓) que se confirmó que esta pantalla es la versión publicada.
  function marcarVersionConfirmada(){
    UPDATE_CONFIRMED = true;
    var b1 = document.getElementById('versionOkBadge');
    if(b1) b1.style.display = 'inline';
    var b2 = document.getElementById('versionOkBadgeRO');
    if(b2) b2.style.display = 'block';
  }

  function check(){
    if(dismissed) return; // Si el usuario cerró el aviso, no insistir esta sesión
    fetchPublicada().then(function(pub){
      if(!pub) return; // Sin conexión o error, intentar más tarde
      var local = (typeof APP_VERSION!=="undefined") ? String(APP_VERSION) : '';
      var p = numVersion(pub), l = numVersion(local);
      if(!p || !l) return;
      if(!esMasNueva(p, l)){
        // Igual que la de esta pantalla (o un servidor aún da la anterior unos minutos tras publicar): no hay nada nuevo
        if(p[0]===l[0] && p[1]===l[1]) marcarVersionConfirmada();
        return;
      }
      publicada = pub;
      if(getSeen() === pub) return; // ya cerró el aviso de esta versión

      // En enlaces de asociados (solo lectura) se recarga solo; al admin se le avisa
      var esEnlaceAsociado = (typeof READONLY_ID!=="undefined" && READONLY_ID) ||
                             (typeof GRUPO_IDS!=="undefined" && GRUPO_IDS) ||
                             (typeof GRUPO_PPAL!=="undefined" && GRUPO_PPAL);
      if(esEnlaceAsociado){
        setSeen(pub); // una sola recarga automática por versión (si el móvil siguiera dando la anterior, no se repite)
        apply();
      }else{
        showBanner();
      }
    });
  }

  function showBanner(){
    if(banner) banner.classList.add('show');
  }

  function apply(){
    // Recarga con _v= para saltarse la caché (regla crítica 4). Si al volver la pantalla sigue siendo la anterior, el aviso
    // vuelve a salir (antes se daba por vista y ya no avisaba más de esa versión).
    try{
      var base=location.href.split('#')[0];
      // Quitar un _v anterior para no acumularlos
      base=base.replace(/([?&])_v=\d+/,'').replace(/[?&]$/,'');
      var sep=base.indexOf('?')>=0?'&':'?';
      location.replace(base+sep+'_v='+Date.now());
    }catch(e){
      location.reload();
    }
  }

  function dismiss(){
    dismissed = true;
    // Recordar que de esta versión ya se cerró el aviso: no reaparece hasta que haya otra
    if(publicada) setSeen(publicada);
    if(banner) banner.classList.remove('show');
  }

  // Inicializar: primera comprobación al cargar
  check();
  // Comprobar cada 3 minutos mientras la app esté abierta
  setInterval(check, CHECK_INTERVAL_MS);
  // Comprobar también cuando el usuario vuelve a la app (importante en iPhone)
  document.addEventListener('visibilitychange', function(){
    if(!document.hidden) check();
  });

  return { apply: apply, dismiss: dismiss };
})();
