// ═══════════════════════════════════════════════════════════════
//  ITEMS DATABASE — replace with your full JSON array
// ═══════════════════════════════════════════════════════════════
var ITEMS = [
  {className:"rhs_mag_30Rnd_556x45_M855A1",  displayName:"Bandolier (5.56 STANAG 30rnd)",  armaCategory:"Ammo"},
  {className:"rhs_mag_30Rnd_556x45_M855",    displayName:"Bandolier (5.56 STANAG M855)",    armaCategory:"Ammo"},
  {className:"rhs_mag_30Rnd_762x39mm",       displayName:"Bandolier (7.62x39mm 30rnd)",     armaCategory:"Ammo"},
  {className:"rhs_mag_100Rnd_762x54mmR",     displayName:"Bandolier (7.62 Link 100rnd)",    armaCategory:"Ammo"},
  {className:"rhs_mag_762x51_Box20",         displayName:"Bandolier (7.62 Mag 20rnd)",      armaCategory:"Ammo"},
  {className:"rhs_grenade_M67",              displayName:"M67 Fragmentation Grenade",       armaCategory:"Ammo"},
  {className:"SmokeShell",                   displayName:"Smoke Grenade (White)",            armaCategory:"Ammo"},
  {className:"SmokeShellRed",                displayName:"Smoke Grenade (Red)",              armaCategory:"Ammo"},
  {className:"SmokeShellGreen",              displayName:"Smoke Grenade (Green)",            armaCategory:"Ammo"},
  {className:"rhs_mag_M136_HEAT",            displayName:"AT4 HEAT Round",                  armaCategory:"Ammo"},
  {className:"kat_IV_16",                    displayName:"16g IV",                           armaCategory:"Medical", mod:"@KAT"},
  {className:"kat_IV_14",                    displayName:"14g IV",                           armaCategory:"Medical", mod:"@KAT"},
  {className:"kat_bloodIV_500",              displayName:"Blood IV (500ml)",                 armaCategory:"Medical", mod:"@KAT"},
  {className:"kat_bloodIV_1000",             displayName:"Blood IV (1000ml)",                armaCategory:"Medical", mod:"@KAT"},
  {className:"ACE_fieldDressing",            displayName:"Field Dressing",                   armaCategory:"Medical", mod:"@ACE3"},
  {className:"ACE_elasticBandage",           displayName:"Elastic Bandage",                  armaCategory:"Medical", mod:"@ACE3"},
  {className:"ACE_packingBandage",           displayName:"Packing Bandage",                  armaCategory:"Medical", mod:"@ACE3"},
  {className:"ACE_tourniquet",               displayName:"CAT Tourniquet",                   armaCategory:"Medical", mod:"@ACE3"},
  {className:"ACE_morphine",                 displayName:"Morphine Autoinjector",            armaCategory:"Medical", mod:"@ACE3"},
  {className:"ACE_adenosine",                displayName:"Adenosine Autoinjector",           armaCategory:"Medical", mod:"@ACE3"},
  {className:"ACE_epinephrine",              displayName:"Epinephrine Autoinjector",         armaCategory:"Medical", mod:"@ACE3"},
  {className:"ACE_surgicalKit",              displayName:"Surgical Kit",                     armaCategory:"Medical", mod:"@ACE3"},
  {className:"ACE_personalAidKit",           displayName:"Personal Aid Kit",                 armaCategory:"Medical", mod:"@ACE3"},
  {className:"4IB_ACE_NVG_Gen4_Black",       displayName:"[Pilot] Dual-tube NVG, Black",     armaCategory:"Equipment", mod:"@4thib"},
  {className:"ACE_RangeCard",                displayName:"Range Card",                       armaCategory:"Equipment", mod:"@ACE3"},
  {className:"ACE_MapTools",                 displayName:"Map Tools",                        armaCategory:"Equipment", mod:"@ACE3"},
  {className:"ACE_Chemlight_HiBlue",         displayName:"Chemlight (Blue)",                 armaCategory:"Equipment", mod:"@ACE3"},
  {className:"ACE_Chemlight_HiGreen",        displayName:"Chemlight (Green)",                armaCategory:"Equipment", mod:"@ACE3"},
  {className:"ACE_Chemlight_HiRed",          displayName:"Chemlight (Red)",                  armaCategory:"Equipment", mod:"@ACE3"},
  {className:"ACRE_PRC152",                  displayName:"ACRE PRC-152 Radio",               armaCategory:"Equipment", mod:"@ACRE2"},
  {className:"ACRE_PRC117F",                 displayName:"ACRE PRC-117F Radio",              armaCategory:"Equipment", mod:"@ACRE2"},
  {className:"Binocular",                    displayName:"Binoculars",                       armaCategory:"Equipment"},
  {className:"ACE_Vector21",                 displayName:"Vector 21 Rangefinder",            armaCategory:"Equipment", mod:"@ACE3"},
  {className:"rhs_weap_m4a1",                displayName:"M4A1 Carbine",                     armaCategory:"Weapons"},
  {className:"rhs_weap_m249_pip_S",          displayName:"M249 SAW (Short)",                 armaCategory:"Weapons"},
  {className:"rhs_weap_M136",                displayName:"M136 AT4",                         armaCategory:"Weapons"},
  {className:"rhs_weap_smaw",                displayName:"SMAW Rocket Launcher",             armaCategory:"Weapons"}
];

