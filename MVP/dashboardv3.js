// ===== Auto-Refresh del bundle (polling suave) =====
function startAutoRefresh({ email, intervalMs = 15000, soft = true } = {}) {
  if (!email) return { stop(){}, poke(){} };

  // último timestamp conocido
  let last =
    window.GJ_BUNDLE?.updated_at ||
    (()=>{
      try { return JSON.parse(localStorage.getItem('gj_bundle')||'{}').updated_at; }
      catch { return null; }
    })();

  let timer = null;

  async function check() {
    try {
      const r = await fetch(`${WORKER_BASE}/bundle?email=${encodeURIComponent(email)}&t=${Date.now()}`, { cache: 'no-store' });
      if (r.status !== 200) return;
      const fresh = await r.json();
      const next  = fresh?.updated_at || null;

      if (next && next !== last) {
        last = next;

        // Actualiza cache local + dispara evento para que el front se repinte
        window.GJ_BUNDLE = fresh;
        try { localStorage.setItem('gj_bundle', JSON.stringify(fresh)); } catch {}
        window.dispatchEvent(new CustomEvent('gj:bundle-updated', { detail: fresh }));

        // Si querés forzar recarga completa, poné soft=false al iniciar
        if (!soft) location.reload();
      }
    } catch (_) {}
  }

  // arranca de inmediato y luego en intervalo
  check();
  timer = setInterval(check, intervalMs);

  return {
    stop(){ if (timer) clearInterval(timer); },
    // para “acelerar” el próximo chequeo después de una acción del usuario
    poke(){ check(); }
  };
}


// ===== Mini State Manager (LS) =====
const GJLocal = (() => {
  const keyFlags   = e => `gj_flags:${String(e||'').toLowerCase()}`;
  const keyPending = e => `gj_pending:${String(e||'').toLowerCase()}`;

  const _get = (k, fb=null) => {
    try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; }
  };
  const _set = (k, v) => { try { v==null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch {} };

  return {
    // flags optimistas (ej: { bbdd_ok:1, firstprog_ok:1 })
    getFlags(email){ return _get(keyFlags(email), {}); },
    mergeFlags(email, patch){ const cur = _get(keyFlags(email), {}); const next = { ...cur, ...patch }; _set(keyFlags(email), next); return next; },
    clearFlags(email){ _set(keyFlags(email), {}); },

    // operación pendiente { op, expect, ts, ttlMs, optimistic }
    setPending(email, p){ _set(keyPending(email), p ? { ...p, ts: Date.now() } : null); },
    getPending(email){ return _get(keyPending(email), null); },
    clearPending(email){ _set(keyPending(email), null); },
    isPendingValid(email){
      const p = _get(keyPending(email), null);
      if (!p) return false;
      const ttl = Number(p.ttlMs || 0);
      if (!ttl) return true;
      return (Date.now() - Number(p.ts || 0)) <= ttl;
    },

    // snapshot de bundle (último conocido)
    saveBundle(bundle){ _set('gj_bundle', bundle); },
    getBundle(){ return _get('gj_bundle', null); }
  };
})();

// ===== Helpers =====
const GJEvents = { emit:(name, detail)=>window.dispatchEvent(new CustomEvent(name,{detail})) };

function deepGet(obj, path){
  if (!path) return undefined;
  return String(path).split('.').reduce((acc,k)=> (acc && acc[k]!==undefined) ? acc[k] : undefined, obj);
}
function bundleStamp(b){
  return (b && (b.updated_at || b.worker_updated_at || b.version || b.worker_version)) || '';
}
function matchesExpect(bundle, expect){
  if (!expect) return false; // sin expectativa, decidimos por 'stamp' (avance)
  if (typeof expect === 'function') { try { return !!expect(bundle); } catch { return false; } }

  // mapea atajos 'F' y 'L' a paths reales
  const map = { F:'confirmacionbbdd', L:'scheduler.firstProgrammed' };
  return Object.entries(expect).every(([k, val])=>{
    if (k === 'op' || k === 'ttlMs' || k === 'optimistic') return true;
    const path = map[k] || k;
    const got = deepGet(bundle, path);
    return String(got).toUpperCase() === String(val).toUpperCase();
  });
}

// ===== Listeners globales (única instancia; evita doble registro) =====
if (!window.__GJ_LISTENERS_WIRED__) {
  window.__GJ_LISTENERS_WIRED__ = true;

  // util seguro para dots (no rompe si setDot no existe aún)
  const setDotSafe = (el, on, color = '#ffc107') => {
    try { (window.setDot || function(){ })(el, on, color); } catch(_) {}
  };
  const getEmail = () =>
    (new URLSearchParams(location.search).get('email') ||
     localStorage.getItem('gj_email') || '').trim().toLowerCase();

  // Recalcula avisos/dots con el último bundle (backend) + flags optimistas (LS)
  function repaintWarnings({ bundle, flags } = {}) {
    const email = getEmail();
    const b   = bundle || (window.GJ_BUNDLE || GJLocal.getBundle() || {});
    const fl  = flags  || GJLocal.getFlags(email) || {};

    const bbddOk   = String(b.confirmacionbbdd || '').toUpperCase() === 'SI' || !!fl.bbdd_ok;
    const firstProg= String(b?.scheduler?.firstProgrammed || '').toUpperCase() === 'SI' || !!fl.firstprog_ok;

    const elBBDD  = document.getElementById('bbdd-warning');
    const elSched = document.getElementById('scheduler-warning');

    // 1) Warning BBDD
    if (elBBDD) elBBDD.style.display = bbddOk ? 'none' : 'block';

    // 2) Warning Programar (solo si F=SI y L vacío)
    const showSched = bbddOk && !firstProg;
    if (elSched) elSched.style.display = showSched ? 'block' : 'none';

    // 3) Dots
    setDotSafe(document.getElementById('li-edit-bbdd'), !bbddOk, '#ffc107');
    setDotSafe(document.getElementById('menu-toggle'), (!bbddOk || showSched), '#ffc107');
    setDotSafe(document.getElementById('open-scheduler'), showSched, '#ffc107');

    // 4) Mantener el espejo en GJ_CTX (si existe)
    try {
      window.GJ_CTX = window.GJ_CTX || {};
      window.GJ_CTX.scheduler = window.GJ_CTX.scheduler || {};
      window.GJ_CTX.scheduler.firstProgrammed = firstProg ? 'SI' : '';
    } catch(_) {}
  }

  // ← se dispara cuando llega un bundle fresco del Worker
  function onBundleUpdated(evt) {
    const fresh = evt?.detail || {};
    // guardamos snapshot por si otro módulo lo pide
    try { GJLocal.saveBundle(fresh); } catch {}
    repaintWarnings({ bundle: fresh });
    try { window.GJPopups?.run(); } catch {}
  }

  // ← se dispara cuando aplicás UI optimista (flags en LS) o se reconcilia/rollback
  function onStateChanged(evt) {
    const email = evt?.detail?.email || getEmail();
    const flags = GJLocal.getFlags(email);
    const bundle = GJLocal.getBundle();
    repaintWarnings({ bundle, flags });
  }

  window.addEventListener('gj:bundle-updated', onBundleUpdated);
  window.addEventListener('gj:state-changed', onStateChanged);
}



// === Worker + fallback a WebApp ===
const WORKER_BASE    = 'https://gamificationworker.rfullivarri22.workers.dev';
const OLD_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbxncfav0V6OJsHDFMcFg7S8qISWXrG5P5l5WTCzBn-iC_4cerC22lsznJHlDsQhneGdpA/exec';

