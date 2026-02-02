(() => {
  const KEY = "logistics-tracker";
  const $ = (id) => document.getElementById(id);

  const els = {
    hqCol: $("hqCol"),
    sectionsCol: $("sectionsCol"),
    newSectionName: $("newSectionName"),
    addSectionBtn: $("addSectionBtn"),
    exportAllBtn: $("exportAllBtn"),
    exportLogBtn: $("exportLogBtn"),
    exportCasBtn: $("exportCasBtn"),
    resetBtn: $("resetBtn"),
    resetAllBtn: $("resetAllBtn"),
  };

  const uid = () =>
    Math.random().toString(36).slice(2, 10) + "-" + Date.now().toString(36);

  function populateCommonItems() {
    const dl = document.getElementById("commonItems");
    if (!dl) return;
    const all = window.COMMON_ITEMS || [];
    dl.innerHTML = "";
    for (const item of all) {
      const opt = document.createElement("option");
      opt.value = item;
      dl.appendChild(opt);
    }
  }

  function demo() {
    return {
      hqAdjust: {},
      sections: [
        { id: "hq", name: "HQ / Overall", people: 0, casualties: { t1: 0, t2: 0, t3: 0, t4: 0 }, items: [] },
        { id: uid(), name: "1 Section (11D)", people: 0, casualties: { t1: 0, t2: 0, t3: 0, t4: 0 }, items: [] },
        { id: uid(), name: "2 Section (11F)", people: 0, casualties: { t1: 0, t2: 0, t3: 0, t4: 0 }, items: [] },
        { id: uid(), name: "3 Section (11H)", people: 0, casualties: { t1: 0, t2: 0, t3: 0, t4: 0 }, items: [] },
      ],
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return demo();
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.sections)) return demo();
      if (!parsed.hqAdjust || typeof parsed.hqAdjust !== "object") parsed.hqAdjust = {};
      return parsed;
    } catch {
      return demo();
    }
  }

  function save(s) {
    localStorage.setItem(KEY, JSON.stringify(s));
  }

  function clampInt(v) {
    const n = Math.floor(Number(v));
    if (!Number.isFinite(n) || n < 0) return 0;
    return n;
  }

  function toTitleCase(str) {
    return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function stripCategory(name) {
    return name.replace(/^\[[^\]]+\]\s*/, "");
  }

  function parseCategory(name) {
    const m = (name || "").trim().match(/^\[([^\]]+)\]\s*(.+)$/);
    if (!m) return { category: "Uncategorised", item: stripCategory(name) };
    return { category: m[1], item: m[2] };
  }

  function sectionTotal(section) {
    return (section.items || []).reduce((a, it) => a + (Number(it.qty) || 0), 0);
  }

  function requestedMap(state) {
    const map = new Map();
    for (const sec of state.sections) {
      if (sec.id === "hq") continue;
      for (const it of sec.items || []) {
        const name = (it.name || "").trim();
        if (!name) continue;
        const qty = Number(it.qty) || 0;
        map.set(name, (map.get(name) || 0) + qty);
      }
    }
    return map;
  }

  function clampAdjust(state, name) {
    const adj = Number(state.hqAdjust[name] || 0);
    if (!Number.isFinite(adj) || adj < 0) state.hqAdjust[name] = 0;
  }

  function sortedNames(map) {
    return Array.from(map.keys()).sort((a, b) => a.localeCompare(b));
  }

  function ensureCasualties(section) {
    if (!section.casualties || typeof section.casualties !== "object") {
      section.casualties = { t1: 0, t2: 0, t3: 0, t4: 0 };
    } else {
      section.casualties.t1 = clampInt(section.casualties.t1);
      section.casualties.t2 = clampInt(section.casualties.t2);
      section.casualties.t3 = clampInt(section.casualties.t3);
      section.casualties.t4 = clampInt(section.casualties.t4);
    }
  }

  function effectivePers(section) {
    ensureCasualties(section);
    const base = Number(section.people) || 0;
    const t1 = Number(section.casualties.t1) || 0;
    const t4 = Number(section.casualties.t4) || 0;
    return Math.max(0, base - t1 - t4);
  }

  function totalPers(state) {
    let sum = 0;
    for (const s of state.sections) sum += effectivePers(s);
    return sum;
  }

  function casualtyTotals(state) {
    const out = { t1: 0, t2: 0, t3: 0, t4: 0, count: 0, effective: 0 };
    for (const s of state.sections) {
      ensureCasualties(s);
      out.t1 += Number(s.casualties.t1) || 0;
      out.t2 += Number(s.casualties.t2) || 0;
      out.t3 += Number(s.casualties.t3) || 0;
      out.t4 += Number(s.casualties.t4) || 0;
      out.count += Number(s.people) || 0;
      out.effective += effectivePers(s);
    }
    return out;
  }

  function logisticsExport(state) {
    const req = requestedMap(state);
    const hq = state.sections.find((s) => s.id === "hq");
    const names = new Set(sortedNames(req));

    for (const it of hq?.items || []) {
      const nm = (it.name || "").trim();
      if (nm) names.add(nm);
    }

    const grouped = {};

    for (const name of names) {
      const requested = Number(req.get(name) || 0);
      clampAdjust(state, name);
      const adjust = Number(state.hqAdjust[name] || 0);
      const totalFromSections = requested + adjust;

      let hqExtraQty = 0;
      if (hq) {
        for (const it of hq.items || []) {
          if (((it.name || "").trim()) === name) hqExtraQty += Number(it.qty) || 0;
        }
      }

      const qty = totalFromSections + hqExtraQty;
      if (qty === 0) continue;

      const { category, item } = parseCategory(name);
      (grouped[category] ||= []).push(`${item} - ${qty}`);
    }

    const lines = [];
    lines.push("----- Logistics Request -----");
    for (const category of Object.keys(grouped).sort()) {
      lines.push(`----- ${category} -----`);
      for (const line of grouped[category].sort()) lines.push(line);
      lines.push("");
    }

    return lines.join("\n").trim();
  }

  function casPersExport(state) {
    const lines = [];
    lines.push(`----- Cas/Pers Report -----`);
    const totals = casualtyTotals(state);
    lines.push(`Count: ${totals.count}`);
    lines.push(`Pers:  ${totals.effective}/${totals.count}`);
    lines.push(`T1: ${totals.t1}  T2: ${totals.t2}  T3: ${totals.t3}  T4: ${totals.t4}`);

    return lines.join("\n").trim();
  }

  function exportAll(state) {
    const lines = [];
    lines.push(casPersExport(state));
    lines.push(``)
    lines.push(``)
    lines.push(logisticsExport(state));
    lines.push*``
    return lines.join("\n").trim();
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      prompt("Copy:", text);
    }
  }

  function makeSplitLabel(text, badgeText) {
    const div = document.createElement("div");
    div.className = "splitlabel";
    const t = document.createElement("span");
    t.textContent = text;
    div.appendChild(t);
    if (badgeText) {
      const pill = document.createElement("span");
      pill.className = "pill";
      pill.textContent = badgeText;
      div.appendChild(pill);
    }
    return div;
  }

  function applyZeroTone(nameEl, qtyEl, qty) {
    const on = (Number(qty) || 0) === 0;
    nameEl.classList.toggle("zeroTone", on);
    qtyEl.classList.toggle("zeroTone", on);
  }

  function renderRequestedRow(state, name, requestedQty) {
    clampAdjust(state, name);

    const row = document.createElement("div");
    row.className = "item";

    const nameInput = document.createElement("input");
    nameInput.className = "input";
    nameInput.type = "text";
    nameInput.value = name;
    nameInput.disabled = true;

    const qtyInput = document.createElement("input");
    qtyInput.className = "input";
    qtyInput.type = "number";
    qtyInput.value = String(requestedQty + Number(state.hqAdjust[name] || 0));
    qtyInput.disabled = true;

    applyZeroTone(nameInput, qtyInput, requestedQty + Number(state.hqAdjust[name] || 0));

    const controls = document.createElement("div");
    controls.className = "controlsRight";

    const tag = document.createElement("span");
    tag.className = "pill";
    tag.textContent = `req:${requestedQty}`;

    const minus = document.createElement("button");
    minus.className = "btn mini";
    minus.type = "button";
    minus.textContent = "-";
    minus.title = "Remove HQ-added extras (cannot go below requested)";
    minus.onclick = () => {
      clampAdjust(state, name);
      const cur = Number(state.hqAdjust[name] || 0);
      state.hqAdjust[name] = Math.max(0, cur - 1);
      save(state);
      render(state);
    };

    const plus = document.createElement("button");
    plus.className = "btn mini";
    plus.type = "button";
    plus.textContent = "+";
    plus.title = "Add HQ extras for this item";
    plus.onclick = () => {
      clampAdjust(state, name);
      const cur = Number(state.hqAdjust[name] || 0);
      state.hqAdjust[name] = cur + 1;
      save(state);
      render(state);
    };

    if ((Number(state.hqAdjust[name] || 0)) <= 0) minus.disabled = true;

    controls.appendChild(tag);
    controls.appendChild(minus);
    controls.appendChild(plus);

    row.appendChild(nameInput);
    row.appendChild(qtyInput);
    row.appendChild(controls);

    return row;
  }

  function renderEditableItemRow(state, section, item) {
    const row = document.createElement("div");
    row.className = "item";

    const trash = document.createElement("button");
    trash.className = "btn danger mini icon";
    trash.type = "button";
    trash.textContent = "🗑";
    trash.title = "Remove item";
    trash.onclick = () => {
      if (!confirm(`Remove "${item.name}"?`)) return;
      section.items = section.items.filter((i) => i.id !== item.id);
      save(state);
      render(state);
    };

    const nameInput = document.createElement("input");
    nameInput.className = "input";
    nameInput.type = "text";
    nameInput.value = item.name;
    nameInput.placeholder = "Item name";
    nameInput.setAttribute("list", "commonItems");
    nameInput.disabled = true;

    const qtyInput = document.createElement("input");
    qtyInput.className = "input";
    qtyInput.type = "number";
    qtyInput.inputMode = "numeric";
    qtyInput.value = String(item.qty ?? 0);
    qtyInput.oninput = () => {
      item.qty = clampInt(qtyInput.value);
      save(state);
      applyZeroTone(nameInput, qtyInput, item.qty);
    };
    qtyInput.onchange = () => render(state);

    applyZeroTone(nameInput, qtyInput, item.qty);

    const controls = document.createElement("div");
    controls.className = "controlsRight";

    const minus = document.createElement("button");
    minus.className = "btn mini";
    minus.type = "button";
    minus.textContent = "-";
    minus.title = "Decrease";
    minus.onclick = () => {
      item.qty = Math.max(0, (Number(item.qty) || 0) - 1);
      save(state);
      render(state);
    };

    const plus = document.createElement("button");
    plus.className = "btn mini";
    plus.type = "button";
    plus.textContent = "+";
    plus.title = "Increase";
    plus.onclick = () => {
      item.qty = (Number(item.qty) || 0) + 1;
      save(state);
      render(state);
    };

    controls.appendChild(minus);
    controls.appendChild(plus);

    row.appendChild(trash);
    row.appendChild(nameInput);
    row.appendChild(qtyInput);
    row.appendChild(controls);

    return row;
  }

  function renderAddRow(state, section) {
    const addRow = document.createElement("div");
    addRow.className = "item";
    addRow.style.opacity = "0.95";

    const spacer = document.createElement("div");
    spacer.style.width = "34px";

    const newItemName = document.createElement("input");
    newItemName.className = "input";
    newItemName.type = "text";
    newItemName.placeholder = "Add new item…";
    newItemName.setAttribute("list", "commonItems");

    const addBtn = document.createElement("button");
    addBtn.className = "btn accent";
    addBtn.type = "button";
    addBtn.textContent = "Add";

    const doAdd = () => {
      const nm = toTitleCase((newItemName.value || "").trim());
      if (!nm) return;
      section.items.push({ id: uid(), name: nm, qty: 1 });
      newItemName.value = "";
      save(state);
      render(state);
    };

    addBtn.onclick = doAdd;
    newItemName.addEventListener("keydown", (e) => {
      if (e.key === "Enter") doAdd();
    });

    addRow.appendChild(spacer);
    addRow.appendChild(newItemName);
    addRow.appendChild(addBtn);

    return addRow;
  }

  function makeCounter(label, value, onMinus, onPlus, pillClass) {
    const wrap = document.createElement("div");
    wrap.className = "counterGroup";

    const minus = document.createElement("button");
    minus.className = "btn mini";
    minus.type = "button";
    minus.textContent = "-";
    minus.onclick = onMinus;

    const pill = document.createElement("span");
    pill.className = "pill" + (pillClass ? ` ${pillClass}` : "");
    pill.textContent = `${label}:${value}`;

    const plus = document.createElement("button");
    plus.className = "btn mini";
    plus.type = "button";
    plus.textContent = "+";
    plus.onclick = onPlus;

    wrap.appendChild(minus);
    wrap.appendChild(pill);
    wrap.appendChild(plus);
    return wrap;
  }

  function renderSectionCard(state, section) {
    const isHQ = section.id === "hq";
    if (typeof section.people !== "number") section.people = clampInt(section.people);
    ensureCasualties(section);

    const card = document.createElement("div");
    card.className = "card";

    const head = document.createElement("div");
    head.className = "cardhead";

    const headerTop = document.createElement("div");
    headerTop.className = "cardhead"; // use same grid rules

    const titleWrap = document.createElement("div");
    titleWrap.className = "headLeft";

    const title = document.createElement("div");
    title.className = "title";
    title.textContent = section.name;

    const meta = document.createElement("div");
    meta.className = "meta";

    if (isHQ) {
      meta.textContent = `HQ Pers: ${section.people || 0} • Total Pers: ${totalPers(state)}`;
    } else {
      meta.textContent = `Pers: ${effectivePers(section)}/${section.people || 0}`;
    }

    titleWrap.appendChild(title);
    titleWrap.appendChild(meta);

    const persCenter = document.createElement("div");
    persCenter.className = "headCenter";

    persCenter.appendChild(
      makeCounter(
        isHQ ? "HQ" : "Count",
        section.people || 0,
        () => {
          section.people = Math.max(0, (section.people || 0) - 1);
          save(state);
          render(state);
        },
        () => {
          section.people = (section.people || 0) + 1;
          save(state);
          render(state);
        }
      )
    );

    const actions = document.createElement("div");
    actions.className = "headActions";

    const clearBtn = document.createElement("button");
    clearBtn.className = "btn icon warn";
    clearBtn.type = "button";
    clearBtn.textContent = "⛔";
    clearBtn.title = isHQ ? "Clear HQ logistics" : "Clear section logistics";
    clearBtn.onclick = () => {
      if (!confirm(`Clear logistics for "${section.name}"?`)) return;
      section.items = [];
      if (isHQ) state.hqAdjust = {};
      save(state);
      render(state);
    };

    actions.appendChild(clearBtn);

    if (!isHQ) {
      const renameBtn = document.createElement("button");
      renameBtn.className = "btn icon";
      renameBtn.type = "button";
      renameBtn.textContent = "✏️";
      renameBtn.title = "Rename section";
      renameBtn.onclick = () => {
        const next = prompt("Rename section:", section.name);
        if (!next) return;
        section.name = next.trim();
        save(state);
        render(state);
      };

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "btn icon danger";
      deleteBtn.type = "button";
      deleteBtn.textContent = "🗑";
      deleteBtn.title = "Delete section";
      deleteBtn.onclick = () => {
        if (!confirm(`Delete section "${section.name}"?`)) return;
        state.sections = state.sections.filter((s) => s.id !== section.id);
        save(state);
        render(state);
      };

      actions.appendChild(renameBtn);
      actions.appendChild(deleteBtn);
    }

    headerTop.appendChild(titleWrap);
    headerTop.appendChild(persCenter);
    headerTop.appendChild(actions);

    const headerBottom = document.createElement("div");
    headerBottom.className = "casRow";

    headerBottom.appendChild(
      makeCounter(
        "T1",
        section.casualties.t1 || 0,
        () => {
          section.casualties.t1 = Math.max(0, (section.casualties.t1 || 0) - 1);
          save(state);
          render(state);
        },
        () => {
          section.casualties.t1 = (section.casualties.t1 || 0) + 1;
          save(state);
          render(state);
        },
        "t1"
      )
    );

    headerBottom.appendChild(
      makeCounter(
        "T2",
        section.casualties.t2 || 0,
        () => {
          section.casualties.t2 = Math.max(0, (section.casualties.t2 || 0) - 1);
          save(state);
          render(state);
        },
        () => {
          section.casualties.t2 = (section.casualties.t2 || 0) + 1;
          save(state);
          render(state);
        },
        "t2"
      )
    );

    headerBottom.appendChild(
      makeCounter(
        "T3",
        section.casualties.t3 || 0,
        () => {
          section.casualties.t3 = Math.max(0, (section.casualties.t3 || 0) - 1);
          save(state);
          render(state);
        },
        () => {
          section.casualties.t3 = (section.casualties.t3 || 0) + 1;
          save(state);
          render(state);
        },
        "t3"
      )
    );

    headerBottom.appendChild(
      makeCounter(
        "T4",
        section.casualties.t4 || 0,
        () => {
          section.casualties.t4 = Math.max(0, (section.casualties.t4 || 0) - 1);
          save(state);
          render(state);
        },
        () => {
          section.casualties.t4 = (section.casualties.t4 || 0) + 1;
          save(state);
          render(state);
        },
        "t4"
      )
    );

    head.appendChild(headerTop);
    head.appendChild(headerBottom);

    const items = document.createElement("div");
    items.className = "items";

    if (isHQ) {
      const req = requestedMap(state);
      const names = sortedNames(req);

      items.appendChild(makeSplitLabel("From Sections", `${names.length} item(s)`));

      if (names.length === 0) {
        const empty = document.createElement("div");
        empty.className = "meta";
        empty.textContent = "No items requested by sections yet.";
        items.appendChild(empty);
      } else {
        for (const name of names) {
          const requestedQty = Number(req.get(name) || 0);
          items.appendChild(renderRequestedRow(state, name, requestedQty));
        }
      }

      items.appendChild(makeSplitLabel("HQ Extras", null));
      for (const it of section.items || []) items.appendChild(renderEditableItemRow(state, section, it));
      items.appendChild(renderAddRow(state, section));
    } else {
      for (const it of section.items || []) items.appendChild(renderEditableItemRow(state, section, it));
      items.appendChild(renderAddRow(state, section));
    }

    card.appendChild(head);
    card.appendChild(items);
    return card;
  }

  function render(state) {
    els.hqCol.innerHTML = "";
    els.sectionsCol.innerHTML = "";

    const hq = state.sections.find((s) => s.id === "hq");
    const others = state.sections.filter((s) => s.id !== "hq");

    if (hq) els.hqCol.appendChild(renderSectionCard(state, hq));
    for (const sec of others) els.sectionsCol.appendChild(renderSectionCard(state, sec));
  }

  let state = load();

  if (!state.sections.some((s) => s.id === "hq")) {
    state.sections.unshift({ id: "hq", name: "HQ / Overall", people: 0, casualties: { t1: 0, t2: 0, t3: 0, t4: 0 }, items: [] });
  }

  if (!state.hqAdjust || typeof state.hqAdjust !== "object") state.hqAdjust = {};
  for (const s of state.sections) {
    if (typeof s.people !== "number") s.people = 0;
    ensureCasualties(s);
    if (!Array.isArray(s.items)) s.items = [];
  }

  save(state);

  populateCommonItems();
  render(state);

  els.addSectionBtn.onclick = () => {
    const nm = (els.newSectionName.value || "").trim();
    if (!nm) return;
    state.sections.push({ id: uid(), name: nm, people: 0, casualties: { t1: 0, t2: 0, t3: 0, t4: 0 }, items: [] });
    els.newSectionName.value = "";
    save(state);
    render(state);
  };

  els.newSectionName.addEventListener("keydown", (e) => {
    if (e.key === "Enter") els.addSectionBtn.click();
  });

  if (els.exportAllBtn) {
    els.exportAllBtn.onclick = async () => {
      await copyText(exportAll(state));
    };
  }

  if (els.exportLogBtn) {
    els.exportLogBtn.onclick = async () => {
      await copyText(logisticsExport(state));
    };
  }

  if (els.exportCasBtn) {
    els.exportCasBtn.onclick = async () => {
      await copyText(casPersExport(state));
    };
  }

  els.resetBtn.onclick = () => {
    const ok = confirm(
      "This will clear all logistics requests:\n\n" +
        "• Item lists\n" +
        "• Quantities\n" +
        "• HQ adjustments\n\n" +
        "Sections, pers counts, and casualties will be kept.\n\nContinue?"
    );
    if (!ok) return;

    state.hqAdjust = {};
    for (const section of state.sections) section.items = [];
    save(state);
    render(state);
  };

  els.resetAllBtn.onclick = () => {
    const ok = confirm(
      "This will clear ALL locally saved data:\n\n" +
        "• Sections\n" +
        "• HQ adjustments\n" +
        "• Pers counts\n" +
        "• Casualties\n\n" +
        "This cannot be undone.\n\nContinue?"
    );
    if (!ok) return;

    localStorage.removeItem(KEY);
    state = load();
    save(state);
    populateCommonItems();
    render(state);
  };
})();