// ═══════════════════════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════════════════════
var STORAGE_KEY = 'ops_lt_v5';

var state = {
  hq: {pers:0, t1:0, t2:0, t3:0, t4:0, items:[]},
  sections: []
};

// Pending add state per section id
var pendingQty = {};   // sid -> number
var pendingSel = {};   // sid -> ITEMS entry or null

function uid() { return Math.random().toString(36).slice(2, 9); }

function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch(e) {}
}

function loadState() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      var d = JSON.parse(raw);
      if (d && d.hq) { state = d; }
    }
  } catch(e) {}
}

function getSection(id) {
  return state.sections.find(function(s) { return s.id === id; });
}

function getObj(id) {
  return id === 'hq' ? state.hq : getSection(id);
}

// ═══════════════════════════════════════════════════════════════
//  STATUS
// ═══════════════════════════════════════════════════════════════
function calcStatus(o) {
  if (!o.pers || o.pers <= 0) return 's-green';
  var pct = ((o.t1 || 0) + (o.t2 || 0)) / o.pers * 100;
  if (pct > 40)  return 's-red';
  if (pct >= 20) return 's-amber';
  return 's-green';
}

function calcOverallStatus() {
  var all = [state.hq].concat(state.sections);
  // Aggregate casualties
  var totalPers = all.reduce(function(a,o){ return a+(o.pers||0); }, 0);
  var totalT12  = all.reduce(function(a,o){ return a+(o.t1||0)+(o.t2||0); }, 0);
  var casPct = totalPers > 0 ? (totalT12 / totalPers * 100) : 0;
  if (casPct > 50) return 's-red';
  // Count red/amber sections
  var redCount = state.sections.filter(function(s){ return calcStatus(s) === 's-red'; }).length;
  var amberCount = state.sections.filter(function(s){ return calcStatus(s) === 's-amber'; }).length;
  if (redCount >= 2) return 's-red';
  if (redCount === 1 || amberCount >= 2) return 's-amber';
  if (casPct > 20) return 's-amber';
  return 's-green';
}

// ═══════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════
function esc(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function toast(msg, err) {
  var el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast' + (err ? ' err' : '');
  requestAnimationFrame(function() { el.classList.add('show'); });
  clearTimeout(el._t);
  el._t = setTimeout(function() { el.classList.remove('show'); }, 2800);
}

function copyText(text) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text)
      .then(function() { toast('Copied to clipboard'); })
      .catch(function() { fallbackCopy(text); });
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  var ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); toast('Copied to clipboard'); }
  catch(e) { toast('Copy failed', true); }
  document.body.removeChild(ta);
}