// Devuelve `data` desde el Worker; si no puede, usa la WebApp
async function loadDataFromCacheOrWebApp(email) {
  try {
    const r = await fetch(`${WORKER_BASE}/bundle?email=${encodeURIComponent(email)}`, { cache: 'no-store' });
    if (r.status === 200) return await r.json();
    if (r.status === 204) throw new Error('No bundle yet');
    throw new Error(`Worker ${r.status}`);
  } catch (err) {
    const resp = await fetch(`${OLD_WEBAPP_URL}?email=${encodeURIComponent(email)}`, { cache: 'no-store' });
    return await resp.json();
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  // Spinner
  const overlay = document.getElementById("spinner-overlay");
  const showSpinner = () => overlay && (overlay.style.display = "flex");
  const hideSpinner = () => overlay && (overlay.style.display = "none");
  showSpinner();

  try {
    // 1) email
    const params = new URLSearchParams(window.location.search);
    const email = params.get("email");
    if (!email) { alert("No se proporcionó un correo electrónico."); return; }

    // 1.1) Contexto para el SCHEDULER
    window.GJ_CTX = { email };
    window.GJ_AUTO = startAutoRefresh({
      email: window.GJ_CTX.email,
      intervalMs: 15000, // 15.000 milisegundos = 15 segundos
      soft: true
    });

    // 2) FETCH DATOS (usa Worker -> fallback WebApp)
    const dataRaw = await loadDataFromCacheOrWebApp(email);
    const schedIn  = dataRaw.scheduler || dataRaw.schedule || {};
    const fpRaw    = schedIn.firstProgrammed ?? schedIn.first_programmed ?? '';
    const fp       = String(fpRaw).trim().toUpperCase() === 'SI' ? 'SI' : '';
    dataRaw.scheduler = { ...schedIn, firstProgrammed: fp };
    window.GJ_BUNDLE = dataRaw;
    try { GJLocal.saveBundle(dataRaw); } catch {}
    window.dispatchEvent(new CustomEvent('gj:bundle-updated', { detail: dataRaw }));
    

    // 2.1) Logs crudos para rachas (CLAVE)
    const logsRaw = Array.isArray(dataRaw?.daily_log_raw) ? dataRaw.daily_log_raw
                  : (Array.isArray(dataRaw?.daily_log)    ? dataRaw.daily_log : []);

    // DEBUG: ver que lleguen
    // console.log('[Dashboard] bundle:', dataRaw);
    // console.log('[Dashboard] daily_log_raw len =', logsRaw.length);

    // ---- Normalizar data al formato plano que usa el front ----
    const data = {
      // Métricas (flatten)
      xp:            dataRaw.xp ?? dataRaw.metrics?.xp_actual ?? 0,
      nivel:         dataRaw.nivel ?? dataRaw.metrics?.nivel ?? 0,
      xp_faltante:   dataRaw.xp_faltante ?? dataRaw.metrics?.xp_faltante ?? 0,
      exp_objetivo:  dataRaw.exp_objetivo ?? dataRaw.metrics?.xp_objetivo ?? 100,
      hp:            dataRaw.hp ?? dataRaw.metrics?.hp ?? 0,
      mood:          dataRaw.mood ?? dataRaw.metrics?.mood ?? 0,
      focus:         dataRaw.focus ?? dataRaw.metrics?.focus ?? 0,
      dias_journey:  dataRaw.dias_journey ?? dataRaw.metrics?.dias_journey ?? 0,
      game_mode:     dataRaw.game_mode ?? dataRaw.metrics?.game_mode ?? "",

      // Links
      avatar_url:          dataRaw.avatar_url ?? dataRaw.links?.avatar_url ?? "",
      daily_form_url:      dataRaw.daily_form_url ?? dataRaw.links?.daily_form ?? "",
      daily_form_edit_url: dataRaw.daily_form_edit_url ?? dataRaw.links?.daily_form_edit ?? "",
      user_profile:        dataRaw.user_profile ?? dataRaw.links?.user_profile ?? "",
      bbdd_editor_url:     dataRaw.bbdd_editor_url ?? dataRaw.links?.bbdd_editor ?? "",

      // Otros
      estado:            dataRaw.estado ?? "",
      confirmacionbbdd:  dataRaw.confirmacionbbdd ?? "",
      nombre:            dataRaw.nombre ?? "",
      apellido:          dataRaw.apellido ?? "",
      sexo:              dataRaw.sexo ?? "",
      edad:              dataRaw.edad ?? "",

      // Series que ya usás
      daily_cultivation: dataRaw.daily_cultivation ?? [],
      daily_emotion:     dataRaw.daily_emotion ?? [],

      // BBDD de tareas
      bbdd:              Array.isArray(dataRaw.bbdd) ? dataRaw.bbdd : [],

      // Habitos Logrados (para Radar)
      habitos_logrados:  dataRaw.habitos_logrados ?? [],
      habitos_by_rasgo:  dataRaw.habitos_agg_by_rasgo ?? null,

      // ⬅️ NUEVO: EXponer logs crudos para el panel de rachas
      daily_log_raw:     logsRaw,
      daily_log:         logsRaw, // alias por compat
    };

    // 3) Espejos globales
    // - GJ_DATA: objeto “plano” que usa la UI
    // - GJ_W1:   bundle estilo worker/webapp (por si algo quiere el shape original)
    // ✅ Dejar los datos accesibles + disparar el render del Emotion Chart
    window.data = data;
    window.GJEmotion?.draw(data.daily_emotion);           // dibuja ya si el script cargó
    window.GJ_DATA = data;
    window.GJ_W1   = { ...dataRaw, daily_log_raw: logsRaw, daily_log: logsRaw };

    // 4) Notificar que hay datos listos
    document.dispatchEvent(new CustomEvent('gj:data-ready', { detail: { data } }));


    // ========== SCHEDULER — Exponer contexto para el modal ==========
    function pick(...vals){
      for (const v of vals) if (v !== undefined && v !== null && String(v).trim() !== '') return v;
      return '';
    }
    function _sheetIdFromUrl_(url){
      if (!url) return '';
      const m = String(url).match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      return m ? m[1] : '';
    }
    function _normalizeHour_(h){
      if (h == null) return null;
      const m = String(h).match(/^\s*(\d{1,2})/);
      if (!m) return null;
      return Math.max(0, Math.min(23, parseInt(m[1],10)));
    }
    // Deep-scan por si la URL del Sheet viene en otro lado
    function _findSheetIdDeep_(obj){
      const re = /https:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/;
      let found = '';
      (function walk(x){
        if (!x || found) return;
        if (typeof x === 'string') {
          const m = x.match(re);
          if (m) found = m[1];
        } else if (typeof x === 'object') {
          for (const k in x) walk(x[k]);
        }
      })(obj);
      return found;
    }
    
    // posibles llaves que puede traer tu Worker/WebApp
    const sheetUrl = pick(
      dataRaw.sheetUrl,                // camelCase
      dataRaw.sheet_url,               // snake_case
      dataRaw.sheet,                   // genérico
      dataRaw.links?.sheet,
      dataRaw.links?.sheetUrl,         // camelCase en links
      dataRaw.links?.sheet_url,        // snake_case en links
      dataRaw.dashboard_sheet_url,
      dataRaw.links?.dashboard_sheet_url,
      dataRaw.user_sheet_url,
      dataRaw.links?.user_sheet_url
    );
    
    // ID final del Sheet del usuario (incluye deep-scan como último recurso)
    const userSheetId = pick(
      dataRaw.user_sheet_id,
      dataRaw.userSheetId,
      dataRaw.sheetId,
      dataRaw.sheet_id,
      _sheetIdFromUrl_(sheetUrl),
      _findSheetIdDeep_(dataRaw)       // ← si vino escondida en otro subobjeto
    );
    
    // Config scheduler (si no vino, defaults)
    const s = dataRaw.schedule || dataRaw.scheduler || {};
    const horaNorm = _normalizeHour_(s.hora);
    
    // Contexto global para el Scheduler (y resto del dashboard)
    window.GJ_CTX = {
      email, // ya definido arriba
      userSheetId,
      linkPublico: pick(data.daily_form_url, dataRaw.daily_form_url, dataRaw.links?.daily_form, ''),
      scheduler: {
        canal:      s.canal      ?? 'email',
        frecuencia: s.frecuencia ?? 'DAILY',
        dias:       s.dias       ?? '',
        hora:       (horaNorm != null ? horaNorm : 8), // SOLO HH (0–23)
        timezone:   s.timezone   ?? 'Europe/Madrid',
        estado:     s.estado     ?? 'ACTIVO'
      }
    };


    // === ONBOARDING WARNINGS (regla definitiva: F y L) ===
    // === ONBOARDING WARNINGS (regla definitiva: F y L) ===
    (function applyOnboardingWarnings(){
      const bbddOk = String(data.confirmacionbbdd || '').toUpperCase() === 'SI';   // F (Central)
    
      // ⚡ Lee flag optimista desde LS (si existe)
      const flags = (window.GJLocal?.getFlags && GJLocal.getFlags(email)) || {};
    
      // L real que viene en el bundle (HUB)
      const firstProgBundle = String(dataRaw?.scheduler?.firstProgrammed || '').toUpperCase() === 'SI';
    
      // UI = optimista (si existe) o valor real del bundle
      const firstProgUI = flags.firstprog_ok ? true : firstProgBundle;
    
      const elBBDD  = document.getElementById('bbdd-warning');
      const elSched = document.getElementById('scheduler-warning');
    
      // 1) Warning BBDD
      if (elBBDD) elBBDD.style.display = bbddOk ? 'none' : 'block';
    
      // 2) Warning Programar (solo si F=SI y L vacío)
      const showSched = bbddOk && !firstProgUI;
      if (elSched) elSched.style.display = showSched ? 'block' : 'none';
    
      // 3) Dots (opcionales, coherentes con los avisos)
      setDot(document.getElementById('li-edit-bbdd'), !bbddOk, '#ffc107');
      setDot(document.getElementById('menu-toggle'), (!bbddOk || showSched), '#ffc107');
      setDot(document.getElementById('open-scheduler'), showSched, '#ffc107');
    
      // 4) Contexto limpio por si lo usa el modal
      window.GJ_CTX = {
        ...(window.GJ_CTX || {}),
        linkPublico: (data.daily_form_url || ''),
        scheduler: {
          canal:      (dataRaw?.scheduler?.canal      ?? 'email'),
          frecuencia: (dataRaw?.scheduler?.frecuencia ?? 'DAILY'),
          dias:       (dataRaw?.scheduler?.dias       ?? ''),
          hora:       (dataRaw?.scheduler?.hora != null ? Number(dataRaw.scheduler.hora) : 8),
          timezone:   (dataRaw?.scheduler?.timezone   ?? 'Europe/Madrid'),
          estado:     (dataRaw?.scheduler?.estado     ?? 'ACTIVO'),
          // 👇 reflejamos el estado que ve la UI (optimista si aplica)
          firstProgrammed: firstProgUI ? 'SI' : ''
        }
      };
    
      // (opcional) expose flags por si querés depurar
      window.GJ_WARN = { bbddOk, firstProgBundle, firstProgUI, showSched };
    })();

    // ——— Reactividad: warnings “vivos” sin F5 ———
    (function mountWarningReactivity(){
      const elBBDD  = document.getElementById('bbdd-warning');
      const elSched = document.getElementById('scheduler-warning');
    
      function render(){
        const flags = (window.GJLocal?.getFlags && GJLocal.getFlags(email)) || {};
        const bbddOk = String(window.GJ_DATA?.confirmacionbbdd || '').toUpperCase() === 'SI';
    
        const firstProgBundle =
          String(window.GJ_CTX?.scheduler?.firstProgrammed || '').toUpperCase() === 'SI';
        const firstProgUI = flags.firstprog_ok ? true : firstProgBundle;
    
        if (elBBDD)  elBBDD.style.display  = bbddOk ? 'none' : 'block';
        const showSched = bbddOk && !firstProgUI;
        if (elSched) elSched.style.display = showSched ? 'block' : 'none';
    
        // dots coherentes
        setDot(document.getElementById('li-edit-bbdd'), !bbddOk, '#ffc107');
        setDot(document.getElementById('menu-toggle'), (!bbddOk || showSched), '#ffc107');
        setDot(document.getElementById('open-scheduler'), showSched, '#ffc107');
      }
    
      // LS/optimista cambia → re-render
      window.addEventListener('gj:state-changed', render);
    
      // Backend confirmó → actualizo contexto y re-render
      window.addEventListener('gj:bundle-updated', (ev) => {
        const fp = String(ev?.detail?.scheduler?.firstProgrammed || '').toUpperCase() === 'SI';
        if (window.GJ_CTX?.scheduler) window.GJ_CTX.scheduler.firstProgrammed = fp ? 'SI' : '';
        render();
      });
    
      // primer render (por si llegamos tarde)
      render();
    })();


    
    // (Opcional, ya no es necesario llamarla; se deja por compatibilidad)
    async function markFirstProgrammed(email){
      try {
        await fetch(`${OLD_WEBAPP_URL}?action=mark_first_programmed&email=${encodeURIComponent(email)}&key=${encodeURIComponent(API_KEY)}`, {
          method: 'POST',
          cache: 'no-store'
        });
        const elSched = document.getElementById('scheduler-warning');
        if (elSched) elSched.style.display = 'none';
        setDot(document.getElementById('open-scheduler'), false);
        setDot(document.getElementById('menu-toggle'), false);
        if (window.GJ_CTX?.scheduler) window.GJ_CTX.scheduler.firstProgrammed = 'SI';
      } catch(e) {
        console.warn('markFirstProgrammed failed', e);
      }
    }
    

    //    d) Resto de enlaces como ya tenías
    const dailyQuest = document.getElementById("daily-quest");
    const editFormEl = document.getElementById("edit-form");
    if (dailyQuest) dailyQuest.href = data.daily_form_url      || "#";
    if (editFormEl) editFormEl.href = data.daily_form_edit_url || "#";
    

    // 4) WARNING + PUNTITOS NOTIFICACION
    // 4.1) ====PUNTITOS EN MENUS===================
    function setDot(el, on, color = '#ffc107') {
      if (!el) return;
      let dot = el.querySelector(':scope > .dot');
      if (on) {
        if (!dot) {
          dot = document.createElement('span');
          dot.className = 'dot';
          el.appendChild(dot);
        }
        dot.style.background = color;
    
        // Solo posicionamos la hamburguesa por JS.
        // El <li> usa el CSS (#li-edit-bbdd > .dot { top:10px; right:10px })
        if (el.id === 'menu-toggle') {
          dot.style.top = '-2px';
          dot.style.right = '-2px';
        } else {
          // IMPORTANTE: no fuerces top/right aquí para dejar actuar al CSS
          dot.style.top = '';
          dot.style.right = '';
        }
      } else if (dot) {
        dot.remove();
      }
    }

  
    await new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));
    hideSpinner();


    
    // ================= AVATAR =================
    const avatarURL = (data.avatar_url || "").trim();
    const avatarImg  = document.getElementById("avatar");
    if (avatarImg) {
      if ((avatarImg.tagName || "").toLowerCase() === "img") {
        if (avatarURL) {
          if (avatarImg.src !== avatarURL) avatarImg.src = avatarURL;
          avatarImg.alt = (data.nombre ? `${data.nombre} — avatar` : "Avatar");
          avatarImg.loading = "eager";
          avatarImg.decoding = "async";
        } else {
          avatarImg.removeAttribute("src");
        }
      } else {
        // #avatar no es <img>: uso background
        avatarImg.style.backgroundImage  = avatarURL ? `url("${avatarURL}")` : "";
        avatarImg.style.backgroundSize   = "cover";
        avatarImg.style.backgroundRepeat = "no-repeat";
        avatarImg.style.backgroundPosition = "center";
      }
    }
    
    // Helpers locales (no cambian API pública)
    const clamp01 = v => Math.max(0, Math.min(1, v));
    const num = (x, def = 0) => {
      const n = Number(x);
      return Number.isFinite(n) ? n : def;
    };
    const putText = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = String(value);
    };
    
    // ============= ESTADO DIARIO: barras =============
    const setProgress = (id, value) => {
      const bar = document.getElementById(id);
      if (!bar) return;
    
      // Tus valores vienen 0–1 → convierto a %
      const percent = Math.round(clamp01(num(value)) * 100);
    
      // Si hay un hijo .fill usarlo; si no, la propia barra
      const target = bar.querySelector(".fill") || bar;
      target.style.width = percent + "%";
      if ("textContent" in target) target.textContent = percent + "%";
    };
    
    setProgress("bar-hp",    data.hp);
    setProgress("bar-mood",  data.mood);
    setProgress("bar-focus", data.focus);
    
    // ============= XP Y NIVEL =============
    const xpActual     = num(data.xp);
    const nivelActual  = num(data.nivel);
    const xpFaltante   = num(data.xp_faltante);
    const expObjetivo  = num(data.exp_objetivo, 0);
    
    // Textos
    putText("xp-actual",    xpActual);
    putText("nivel-actual", nivelActual);
    putText("xp-faltante",  xpFaltante);
    
    // Progreso de nivel (evita NaN y divide-by-0)
    let progresoNivel = 0;
    if (expObjetivo > 0) {
      progresoNivel = Math.round(clamp01(xpActual / expObjetivo) * 100);
    }
    
    const barNivel = document.getElementById("bar-nivel");
    if (barNivel) {
      const target = barNivel.querySelector(".fill") || barNivel;
      target.style.width = progresoNivel + "%";
      if ("textContent" in target) target.textContent = progresoNivel + "%";
    }
  
    // 🧿 RADAR DE RASGOS
    function calcularXPporRasgoDesdeBBDD(bbdd, habitos_logrados, habitos_by_rasgo) {
      const xpPorRasgo = {};
    
      // 1) Suma desde BBDD (lo que ya tenías)
      (bbdd || []).forEach(row => {
        const rasgo = row && row.rasgo;
        const exp   = Number(row && row.exp) || 0;
        if (!rasgo) return;
        xpPorRasgo[rasgo] = (xpPorRasgo[rasgo] || 0) + exp;
      });
    
      // 2) Suma desde Hábitos Logrados
      //    a) si vino el agregado del backend, úsalo directo (más barato)
      if (habitos_by_rasgo && typeof habitos_by_rasgo === 'object') {
        for (const r in habitos_by_rasgo) {
          const exp = Number(habitos_by_rasgo[r]) || 0;
          if (!r) continue;
          xpPorRasgo[r] = (xpPorRasgo[r] || 0) + exp;
        }
      } else {
        //    b) si no vino el agregado, sumar desde la lista A:G
        (habitos_logrados || []).forEach(h => {
          const rasgo = h && h.rasgo;
          const exp   = Number(h && h.exp) || 0;
          if (!rasgo) return;
          xpPorRasgo[rasgo] = (xpPorRasgo[rasgo] || 0) + exp;
        });
      }
    
      // 3) Salida ordenada (desc por XP) para que el radar sea estable
      const entries = Object.entries(xpPorRasgo).sort((a,b)=> b[1]-a[1]);
      const labels  = entries.map(([r]) => r);
      const values  = entries.map(([,v]) => v);
      return { labels, values };
    }
  
    // const radarCanvas = document.getElementById("radarChart");
    // const radarData = data.bbdd ? calcularXPporRasgoDesdeBBDD(data.bbdd) : { labels: [], values: [] };

    const radarCanvas = document.getElementById("radarChart");
    const radarData = calcularXPporRasgoDesdeBBDD(
      data.bbdd,
      data.habitos_logrados,
      data.habitos_by_rasgo
    );
  
    new Chart(radarCanvas, {
      type: "radar",
      data: {
        labels: radarData.labels,
        datasets: [{
          data: radarData.values,
          fill: true,
          borderColor: "rgba(102, 0, 204, 1)",
          backgroundColor: "rgba(102, 0, 204, 0.2)",
          pointBackgroundColor: "rgba(102, 0, 204, 1)"
        }]
      },
      options: {
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false },
          datalabels: {
            color: '#fff',
            font: { size: 12, weight: 'bold' },
            formatter: (value) => value
          }
        },
        scales: {
          r: {
            suggestedMin: 0,
            // suggestedMax: Math.max(...radarData.values, 10),
            suggestedMax: Math.max(10, ...(radarData.values || [])),
            pointLabels: {
              color: "#ffffff",
              font: { family: "'Sora', 'Manrope', sans-serif", size: 13 }
            },
            grid: { color: "#444" },
            angleLines: { color: "#555" },
            ticks: { display: false }
          }
        }
      },
      plugins: [ChartDataLabels]
    });
  
    // 🪴 DAILY CULTIVATION
    function formatMonthName(monthStr) {
      const [year, month] = monthStr.split("-");
      const meses = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sept","Oct","Nov","Dic"];
      return `${meses[parseInt(month, 10) - 1]} ${year}`;
    }
  
    function renderMonthSelector(dataArr) {
      const monthSelector = document.getElementById("month-select");
      if (!monthSelector) return;
  
      const uniqueMonths = [...new Set(dataArr.map(item => {
        const d = new Date(item.fecha);
        if (isNaN(d)) return null;
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      }))].filter(Boolean);
  
      monthSelector.innerHTML = "";
      uniqueMonths.forEach(month => {
        const option = document.createElement("option");
        option.value = month;
        option.textContent = formatMonthName(month);
        monthSelector.appendChild(option);
      });
  
      const currentMonth = new Date().toISOString().slice(0, 7);
      monthSelector.value = uniqueMonths.includes(currentMonth) ? currentMonth : uniqueMonths[0];
  
      const selectedInit = monthSelector.value;
      renderXPChart(dataArr.filter(item => item.fecha.startsWith(selectedInit)));
  
      monthSelector.addEventListener("change", () => {
        const selected = monthSelector.value;
        const filtered = dataArr.filter(item => item.fecha.startsWith(selected));
        renderXPChart(filtered);
      });
    }
  
    let xpChart;
    function renderXPChart(arr) {
      const ctx = document.getElementById("xpChart").getContext("2d");
      if (xpChart) xpChart.destroy();
  
      const fechas = arr.map(entry => entry.fecha);
      const xp = arr.map(entry => entry.xp);
  
      xpChart = new Chart(ctx, {
        type: "line",
        data: {
          labels: fechas,
          datasets: [{
            // label: "XP", // (quitamos label para no mostrar en leyenda)
            data: xp,
            borderColor: "#B17EFF",
            backgroundColor: "rgba(177,126,255,0.2)",
            borderWidth: 2,
            tension: 0.3,
            fill: true,
            pointRadius: 3,
            pointBackgroundColor: "#B17EFF"
          }]
        },
        options: {
          responsive: true,
          plugins: {
            tooltip: { enabled: false },
            legend: { display: false }, // 👈 ocultamos la leyenda
            datalabels: {
              color: "#fff",
              font: { size: 11, weight: "bold" },
              align: "top",
              formatter: value => value
            }
          },
          scales: {
            x: {
              ticks: { color: "white", font: { size: 13 } }
            },
            y: {
              ticks: { color: "white", beginAtZero: true }
            }
          }
        },
        plugins: [ChartDataLabels]
      });
    }
  
    if (data.daily_cultivation && Array.isArray(data.daily_cultivation)) {
      renderMonthSelector(data.daily_cultivation);
    } else {
      console.warn("⚠️ No hay datos válidos para Daily Cultivation");
    }
  

    
    // ========================
    // 💖 EMOTION CHART — iOS/Android/Web safe + auto-init
    // ========================
    (function () {
      // ---------- util de fecha (tolerante y sin UTC) ----------
      function parseAnyDate(str) {
        if (!str) return null;
        if (str.includes("/")) { // dd/mm/yyyy
          const [d, m, y] = str.split("/").map(n => parseInt(n, 10));
          if (!y || !m || !d) return null;
          return new Date(y, m - 1, d);
        }
        if (str.includes("-")) { // yyyy-mm-dd
          const [y, m, d] = str.split("-").map(n => parseInt(n, 10));
          if (!y || !m || !d) return null;
          return new Date(y, m - 1, d);
        }
        return null;
      }
      function ymd(d) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
      }
    
      // ---------- renderer ----------
      function renderEmotionChart(dailyEmotion) {
        const normalize = (s) => (s || "").replace(/neutral/i, "Cansancio").trim();
    
        const emotionKey = {
          "Calma": "CALMA",
          "Felicidad": "FELI",
          "Motivación": "MOTI",
          "Tristeza": "TRIS",
          "Ansiedad": "ANSI",
          "Frustración": "FRUS",
          "Cansancio": "CANS"
        };
        const keyToName = {
          CALMA: "Calma", FELI: "Felicidad", MOTI: "Motivación",
          TRIS: "Tristeza", ANSI: "Ansiedad", FRUS: "Frustración",
          CANS: "Cansancio", NONE: "Sin registro"
        };
        const keyToColor = {
          CALMA:"#2ECC71", FELI:"#F1C40F", MOTI:"#9B59B6",
          TRIS:"#3498DB",  ANSI:"#E74C3C", FRUS:"#8D6E63",
          CANS:"#16A085",  NONE:"#555555"
        };
    
        const wrap = document.getElementById("emotionChart");
        if (!wrap) return;
        wrap.innerHTML = "";
    
        // fecha -> emoción
        const emotionMap = Object.create(null);
        for (const entry of dailyEmotion || []) {
          const d = parseAnyDate(entry.fecha);
          const k = emotionKey[ normalize(entry.emocion) ];
          if (d && k) emotionMap[ ymd(d) ] = k;
        }
    
        const sortedDates = Object.keys(emotionMap).sort();
        if (sortedDates.length === 0) return;
    
        // domingo de la primera semana (local)
        const start = parseAnyDate(sortedDates[0]);
        start.setHours(0,0,0,0);
        start.setDate(start.getDate() - start.getDay()); // 0 = dom
    
        const NUM_WEEKS = 26;
        const DAYS_IN_WEEK = 7;
    
        // etiquetas de mes (una por semana)
        const monthLabelsContainer = document.createElement("div");
        monthLabelsContainer.className = "month-labels";
    
        const gridContainer = document.createElement("div");
        gridContainer.className = "emotion-grid";
    
        let currentMonth = -1;
        for (let col = 0; col < NUM_WEEKS; col++) {
          const labelDate = new Date(start);
          labelDate.setDate(start.getDate() + col * 7);
          const m = labelDate.getMonth();
    
          const label = document.createElement("div");
          label.className = "month-label";
          label.textContent = (m !== currentMonth)
            ? labelDate.toLocaleString("es-ES", { month: "short" })
            : "";
          currentMonth = m;
    
          // si cambiaste tamaño de celda/gap, ajusta este ancho
          label.style.width = "14px";
          monthLabelsContainer.appendChild(label);
        }
    
        for (let row = 0; row < DAYS_IN_WEEK; row++) {
          const rowDiv = document.createElement("div");
          rowDiv.className = "emotion-row";
    
          for (let col = 0; col < NUM_WEEKS; col++) {
            const cellDate = new Date(start);
            cellDate.setDate(start.getDate() + row + col * 7);
            const key = emotionMap[ ymd(cellDate) ] || "NONE";
    
            const cell = document.createElement("div");
            cell.className = "emotion-cell";
            cell.style.backgroundColor = keyToColor[key] || "#555";
            cell.title = `${ymd(cellDate)} – ${keyToName[key]}`;
            rowDiv.appendChild(cell);
          }
          gridContainer.appendChild(rowDiv);
        }
    
        wrap.appendChild(monthLabelsContainer);
        wrap.appendChild(gridContainer);
      }
    
      // ---------- destacado ----------
      function mostrarEmocionPrevalente(datos, dias = 15) {
        if (!Array.isArray(datos) || datos.length === 0) return;
        const norm = (s) => (s || "").replace(/neutral/i, "Cansancio").trim();
    
        const ordenados = [...datos].sort((a, b) => {
          const da = parseAnyDate(a.fecha);
          const db = parseAnyDate(b.fecha);
          return (db ? db.getTime() : 0) - (da ? da.getTime() : 0);
        });
    
        const recientes = ordenados.slice(0, dias);
        const contador = Object.create(null);
        for (const e of recientes) {
          const nombre = norm((e.emocion || "").split("–")[0].trim());
          if (nombre) contador[nombre] = (contador[nombre] || 0) + 1;
        }
    
        const top = Object.entries(contador).sort((a, b) => b[1] - a[1])[0];
        if (!top) return;
    
        const [nombreEmocion] = top;
        const colores = {
          "Calma":"#2ECC71","Felicidad":"#F1C40F","Motivación":"#9B59B6",
          "Tristeza":"#3498DB","Ansiedad":"#E74C3C","Frustración":"#8D6E63",
          "Cansancio":"#16A085"
        };
        const color = colores[nombreEmocion] || "#555";
    
        const cont = document.getElementById("emotion-destacada");
        if (cont) {
          cont.innerHTML = `
            <div class="emotion-highlight">
              <div class="big-box" style="background-color:${color};"></div>
              <div>
                <div class="emotion-name">${nombreEmocion}</div>
                <div class="emotion-info">Emoción más frecuente en los últimos ${dias} días</div>
              </div>
            </div>
          `;
        }
      }
    
      // ---------- orquestador (evita la carrera) ----------
      function drawIfReady() {
        const hasTarget = !!document.getElementById("emotionChart");
        const arr = window.data && window.data.daily_emotion;
        if (hasTarget && Array.isArray(arr) && arr.length) {
          renderEmotionChart(arr);
          mostrarEmocionPrevalente(arr, 15);
          return true;
        }
        return false;
      }
    
      // expone API por si querés llamarlo explícito desde tu loader
      window.GJEmotion = {
        draw: (arr) => { renderEmotionChart(arr || (window.data?.daily_emotion || [])); mostrarEmocionPrevalente(arr || (window.data?.daily_emotion || []), 15); },
        renderEmotionChart,
        mostrarEmocionPrevalente
      };
    
      // intenta ahora, luego en eventos, y con un retry breve (SPA/webview)
      if (!drawIfReady()) {
        document.addEventListener("DOMContentLoaded", drawIfReady, { once:true });
        window.addEventListener("load", drawIfReady, { once:true });
        window.addEventListener("gj:data-ready", drawIfReady);
        const retry = setInterval(() => { if (drawIfReady()) clearInterval(retry); }, 200);
        setTimeout(() => clearInterval(retry), 8000);
      }
    })();


    
    // REWARDS
    document.getElementById("rewardsContainer").innerHTML = "<p>(🪄Rewards WIP - Very Soon)</p>";
  
    // MISIONES
    const missionsWrapper = document.getElementById("missions-wrapper");
    (data.misiones || []).forEach((m) => {
      const card = document.createElement("div");
      card.className = "mission-card";
      card.innerHTML = `
        <h4>🎯 ${m.nombre}</h4>
        <p><strong>Pilar:</strong> ${m.pilar}</p>
        <p><strong>Rasgo:</strong> ${m.rasgo}</p>
        <p><strong>Tasks:</strong> ${m.tasks.join(", ")}</p>
        <p><strong>Semanas necesarias:</strong> ${m.constancia_semanas}</p>
        <p><strong>XP:</strong> ${m.xp}</p>
        <button>Activar</button>
      `;
      missionsWrapper.appendChild(card);
    });
  
    // MENÚ HAMBURGUESA
    const menuToggle = document.getElementById("menu-toggle");
    const dashMenu = document.getElementById("dashboard-menu");
    if (menuToggle && dashMenu) {
      menuToggle.addEventListener("click", () => dashMenu.classList.toggle("active"));
      document.addEventListener("click", (e) => {
        if (!dashMenu.contains(e.target) && e.target !== menuToggle) dashMenu.classList.remove("active");
      });
    }
  
    // --- Responsiveness / resize for charts ---
    const radarCanvasEl = document.getElementById('radarChart');
    const getRadarChart = () => {
      try { return Chart.getChart(radarCanvasEl); } catch { return null; }
    };
  
    const resizeTargets = [
      document.getElementById('radarChartContainer'),
      document.getElementById('xpChart')?.parentElement
    ].filter(Boolean);
  
    const ro = new ResizeObserver(() => {
      const rc = getRadarChart();
      if (rc) rc.resize();
      if (typeof xpChart !== 'undefined' && xpChart) xpChart.resize();
    });
    resizeTargets.forEach(t => ro.observe(t));
  
    window.addEventListener('resize', () => {
      const rc = getRadarChart();
      if (rc) rc.resize();
      if (typeof xpChart !== 'undefined' && xpChart) xpChart.resize();
    });

  } catch (err) {
    console.error("Error cargando datos del dashboard:", err);
  } finally {
    hideSpinner(); // siempre se oculta al final
  }
});


