(() => {
  const MAX_SLOTS = 10;
  const KEY = "logi_2ic_v3";

  const $ = (id) => document.getElementById(id);

  const colgroup = $("colgroup");
  const thead = $("thead");
  const tbody = $("tbody");
  const tfoot = $("tfoot");
  const otherSection = $("otherSection");

  const btnAddRow = $("btnAddRow");
  const btnEdit = $("btnEdit");

  function makeEmptyRow() {
    const eq = {};
    for (const it of window.EQUIPMENT) eq[it.key] = 0;
    return { name: "", role: "", oom: "", eq, other: "" };
  }

  function clampInt(n, min, max) {
    n = (n | 0);
    if (n < min) return min;
    if (n > max) return max;
    return n;
  }

  function normalizeRow(r) {
    const base = makeEmptyRow();
    if (!r || typeof r !== "object") return base;

    base.name = typeof r.name === "string" ? r.name : "";
    base.role = typeof r.role === "string" ? r.role : "";
    base.oom = (r.oom ?? "") + "";
    base.other = typeof r.other === "string" ? r.other : "";

    const eq = (r.eq && typeof r.eq === "object") ? r.eq : {};
    for (const it of window.EQUIPMENT) {
      const v = Number(eq[it.key]);
      base.eq[it.key] = Number.isFinite(v) ? clampInt(v, 0, 10) : 0;
    }
    return base;
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return { rows: [makeEmptyRow()], otherSection: "", editing: false };

      const parsed = JSON.parse(raw);
      const rows = Array.isArray(parsed.rows) ? parsed.rows.map(normalizeRow) : [makeEmptyRow()];
      return {
        rows: rows.length ? rows.slice(0, MAX_SLOTS) : [makeEmptyRow()],
        otherSection: typeof parsed.otherSection === "string" ? parsed.otherSection : "",
        editing: !!parsed.editing
      };
    } catch {
      return { rows: [makeEmptyRow()], otherSection: "", editing: false };
    }
  }

  function save(state) {
    localStorage.setItem(KEY, JSON.stringify(state));
  }

  function clearKitOnly(row) {
    row.other = "";
    for (const it of window.EQUIPMENT) row.eq[it.key] = 0;
  }

  const EQ_W = 70;
  const NAME_W = 140;
  const ROLE_W = 120;
  const OTHER_W = 260;
  const CLR_W = 44;
  const DEL_W = 52;

  function buildColGroup() {
    colgroup.innerHTML = "";

    const add = (px) => {
      const c = document.createElement("col");
      c.style.width = px + "px";
      colgroup.appendChild(c);
    };

    add(NAME_W);
    add(ROLE_W);
    add(EQ_W);

    for (let i = 0; i < window.EQUIPMENT.length; i++) add(EQ_W);

    add(OTHER_W);
    add(CLR_W);
    add(DEL_W);
  }

  function buildHeader() {
    const tr = document.createElement("tr");
    const cols = [
      { label: "Name", cls: "colName" },
      { label: "Role", cls: "colRole" },
      { label: "OOM", cls: "colOom" },
      ...window.EQUIPMENT.map(x => ({ label: x.label, cls: "colEq" })),
      { label: "Other", cls: "colOther" },
      { label: "", cls: "colClear" },
      { label: "", cls: "colDel" }
    ];

    thead.innerHTML = "";
    for (const c of cols) {
      const th = document.createElement("th");

      if (c.label && c.label.includes(" ")) {
        const s = c.label.trim();
        const lastSpace = s.lastIndexOf(" ");
        if (lastSpace > 3 && (s.length - lastSpace) <= 9) {
          th.innerHTML = s.slice(0, lastSpace) + "<br>" + s.slice(lastSpace + 1);
        } else {
          th.textContent = c.label;
        }
      } else {
        th.textContent = c.label;
      }

      th.className = c.cls;
      tr.appendChild(th);
    }
    thead.appendChild(tr);
  }

  function mkInput(value, onChange, placeholder = "", readonly = false) {
    const el = document.createElement("input");
    el.type = "text";
    el.value = value ?? "";
    el.placeholder = placeholder;
    if (readonly) el.readOnly = true;
    el.addEventListener("input", () => onChange(el.value));
    return el;
  }

  function mkNum(value, onChange, placeholder = "") {
    const el = document.createElement("input");
    el.type = "number";
    el.inputMode = "numeric";
    el.value = value ?? "";
    el.placeholder = placeholder;
    el.addEventListener("input", () => onChange(el.value));
    return el;
  }

  function mkSelect(value, onChange) {
    const el = document.createElement("select");
    for (let i = 0; i <= 10; i++) {
      const opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = String(i);
      el.appendChild(opt);
    }
    el.value = String(value ?? 0);
    el.addEventListener("change", () => onChange(Number(el.value)));
    return el;
  }

  function computeTotals(rows) {
    const totals = {};
    for (const it of window.EQUIPMENT) totals[it.key] = 0;

    for (const r of rows) {
      for (const it of window.EQUIPMENT) totals[it.key] += Number(r.eq[it.key]) || 0;
    }
    return totals;
  }

  function bands(total, perBand) {
    return total > 0 ? Math.ceil(total / perBand) : 0;
  }

  function cfaksNeeded(totals) {
    const packing = totals.bandagePacking || 0;
    const elastic = totals.bandageElastic || 0;
    const quik = totals.bandageQuikclot || 0;

    const byPacking = packing > 0 ? Math.ceil(packing / 10) : 0;
    const byElastic = elastic > 0 ? Math.ceil(elastic / 5) : 0;
    const byQuik = quik > 0 ? Math.ceil(quik / 5) : 0;

    return Math.max(byPacking, byElastic, byQuik);
  }

  function renderFooter(rows) {
    const totals = computeTotals(rows);
    const tr = document.createElement("tr");

    const tdLabel = document.createElement("td");
    tdLabel.colSpan = 3;
    tdLabel.className = "totalCell";
    tdLabel.textContent = "Totals";
    tr.appendChild(tdLabel);

    for (const it of window.EQUIPMENT) {
      const td = document.createElement("td");
      td.className = "totalCell colEq";
      const total = totals[it.key] || 0;
      td.textContent = String(total);

      if (it.key === "mag556") {
        const s = document.createElement("span");
        s.className = "sub";
        s.textContent = `Bands: ${bands(total, 4)}`;
        td.appendChild(s);
      } else if (it.key === "mag762") {
        const s = document.createElement("span");
        s.className = "sub";
        s.textContent = `Bandos: ${bands(total, 4)}`;
        td.appendChild(s);
      } else if (it.key === "link762") {
        const s = document.createElement("span");
        s.className = "sub";
        s.textContent = `Bandos: ${bands(total, 2)}`;
        td.appendChild(s);
      } else if (it.key === "frag") {
        const s = document.createElement("span");
        s.className = "sub";
        s.textContent = `Bandos: ${bands(total, 4)}`;
        td.appendChild(s);
      } else if (it.key === "smkWhite") {
        const s = document.createElement("span");
        s.className = "sub";
        s.textContent = `Bandos: ${bands(total, 4)}`;
        td.appendChild(s);
      } else if (it.key === "bandagePacking") {
        const c = cfaksNeeded(totals);
        const s = document.createElement("span");
        s.className = "sub";
        s.textContent = `CFAKs: ${c}`;
        td.appendChild(s);
      }

      tr.appendChild(td);
    }

    tr.appendChild(document.createElement("td"));
    tr.appendChild(document.createElement("td"));
    tr.appendChild(document.createElement("td"));

    tfoot.innerHTML = "";
    tfoot.appendChild(tr);
  }

  function updateEditUI(state) {
    document.body.classList.toggle("editing", state.editing);
    btnEdit.textContent = state.editing ? "Edit: On" : "Edit: Off";
    btnAddRow.disabled = state.rows.length >= MAX_SLOTS;
  }

  function render(state) {
    tbody.innerHTML = "";

    for (let i = 0; i < state.rows.length; i++) {
      const row = state.rows[i];
      const tr = document.createElement("tr");

      const tdName = document.createElement("td");
      tdName.className = "colName ro";
      tdName.appendChild(mkInput(row.name, v => { row.name = v; save(state); }, "Name", !state.editing));
      tr.appendChild(tdName);

      const tdRole = document.createElement("td");
      tdRole.className = "colRole ro";
      tdRole.appendChild(mkInput(row.role, v => { row.role = v; save(state); }, "Role", !state.editing));
      tr.appendChild(tdRole);

      const tdOom = document.createElement("td");
      tdOom.className = "colOom";
      tdOom.appendChild(mkNum(row.oom, v => { row.oom = v; save(state); }, "0"));
      tr.appendChild(tdOom);

      for (const it of window.EQUIPMENT) {
        const td = document.createElement("td");
        td.className = "colEq";
        td.appendChild(mkSelect(row.eq[it.key], v => {
          row.eq[it.key] = clampInt(v, 0, 10);
          save(state);
          renderFooter(state.rows);
        }));
        tr.appendChild(td);
      }

      const tdOther = document.createElement("td");
      tdOther.className = "colOther";
      tdOther.appendChild(mkInput(row.other, v => { row.other = v; save(state); }, "Typeable..."));
      tr.appendChild(tdOther);

      const tdClear = document.createElement("td");
      tdClear.className = "colClear";
      const btnClear = document.createElement("button");
      btnClear.type = "button";
      btnClear.textContent = "✕";
      btnClear.title = "Clear kit + other (keep name/role/OOM)";
      btnClear.addEventListener("click", () => {
        clearKitOnly(row);
        save(state);
        render(state);
      });
      tdClear.appendChild(btnClear);
      tr.appendChild(tdClear);

      const tdDel = document.createElement("td");
      tdDel.className = "colDel";
      const btnDel = document.createElement("button");
      btnDel.type = "button";
      btnDel.textContent = "Del";
      btnDel.title = "Delete row";
      btnDel.addEventListener("click", () => {
        state.rows.splice(i, 1);
        if (state.rows.length === 0) state.rows.push(makeEmptyRow());
        save(state);
        render(state);
      });
      tdDel.appendChild(btnDel);
      tr.appendChild(tdDel);

      tbody.appendChild(tr);
    }

    otherSection.value = state.otherSection || "";
    renderFooter(state.rows);
    updateEditUI(state);
  }

  const state = load();

  buildColGroup();
  buildHeader();
  render(state);

  otherSection.addEventListener("input", () => {
    state.otherSection = otherSection.value;
    save(state);
  });

  btnEdit.addEventListener("click", () => {
    state.editing = !state.editing;
    save(state);
    updateEditUI(state);
    render(state);
  });

  btnAddRow.addEventListener("click", () => {
    if (!state.editing) return;
    if (state.rows.length >= MAX_SLOTS) return;
    state.rows.push(makeEmptyRow());
    save(state);
    render(state);
  });
})();