// ═══════════════════════════════════════════════════════════════
//  RENDER — HQ PANEL
// ═══════════════════════════════════════════════════════════════
function renderHQ() {
  var h = state.hq;
  var totalPers = h.pers;
  state.sections.forEach(function(s) { totalPers += s.pers; });

  var st = calcStatus(h);
  var col = document.getElementById('colHQ');
  col.innerHTML =
    '<div class="panel">' +
      '<div class="panel-head">' +
        '<div>' +
          '<div class="panel-name">HQ / Overall</div>' +
          '<div class="panel-sub" id="hqSub">HQ Pers: ' + h.pers + ' &bull; Total Pers: ' + totalPers + '</div>' +
        '</div>' +
        '<div class="ph-right">' +
          '<div class="counter">' +
            '<button class="cb" data-adj="hq|pers|-1">&#8722;</button>' +
            '<div class="cv" id="hqPersVal">HQ: ' + h.pers + '</div>' +
            '<button class="cb" data-adj="hq|pers|1">+</button>' +
          '</div>' +
          '<div class="sdot ' + st + '"><div class="sdot-i"></div></div>' +
        '</div>' +
      '</div>' +
      renderTriageRow('hq', h) +
      renderAggArea() +
      renderItemAddArea('hq') +
      renderItemsArea('hq', h.items) +
    '</div>';

  bindAdjButtons(col);
  bindSearchInput('hq');
}

function renderTriageRow(sid, o) {
  return '<div class="triage-row">' +
    renderTri(sid, 't1', o.t1 || 0, 't1') +
    renderTri(sid, 't2', o.t2 || 0, 't2') +
    renderTri(sid, 't3', o.t3 || 0, 't3') +
    renderTri(sid, 't4', o.t4 || 0, 't4') +
  '</div>';
}

function renderTri(sid, key, val, cls) {
  return '<div class="tri">' +
    '<button class="tb" data-adj="' + sid + '|' + key + '|-1">&#8722;</button>' +
    '<div class="tl ' + cls + '">' + key.toUpperCase() + ': ' + val + '</div>' +
    '<button class="tb" data-adj="' + sid + '|' + key + '|1">+</button>' +
  '</div>';
}

function renderAggArea() {
  var all = [];
  var sources = [{obj: state.hq, name: 'HQ'}].concat(
    state.sections.map(function(s){ return {obj: s, name: s.name}; })
  );
  var merged = {};
  sources.forEach(function(src) {
    (src.obj.items || []).forEach(function(i) {
      if (merged[i.displayName]) {
        merged[i.displayName].qty += i.qty;
      } else {
        merged[i.displayName] = {name: i.displayName, qty: i.qty, imp: i.imp};
      }
    });
  });
  var all = Object.values(merged);

  var inner = '';
  if (all.length === 0) {
    inner = '<div class="agg-empty">No items requested by sections yet.</div>';
  } else {
    all.forEach(function(i) {
      var style = i.imp ? ' style="color:var(--accent)"' : '';
      inner += '<div class="agg-row">' +
        '<span class="agg-name"' + style + '>' + esc(i.name) + '</span>' +
        '<span class="agg-qty">&times;' + i.qty + '</span>' +
        '<span class="agg-sec">' + esc(i.sec) + '</span>' +
      '</div>';
    });
  }

  return '<div class="agg-area">' +
    '<div class="items-lbl">Overall <span class="ibadge">' + all.length + ' item(s)</span></div>' +
    inner +
  '</div>';
}