// —— util común ——
const __isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
const __isStandalone = (() => {
  try { return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone; }
  catch { return false; }
})();
const __isIOSPWA = __isIOS && __isStandalone;

function __bundleStamp(b){
  return (b && (b.updated_at || b.worker_updated_at || b.version || b.worker_version)) || '';
}

async function __fetchBundleFresh(email){
  const base = (typeof WORKER_BASE !== 'undefined' && WORKER_BASE) || '';
  if (!base) throw new Error('WORKER_BASE no definido');
  const r = await fetch(`${base}/bundle?email=${encodeURIComponent(email)}&t=${Date.now()}`, { cache:'no-store' });
  if (!r.ok) throw new Error('bundle fetch failed');
  const fresh = await r.json();
  // fuente de verdad + cache local
  window.GJ_BUNDLE = fresh;
  try { localStorage.setItem('gj_bundle', JSON.stringify(fresh)); } catch {}
  // avisar a todos los módulos UI
  window.dispatchEvent(new CustomEvent('gj:bundle-updated', { detail: fresh }));
  return fresh;
}

async function __refreshAllSoft(email, { clearPopupsLocal = false } = {}){
  // 1) pedir al backend que regenere KV en Worker
  await refreshBundle(email);

  // 2) traer bundle fresco y repintar (sin recarga)
  const before = __bundleStamp(window.GJ_BUNDLE);
  const fresh  = await __fetchBundleFresh(email);
  const after  = __bundleStamp(fresh);

  // 3) PopUps (re-fetch WebApp sin caché + render)
  await refreshPopupsAfterBundle(email, { clearLocal: clearPopupsLocal });

  // 4) Notificaciones (si tenés módulo)
  await window.refreshNotifications?.(email);

  return { before, after };
}

