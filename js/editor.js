/* ============================================================
   Fretdrom Editor — toolbar wiring, interactions, drag.
   Depends on: JSON5 (global), FDMusic (window), FretDrom (window).
   ============================================================ */
(function(){

const { PRESETS, EXAMPLES, INTERVAL_LABELS,
        parseTuning, intervalsFromFrets,
        fretNumToChar, fretCharToNum } = window.FDMusic;

const $ = sel => document.querySelector(sel);
const codeEl = $('#code');
const previewEl = $('#preview');
const gutterEl = $('#gutter');
const statusMsg = $('#status-msg');
const metaDot = $('#meta-dot');
const metaText = $('#meta-text');
const metaStringCount = $('#meta-string-count');

const state = {
  type: 'chord',
  skin: 'default',
  labels: 'auto',
  preset: 'guitar-std',
  tuning: 'E2 A2 D3 G3 B3 E4',
};

let renderTimer = null;
let chordDrag = null;

/* ---------- STATUS / GUTTER / CURSOR ---------- */
function setStatus(kind, msg){
  statusMsg.innerHTML = `<span class="${kind}">●</span> ${msg}`;
  metaDot.className = 'dot' + (kind==='err' ? ' err' : kind==='warn' ? ' warn' : '');
  metaText.textContent = kind==='err' ? 'parse error' : kind==='warn' ? 'rendered with warnings' : 'rendered';
}
function updateGutter(){
  const lines = codeEl.value.split('\n').length;
  let g = '';
  for(let i=1;i<=lines;i++) g += i + '\n';
  gutterEl.textContent = g;
  $('#crumb-lines').textContent = lines + ' lines';
  $('#crumb-bytes').textContent = new Blob([codeEl.value]).size + ' B';
}
function updateCursor(){
  const pos = codeEl.selectionStart;
  const before = codeEl.value.slice(0,pos);
  const ln = before.split('\n').length;
  const col = pos - before.lastIndexOf('\n');
  $('#status-cursor').textContent = `Ln ${ln}, Col ${col}`;
}
function syncGutterScroll(){ gutterEl.scrollTop = codeEl.scrollTop; }

/* ---------- SAFE SOURCE MUTATION ---------- */
function stringify(obj){
  return JSON.stringify(obj, null, 2)
    .replace(/"([a-zA-Z_][a-zA-Z0-9_]*)":/g, '$1:'); // unquote simple keys
}
function mutateSource(fn){
  let parsed;
  try{ parsed = JSON5.parse(codeEl.value); }catch{ toast('fix JSON before editing'); return; }
  const ret = fn(parsed);
  if(ret === false) return;
  codeEl.value = stringify(parsed);
  scheduleRender();
}

/* ---------- RENDER ---------- */
function render(){
  const src = codeEl.value;
  if(!src.trim()){
    previewEl.innerHTML = `<div class="stage" data-label="render"><div class="empty">Awaiting source…</div></div>`;
    setStatus('warn','empty document');
    return;
  }

  let parsed;
  try{ parsed = JSON5.parse(src); }
  catch(e){ setStatus('err', `JSON5: ${e.message}`); return; }

  let detectedType = null;
  if(parsed.chord) detectedType = 'chord';
  else if(parsed.scale) detectedType = 'scale';
  else if(parsed.tab) detectedType = 'tab';
  if(detectedType && detectedType !== state.type) setActiveType(detectedType, false);

  const inj = JSON.parse(JSON.stringify(parsed));
  (function injectSkin(o){
    const node = o.chord || o.scale || o;
    node.config = node.config || {};
    if(!node.config.skin) node.config.skin = state.skin;
  })(inj);

  // LABELS MODE: rewrite intervals/fingers in render copy
  if(inj.chord && inj.chord.frets){
    if(state.labels === 'intervals'){
      const lbl = intervalsFromFrets(inj.chord.frets, inj.chord.tuning || state.tuning, $('#root-override').value);
      if(lbl) inj.chord.intervals = lbl;
    }else if(state.labels === 'fingers'){
      delete inj.chord.intervals;
    }
  }
  if(inj.scale && inj.scale.grid && state.labels === 'intervals'){
    const t = parseTuning(inj.scale.tuning || state.tuning);
    if(t && !t.compact){
      const startFret = inj.scale.start_fret || 1;
      const playing = [];
      let rootSemis = null;
      for(let r=0;r<inj.scale.grid.length;r++){
        const sSemis = t.semis[r]; if(sSemis==null) continue;
        const row = inj.scale.grid[r];
        for(let c=0;c<row.length;c++){
          const v = String(row[c]);
          if(v==='.' || v==='-') continue;
          const pitch = sSemis + (startFret + c);
          playing.push(pitch);
          if(v.toUpperCase()==='R') rootSemis = (rootSemis==null) ? pitch : Math.min(rootSemis, pitch);
        }
      }
      const ov = $('#root-override').value;
      if(ov !== '' && ov != null && playing.length){
        const rc = +ov;
        const matches = playing.filter(p => ((p%12)+12)%12 === rc);
        rootSemis = matches.length ? Math.min(...matches) : Math.min(...playing) - (((Math.min(...playing)-rc)%12+12)%12);
      }
      if(rootSemis==null && playing.length) rootSemis = Math.min(...playing);
      if(rootSemis!=null){
        inj.scale.grid = inj.scale.grid.map((row,r)=>row.map((cell,c)=>{
          const v = String(cell);
          if(v==='.' || v==='-') return v;
          const pitch = t.semis[r] + (startFret + c);
          const semi = ((pitch - rootSemis)%12+12)%12;
          return semi===0 ? 'R' : INTERVAL_LABELS[semi];
        }));
      }
    }
  }

  // sanitize tuning for renderer (strip octaves so it just uses string count)
  (function sanitizeTuning(o){
    const node = o.chord || o.scale;
    if(node && node.tuning && /\d/.test(node.tuning)){
      node.tuning = node.tuning.replace(/\d+/g,'').replace(/\s+/g,'');
    }
  })(inj);

  let svg;
  try{ svg = window.FretDrom.renderSVG(inj); }
  catch(e){ setStatus('err', `Render: ${e.message}`); return; }

  const dark = state.skin === 'dark' || state.skin === 'sketch-dark';
  previewEl.classList.toggle('dark', dark);
  previewEl.innerHTML = `<div class="stage" data-label="${detectedType||state.type}"></div>`;
  previewEl.querySelector('.stage').innerHTML = svg;

  $('#crumb-type').textContent = detectedType || state.type;
  const node = parsed.chord || parsed.scale || parsed;
  $('#crumb-name').textContent = node.name || 'untitled';
  $('#crumb-skin').textContent = state.skin;

  let stringCount = 0;
  if(parsed.chord && parsed.chord.frets) stringCount = parsed.chord.frets.length;
  else if(parsed.scale && parsed.scale.grid) stringCount = parsed.scale.grid.length;
  else if(parsed.tab) stringCount = parsed.tab.length;
  metaStringCount.textContent = stringCount + ' string' + (stringCount===1?'':'s');

  setStatus('ok','parsed cleanly');
  attachInteractive(parsed, detectedType||state.type);
}

function scheduleRender(){
  clearTimeout(renderTimer);
  renderTimer = setTimeout(render, 180);
  updateGutter();
}

/* ---------- INTERACTIVE OVERLAY ---------- */
function attachInteractive(parsed, type){
  const stage = previewEl.querySelector('.stage');
  if(!stage) return;
  const svg = stage.querySelector('svg');
  if(!svg) return;
  stage.style.position = 'relative';

  // editable title overlay
  const titleEl = svg.querySelector('[data-role="title"]');
  const node = parsed.chord || parsed.scale || parsed;
  if(titleEl && (type==='chord'||type==='scale'||type==='tab')){
    titleEl.style.display = 'none';
    const div = document.createElement('div');
    div.className = 'fd-title-edit';
    div.contentEditable = 'plaintext-only';
    div.textContent = node.name || '';
    div.setAttribute('data-placeholder','untitled');
    div.addEventListener('blur', ()=>{
      mutateSource(p=>{
        const n = p.chord || p.scale || p;
        n.name = div.textContent.trim();
      });
    });
    div.addEventListener('keydown', e=>{
      if(e.key==='Enter'){ e.preventDefault(); div.blur(); }
    });
    stage.appendChild(div);
  }

  // start-fret stepper visibility
  const sfCtl = $('#start-fret-ctl');
  if(type==='chord' || type==='scale'){
    sfCtl.style.display = 'inline-flex';
    const cur = (parsed.chord||parsed.scale).start_fret || 1;
    $('#sf-val').value = cur;
  }else{
    sfCtl.style.display = 'none';
  }

  if(type==='chord'){
    svg.querySelectorAll('.fd-hit-fret').forEach(rect=>{
      rect.addEventListener('mousedown', (e)=>{
        e.preventDefault();
        const i = +rect.dataset.i, f = +rect.dataset.f;
        let p; try{ p = JSON5.parse(codeEl.value); }catch{ return; }
        const c = p.chord; if(!c) return;
        const startFret = c.start_fret || 1;
        const targetFret = startFret + f;
        const fretsArr = Array.from(c.frets || '');
        const fingersArr = c.fingers ? Array.from(c.fingers) : [];
        const hasDot = (fretCharToNum(fretsArr[i]) === targetFret);
        const carriedFinger = (fingersArr[i] && fingersArr[i] !== '0') ? fingersArr[i] : '-';
        chordDrag = { startI:i, startF:f, curI:i, curF:f, moved:false, hasDot, carriedFinger };
        updateDragGhost(rect);
      });
    });
    svg.querySelectorAll('.fd-hit-open').forEach(rect=>{
      rect.addEventListener('click', ()=>{
        const i = +rect.dataset.i;
        mutateSource(p=>{
          const c = p.chord; if(!c) return false;
          const fretsArr = Array.isArray(c.frets) ? [...c.frets] : Array.from(c.frets||'');
          const cur = fretCharToNum(fretsArr[i]);
          if(cur === -1) fretsArr[i] = '0';
          else fretsArr[i] = 'x';
          c.frets = Array.isArray(c.frets) ? fretsArr : fretsArr.join('');
        });
      });
    });
  }else if(type==='scale'){
    svg.querySelectorAll('.fd-hit-cell').forEach(rect=>{
      rect.addEventListener('click', ()=>{
        const r = +rect.dataset.r, c = +rect.dataset.c;
        mutateSource(p=>{
          const sc = p.scale; if(!sc || !sc.grid) return false;
          const row = sc.grid[r]; if(!row) return false;
          const cur = String(row[c]);
          row[c] = (cur==='.'||cur==='-'||cur==='') ? 'x' :
                   (cur==='x'||cur==='X') ? 'R' :
                   (cur==='R'||cur==='r') ? '.' : '.';
        });
      });
    });
  }
}

/* ---------- DRAG GHOST ---------- */
function removeDragGhost(){ document.querySelectorAll('.fd-drag-ghost').forEach(n=>n.remove()); }
function updateDragGhost(rect){
  const svg = rect.ownerSVGElement; if(!svg) return;
  const x = +rect.getAttribute('x') + (+rect.getAttribute('width'))/2;
  const y = +rect.getAttribute('y') + (+rect.getAttribute('height'))/2;
  let g = svg.querySelector('.fd-drag-ghost');
  if(!g){
    const NS = 'http://www.w3.org/2000/svg';
    g = document.createElementNS(NS,'g');
    g.setAttribute('class','fd-drag-ghost');
    g.style.pointerEvents = 'none';
    const c = document.createElementNS(NS,'circle');
    c.setAttribute('r','11'); c.setAttribute('fill','#b94a3a');
    c.setAttribute('opacity','0.85'); c.setAttribute('stroke','#fff'); c.setAttribute('stroke-width','1.5');
    g.appendChild(c);
    const t = document.createElementNS(NS,'text');
    t.setAttribute('text-anchor','middle'); t.setAttribute('font-size','10.5');
    t.setAttribute('font-weight','600'); t.setAttribute('fill','#fff');
    t.setAttribute('font-family','JetBrains Mono, monospace');
    g.appendChild(t);
    svg.appendChild(g);
  }
  const c = g.querySelector('circle');
  const t = g.querySelector('text');
  c.setAttribute('cx', x); c.setAttribute('cy', y);
  t.setAttribute('x', x); t.setAttribute('y', y+3.5);
  const lbl = (chordDrag && chordDrag.carriedFinger && chordDrag.carriedFinger !== '-') ? chordDrag.carriedFinger : '';
  t.textContent = lbl;
}

function setupChordDocHandlers(){
  document.addEventListener('mousemove', e=>{
    if(!chordDrag) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if(el && el.classList && el.classList.contains('fd-hit-fret')){
      const i = +el.dataset.i, f = +el.dataset.f;
      if(i !== chordDrag.startI || f !== chordDrag.startF) chordDrag.moved = true;
      chordDrag.curI = i; chordDrag.curF = f;
      updateDragGhost(el);
    }else{
      removeDragGhost();
    }
  });
  document.addEventListener('mouseup', ()=>{
    if(!chordDrag) return;
    const d = chordDrag; chordDrag = null;
    removeDragGhost();

    if(d.moved){
      mutateSource(p=>{
        const c = p.chord; if(!c) return false;
        const startFret = c.start_fret || 1;
        const fretsArr = Array.from(c.frets || '');
        let fingersArr = c.fingers ? Array.from(c.fingers) : Array(fretsArr.length).fill('-');
        while(fingersArr.length < fretsArr.length) fingersArr.push('-');
        const newFret = startFret + d.curF;
        const carriedFinger = (fingersArr[d.startI] && fingersArr[d.startI] !== '0') ? fingersArr[d.startI] : '-';
        if(d.startI !== d.curI){
          fretsArr[d.startI] = 'x';
          fingersArr[d.startI] = '-';
        }
        fretsArr[d.curI] = fretNumToChar(newFret);
        fingersArr[d.curI] = carriedFinger;
        c.frets = fretsArr.join('');
        if(fingersArr.some(x => x && x !== '-' && x !== '0')) c.fingers = fingersArr.join('');
        else delete c.fingers;
        if(c.intervals) delete c.intervals;
      });
    }else{
      mutateSource(p=>{
        const c = p.chord; if(!c) return false;
        const startFret = c.start_fret || 1;
        const targetFret = startFret + d.startF;
        const fretsArr = Array.from(c.frets || '');
        let fingersArr = c.fingers ? Array.from(c.fingers) : Array(fretsArr.length).fill('-');
        while(fingersArr.length < fretsArr.length) fingersArr.push('-');
        const cur = fretCharToNum(fretsArr[d.startI]);
        const isHere = (cur === targetFret);
        const states = [null, '-', '1', '2', '3', '4'];
        const curState = isHere ? (fingersArr[d.startI] || '-') : null;
        const idx = states.indexOf(curState);
        const next = states[((idx<0?0:idx) + 1) % states.length];
        if(next == null){
          fretsArr[d.startI] = 'x';
          fingersArr[d.startI] = '-';
        }else{
          fretsArr[d.startI] = fretNumToChar(targetFret);
          fingersArr[d.startI] = next;
        }
        c.frets = fretsArr.join('');
        if(fingersArr.some(x => x && x !== '-' && x !== '0')) c.fingers = fingersArr.join('');
        else delete c.fingers;
        if(c.intervals) delete c.intervals;
      });
    }
  });
}

/* ---------- TYPE / SKIN / LABELS ---------- */
function setActiveType(t, andLoad){
  state.type = t;
  document.querySelectorAll('#seg-type button').forEach(b=>{
    b.classList.toggle('on', b.dataset.type === t);
  });
  if(andLoad){
    const map = { chord:'ex-c-maj', scale:'ex-am-pent', tab:'ex-riff' };
    loadExample(map[t]);
  }
}
document.querySelectorAll('#seg-type button').forEach(b=>{
  b.addEventListener('click', ()=> setActiveType(b.dataset.type, true));
});
document.querySelectorAll('#seg-skin button').forEach(b=>{
  b.addEventListener('click', ()=>{
    document.querySelectorAll('#seg-skin button').forEach(x=>x.classList.remove('on'));
    b.classList.add('on');
    state.skin = b.dataset.skin;
    render();
  });
});
document.querySelectorAll('#seg-labels button').forEach(b=>{
  b.addEventListener('click', ()=>{
    document.querySelectorAll('#seg-labels button').forEach(x=>x.classList.remove('on'));
    b.classList.add('on');
    state.labels = b.dataset.labels;
    render();
  });
});

/* ---------- TUNING ---------- */
$('#preset-instrument').addEventListener('change', (e)=>{
  const v = e.target.value;
  const t = PRESETS[v];
  if(t){
    $('#tuning-input').value = t;
    state.tuning = t;
    state.preset = v;
    applyTuningToSource(t);
  }else if(v==='custom'){
    $('#tuning-input').focus();
  }
});
$('#tuning-input').addEventListener('input', e=>{ state.tuning = e.target.value; });
$('#tuning-input').addEventListener('change', e=>{ applyTuningToSource(e.target.value.trim()); });

function applyTuningToSource(t){
  if(!t) return;
  let parsed;
  try{ parsed = JSON5.parse(codeEl.value); }catch{ return; }
  const node = parsed.chord || parsed.scale;
  if(!node) return;
  const tokens = t.split(/\s+/);
  if(parsed.chord && parsed.chord.frets){
    const cur = parsed.chord.frets.length;
    const target = tokens.length;
    if(target !== cur){
      let fr = Array.isArray(parsed.chord.frets) ? [...parsed.chord.frets] : Array.from(parsed.chord.frets);
      if(target > cur) while(fr.length < target) fr.push('x');
      else fr = fr.slice(0, target);
      parsed.chord.frets = Array.isArray(parsed.chord.frets) ? fr : fr.join('');
      if(parsed.chord.fingers){
        let fg = Array.isArray(parsed.chord.fingers) ? [...parsed.chord.fingers] : Array.from(parsed.chord.fingers);
        if(target > cur) while(fg.length < target) fg.push('-');
        else fg = fg.slice(0, target);
        parsed.chord.fingers = Array.isArray(parsed.chord.fingers) ? fg : fg.join('');
      }
      if(Array.isArray(parsed.chord.intervals)){
        if(target > cur) while(parsed.chord.intervals.length < target) parsed.chord.intervals.push(null);
        else parsed.chord.intervals = parsed.chord.intervals.slice(0, target);
      }
    }
  }
  if(parsed.scale && parsed.scale.grid){
    const cur = parsed.scale.grid.length;
    const target = tokens.length;
    const cols = (parsed.scale.grid[0]||[]).length || (parsed.scale.num_frets||5);
    if(target > cur) while(parsed.scale.grid.length < target) parsed.scale.grid.push(Array(cols).fill('.'));
    else if(target < cur) parsed.scale.grid = parsed.scale.grid.slice(0, target);
  }
  node.tuning = t;
  codeEl.value = stringify(parsed);
  scheduleRender();
}

/* ---------- START FRET STEPPER ---------- */
function setStartFret(delta, abs){
  mutateSource(p=>{
    const n = p.chord || p.scale; if(!n) return false;
    const cur = n.start_fret || 1;
    let next = (abs!=null) ? abs : (cur + delta);
    next = Math.max(1, Math.min(24, next));
    n.start_fret = next;
    $('#sf-val').value = next;
  });
}
$('#sf-dec').addEventListener('click', ()=> setStartFret(-1));
$('#sf-inc').addEventListener('click', ()=> setStartFret(+1));
$('#sf-val').addEventListener('change', e=>{
  const v = parseInt(e.target.value,10);
  if(!isNaN(v)) setStartFret(0, v);
});

$('#apply-tuning').addEventListener('click', ()=>{
  const t = state.tuning.trim();
  if(!t) return;
  const parsed = (()=>{ try{ return JSON5.parse(codeEl.value); }catch{ return null; }})();
  if(!parsed){ toast('fix JSON before applying tuning'); return; }
  const node = parsed.chord || parsed.scale;
  if(node){
    node.tuning = t;
    codeEl.value = stringify(parsed);
  }else if(parsed.tab){
    toast('tablature uses per-lane names');
    return;
  }
  scheduleRender();
  toast('tuning applied');
});

/* ---------- AUTO-INTERVALS ---------- */
$('#auto-intervals').addEventListener('click', ()=>{
  let parsed;
  try{ parsed = JSON5.parse(codeEl.value); }catch{ toast('fix JSON first'); return; }

  if(parsed.chord && parsed.chord.frets){
    const tuning = parsed.chord.tuning || state.tuning;
    const labels = intervalsFromFrets(parsed.chord.frets, tuning, $('#root-override').value);
    if(!labels){ toast('need octave-tagged tuning, e.g. E2 A2 D3 G3 B3 E4'); return; }
    parsed.chord.intervals = labels;
    codeEl.value = stringify(parsed);
    scheduleRender();
    toast('intervals computed');
    return;
  }

  if(parsed.scale && parsed.scale.grid){
    const tuning = parsed.scale.tuning || state.tuning;
    const t = parseTuning(tuning);
    if(!t || t.compact){ toast('need octave-tagged tuning, e.g. E2 A2 D3 G3 B3 E4'); return; }
    const startFret = parsed.scale.start_fret || 1;
    const grid = parsed.scale.grid;
    const playing = [];
    let rootSemis = null;
    for(let r=0;r<grid.length;r++){
      const sSemis = t.semis[r]; if(sSemis==null) continue;
      const row = grid[r];
      for(let c=0;c<row.length;c++){
        const v = String(row[c]);
        if(v==='.' || v==='-' ) continue;
        const pitch = sSemis + (startFret + c);
        playing.push(pitch);
        if(v.toUpperCase()==='R') rootSemis = (rootSemis==null) ? pitch : Math.min(rootSemis, pitch);
      }
    }
    const ov = $('#root-override').value;
    if(ov !== '' && ov != null && playing.length){
      const rc = +ov;
      const matches = playing.filter(p => ((p%12)+12)%12 === rc);
      rootSemis = matches.length ? Math.min(...matches) : Math.min(...playing) - (((Math.min(...playing)-rc)%12+12)%12);
    }
    if(rootSemis==null){
      if(!playing.length){ toast('no notes in grid'); return; }
      rootSemis = Math.min(...playing);
    }
    parsed.scale.grid = grid.map((row,r)=>row.map((cell,c)=>{
      const v = String(cell);
      if(v==='.' || v==='-') return v;
      const pitch = t.semis[r] + (startFret + c);
      const semi = ((pitch - rootSemis) % 12 + 12) % 12;
      return semi===0 ? 'R' : INTERVAL_LABELS[semi];
    }));
    parsed.scale.subtitle = parsed.scale.subtitle || 'Intervals';
    codeEl.value = stringify(parsed);
    scheduleRender();
    toast('grid relabelled with intervals');
    return;
  }

  toast('auto-intervals works on chord & scale');
});

$('#root-override').addEventListener('change', ()=>{
  if(state.labels === 'intervals'){ render(); return; }
  let parsed; try{ parsed = JSON5.parse(codeEl.value); }catch{ return; }
  if(parsed.chord && parsed.chord.intervals && parsed.chord.frets){
    const lbl = intervalsFromFrets(parsed.chord.frets, parsed.chord.tuning || state.tuning, $('#root-override').value);
    if(lbl){
      parsed.chord.intervals = lbl;
      codeEl.value = stringify(parsed);
      scheduleRender();
      toast('intervals recomputed');
    }
  }
});

/* ---------- FORMAT ---------- */
function formatNow(){
  try{
    const parsed = JSON5.parse(codeEl.value);
    codeEl.value = stringify(parsed);
    scheduleRender();
    toast('formatted');
  }catch(e){ toast('cannot format: ' + e.message); }
}
$('#format-json').addEventListener('click', formatNow);

/* ---------- EXAMPLES ---------- */
$('#examples').addEventListener('change', e=>{
  if(e.target.value){ loadExample(e.target.value); e.target.value=''; }
});
function loadExample(key){
  if(!EXAMPLES[key]) return;
  codeEl.value = EXAMPLES[key];
  scheduleRender();
}

/* ---------- COPY / DOWNLOAD SVG ---------- */
$('#copy-json').addEventListener('click', async ()=>{
  const txt = codeEl.value;
  if(!txt.trim()){ toast('nothing to copy'); return; }
  try{ await navigator.clipboard.writeText(txt); toast('JSON copied'); }
  catch{ toast('clipboard blocked'); }
});

$('#copy-svg').addEventListener('click', async ()=>{
  const svg = previewEl.querySelector('svg');
  if(!svg){ toast('nothing to copy'); return; }
  const xml = new XMLSerializer().serializeToString(svg);
  try{ await navigator.clipboard.writeText(xml); toast('SVG copied'); }
  catch{ toast('clipboard blocked'); }
});
$('#download-svg').addEventListener('click', ()=>{
  const svg = previewEl.querySelector('svg');
  if(!svg){ toast('nothing to download'); return; }
  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(svg);
  const blob = new Blob([xml], { type:'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'fretdrom.svg';
  a.click();
  URL.revokeObjectURL(url);
});

/* ---------- TOAST ---------- */
let toastT;
function toast(msg){
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(()=>t.classList.remove('show'), 1500);
}

/* ---------- DIVIDER ---------- */
(function setupDivider(){
  const main = $('#main');
  const div = $('#divider');
  let dragging = false;
  div.addEventListener('mousedown', e=>{
    dragging = true; document.body.style.cursor='row-resize'; e.preventDefault();
  });
  window.addEventListener('mousemove', e=>{
    if(!dragging) return;
    const rect = main.getBoundingClientRect();
    let frac = (e.clientY - rect.top) / rect.height;
    frac = Math.max(0.15, Math.min(0.85, frac));
    main.style.gridTemplateRows = `${frac*100}% 6px ${(1-frac)*100}%`;
  });
  window.addEventListener('mouseup', ()=>{ dragging=false; document.body.style.cursor=''; });
})();

/* ---------- KEYBOARD ---------- */
codeEl.addEventListener('keydown', e=>{
  if(e.key === 'Tab'){
    e.preventDefault();
    const s = codeEl.selectionStart, ee = codeEl.selectionEnd;
    codeEl.setRangeText('  ', s, ee, 'end');
    scheduleRender();
  }
  if((e.metaKey||e.ctrlKey) && e.key.toLowerCase()==='s'){ e.preventDefault(); formatNow(); }
  if((e.metaKey||e.ctrlKey) && e.key === 'Enter'){ e.preventDefault(); render(); }
});
codeEl.addEventListener('input', scheduleRender);
codeEl.addEventListener('keyup', updateCursor);
codeEl.addEventListener('click', updateCursor);
codeEl.addEventListener('scroll', syncGutterScroll);

/* ---------- BOOT ---------- */
function boot(){
  setupChordDocHandlers();
  loadExample('ex-c-maj');
  updateCursor();
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', boot);
}else{
  boot();
}
})();