function renderItemAddArea(sid) {
  var qty = pendingQty[sid] || 1;
  return '<div class="item-add">' +
    '<div class="add-row">' +
      '<div class="sw">' +
        '<input class="si" id="si-' + sid + '" placeholder="Search or type item name\u2026" autocomplete="off">' +
        '<div class="sdd" id="sdd-' + sid + '"></div>' +
      '</div>' +
      '<div class="qc">' +
        '<button class="qb" data-aq="' + sid + '|-1">&#8722;</button>' +
        '<div class="qn" id="aqn-' + sid + '">' + qty + '</div>' +
        '<button class="qb" data-aq="' + sid + '|1">+</button>' +
      '</div>' +
      '<button class="ab" data-addi="' + sid + '">Add</button>' +
    '</div>' +
  '</div>';
}

function renderItemsArea(sid, items) {
  var label = sid === 'hq' ? 'HQ Extras' : 'Items';
  var rows = '';
  items.forEach(function(i) {
    var cls = 'ir' + (i.imp ? ' imp' : '');
    rows += '<div class="' + cls + '">' +
      '<span class="ir-name">' + esc(i.displayName) + '</span>' +
      '<span class="ir-cat">' + esc(i.armaCategory || '') + '</span>' +
      '<button class="iqb" data-iq="' + sid + '|' + i.id + '|-1">&#8722;</button>' +
      '<span class="iqn">' + i.qty + '</span>' +
      '<button class="iqb" data-iq="' + sid + '|' + i.id + '|1">+</button>' +
      '<button class="idb" data-rm="' + sid + '|' + i.id + '">&#215;</button>' +
    '</div>';
  });
  var clearBtn = items.length ? '<button class="reset-log-btn" data-resetlog="' + sid + '">Clear</button>' : '';
  return '<div class="items-area">' +
    '<div class="items-lbl">' + label + ' <span class="ibadge">' + items.length + '</span>' + clearBtn + '</div>' +
    '<div class="items-list">' + rows + '</div>' +
  '</div>';
}

// ═══════════════════════════════════════════════════════════════
//  RENDER — SECTIONS
// ═══════════════════════════════════════════════════════════════
function renderSections() {
  var col = document.getElementById('colSecs');
  document.getElementById('noSecMsg').style.display = state.sections.length ? 'none' : '';

  // Remove existing panels
  var panels = col.querySelectorAll('.panel');
  panels.forEach(function(p) { p.remove(); });

  state.sections.forEach(function(s) {
    var div = document.createElement('div');
    div.className = 'panel';
    div.id = 'panel-' + s.id;
    div.innerHTML = buildSectionHTML(s);
    col.appendChild(div);
    bindAdjButtons(div);
    bindSearchInput(s.id);
  });
}

function buildSectionHTML(s) {
  var st  = calcStatus(s);
  var eff = Math.max(0, s.pers - (s.t1||0) - (s.t2||0) - (s.t3||0) - (s.t4||0));

  return '<div class="panel-head">' +
      '<div>' +
        '<div class="panel-name">' + esc(s.name) + '</div>' +
        '<div class="panel-sub">Pers: ' + eff + '/' + s.pers + '</div>' +
      '</div>' +
      '<div class="ph-right">' +
        '<div class="counter">' +
          '<button class="cb" data-adj="' + s.id + '|pers|-1">&#8722;</button>' +
          '<div class="cv">Count: ' + s.pers + '</div>' +
          '<button class="cb" data-adj="' + s.id + '|pers|1">+</button>' +
        '</div>' +
        '<div class="sdot ' + st + '"><div class="sdot-i"></div></div>' +
        '<button class="ib exp" data-expsec="' + s.id + '" title="Export">&#8657;</button>' +
        '<button class="ib edit edit-only" data-rename="' + s.id + '" title="Rename">&#9998;</button>' +
        '<button class="ib del edit-only" data-delsec="' + s.id + '" title="Delete">&#215;</button>' +
      '</div>' +
    '</div>' +
    renderTriageRow(s.id, s) +
    renderItemAddArea(s.id) +
    renderItemsArea(s.id, s.items || []);
}