function __hardReload(){
  const u = new URL(location.href);
  u.searchParams.set('r', Date.now());
  location.replace(u.toString());
}

// —— Después de refrescar el bundle/KV, volver a pedir PopUps ——
// (queda igual, lo usa __refreshAllSoft internamente)
async function refreshPopupsAfterBundle(email, { clearLocal = false } = {}) {
  if (clearLocal && window.GJPopups && typeof window.GJPopups.clearLocal === 'function') {
    try { window.GJPopups.clearLocal(email); } catch(_) {}
  }
  if (window.GJPopups && typeof window.GJPopups.run === 'function') {
    try { await window.GJPopups.run(); } catch(_) {}
  }
}

// === BOTÓN ACTUALIZAR (bind seguro para mobile) ===
(function attachRefreshButton () {
  const SEL = '#refresh-kv, [data-action="refresh-kv"]';

  function bind(){
    const btn = document.querySelector(SEL);
    if (!btn || btn.dataset.gjBound) return;
    btn.dataset.gjBound = '1';

    let cooling = false;

    const handler = async (e) => {
      e.preventDefault();
      if (cooling) return;
      cooling = true;

      const email = (window.GJ_CTX && window.GJ_CTX.email)
                 || new URLSearchParams(location.search).get('email');
      if (!email) { alert('Falta email'); cooling = false; return; }

      const clearPopupsLocal = btn.hasAttribute('data-clear-popups');

      try {
        btn.classList.add('is-loading');
        if (window.toast) toast.info('Actualizando…');

        // —— SOFT refresh primero
        const { before, after } = await __refreshAllSoft(email, { clearPopupsLocal });

        // —— fallback duro si el stamp no cambió (típico iOS PWA) 
        if (before === after || __isIOSPWA) {
          await new Promise(r => setTimeout(r, 300));
          __hardReload();
          return;
        }

        // listo sin recarga
        if (window.toast) toast.success('Actualizado ✨');
      } catch (err) {
        console.error(err);
        if (window.toast) toast.error('No se pudo actualizar ahora');
        // como red de seguridad, intentá recarga dura
        __hardReload();
        return;
      } finally {
        btn.classList.remove('is-loading');
        setTimeout(() => (cooling = false), 1200);
      }
    };

    // iOS a veces no dispara click → sumo touchend/pointerup
    btn.addEventListener('click',     handler, { passive:false });
    btn.addEventListener('touchend',  handler, { passive:false });
    btn.addEventListener('pointerup', handler, { passive:false });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind, { once:true });
  } else {
    bind();
  }
})();

