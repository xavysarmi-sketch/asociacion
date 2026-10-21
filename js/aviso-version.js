// Nuevos Horizontes · aviso-version.js
// Aviso de «Nueva versión disponible» y número de versión visible.
window.APP_UPDATE = (function(){
  var CHECK_INTERVAL_MS = 3 * 60 * 1000; // Comprueba cada 3 minutos
  var currentFingerprint = null;
  var pendingFp = null;      // huella distinta a la espera de confirmarse
  var pendingCount = 0;      // veces seguidas que se ha visto esa huella distinta
  var dismissed = false;
  var banner = document.getElementById('updateBanner');
  var versionTag = document.getElementById('appVersionTag');
  if(versionTag && typeof APP_VERSION!=="undefined"){ versionTag.textContent = APP_VERSION; }

  // Memoria persistente: qué huella ya aceptó/cerró el usuario, para NO volver a
  // avisar de la misma versión aunque recargue o reabra la app desde el icono.
  function getSeen(){ try{ return localStorage.getItem('nh_update_seen')||''; }catch(e){ return ''; } }
  function setSeen(fp){ try{ localStorage.setItem('nh_update_seen', fp||''); }catch(e){} }

  // Obtiene una "huella" del archivo remoto sin descargarlo entero
  // Usa un HEAD request que es muy rápido y no consume datos
  function fetchFingerprint(){
    // Añade un parámetro aleatorio para evitar caché del navegador
    var url = location.href.split('?')[0] + '?_check=' + Date.now();
    return fetch(url, { method: 'HEAD', cache: 'no-store' })
      .then(function(r){
        // La huella es la combinación de ETag + Last-Modified
        // (GitHub Pages cambia estos valores en cada commit nuevo)
        var etag = r.headers.get('ETag') || '';
        var lastMod = r.headers.get('Last-Modified') || '';
        return etag + '|' + lastMod;
      })
      .catch(function(){ return null; });
  }

  // Marca visualmente (sello ✓) que se confirmó que esta pantalla es la versión publicada.
  // Se llama cuando la huella del servidor coincide con lo que ya se está viendo.
  function marcarVersionConfirmada(){
    UPDATE_CONFIRMED = true;
    var b1 = document.getElementById('versionOkBadge');
    if(b1) b1.style.display = 'inline';
    var b2 = document.getElementById('versionOkBadgeRO');
    if(b2) b2.style.display = 'block';
  }

  function check(){
    if(dismissed) return; // Si el usuario cerró el banner, no insistir esta sesión
    fetchFingerprint().then(function(fp){
      if(!fp) return; // Sin conexión o error, intentar más tarde
      if(currentFingerprint === null){
        // Primera comprobación de esta sesión: guardamos la huella actual
        currentFingerprint = fp;
        marcarVersionConfirmada();
        return;
      }
      if(fp === currentFingerprint){
        // Sin cambios: se limpia cualquier candidato pendiente (era ruido puntual)
        pendingFp = null; pendingCount = 0;
        marcarVersionConfirmada();
        return;
      }
      // La huella es distinta. Puede ser versión nueva real o ruido de las
      // cabeceras de GitHub Pages. Exigimos verla DOS veces seguidas igual.
      if(fp === pendingFp){ pendingCount++; }
      else{ pendingFp = fp; pendingCount = 1; }
      if(pendingCount < 2) return; // aún no confirmada; esperar próxima comprobación

      // Confirmada como versión nueva real
      currentFingerprint = fp;
      pendingFp = null; pendingCount = 0;

      // Si el usuario YA aceptó/cerró exactamente esta huella, no volver a avisar
      if(getSeen() === fp) return;

      // En enlaces de asociados (solo lectura) se recarga solo; al admin se le avisa
      var esEnlaceAsociado = (typeof READONLY_ID!=="undefined" && READONLY_ID) ||
                             (typeof GRUPO_IDS!=="undefined" && GRUPO_IDS) ||
                             (typeof GRUPO_PPAL!=="undefined" && GRUPO_PPAL);
      if(esEnlaceAsociado){
        setSeen(fp);
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
    // Marca la huella actual como \"ya vista\" para que la página recargada no
    // vuelva a mostrar el banner de esta misma versión.
    if(currentFingerprint) setSeen(currentFingerprint);
    try{
      var base=location.href.split('#')[0];
      var sep=base.indexOf('?')>=0?'&':'?';
      // Quitar un _v anterior para no acumularlos
      base=base.replace(/([?&])_v=\d+/,'').replace(/[?&]$/,'');
      sep=base.indexOf('?')>=0?'&':'?';
      location.replace(base+sep+'_v='+Date.now());
    }catch(e){
      location.reload();
    }
  }

  function dismiss(){
    dismissed = true;
    // Recordar que esta versión ya se cerró: no reaparece hasta que haya otra real
    if(currentFingerprint) setSeen(currentFingerprint);
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