// ═══════════════════════════════════════════════════════════════
//  FULL RENDER
// ═══════════════════════════════════════════════════════════════
function render() {
  renderHQ();
  renderSections();
  var os = calcOverallStatus();
  var labels = {'s-green':'Operational','s-amber':'Degraded','s-red':'Mass CAS'};
  var el = document.getElementById('overallStatus');
  el.className = 'overall-status ' + os;
  el.innerHTML = '<div class="os-dot"></div>' + labels[os];
  saveState();
}

// ═══════════════════════════════════════════════════════════════
//  EVENT DELEGATION
// ═══════════════════════════════════════════════════════════════
function bindAdjButtons(root) {
  root.querySelectorAll('[data-adj]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var parts = btn.dataset.adj.split('|');
      var sid = parts[0], key = parts[1], d = parseInt(parts[2]);
      var o = getObj(sid);
      if (!o) return;
      o[key] = Math.max(0, (o[key] || 0) + d);
      render();
    });
  });

  root.querySelectorAll('[data-aq]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var parts = btn.dataset.aq.split('|');
      var sid = parts[0], d = parseInt(parts[1]);
      pendingQty[sid] = Math.max(1, (pendingQty[sid] || 1) + d);
      var el = document.getElementById('aqn-' + sid);
      if (el) el.textContent = pendingQty[sid];
    });
  });

  root.querySelectorAll('[data-addi]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      doAddItem(btn.dataset.addi);
    });
  });

  root.querySelectorAll('[data-iq]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var parts = btn.dataset.iq.split('|');
      var sid = parts[0], iid = parts[1], d = parseInt(parts[2]);
      var o = getObj(sid);
      if (!o) return;
      var item = o.items.find(function(i) { return i.id === iid; });
      if (!item) return;
      item.qty = Math.max(1, item.qty + d);
      render();
    });
  });

  root.querySelectorAll('[data-rm]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var parts = btn.dataset.rm.split('|');
      var sid = parts[0], iid = parts[1];
      var o = getObj(sid);
      if (!o) return;
      o.items = o.items.filter(function(i) { return i.id !== iid; });
      render();
    });
  });

  root.querySelectorAll('[data-rename]').forEach(function(btn) {
    btn.addEventListener('click', function() { openRename(btn.dataset.rename); });
  });

  root.querySelectorAll('[data-delsec]').forEach(function(btn) {
    btn.addEventListener('click', function() { deleteSection(btn.dataset.delsec); });
  });

  root.querySelectorAll('[data-expsec]').forEach(function(btn) {
    btn.addEventListener('click', function() { exportSection(btn.dataset.expsec); });
  });

  root.querySelectorAll('[data-resetlog]').forEach(function(btn) {
    btn.addEventListener('click', function() { resetLogistics(btn.dataset.resetlog); });
  });
}

// ═══════════════════════════════════════════════════════════════
//  SEARCH / AUTOCOMPLETE
// ═══════════════════════════════════════════════════════════════
function bindSearchInput(sid) {
  var inp = document.getElementById('si-' + sid);
  var dd  = document.getElementById('sdd-' + sid);
  if (!inp || !dd) return;

  inp.addEventListener('input', function() { updateDropdown(sid, inp.value); });
  inp.addEventListener('focus', function() { updateDropdown(sid, inp.value); });
  inp.addEventListener('blur',  function() {
    setTimeout(function() { dd.classList.remove('open'); }, 180);
  });
  inp.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') { doAddItem(sid); }
  });
}