// —— Pull-to-Refresh móvil (iOS/Android) — usa el mismo flujo que el botón
(function attachPullToRefresh () {
  const SC = document.scrollingElement || document.documentElement;
  let startY = 0, pulling = false, fired = false;
  const TH = 70;

  let tip;
  function showTip(y){
    if (!tip){
      tip = document.createElement('div');
      tip.id = 'gj-ptr-tip';
      tip.style.cssText = 'position:fixed;top:8px;left:50%;transform:translate(-50%,-40px);' +
        'padding:6px 10px;border-radius:12px;background:rgba(0,0,0,.45);color:#fff;' +
        'font-size:12px;z-index:9999;transition:transform .2s,opacity .2s;opacity:0;';
      tip.textContent = 'Soltá para actualizar…';
      document.body.appendChild(tip);
    }
    tip.style.opacity = '1';
    tip.style.transform = `translate(-50%,${Math.min(0, y-40)}px)`;
  }
  function hideTip(){ if (tip){ tip.style.opacity='0'; tip.style.transform='translate(-50%,-40px)'; } }
  const atTop = () => (SC.scrollTop || 0) <= 0;

  document.addEventListener('touchstart', (e)=>{
    if (!atTop()) return;
    startY = e.touches[0].clientY;
    pulling = true; fired = false;
  }, { passive:true });

  document.addEventListener('touchmove', (e)=>{
    if (!pulling) return;
    const dy = e.touches[0].clientY - startY;
    if (atTop() && dy > 10) showTip(Math.min(TH, dy/2));
    if (atTop() && dy > TH && !fired){
      fired = true; hideTip();

      const email = (window.GJ_CTX && window.GJ_CTX.email)
                 || new URLSearchParams(location.search).get('email');
      if (!email) return;

      (async ()=>{
        try{
          if (window.toast) toast.info('Actualizando…');

          // —— SOFT refresh primero
          const { before, after } = await __refreshAllSoft(email);

          // —— fallback duro si no cambió o si es iOS PWA
          if (before === after || __isIOSPWA) {
            await new Promise(r => setTimeout(r, 250));
            __hardReload();
            return;
          }

          if (window.toast) toast.success('Actualizado ✨');
        }catch(err){
          console.warn(err);
          if (window.toast) toast.error('No se pudo actualizar');
          __hardReload();
        }
      })();
    }
  }, { passive:true });

  document.addEventListener('touchend', ()=>{
    pulling = false; setTimeout(hideTip, 120);
  }, { passive:true });
})();



