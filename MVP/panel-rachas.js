/* panel-rachas.js — componente + adaptador (browser global) */
(function (global) {
  const MODES = { Low:1, Chill:2, Flow:3, Evolve:4 };
  const $  = (sel,el=document)=>el.querySelector(sel);
  const $$ = (sel,el=document)=>[...el.querySelectorAll(sel)];
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const pct=(done,goal)=>clamp(Math.round((done/goal)*100),0,100);
  const stateClass=(done,goal)=> done>=goal ? 'ok' : (done/goal>=.5 ? 'warn' : 'bad');

  // --- debug toggle ---
  const DEBUG_RACHAS = false;
  const dbg = (...a)=>{ if (DEBUG_RACHAS) try{ console.log(...a); } catch(_){} };

  // Barras: Mes = semanas; 3M = meses agregados
  // Barras: Mes = semanas; 3M = meses agregados
  // +labels opcional: ['1','2','3','4','5'] ó ['J','A','S']
  function weeklyBars(values, goal, labels){
    if(!Array.isArray(values) || values.length===0) return '';
    const BASE = 20, EXTRA = 6, g = Math.max(1, goal|0);
    const bars = values.map(v=>{
      const n = Math.max(0, Number(v)||0);
      if (n < g)  { const h = Math.max(6, Math.round(BASE*(n/g))); return `<b class="miss" style="height:${h}px"></b>`; }
      if (n === g){ return `<b class="hit" style="height:${BASE}px"></b>`; }
      const h = BASE + (n - g) * EXTRA;
      return `<b class="over" style="height:${h}px"></b>`;
    }).join('');
  
    const lab = (Array.isArray(labels) && labels.length===values.length)
      ? `<div class="labels">${labels.map(t=>`<i>${t}</i>`).join('')}</div>`
      : '';
  
    return `<div class="wkbars" style="--bars:${values.length}">${bars}${lab}</div>`;
  }
  // Mini barras verdes (Top-3): semanas del MES actual vs goal
  function miniWeeklyBars(values, goal){
    if(!Array.isArray(values) || values.length===0) return '';
    const g = Math.max(1, goal|0);
    return `<span class="wkmini">${
      values.map(v=>{
        const n = Math.max(0, Number(v)||0);
        if (n < g)  return `<b class="miss"></b>`;
        if (n === g) return `<b class="hit"></b>`;
        return `<b class="over"></b>`;
      }).join('')
    }</span>`;
  }

  // === Componente ===
  function mount(target, { initialState, dataProvider }){
    const root = (typeof target==='string') ? document.querySelector(target) : target;
    const S = Object.assign({ mode:'Flow', pillar:'Body', range:'month', query:'' }, initialState||{});

    // UI
    root.innerHTML = `
      <div class="box">
        <!-- FILA 1: derecha -> Game Mode + Info (ℹ️ a la DERECHA, pegado al borde) -->
        <div class="row row-top">
          <div class="seg seg-right">
            <span class="chip mode ${S.mode.toLowerCase()}" data-role="modeChip">
              🎮 ${S.mode} · <b>${MODES[S.mode]}×/sem</b>
            </span>
            <span id="rachasInfoTop"></span>
          </div>
        </div>
    
        <!-- FILA 2: tabs centrados en una sola línea -->
        <div class="row row-pills">
          <div class="seg seg-pillars" data-role="pillars">
            <button aria-pressed="${S.pillar==='Body'}" data-p="Body">🫀 Body</button>
            <button aria-pressed="${S.pillar==='Mind'}" data-p="Mind">🧠 Mind</button>
            <button aria-pressed="${S.pillar==='Soul'}" data-p="Soul">🏵️ Soul</button>
          </div>
        </div>
    
        <div class="streaks" data-role="streaks" style="display:none">
          <div class="stitle">🔥 Top 3 rachas <span class="muted">— días consecutivos sin cortar</span></div>
          <div class="slist" data-role="top3"></div>
        </div>
    
        <!-- FILA 3: tabs de rango CENTRADOS, con ℹ️ a la derecha -->
        <div class="row row-range" style="margin-top:8px">
          <div class="seg" data-role="range">
            <button aria-pressed="${S.range==='week'}"  data-r="week">Sem</button>
            <button aria-pressed="${S.range==='month'}" data-r="month">Mes</button>
            <button aria-pressed="${S.range==='qtr'}"   data-r="qtr">3M</button>
          </div>
          <span id="rachasInfoScope"></span>
        </div>
    
        <div class="filter"><input type="search" data-role="q" placeholder="Filtrar tareas… (ej.: ayuno)"></div>
        <div class="list" data-role="list"></div>
        <div class="muted" style="margin-top:8px">
          Tip: ✓×N = veces en el período · +XP = XP acumulado · 🔥 = racha (semanas).
          La barra muestra tu <b>progreso semanal</b> (hechas/N). En <b>Mes</b>: semanas; en <b>3M</b>: 3 barras (meses).
        </div>
      </div>
    `;

    // CSS (una vez)
    if (!document.getElementById('panel-rachas-styles')) {
      const css = document.createElement('style'); css.id='panel-rachas-styles';
      css.textContent = `
        .third{max-width:560px;margin:0 auto 18px;width:100%}
        @media(min-width:1160px){.third{max-width:33vw}}
        /* Box principal con glass claro (estilo Simplicity) */
        .box{
          /* tokens */
          --glass-blur: 18px;
          --glass-bg: rgba(255,255,255,.06);        /* blanco lechoso */
          --glass-br: rgba(255,255,255,.22);        /* borde claro */
          --glass-shadow: 0 12px 30px rgba(0,0,0,.35);
        
          position:relative; overflow:hidden;
          border-radius:28px;                        /* radio grande como el ref */
          background:var(--glass-bg);
          backdrop-filter: blur(var(--glass-blur)) saturate(140%);
          -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(140%);
          border:1px solid var(--glass-br);
          box-shadow:var(--glass-shadow);
        
          /* más respiro horizontal sin tocar el spacing vertical que ya te gusta */
          padding:9px 13px 9px;
        }
        /* destellos lila/azul muy suaves detrás (como el ref) */
        .box::before{
          content:""; position:absolute; inset:-30% -8% auto -8%; height:260px;
          background:
            radial-gradient(140px 140px at 22% 68%, rgba(168,120,255,.18), transparent 60%),
            radial-gradient(190px 190px at 78% 30%, rgba(55,170,255,.18),  transparent 60%);
          filter:blur(10px) saturate(120%); pointer-events:none;
        }
        
        /* Cards internas con una capa de glass un poco más opaca para “doble vidrio” */
        .task{
          background:linear-gradient(180deg, rgba(255,255,255,.07), rgba(255,255,255,.05));
          border:1px solid rgba(255,255,255,.14);
          border-radius:16px;
          padding:9px 9px;              /* respiro lateral de cada card */
        }
        
        /* margen lateral de la lista para que las cards no “toquen” el vidrio */
        .list{ padding:0 5px 7px; }
        .row{display:flex;align-items:center;justify-content:space-between;gap:10px}
        .seg{display:flex;gap:8px;flex-wrap:wrap}
        .seg button{background:#1a2240;border:1px solid #24325a;color:#cfd6ff;padding:7px 11px;border-radius:999px;font-weight:800;cursor:pointer}
        .seg button[aria-pressed="true"]{background:#eef2ff;color:#0f1630;border-color:transparent}
        /* === Info chips: fijar anclaje y que se vean como botoncito === */
        #rachasInfoTop, #rachasInfoScope{
          position: relative;            /* ancla local para estilos globales */
          display: inline-flex; 
          align-items: center;
          min-width: 22px;               /* evita colapso del contenedor */
        }
        
        /* Si tu CSS global posiciona .info-chip en absolute, acá lo neutralizamos */
        #rachasInfoTop .info-chip,
        #rachasInfoScope .info-chip{
          position: static !important;   /* que fluya como botón común */
          margin-left: 6px;
        }
        
        /* Opcional: tamaño/estética consistente con tus tabs */
        #rachasInfoTop .info-chip,
        #rachasInfoScope .info-chip{
          width: 26px; height: 26px; border-radius: 999px;
          background:#1a2240; border:1px solid #24325a; color:#cfd6ff;
          font-weight:800; line-height:1; cursor:pointer;
        }
        .chip{background:#1a2037;border:1px solid #2a3560;color:#d6dcff;padding:6px 9px;border-radius:999px;font-weight:800;display:inline-flex;align-items:center;gap:8px}
        .chip.mode{--modeFlow:#1f7aff;background:color-mix(in srgb, var(--modeFlow) 12%, #0c1124);border-color:color-mix(in srgb, var(--modeFlow) 40%, #2a3560)}
        .chip.mode.low{--modeFlow:#7d7fff}.chip.mode.chill{--modeFlow:#7bc6ff}.chip.mode.flow{--modeFlow:#1f7aff}.chip.mode.evolve{--modeFlow:#20d3b0}
        .info{width:28px;height:28px;border-radius:999px;border:1px solid #2a3560;background:#1a2240;color:#cfd6ff;display:grid;place-items:center;cursor:pointer}
        .streaks{margin:12px 0 10px;padding:10px;border:1px solid #1f2a48;border-radius:16px;background:linear-gradient(180deg,#141c3a,#0e142b)}
        .stitle{font-weight:900;margin:0 2px 8px;display:flex;gap:8px;align-items:center}
        .slist{display:flex;flex-direction:column;gap:8px}
        .stag{position:relative;background:#0f1530;border:1px solid #263157;border-radius:12px;padding:10px 86px 10px 10px}
        .stag .n{font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .stag .sub{display:flex;align-items:center;justify-content:space-between;color:#cfd6ec;font-size:12px;margin-top:4px}
        .stag .bar{height:8px;background:#1f274a;border-radius:999px;overflow:hidden;margin-top:6px}
        .stag .bar i{display:block;height:100%;width:var(--p,0%);background:linear-gradient(90deg,#5a2bff,#a77bff)}
        .stag .streak-chip{position:absolute;top:8px;right:8px;background:rgba(255,157,77,.12);border:1px solid #6e3c17;color:#ffd6b2;padding:4px 8px;border-radius:999px;font-weight:900;font-size:12px}
        .filter{display:flex;gap:8px;margin:10px 0}
        .filter input{flex:1;background:#101735;border:1px solid #263157;color:#e9edff;border-radius:12px;padding:10px 12px;font-weight:600}
        .filter input::placeholder{color:#8ea0ce}
        .list{display:flex;flex-direction:column;gap:10px}
        .task{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;background:linear-gradient(180deg,#111831,#0b1428);border:1px solid #1f2a48;border-radius:16px;padding:10px}
        @media(max-width:520px){.task{grid-template-columns:1fr}}
        .left{min-width:0}.name{font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.stat{font-size:12px;color:#9aa3b2}
        .prog{display:flex;align-items:center;gap:8px;margin-top:8px}
        .state{width:10px;height:10px;border-radius:999px;border:1px solid #0004}.state.ok{background:#7af59b}.state.warn{background:#ffd166}.state.bad{background:#ff6b6b}
        .bar{position:relative;height:10px;background:#1f274a;border-radius:999px;overflow:hidden;flex:1}
        .bar i{position:absolute;inset:0;width:var(--p,0%);background:linear-gradient(90deg,#5a2bff,#a77bff)}
        .pnum{font-variant-numeric:tabular-nums;font-weight:900;min-width:48px;text-align:right}
        .right{display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:flex-end}
        .right .chip{background:transparent}
        .wkbars{display:grid;grid-auto-flow:column;gap:4px;align-items:end;height:32px}
        .wkbars b{width:12px;border-radius:4px}
        .wkbars b.miss{background:#3a456f}.wkbars b.hit{background:#30e47b}.wkbars b.over{background:linear-gradient(180deg,#8bff6a,#26e0a4)}
        .muted{color:#9aa3b2}
        @media (max-width: 1280px){
          .task{grid-template-columns:1fr; row-gap:8px}
          .right{justify-content:space-between}
          .wkbars{min-width:0}
        }
        @media (max-width: 768px){
          .chip{font-size:12px; padding:5px 8px}
          .wkbars b{width:10px}
          .pnum{min-width:auto}
        }
        /* mini barras para Top-3 */
        .wkmini{display:inline-grid;grid-auto-flow:column;gap:3px;align-items:end;height:10px;margin-left:8px}
        .wkmini b{width:3px;border-radius:2px;opacity:.9}
        .wkmini b.miss{background:#3a456f}
        .wkmini b.hit{background:#30e47b}
        .wkmini b.over{background:linear-gradient(180deg,#8bff6a,#26e0a4)}
        .wkbars{display:grid;grid-auto-flow:column;gap:4px;align-items:end;height:32px;min-width:112px;position:relative}
        .wkbars b{width:12px;border-radius:4px}
        .wkbars b.miss{background:#3a456f}.wkbars b.hit{background:#30e47b}.wkbars b.over{background:linear-gradient(180deg,#8bff6a,#26e0a4)}
        .wkbars .labels{position:absolute;inset:auto 0 -14px 0;display:grid;grid-auto-flow:column;gap:4px;pointer-events:none}
        .wkbars .labels i{display:block;text-align:center;font-size:11px;line-height:1;color:#9aa3b2;opacity:.8;font-weight:700;letter-spacing:.04em}
        
        /* BARRAS GRANDES + ETIQUETAS */
        /* Barras con “zanja” para labels */
        .wkbars{
          position:relative;
          display:grid; grid-auto-flow:column; gap:4px; align-items:end;
          height:36px;                 /* pelín más alto */
          padding-bottom:18px;         /* reserva suelo para etiquetas */
          overflow:visible;
        }
        .wkbars b{ width:12px; border-radius:4px }
        .wkbars b.miss{background:#3a456f}
        .wkbars b.hit {background:#30e47b}
        .wkbars b.over{background:linear-gradient(180deg,#8bff6a,#26e0a4)}
        
        .wkbars .labels{
          position:absolute; left:0; right:0; bottom:-10px;   /* más abajo → no pisa barras altas */
          display:grid; grid-template-columns:repeat(var(--bars,3),1fr);
          gap:4px; pointer-events:none;
        }
        .wkbars .labels i{
          display:block; text-align:center;
          font-size:11px; line-height:1; font-weight:700; letter-spacing:.02em;
          transform:none;               /* nada de translate raro */
        }
        
        /* ====== chip de modo, más chico y no “parecido a botón” ====== */
        .chip.mode{
          border-radius:10px;                /* más rectangular */
          font-size:12px; padding:5px 10px;
          background:color-mix(in srgb, var(--mcolor, #5aa0ff) 12%, #0c1124);
          border:1px solid color-mix(in srgb, var(--mcolor, #5aa0ff) 40%, #2a3560);
          box-shadow:0 0 0 1px color-mix(in srgb, var(--mcolor, #5aa0ff) 25%, transparent) inset;
        }
        .chip.mode.low    { --mcolor:#ff6b6b; }   /* Low = rojo   */
        .chip.mode.chill  { --mcolor:#20d3b0; }   /* Chill = verde */
        .chip.mode.flow   { --mcolor:#1f7aff; }   /* Flow = azul  */
        .chip.mode.evolve { --mcolor:#a77bff; }   /* Evolve = lila*/
        
        /* ====== tabs Sem/Mes/3M reubicados y centrados ====== */
        .seg.is-range{ width:100%; justify-content:center; gap:8px; }
        .seg.is-range button{ flex:0 1 96px; }       /* tamaño parejo y responsive */
        .seg[data-role="range"]{ width:100%; justify-content:center }
        
        /* pequeño ajuste para que el bloque derecho tenga aire
           cuando las barras verdes son altas */
        .right{gap:10px; flex-wrap:wrap; justify-content:flex-end; min-height:40px}
        /* compactar el bloque de barras verdes */
        .task .right{ gap:8px; } /* antes 10px, reduce el aire entre chips y barras */
        
        /* ⚠️ anula el min-width heredado (si lo tenés en alguna regla anterior) */
        .wkbars{ min-width:0 !important; }
        
        /* barras y separaciones más finas */
        .wkbars{ gap:3px; }             /* antes 4px */
        .wkbars b{ width:9px; }         /* antes 12px */
        
        /* etiquetas más juntitas y… más abajo para que no “muerdan” barras altas */
        .wkbars .labels{ gap:3px; bottom:-8px; font-size:10px; }
        /* Iconitos solo dentro del popover de ayuda */
        .info-pop .ico-lila{
          display:inline-block; width:22px; height:6px; 
          background:linear-gradient(90deg,#5a2bff,#a77bff);
          border-radius:999px; vertical-align:middle; margin-right:6px
        }
        .info-pop .ico-verdes{
          display:inline-grid; grid-auto-flow:column; gap:3px; 
          height:12px; vertical-align:middle; margin-right:6px
        }
        .info-pop .ico-verdes i{
          width:3px; border-radius:2px; background:linear-gradient(180deg,#8bff6a,#26e0a4);
          display:inline-block
        }
        .info-pop .ico-verdes i:nth-child(1){height:10px}
        .info-pop .ico-verdes i:nth-child(2){height:7px}
        .info-pop .ico-verdes i:nth-child(3){height:11px}

        /* ===== Rachas: layout del header ===== */

        /* Fila 1: contenido a la derecha (info + modo) */
        .row-top{ justify-content:flex-end; }
        .row-top .seg-right{
          width:100%;
          display:flex;
          justify-content:flex-end;
          align-items:center;
          gap:8px;
        }
        
        /* Botón ℹ️ dentro del header: que fluya como botón normal */
        #rachasInfoTop .info-chip{
          position:static !important;
          width:26px; height:26px; border-radius:999px;
          background:#1a2240; border:1px solid #24325a; color:#cfd6ff;
          font-weight:800; line-height:1;
        }
        
        /* Fila 2: tabs centrados SIEMPRE en una sola línea */
        .row-pills{ justify-content:center; }
        .seg-pillars{
          width:100%;
          display:flex;
          justify-content:center;
          align-items:center;
          gap:8px;
          flex-wrap:nowrap;            /* ❗ no permitir segunda línea */
          white-space:nowrap;
        }
        .seg-pillars button{
          flex:0 0 auto;               /* no se estiran, no se rompen */
          white-space:nowrap;
        }
        
        /* Ajustes responsivos para que sigan entrando en móviles estrechos */
        @media (max-width: 390px){
          .seg-pillars button{ padding:6px 10px; font-size:13px; }
          .chip.mode{ font-size:11px; padding:4px 8px; }
        }


        /* ===== Header Rachas – layout exacto ===== */
        /* FILA 1: grid -> [filler][modo][info] con info pegado a la derecha */
        .row-top{ 
          display:grid !important; 
          grid-template-columns: 1fr auto auto;
          align-items:center;
        }
        .row-top .seg-right{ display:contents !important; }   /* usa las 3 columnas del grid */
        .row-top [data-role="modeChip"]{ grid-column:2; }
        .row-top #rachasInfoTop{ grid-column:3; justify-self:end; }
        
        /* Botón ℹ️ del header: botón normal, no absolute */
        #rachasInfoTop .info-chip{
          position:static !important;
          width:26px; height:26px; border-radius:999px;
          background:#1a2240; border:1px solid #24325a; color:#cfd6ff;
          font-weight:800; line-height:1;
        }
        
        /* GAP entre fila 1 (modo+ℹ️) y fila 2 (pilares) */
        .row-pills{ margin-top:8px; }
        
        /* FILA 2: los tres tabs SIEMPRE centrados y en una sola línea */
        .seg-pillars{
          width:100%;
          display:flex; justify-content:center; align-items:center;
          gap:8px; flex-wrap:nowrap; white-space:nowrap;
        }
        .seg-pillars button{ flex:0 0 auto; }
        
        /* FILA 3: rango centrado “geométricamente” con ℹ️ a la derecha */
        .row-range{
          display:grid; 
          grid-template-columns: 1fr auto auto;  /* centro real, info a la derecha */
          align-items:center;
        }
        .row-range [data-role="range"]{
          grid-column:2; 
          width:auto; 
          display:flex; justify-content:center; gap:8px;
        }
        .row-range #rachasInfoScope{ grid-column:3; justify-self:end; }
        #rachasInfoScope .info-chip{
          position:static !important;
          width:26px; height:26px; border-radius:999px;
          background:#1a2240; border:1px solid #24325a; color:#cfd6ff;
          font-weight:800; line-height:1;
        }
        
        /* Un toque de responsivo por si el ancho es MUY chico */
        @media (max-width: 390px){
          .seg-pillars button{ padding:6px 10px; font-size:13px; }
          .chip.mode{ font-size:11px; padding:4px 8px; }
        }
        /* Fila del rango (Sem/Mes/3M): centrada geométricamente con ℹ️ a la derecha */
        .box .row:has([data-role="range"]){
          display:grid;
          grid-template-columns: 1fr auto 1fr;
          align-items:center;
        }
        .box .row:has([data-role="range"]) [data-role="range"]{
          grid-column:2;
          display:flex; justify-content:center; gap:8px;
        }
        .box .row:has([data-role="range"]) #rachasInfoScope{
          grid-column:3; justify-self:end;
        }
      `;
      document.head.appendChild(css);
    }

    root.classList.add('third');

    const els = {
      pillars: $('[data-role="pillars"]', root),
      range:   $('[data-role="range"]', root),
      modeChip: $('[data-role="modeChip"]', root),
      streaks: $('[data-role="streaks"]', root),
      top3:    $('[data-role="top3"]', root),
      list:    $('[data-role="list"]', root),
      q:       $('[data-role="q"]', root),
      //infoBtn: $('[data-role="infoBtn"]', root)
    };

    // === Info chips (usa tu util global attachInfoChip) ===
    // === Info chips (usa tu util global attachInfoChip) ===
    // Intenta varias veces por si la utilidad carga después.
    (function initInfoChipsRetry(){
      const TOP_INFO_HTML = `
        <div>
          <h4>¿Cómo leer “Rachas”?</h4>
          <ul style="margin:0; padding-left:18px">
            <li><span class="ico-lila"></span> <b>Barra lila</b>: progreso de la <b>semana actual</b> vs objetivo (<b>N×/sem</b> según el game mode).</li>
            <li><b>✓×N</b> y <b>+XP</b>: totales en el <b>scope</b> seleccionado (Sem, Mes, 3M).</li>
            <li>🔥 <b>Racha diaria</b>: días consecutivos sin cortar.</li>
            <li><span class="ico-verdes"><i></i><i></i><i></i></span> <b>Mini barras verdes</b> (Top-3): semanas del <b>mes actual</b> vs objetivo.</li>
            <li><span class="ico-verdes"><i></i><i></i><i></i></span> <b>Barras verdes</b> por tarea:
              <ul style="margin:6px 0 0 0; padding-left:18px">
                <li><b>Mes</b>: 4–5 columnas (semanas). Verde si esa semana alcanzó el objetivo; más alta si lo superó.</li>
                <li><b>3M</b>: 3 columnas (meses). Verde “llena” si todas las semanas del mes cumplieron.</li>
              </ul>
            </li>
            <li><b>Etiquetas</b>: <b>1..5</b> = semanas; <b>J/A/S</b> = meses (derecha = mes actual).</li>
          </ul>
        </div>`;
    
      const SCOPE_INFO_HTML = `
        <h4>Scopes: Sem / Mes / 3M</h4>
        <ul>
          <li><b>Sem</b>: todo refleja SOLO la semana actual (la lila siempre es semanal).</li>
          <li><b>Mes</b>: chips agregan el mes; barras verdes = semanas <b>1..N</b>.</li>
          <li><b>3M</b>: chips agregan 90 días; barras verdes = meses <b>J A S</b> (derecha = mes actual).</li>
        </ul>`;
    
      let tries = 0;
      const MAX = 20;     // ~3s total
      const DELAY = 150;
    
      function go(){
        // si la utilidad ya está y aún no se creó el chip, crearlo
        if (window.attachInfoChip) {
          if (!document.querySelector('#rachasInfoTop .info-chip')) {
            attachInfoChip('#rachasInfoTop',   TOP_INFO_HTML,   'right');
          }
          if (!document.querySelector('#rachasInfoScope .info-chip')) {
            attachInfoChip('#rachasInfoScope', SCOPE_INFO_HTML, 'right');
          }
          return; // listo
        }
        if (++tries <= MAX) setTimeout(go, DELAY);
        // si se agota, no hacemos nada (evitamos ruido en consola)
      }
      go();
    })();
    // // (idempotente: si ya existe el chip, no vuelve a crearlo)
    // if (window.attachInfoChip) {
    //   const TOP_INFO_HTML = `
    //       <div>
    //         <h4>¿Cómo leer “Rachas”?</h4>
    //         <ul style="margin:0; padding-left:18px">
    //           <li>
    //             <span class="ico-lila"></span>
    //             <b>Barra lila</b>: progreso de la <b>semana actual</b> vs objetivo (<b>N×/sem</b> según el modo).
    //           </li>
    //           <li><b>✓×N</b> y <b>+XP</b>: totales en el <b>scope</b> seleccionado (Sem, Mes, 3M).</li>
    //           <li>🔥 <b>Racha diaria</b>: días consecutivos sin cortar.</li>
    //           <li>
    //             <span class="ico-verdes"><i></i><i></i><i></i></span>
    //             <b>Mini barras verdes</b> (Top-3): semanas del <b>mes actual</b> vs objetivo.
    //           </li>
    //           <li>
    //             <span class="ico-verdes"><i></i><i></i><i></i></span>
    //             <b>Barras verdes</b> por tarea:
    //             <ul style="margin:6px 0 0 0; padding-left:18px">
    //               <li><b>Mes</b>: 4–5 columnas (semanas). Verde si esa semana alcanzó el objetivo; más alta si lo superó.</li>
    //               <li><b>3M</b>: 3 columnas (meses). Verde “llena” si todas las semanas del mes cumplieron.</li>
    //             </ul>
    //           </li>
    //           <li><b>Etiquetas</b>: <b>1..5</b> = semanas; <b>J/A/S</b> = meses (derecha = mes actual).</li>
    //         </ul>
    //       </div>
    //     `;
    
    //   const SCOPE_INFO_HTML = `
    //     <h4>Scopes: Sem / Mes / 3M</h4>
    //     <ul>
    //       <li><b>Sem</b>: todo refleja SOLO la semana actual.</li>
    //       <li><b>Mes</b>: chips agregan el mes; barras verdes = semanas <b>1..N</b>.</li>
    //       <li><b>3M</b>: chips agregan 90 días; barras verdes = meses <b>J A S</b> (derecha = mes actual).</li>
    //     </ul>
    //     <p style="margin-top:6px"><b>Tip:</b> la lila SIEMPRE es la semana actual.</p>
    //   `;
    
    //   // Evitar duplicados si alguien remonta el panel:
    //   if (!document.querySelector('#rachasInfoTop .info-chip')) {
    //     attachInfoChip('#rachasInfoTop', TOP_INFO_HTML, 'right');
    //   }
    //   if (!document.querySelector('#rachasInfoScope .info-chip')) {
    //     attachInfoChip('#rachasInfoScope', SCOPE_INFO_HTML, 'right');
    //   }
    // }

    async function refresh(){
      const goal = MODES[S.mode] || 3;   // fallback
      els.modeChip.className = `chip mode ${S.mode.toLowerCase()}`;
      els.modeChip.innerHTML = `🎮 ${S.mode} · <b>${goal}×/sem</b>`;

      const { topStreaks=[], tasks=[] } = await dataProvider({ mode:S.mode, pillar:S.pillar, range:S.range, query:S.query });

      // TOP 3 (sincronizado con logs semanales + mini-barras del mes)
      if(topStreaks.length===0){
        els.streaks.style.display='none';
      }else{
        els.streaks.style.display='';
        // para acceder a metrics por id
        const byId = new Map(tasks.map(x=>[x.id, x]));
        els.top3.innerHTML = topStreaks.slice(0,3).map(t=>{
          const mt   = byId.get(t.id);                 // tarea completa con metrics
          const wk   = mt?.metrics?.week?.count ?? t.weekDone ?? 0;   // semana actual (logs)
          const p    = pct(wk, goal);                                   // barra lila
          const bars = miniWeeklyBars(mt?.metrics?.month?.weeks || [], goal); // mini barras verdes (mes)
      
          return `<div class="stag">
            <div class="n">${t.name}</div>
            <div class="sub"><span>${bars}</span><span>${wk}/${goal}</span></div>
            <div class="bar" style="--p:${p}%"><i></i></div>
            ${t.streakWeeks>=2 ? `<span class="streak-chip">🔥 x${t.streakWeeks}d</span>` : ``}
          </div>`;
        }).join('');
      }

      // LISTA (ordenada por XP del scope y sin duplicar top)
      const exclude = new Set(topStreaks.map(t=>t.id));
      const ranked = tasks
        .filter(t => !exclude.has(t.id))
        .sort((a,b) => ((b.metrics[S.range]?.xp || 0) - (a.metrics[S.range]?.xp || 0)));
      
      els.list.innerHTML = ranked.map(t=>{
        const m   = t.metrics[S.range] || { count:0, xp:0, weeks:[] };
      
        // 🔮 LILA = SIEMPRE semana actual (independiente del scope)
        const wk  = (t.metrics?.week?.count ?? 0);
        const P   = pct(wk, goal);
        const st  = stateClass(wk, goal);
      
        // 🟩 Etiquetas sutiles para las barritas verdes
        let wkLabels = null;
        if (S.range === 'month') {
          // Semanas del mes: 1..N (N=4 o 5)
          wkLabels = Array.from({length: (m.weeks?.length||0)}, (_,i)=> String(i+1));
        } else if (S.range === 'qtr') {
          // 3 meses: mes-2, mes-1, mes0 (derecha = mes actual)
          const now = new Date();
          const L = i => new Date(now.getFullYear(), now.getMonth()-i, 1)
                          .toLocaleString('es-ES', { month:'short' })
                          .slice(0,1).toUpperCase(); // J,A,S...
          wkLabels = [ L(2), L(1), L(0) ];
        }
      
        const bars = (S.range==='week') ? '' : weeklyBars(m.weeks, goal, wkLabels);
      
        // (el fueguito lo dejamos como está por ahora)
        const fire = (t.streakWeeks>=2) ? `<span class="chip">🔥</span>` : '';
      
        return `<div class="task">
          <div class="left">
            <div class="name">${t.name}</div>
            <div class="stat">Stat: ${t.stat}</div>
            <div class="prog">
              <span class="state ${st}" title="Estado semanal"></span>
              <div class="bar" style="--p:${P}%"><i></i></div>
              <div class="pnum">${wk}/${goal}</div>
            </div>
          </div>
          <div class="right">
            <span class="chip">✓×${m.count||0}</span>
            <span class="chip">+${m.xp||0} XP</span>
            ${fire}
            ${bars}
          </div>
        </div>`;
      }).join('');
    }
    
    // Eventos
    els.pillars.addEventListener('click',e=>{
      const b=e.target.closest('button'); if(!b) return;
      S.pillar=b.dataset.p; $$('.seg[data-role="pillars"] button',root).forEach(x=>x.setAttribute('aria-pressed', x===b?'true':'false')); refresh();
    });
    els.range.addEventListener('click',e=>{
      const b=e.target.closest('button'); if(!b) return;
      S.range=b.dataset.r; $$('.seg[data-role="range"] button',root).forEach(x=>x.setAttribute('aria-pressed', x===b?'true':'false')); refresh();
    });
    els.q.addEventListener('input', ()=>{ S.query=els.q.value||''; refresh(); });
    // els.infoBtn.addEventListener('click', ()=>{
    //   alert('Tip: ✓×N = veces en el período · +XP = XP · 🔥 = racha. Mes = semanas; 3M = meses (verde si todas las semanas llegaron).');
    // });

    return refresh();
  }

  // === Adaptador a Dashboard v3 (reemplazo completo) ===
  function fromDashboardV3(data){
    const MODE_TIER = { LOW:1, CHILL:2, FLOW:3, 'FLOW MOOD':3, EVOL:4, EVOLVE:4 };
    const PILLAR_MAP = {
      'Cuerpo':'Body','Mente':'Mind','Alma':'Soul',
      'Body':'Body','Mind':'Mind','Soul':'Soul',
      'BODY':'Body','MIND':'Mind','SOUL':'Soul',
      'CUERPO':'Body','MENTE':'Mind','ALMA':'Soul'
    };
  
    // -------- helpers generales ----------
    const DAY=86400000;
    const weekStart = (date)=>{ const d=new Date(date); const day=(d.getDay()+6)%7; d.setHours(0,0,0,0); return new Date(d.getTime()-day*DAY); };
    const addDays=(d,n)=>new Date(d.getTime()+n*DAY);
    const monthStart = (d)=>{ const x=new Date(d); return new Date(x.getFullYear(), x.getMonth(), 1); };
    const monthEnd   = (d)=>{ const x=new Date(d); return new Date(x.getFullYear(), x.getMonth()+1, 1); };
  
    function parseLocalDate(s){
      const str = (s||'').toString().trim();
      let m = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);                    // 2025-09-10
      if (m) return new Date(+m[1], +m[2]-1, +m[3]);
      m = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);        // 10/09/2025 o 10-09-25
      if (m) return new Date(m[3].length===2?('20'+m[3]):m[3], +m[2]-1, +m[1]);
      const d = new Date(str);                                          // fallback (ISO, etc.)
      return isNaN(+d) ? null : d;
    }
  
    const normStr = s => (s ?? '')
      .toString()
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'')   // sin acentos
      .replace(/[^\w\s]/g,' ')                           // limpia símbolos raros (`, ’, etc.)
      .replace(/\s+/g,' ')
      .trim()
      .toLowerCase();
  
    const pill = v => PILLAR_MAP[String(v||'').trim()] || String(v||'').trim();
  
    // -------- 1) BBDD base (tareas) ----------
    const rows = Array.isArray(data?.bbdd) ? data.bbdd : [];
    const BASE = rows.map(r=>({
      id:   (r.id || r.task || r.Task || r.TAREA || r.nombre || '').toString().trim() || Math.random().toString(36).slice(2),
      pillar: pill(r.pilar||r.pillar),
      stat:   (r.stat || r.rasgo || r.trait || '').toString().trim(),
      name:   (r.task || r.Task || r.Tarea || r.nombre || '').toString().trim(),
      xp: Number(r.xp_base ?? r.xp ?? r.exp ?? 0),
      streakWeeks: Number(r.constancia || r.streak || 0),
      weeklyNow:{1:+(r.c1s_ac||0),2:+(r.c2s_ac||0),3:+(r.c3s_ac||0),4:+(r.c4s_ac||0)},
      weeklyMax:{1:+(r.c1s_m ||0),2:+(r.c2s_m ||0),3:+(r.c3s_m ||0),4:+(r.c4s_m ||0)}
    }));
  
    // -------- 2) Extraer daily logs en profundidad ----------
    function pickLogsDeep(x){
      if (!x || typeof x !== 'object') return [];
      for (const k of ['daily_log_raw','daily_log','dailyLogs','DailyLog','dailyLogsRaw']) {
        if (Array.isArray(x[k])) return x[k];
      }
      for (const v of Object.values(x)) {
        if (v && typeof v === 'object') {
          const r = pickLogsDeep(v);
          if (r.length) return r;
        }
      }
      return [];
    }
  
    const RAW0 = pickLogsDeep(data);
    dbg('[Rachas] LOGS total=', RAW0.length, '→ sample:', RAW0.slice(0,5));
  
    const LOGS = RAW0.map(l=>{
      const d  = parseLocalDate(l.fecha || l.date || l.day || l.Fecha);
      const p  = pill(l.pilar || l.pillar || l.Pilar);
      const t  = (l.task || l.tarea || l.Task || l.nombre || '').toString().trim();
      const xp = Number(l.xp || l.XP || l.exp || 0) || 0;
      if (!d || !t) return null;
      return { dt:d, pillar:p, taskRaw:t, taskNorm:normStr(t), xp };
    }).filter(Boolean);
  
    // -------- 3) Ventanas de tiempo ----------
    const now = new Date();
  
    function weeksOfMonth(mDate){
      const start = monthStart(mDate), end = monthEnd(mDate);
      const weeks = [];
      for(let d=weekStart(start); d<end; d=addDays(d,7)){
        const s = d < start ? start : d;
        const e = addDays(d,7) > end ? end : addDays(d,7);
        if (s < e) weeks.push({start:s, end:e});
      }
      return weeks;
    }
  
    function buildWeeksOfCurrentMonth(){ return weeksOfMonth(now); }
  
    function build3Months(){
      const base = monthStart(now);
      return [
        { start: new Date(base.getFullYear(), base.getMonth()-2, 1), end: new Date(base.getFullYear(), base.getMonth()-1, 1) },
        { start: new Date(base.getFullYear(), base.getMonth()-1, 1), end: new Date(base.getFullYear(), base.getMonth()-0, 1) },
        { start: new Date(base.getFullYear(), base.getMonth()-0, 1), end: new Date(base.getFullYear(), base.getMonth()+1, 1) },
      ];
    }
  
    const xpFromLog = (log, taskXP) => (log.xp && log.xp>0) ? log.xp : Number(taskXP||0);
  
    // -------- 4) Agregar métricas por tarea ----------
    function aggregateForTask(t){
      const tier = MODE_TIER[String((data?.metrics?.game_mode || data?.game_mode || 'FLOW')).toUpperCase()] || 3;
      const key  = normStr(t.name);
  
      // match por nombre y pilar (si no hay matches, relaja pilar)
      let taskLogs = LOGS.filter(l => (l.pillar===t.pillar) && l.taskNorm===key);
      if (taskLogs.length === 0) taskLogs = LOGS.filter(l => l.taskNorm===key);
  
      // ===== Semana actual (lila SIEMPRE) =====
      const ws = weekStart(now), we = addDays(ws,7);
      const wLogs = taskLogs.filter(l => l.dt>=ws && l.dt<we);
      const week  = { count: wLogs.length, xp: wLogs.reduce((a,l)=>a+xpFromLog(l,t.xp),0) };
  
      // Sin logs → barras vacías (chips semanales correctos)
      if (taskLogs.length===0){
        return {
          week,
          month: { count:0, xp:0, weeks: buildWeeksOfCurrentMonth().map(()=>0) },
          qtr:   { count:0, xp:0, weeks:[0,0,0] }
        };
      }
  
      // ===== Mes actual (4–5 barras = semanas; valor = conteo semanal) =====
      const weeks = buildWeeksOfCurrentMonth();
      const weeksArr = new Array(weeks.length).fill(0);
      let monthCount=0, monthXP=0;
      for (const l of taskLogs){
        for (let i=0;i<weeks.length;i++){
          const b = weeks[i];
          if (l.dt>=b.start && l.dt<b.end){
            weeksArr[i]++; monthCount++; monthXP += xpFromLog(l,t.xp); break;
          }
        }
      }
      const monthMetrics = { count:monthCount, xp:monthXP, weeks:weeksArr };
  
      // ===== 3M (3 barras = meses; valor = proporción de semanas que cumplieron el goal) =====
      const months = build3Months();
      const qStart = months[0].start, qEnd = months[months.length-1].end;
      const qLogs = taskLogs.filter(l => l.dt>=qStart && l.dt<qEnd);
      const qCount = qLogs.length;
      const qXP    = qLogs.reduce((a,l)=>a+xpFromLog(l,t.xp),0);
  
      const perWeekCount = new Map(); // weekStart(ts) -> count
      for (const l of qLogs){
        const k = +weekStart(l.dt);
        perWeekCount.set(k, (perWeekCount.get(k)||0) + 1);
      }
  
      // Para cada mes: weeksHit = #semanas con conteo >= tier; totalWeeks = #semanas del mes
      // valor de la barra = (weeksHit / totalWeeks) * tier   → weeklyBars(..., goal=tier) la pinta
      const qtrBars = months.map(({start,end})=>{
        const weeksInMonth = weeksOfMonth(start);
        const totalWeeks   = weeksInMonth.length || 4;
        let hit = 0;
        for (const w of weeksInMonth){
          const k = +weekStart(w.start);
          const c = perWeekCount.get(k) || 0;
          if (c >= tier) hit++;
        }
        // escala al rango 0..tier para que "hit completo" ≡ barra verde completa
        return (hit / totalWeeks) * tier;
      });
  
      return { week, month: monthMetrics, qtr: { count:qCount, xp:qXP, weeks:qtrBars } };
    }
  
    // -------- 5) Provider ----------
    return ({ mode, pillar, range, query })=>{
      const q = (query||'').toLowerCase();
      const ofPillar = BASE.filter(x=>x.pillar===pillar && (!q || x.name.toLowerCase().includes(q) || x.stat.toLowerCase().includes(q)));
  
      // Top-3 rachas desde BBDD (no toca logs)
      const tier = MODE_TIER[String((mode||'FLOW')).toUpperCase()] || 3;
      const topStreaks = ofPillar
        .filter(x=>x.streakWeeks>=2)
        .sort((a,b)=>b.streakWeeks-a.streakWeeks)
        .slice(0,3)
        .map(x=>({ id:x.id, name:x.name, stat:x.stat, weekDone:(x.weeklyNow[tier]||0), streakWeeks:x.streakWeeks }));
  
      const tasks = ofPillar.map(x=>{
        const metrics = aggregateForTask(x);
        return { id:x.id, name:x.name, stat:x.stat, weekDone:(x.weeklyNow[tier]||0), streakWeeks:x.streakWeeks, metrics };
      });
  
      // Log opcional (silencioso por default)
      const totals = tasks.reduce((acc,t)=>{
        acc.weekTotal  += t.metrics.week.count;
        acc.monthTotal += t.metrics.month.count;
        acc.qtrTotal   += t.metrics.qtr.count;
        return acc;
      },{weekTotal:0,monthTotal:0,qtrTotal:0});
      dbg('[Rachas] pillar:', pillar, 'tasks=', tasks.length, '→', totals);
  
      return Promise.resolve({ topStreaks, tasks });
    };
  }
  const PanelRachas = { mount, adapters:{ fromDashboardV3 } };
  if (typeof module !== 'undefined' && module.exports) module.exports = PanelRachas;
  else global.PanelRachas = PanelRachas;

})(typeof window!=='undefined' ? window : globalThis);