function updateDropdown(sid, query) {
  var dd = document.getElementById('sdd-' + sid);
  if (!dd) return;
  var q = (query || '').trim().toLowerCase();
  if (!q) { dd.classList.remove('open'); return; }

  function fuzzy(str, pattern) {
  str = str.toLowerCase();
  var pi = 0;
  for (var si = 0; si < str.length && pi < pattern.length; si++) {
    if (str[si] === pattern[pi]) pi++;
    }
    return pi === pattern.length;
  }

  var matches = ITEMS.filter(function(i) {
    return fuzzy(i.displayName, q) ||
          fuzzy(i.className || '', q) ||
          fuzzy(i.armaCategory || '', q);
  }).slice(0, 14);

  if (!matches.length) { dd.classList.remove('open'); return; }

  var html = '';
  matches.forEach(function(i) {
    html += '<div class="ddi" data-cls="' + esc(i.className) + '">' +
      '<span class="ddi-name">' + esc(i.displayName) + '</span>' +
      '<span class="ddi-cat">' + esc(i.armaCategory || '') + '</span>' +
    '</div>';
  });
  dd.innerHTML = html;
  dd.classList.add('open');

  dd.querySelectorAll('.ddi').forEach(function(el) {
    el.addEventListener('mousedown', function(e) {
      e.preventDefault();
      var cls = el.dataset.cls;
      var item = ITEMS.find(function(i) { return i.className === cls; });
      if (item) {
        pendingSel[sid] = item;
        var inp = document.getElementById('si-' + sid);
        if (inp) inp.value = item.displayName;
      }
      dd.classList.remove('open');
    });
  });
}

// ═══════════════════════════════════════════════════════════════
//  ADD ITEM
// ═══════════════════════════════════════════════════════════════
function doAddItem(sid) {
  var inp  = document.getElementById('si-' + sid);
  var name = inp ? inp.value.trim() : '';
  if (!name) return;

  var o   = getObj(sid);
  if (!o) return;
  var qty = pendingQty[sid] || 1;
  var sel = pendingSel[sid] || null;

  var existing = o.items.find(function(i) {
    return i.displayName.toLowerCase() === name.toLowerCase();
  });

  if (existing) {
    existing.qty += qty;
  } else {
    o.items.push({
      id:           uid(),
      displayName:  sel ? sel.displayName  : name,
      className:    sel ? sel.className    : '',
      armaCategory: sel ? sel.armaCategory : 'Other',
      qty:          qty,
      imp:          false
    });
  }

  if (inp) inp.value = '';
  pendingSel[sid] = null;
  pendingQty[sid] = 1;
  render();
}

// ═══════════════════════════════════════════════════════════════
//  SECTIONS
// ═══════════════════════════════════════════════════════════════
function addSection() {
  var inp  = document.getElementById('newSecInp');
  var name = inp.value.trim();
  if (!name) { toast('Enter a section name', true); return; }
  state.sections.push({id:uid(), name:name, pers:0, t1:0, t2:0, t3:0, t4:0, items:[]});
  inp.value = '';
  render();
  toast('"' + name + '" added');
}

function deleteSection(id) {
  var s = getSection(id);
  if (!confirm('Delete "' + (s ? s.name : id) + '"? Cannot be undone.')) return;
  state.sections = state.sections.filter(function(s) { return s.id !== id; });
  render();
  toast('Section removed');
}

// ── RENAME
var _renameId = null;
function openRename(id) {
  _renameId = id;
  var s = getSection(id);
  document.getElementById('renameInp').value = s ? s.name : '';
  document.getElementById('renameOverlay').classList.add('open');
  setTimeout(function() { document.getElementById('renameInp').select(); }, 40);
}
function closeRename() {
  document.getElementById('renameOverlay').classList.remove('open');
  _renameId = null;
}
function doRename() {
  var n = document.getElementById('renameInp').value.trim();
  if (!n) { toast('Name required', true); return; }
  var s = getSection(_renameId);
  if (s) { s.name = n; }
  closeRename();
  render();
  toast('Renamed');
}

// -- RESET  (confirm() is blocked in many contexts so we use a two-click arm/fire pattern)
var _resetArmed = false;
var _resetAllArmed = false;