// // —— Después de refrescar el bundle/KV, volver a pedir PopUps ——
// async function refreshPopupsAfterBundle(email, { clearLocal = false } = {}) {
//   // Si querés forzar re-aparición total en pruebas, usá clearLocal=true
//   if (clearLocal && window.GJPopups && typeof window.GJPopups.clearLocal === 'function') {
//     try { window.GJPopups.clearLocal(email); } catch(_) {}
//   }
//   // Re-ejecuta la lógica de popups (fetch al WebApp con cache:no-store)
//   if (window.GJPopups && typeof window.GJPopups.run === 'function') {
//     try { await window.GJPopups.run(); } catch(_) {}
//   }
// }


// // === BOTÓN ACTUALIZAR (bind seguro para mobile) ===
// (function attachRefreshButton () {
//   const SEL = '#refresh-kv, [data-action="refresh-kv"]';

//   function bind(){
//     const btn = document.querySelector(SEL);
//     if (!btn || btn.dataset.gjBound) return;
//     btn.dataset.gjBound = '1';

//     let cooling = false;

//     // === Handler que te funcionaba (refresh + reload) ===
//     const handler = async (e) => {
//       e.preventDefault();
//       if (cooling) return;
//       cooling = true;

//       const email = (window.GJ_CTX && window.GJ_CTX.email)
//                  || new URLSearchParams(location.search).get('email');
//       if (!email) { alert('Falta email'); cooling = false; return; }

//       try {
//         btn.classList.add('is-loading');

//         // actualiza el KV en el Worker (usa tu refreshBundle tal cual)
//         await refreshBundle(email);  // (mode por defecto = 'reload' → puede recargar)

//         // feedback
//         if (window.toast) toast.success('Actualizado ✨');

//         // pequeña pausa y recarga dura para asegurar render inmediato en iOS
//         await new Promise(r => setTimeout(r, 400));
//         const u = new URL(location.href); u.searchParams.set('r', Date.now());
//         location.replace(u.toString());
//         return;
//       } catch (err) {
//         console.error(err);
//         alert('No se pudo actualizar ahora.');
//       } finally {
//         btn.classList.remove('is-loading');
//         setTimeout(() => (cooling = false), 1500);
//       }
//     };

//     // iOS a veces no dispara click → sumo touchend/pointerup
//     btn.addEventListener('click',     handler, { passive:false });
//     btn.addEventListener('touchend',  handler, { passive:false });
//     btn.addEventListener('pointerup', handler, { passive:false });
//   }

//   // Si el botón aún no existe, enganchá al cargar el DOM
//   if (document.readyState === 'loading') {
//     document.addEventListener('DOMContentLoaded', bind, { once:true });
//   } else {
//     bind();
//   }
// })();




// // —— Pull-to-Refresh móvil (iOS/Android) — usa el mismo flujo que el botón
// (function attachPullToRefresh () {
//   const SC = document.scrollingElement || document.documentElement;
//   let startY = 0, pulling = false, fired = false;
//   const TH = 70;

//   let tip;
//   function showTip(y){
//     if (!tip){
//       tip = document.createElement('div');
//       tip.id = 'gj-ptr-tip';
//       tip.style.cssText = 'position:fixed;top:8px;left:50%;transform:translate(-50%,-40px);' +
//         'padding:6px 10px;border-radius:12px;background:rgba(0,0,0,.45);color:#fff;' +
//         'font-size:12px;z-index:9999;transition:transform .2s,opacity .2s;opacity:0;';
//       tip.textContent = 'Soltá para actualizar…';
//       document.body.appendChild(tip);
//     }
//     tip.style.opacity = '1';
//     tip.style.transform = `translate(-50%,${Math.min(0, y-40)}px)`;
//   }
//   function hideTip(){ if (tip){ tip.style.opacity='0'; tip.style.transform='translate(-50%,-40px)'; } }
//   const atTop = () => (SC.scrollTop || 0) <= 0;

//   document.addEventListener('touchstart', (e)=>{
//     if (!atTop()) return;
//     startY = e.touches[0].clientY;
//     pulling = true; fired = false;
//   }, { passive:true });

//   document.addEventListener('touchmove', (e)=>{
//     if (!pulling) return;
//     const dy = e.touches[0].clientY - startY;
//     if (atTop() && dy > 10) showTip(Math.min(TH, dy/2));
//     if (atTop() && dy > TH && !fired){
//       fired = true; hideTip();

//       const email = (window.GJ_CTX && window.GJ_CTX.email)
//                  || new URLSearchParams(location.search).get('email');
//       if (!email) return;

//       (async ()=>{
//         try{
//           if (window.toast) toast.info('Actualizando…');
//           await refreshBundle(email); // mismo flujo que botón (reload por defecto)
//           await new Promise(r => setTimeout(r, 300));
//           const u = new URL(location.href); u.searchParams.set('r', Date.now());
//           location.replace(u.toString());
//         }catch(err){
//           console.warn(err);
//           if (window.toast) toast.error('No se pudo actualizar');
//         }
//       })();
//     }
//   }, { passive:true });

//   document.addEventListener('touchend', ()=>{
//     pulling = false; setTimeout(hideTip, 120);
//   }, { passive:true });
// })();






// ===== CAMBIAR AVATAR abrir/cerrar + subir a ImgBB + persistir en Sheet =====
  // ===== Config del Form que actualiza el avatar =====
  const AVATAR_FORM = {
    ACTION: "https://docs.google.com/forms/u/0/d/e/1FAIpQLScFl3MFsLSos0OEnW9mTI2eZ3DpRBmfq8o29fgKLxEKpXX4Kg/formResponse", // <-- FORM_ACTION
    ENTRY_EMAIL: "entry.158494973",        // <-- ENTRY para email
    ENTRY_AVATAR: "entry.1736118796"        // <-- ENTRY para avatar URL
  };
  
  // ===== Subida a ImgBB (igual que en tu SignUp) =====
  async function uploadToImgBB(file){
    const IMGBB_KEY = "b78f6fa1f849b2c8fcc41ba4b195864f"; // misma key
    const reader = new FileReader();
  
    return new Promise((resolve, reject)=>{
      reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
      reader.onloadend = async () => {
        try {
          const base64 = String(reader.result).split(",")[1];
          const resp = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, {
            method: "POST",
            body: new URLSearchParams({ image: base64 })
          });
          const data = await resp.json();
          const url = data?.data?.url;
          url ? resolve(url) : reject(new Error("Respuesta inválida de ImgBB"));
        } catch (err) { reject(err); }
      };
      reader.readAsDataURL(file);
    });
  }
  
  // ===== Enviar al Google Form (no-cors, como en SignUp) =====
  async function sendAvatarToForm(email, avatarUrl){
    const fd = new FormData();
    fd.append(AVATAR_FORM.ENTRY_EMAIL, email);
    fd.append(AVATAR_FORM.ENTRY_AVATAR, avatarUrl);
  
    await fetch(AVATAR_FORM.ACTION, {
      method: "POST",
      mode: "no-cors",
      body: fd
    });
    // no-cors no permite leer respuesta → asumimos éxito como en SignUp
  }
  
  // ===== Integración con el popup del Dashboard =====
  // ===== Integración con el popup del Dashboard =====
  (() => {
    const openBtn   = document.getElementById('edit-avatar');
    const modal     = document.getElementById('avatarPopup');
    const closeBtn  = document.getElementById('closeAvatarPopup');
    const cancelBtn = document.getElementById('cancelAvatar');
    const confirmBtn= document.getElementById('confirmAvatar');
    const inputFile = document.getElementById('newAvatarInput');
    const statusEl  = document.getElementById('avatarStatus');
    const avatarImg = document.getElementById('avatar');
    const current   = document.getElementById('currentAvatar');
  
    function showModal(){ modal?.classList.add('visible'); }
    function hideModal(){ modal?.classList.remove('visible'); statusEl.textContent=''; inputFile.value=''; }
  
    openBtn?.addEventListener('click', (e)=>{
      e.preventDefault();
      if (current && avatarImg) current.src = avatarImg.src || "";
      showModal();
    });
    closeBtn?.addEventListener('click', hideModal);
    cancelBtn?.addEventListener('click', hideModal);
  
    confirmBtn?.addEventListener('click', async ()=>{
      const file = inputFile?.files?.[0];
      if (!file){ alert("Elegí una imagen primero."); return; }
  
      const email = window.GJ_CTX?.email || new URLSearchParams(location.search).get('email') || "";
      if (!email){ alert("Falta email en la URL."); return; }
  
      try {
        statusEl.textContent = "Subiendo imagen…";
        const url = await uploadToImgBB(file);
  
        statusEl.textContent = "Actualizando tu perfil…";
        await sendAvatarToForm(email, url);
  
        // UI instantánea
        if (avatarImg) avatarImg.src = url;
        if (current)   current.src   = url;
  
        // Refrescar bundle sin F5 y confirmar contra backend cuando llegue la misma URL
        await refreshBundle(email, {
          mode: 'soft',
          expect: (b) => (b?.links?.avatar_url === url) || (b?.avatar_url === url)
        });
  
        statusEl.textContent = "Listo ✅";
        setTimeout(hideModal, 600);
      } catch (err) {
        console.error(err);
        statusEl.textContent = "Error: " + err.message;
      }
    });
  })();