function doReset() {
  if (!_resetArmed) {
    _resetArmed = true;
    var btn = document.getElementById('btnReset');
    btn.textContent = 'Confirm Reset';
    btn.style.background = 'var(--red)';
    btn.style.color = '#fff';
    setTimeout(function() {
      _resetArmed = false;
      btn.textContent = 'Reset';
      btn.style.background = '';
      btn.style.color = '';
    }, 3000);
    return;
  }
  _resetArmed = false;
  var btn = document.getElementById('btnReset');
  btn.textContent = 'Reset';
  btn.style.background = '';
  btn.style.color = '';
  function clearObj(o) { o.t1=0; o.t2=0; o.t3=0; o.t4=0; o.items=[]; }
  clearObj(state.hq);
  state.sections.forEach(function(s) { clearObj(s); });
  render();
  toast('All logistics and casualties cleared');
}

function doResetAll() {
  if (!_resetAllArmed) {
    _resetAllArmed = true;
    var btn = document.getElementById('btnResetAll');
    btn.textContent = 'Confirm Reset All';
    btn.style.background = 'var(--red)';
    btn.style.color = '#fff';
    setTimeout(function() {
      _resetAllArmed = false;
      btn.textContent = 'Reset All';
      btn.style.background = '';
      btn.style.color = '';
    }, 3000);
    return;
  }
  _resetAllArmed = false;
  var btn = document.getElementById('btnResetAll');
  btn.textContent = 'Reset All';
  btn.style.background = '';
  btn.style.color = '';
  try { localStorage.removeItem(STORAGE_KEY); } catch(e) {}
  state = { hq: {pers:0, t1:0, t2:0, t3:0, t4:0, items:[]}, sections: [] };
  render();
  toast('Reset to fresh start');
}
function resetLogistics(sid) {
  var o = getObj(sid);
  if (!o) return;
  o.items = [];
  render();
  toast('Logistics cleared');
}

var editMode = false;
document.getElementById('btnEditMode').addEventListener('click', function() {
  editMode = !editMode;
  var btn = document.getElementById('btnEditMode');
  btn.textContent = editMode ? 'Exit Edit' : 'Edit Mode';
  btn.classList.toggle('edit-active', editMode);
  document.getElementById('addBar').style.display = editMode ? 'flex' : 'none';
  document.querySelectorAll('.edit-only').forEach(function(el) {
    el.style.display = editMode ? 'flex' : 'none';
  });
});

// ═══════════════════════════════════════════════════════════════
//  EXPORT  — all exports produce aggregated totals, not per-section
// ═══════════════════════════════════════════════════════════════

// Build a single aggregated object across HQ + all sections
function buildTotals() {
  var all = [state.hq].concat(state.sections);
  var totals = {pers:0, t1:0, t2:0, t3:0, t4:0, items:[]};
  all.forEach(function(o) {
    totals.pers += (o.pers || 0);
    totals.t1   += (o.t1  || 0);
    totals.t2   += (o.t2  || 0);
    totals.t3   += (o.t3  || 0);
    totals.t4   += (o.t4  || 0);
    (o.items || []).forEach(function(i) {
      // Merge items with the same displayName by summing qty
      var existing = totals.items.find(function(x) {
        return x.displayName === i.displayName;
      });
      if (existing) {
        existing.qty += i.qty;
      } else {
        totals.items.push({
          displayName:  i.displayName,
          armaCategory: i.armaCategory || 'Other',
          qty:          i.qty
        });
      }
    });
  });
  return totals;
}

function fmtCasPersTotal(t) {
  var eff = Math.max(0, t.pers - t.t1 - t.t2 - t.t3 - t.t4);
  return '----- Cas/Pers Report -----\n' +
    'Count: ' + t.pers + '\n' +
    'Pers:  ' + eff + '/' + t.pers + '\n' +
    'T1: ' + t.t1 + '  T2: ' + t.t2 + '  T3: ' + t.t3 + '  T4: ' + t.t4;
}

function fmtLogisticsTotal(t) {
  if (!t.items.length) return '';
  var groups = {};
  t.items.forEach(function(i) {
    var cat = i.armaCategory || 'Other';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(i);
  });
  var lines = ['----- Logistics Request -----'];
  Object.keys(groups).forEach(function(cat) {
    lines.push('----- ' + cat + ' -----');
    groups[cat].forEach(function(i) {
      lines.push(i.displayName + ' - ' + i.qty);
    });
  });
  return lines.join('\n');
}

// Per-section export (the ⇧ button on each section) keeps detail
function exportSection(id) {
  var s = getSection(id);
  if (!s) return;
  var eff = Math.max(0, s.pers - (s.t1||0) - (s.t2||0) - (s.t3||0) - (s.t4||0));
  var lines = [
    '----- ' + s.name + ' Cas/Pers Report -----',
    'Count: ' + s.pers,
    'Pers:  ' + eff + '/' + s.pers,
    'T1: ' + (s.t1||0) + '  T2: ' + (s.t2||0) + '  T3: ' + (s.t3||0) + '  T4: ' + (s.t4||0)
  ];
  if (s.items && s.items.length) {
    var groups = {};
    s.items.forEach(function(i) {
      var cat = i.armaCategory || 'Other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(i);
    });
    lines.push('----- ' + s.name + ' Logistics Request -----');
    Object.keys(groups).forEach(function(cat) {
      lines.push('----- ' + cat + ' -----');
      groups[cat].forEach(function(i) { lines.push(i.displayName + ' - ' + i.qty); });
    });
  }
  copyText(lines.join('\n'));
}

function exportAll() {
  var t = buildTotals();
  var parts = [fmtCasPersTotal(t)];
  var log = fmtLogisticsTotal(t);
  if (log) parts.push(log);
  copyText(parts.join('\n'));
}

function exportLogistics() {
  var t = buildTotals();
  var log = fmtLogisticsTotal(t);
  if (!log) { toast('No logistics items to export', true); return; }
  copyText(log);
}

function exportCasPers() {
  var t = buildTotals();
  copyText(fmtCasPersTotal(t));
}

// ═══════════════════════════════════════════════════════════════
//  WIRE UP STATIC BUTTONS
// ═══════════════════════════════════════════════════════════════
document.getElementById('btnAddSec').addEventListener('click', addSection);
document.getElementById('newSecInp').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') addSection();
});
document.getElementById('btnExportAll').addEventListener('click', exportAll);
document.getElementById('btnExportLog').addEventListener('click', exportLogistics);
document.getElementById('btnExportCas').addEventListener('click', exportCasPers);
document.getElementById('btnReset').addEventListener('click', doReset);
document.getElementById('btnResetAll').addEventListener('click', doResetAll);
document.getElementById('btnCloseRename').addEventListener('click', closeRename);
document.getElementById('btnCancelRename').addEventListener('click', closeRename);
document.getElementById('btnDoRename').addEventListener('click', doRename);
document.getElementById('renameInp').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') doRename();
});

// Close dropdowns on outside click
document.addEventListener('click', function(e) {
  if (!e.target.closest('.sw')) {
    document.querySelectorAll('.sdd').forEach(function(d) { d.classList.remove('open'); });
  }
});

// ═══════════════════════════════════════════════════════════════
//  INIT — try items.json first, fall back to built-in ITEMS
// ═══════════════════════════════════════════════════════════════
loadState();
fetch('items.json')
  .then(function(r) {
    if (!r.ok) throw new Error('not found');
    return r.json();
  })
  .then(function(data) {
    if (Array.isArray(data) && data.length) {
      ITEMS = data;
      toast('Loaded ' + data.length + ' items from items.json');
    }
    render();
  })
  .catch(function() {
    // items.json missing or invalid — use built-in ITEMS array
    render();
  });