// ====== REFRESH GENÉRICO (Worker pull) — extendido ======
async function refreshBundle(
  email,
  {
    mode = 'reload',               // 'reload' (igual que hoy) o 'soft' (sin F5)
    optimistic = null,             // ej: { firstprog_ok:1 } o { bbdd_ok:1 }
    expect = null,                 // ej: { L:'SI' }  ó  { 'scheduler.firstProgrammed':'SI' }  ó  fn(bundle)=>bool
    ttlPending = 10*60*1000,       // 10 min para mantener UI optimista
    retries = [2000, 5000, 10000]  // backoff para esperar bundle fresco
  } = {}
){
  if (!email) throw new Error('Falta email');
  if (window.__GJ_REFRESH_INFLIGHT) return; // dedupe simple
  window.__GJ_REFRESH_INFLIGHT = true;

  try {
    // 0) Aplicar optimista (instantáneo) si vino
    if (optimistic) {
      GJLocal.mergeFlags(email, optimistic);
      GJLocal.setPending(email, { op: (expect && expect.op) || 'generic', expect, ttlMs: ttlPending, optimistic });
      GJEvents.emit('gj:state-changed', { email, flags: GJLocal.getFlags(email), pending: GJLocal.getPending(email) });
    }

    // 1) Pedir al Worker que refresque desde WebApp → KV
    const r = await fetch(`${WORKER_BASE}/refresh-pull?email=${encodeURIComponent(email)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({ email })
    });
    if (!r.ok) throw new Error('refresh-pull failed: ' + r.status);

    // 2a) Modo clásico (no cambiamos nada de lo que ya hacías)
    if (mode === 'reload') { location.reload(); return; }

    // 2b) Modo soft: traemos bundle fresco con buster y backoff
    const prev = GJLocal.getBundle();
    const prevStamp = bundleStamp(prev);

    const fetchFresh = async () => {
      const url = `${WORKER_BASE}/bundle?email=${encodeURIComponent(email)}&t=${Date.now()}`;
      const resp = await fetch(url, { cache: 'no-store' });
      if (!resp.ok) throw new Error('bundle fetch failed: ' + resp.status);
      return await resp.json();
    };

    let fresh = await fetchFresh();
    let advanced = (bundleStamp(fresh) && (prevStamp ? bundleStamp(fresh) !== prevStamp : true));
    let ok = matchesExpect(fresh, expect) || advanced;

    for (let i=0; !ok && i<retries.length; i++) {
      await new Promise(res => setTimeout(res, retries[i]));
      fresh = await fetchFresh();
      advanced = (bundleStamp(fresh) && (prevStamp ? bundleStamp(fresh) !== prevStamp : true));
      ok = matchesExpect(fresh, expect) || advanced;
    }

    // 3) Snapshot + evento
    window.GJ_BUNDLE = fresh;
    GJLocal.saveBundle(fresh);
    GJEvents.emit('gj:bundle-updated', fresh);

    // 4) Reconciliación optimista ↔ backend
    const stillValid = GJLocal.isPendingValid(email);
    if (matchesExpect(fresh, expect)) {
      // confirmado por backend
      GJLocal.clearPending(email);
    } else if (!stillValid && optimistic) {
      // venció TTL y backend no confirmó → rollback del patch optimista
      const roll = Object.fromEntries(Object.keys(optimistic).map(k => [k, 0]));
      GJLocal.mergeFlags(email, roll);
      GJLocal.clearPending(email);
    }
    GJEvents.emit('gj:state-changed', { email, flags: GJLocal.getFlags(email), pending: GJLocal.getPending(email) });

    return fresh;
  } finally {
    window.__GJ_REFRESH_INFLIGHT = false;
  }
}



/* ========= InfoChip util v3 (fixed, viewport-safe) ===========================
   Uso declarativo:
     <h3 class="card-title" data-info="Texto..." data-info-pos="left"></h3>

   Uso por JS:
     attachInfoChip('.xp-box h3', 'Qué es el XP...', 'right')

   Cambios clave:
   - El pop usa position: FIXED -> no lo recortan contenedores ni overflow:hidden.
   - Colocación inteligente dentro del viewport (con margen).
   - Misma API que tu versión anterior.
============================================================================= */
/* ========= InfoChip util v4 — body-mounted, scroll-safe, iOS-safe ========= */
(function(){
  const MARGIN = 10;       // resguardo contra bordes
  const GAP_Y  = 2;        // separación del chip
  const TAP_GUARD_MS = 450;

  function _build(targetEl, html, pos){
    if (!targetEl) return;

    targetEl.classList.add('card-title-with-info');
    const anchor = String(pos || targetEl.dataset.infoPos || 'right').toLowerCase();

    // botón
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'info-chip' + (anchor === 'left' ? ' info-left' : '');
    chip.setAttribute('aria-label','Información');
    chip.textContent = 'i';

    // pop → lo montamos en <body> para evitar el bug de Safari/Android
    const pop = document.createElement('div');
    pop.className = 'info-pop';
    pop.innerHTML = html;
    // importante: el chip queda en el card, pero el pop va al body
    targetEl.appendChild(chip);
    document.body.appendChild(pop);

    let rafId = null, lastTouchTs = 0;

    function place(){
      // mostrar para medir
      pop.style.position = 'fixed';
      pop.style.display  = 'block';
      pop.classList.add('show');

      // ¡siempre recomputar con el chip que disparó!
      const r  = chip.getBoundingClientRect();
      const pw = pop.offsetWidth;
      const ph = pop.offsetHeight;

      // base horizontal segun ancla
      let left = (anchor === 'left' || chip.classList.contains('info-left'))
        ? Math.round(r.left)
        : Math.round(r.right - pw);

      // clamp horizontal
      if (left < MARGIN) left = MARGIN;
      if (left + pw > window.innerWidth - MARGIN){
        left = window.innerWidth - MARGIN - pw;
      }

      // vertical preferente: debajo
      let top = Math.round(r.bottom + GAP_Y);
      // si no entra, va arriba
      if (top + ph > window.innerHeight - MARGIN){
        top = Math.max(MARGIN, Math.round(r.top - ph - GAP_Y));
      }

      pop.style.left = left + 'px';
      pop.style.top  = top  + 'px';
    }

    function closeAll(){
      document.querySelectorAll('.info-pop.show').forEach(p=>{
        p.classList.remove('show');
        p.style.display = 'none';
      });
    }

    function toggle(e){
      if (e) e.stopPropagation();
      const wantShow = !pop.classList.contains('show');
      closeAll();
      if (wantShow) place();
    }

    chip.addEventListener('click', (e)=>{
      if (Date.now() - lastTouchTs < TAP_GUARD_MS) return;
      toggle(e);
    });
    chip.addEventListener('touchstart', (e)=>{ lastTouchTs = Date.now(); toggle(e); }, {passive:true});
    chip.addEventListener('mouseenter', place); // desktop

    // Reposicionar mientras esté visible
    const onScrollOrResize = ()=>{
      if (!pop.classList.contains('show')) return;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(place);
    };
    window.addEventListener('scroll', onScrollOrResize, {passive:true});
    document.addEventListener('scroll', onScrollOrResize, {passive:true});
    window.addEventListener('resize', onScrollOrResize);
    window.addEventListener('orientationchange', onScrollOrResize);

    // Cerrar en click fuera / ESC
    document.addEventListener('click', (e)=>{
      if (!e.target.closest('.info-pop') && !e.target.closest('.info-chip')){
        closeAll();
      }
    });
    document.addEventListener('keydown', (e)=>{
      if (e.key === 'Escape') closeAll();
    });
  }

  function initInfoChips(){
    document.querySelectorAll('[data-info]').forEach(el=>{
      if (el.dataset.infoInit === '1') return;
      el.dataset.infoInit = '1';
      _build(el, el.dataset.info, (el.dataset.infoPos||'right'));
    });
  }

  window.attachInfoChip = function(selector, text, position){
    const el = document.querySelector(selector);
    _build(el, text, (position||'right'));
  };

  document.addEventListener('DOMContentLoaded', initInfoChips);
})();
