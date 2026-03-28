
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  setDoc,
  deleteDoc,
  doc,
  query,
  where,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC8xgBhl57PVPP-3YuetqS98VFZx-5hArI",
  authDomain: "etgloadout.firebaseapp.com",
  projectId: "etgloadout",
  storageBucket: "etgloadout.firebasestorage.app",
  messagingSenderId: "800810367169",
  appId: "1:800810367169:web:e0f9a8b5520441bf3dfc40"
};

const STORAGE_KEYS = {
  draft: "logi-loadout-draft-v2",
  context: "logi-loadout-context-v2",
  savedCache: "logi-loadout-saved-cache-v2"
};

const LOADOUTS_COLLECTION = "loadouts";
const DEFAULT_EARPLUGS = true;

const MASS_PER_KG = 22.04;
const KG_PER_MASS = 1 / MASS_PER_KG;
const DEFAULT_CARRY_LIMIT = 35;

const $ = (id) => document.getElementById(id);

const elements = {
  connectionPill: $("connectionPill"),
  currentDocPill: $("currentDocPill"),
  statusText: $("statusText"),
  outputText: $("outputText"),
  savedLoadouts: $("savedLoadouts"),
  itemRowTemplate: $("itemRowTemplate"),
  defaultLoadoutSelect: $("defaultLoadoutSelect"),
  massWarnings: $("massWarnings"),
  metricTotalMass: $("metricTotalMass"),
  metricUniformMass: $("metricUniformMass"),
  metricVestMass: $("metricVestMass"),
  metricBackpackMass: $("metricBackpackMass")
};

const pickerIds = [
  "primaryWeapon", "primaryBarrel", "primaryRail", "primaryOptic", "primaryMagClass", "primaryAltMagClass", "primaryUnderbarrel",
  "launcherWeapon", "launcherBarrel", "launcherRail", "launcherOptic", "launcherMagClass", "launcherAltMagClass", "launcherUnderbarrel",
  "handgunWeapon", "handgunBarrel", "handgunRail", "handgunOptic", "handgunMagClass", "handgunAltMagClass", "handgunUnderbarrel",
  "binocularWeapon",
  "uniformClass", "vestClass", "backpackClass", "headgearClass", "facewearClass",
  "assignedMap", "assignedGps", "assignedCompass", "assignedWatch", "assignedNvg"
];

const state = {
  db: null,
  currentId: null,
  items: [],
  itemMap: new Map(),
  compatibility: null,
  defaultLoadouts: [],
  pickers: new Map(),
  draft: null,
  savedLoadouts: [],
  cacheLoaded: false
};

function createEmptyDraft(context = {}) {
  return {
    name: "",
    role: "",
    platoon: context.platoon ?? "",
    section: context.section ?? "",
    totalCarryLimit: context.totalCarryLimit ?? DEFAULT_CARRY_LIMIT,
    primary: emptyWeapon(),
    launcher: emptyWeapon(),
    handgun: emptyWeapon(),
    binoculars: { weapon: "" },
    uniform: { className: "", items: [] },
    vest: { className: "", items: [] },
    backpack: { className: "", items: [] },
    headgear: "",
    facewear: "",
    assignedItems: {
      map: "",
      gps: "",
      radio: "",
      compass: "",
      watch: "",
      nvg: ""
    },
    extras: {
      insignia: "",
      aceEarplugs: DEFAULT_EARPLUGS
    }
  };
}

function emptyWeapon() {
  return {
    weapon: "",
    barrel: "",
    rail: "",
    optic: "",
    magClass: "",
    altMagClass: "",
    underbarrel: ""
  };
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalise(text) {
  return String(text ?? "").trim().toLowerCase();
}

function safeJsonParse(raw, fallback) {
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function getContextFromStorage() {
  return safeJsonParse(localStorage.getItem(STORAGE_KEYS.context), {});
}

function saveContextToStorage() {
  const context = {
    platoon: $("platoonName").value.trim(),
    section: $("sectionName").value.trim(),
    totalCarryLimit: Number($("serverCarryLimit").value || DEFAULT_CARRY_LIMIT)
  };
  localStorage.setItem(STORAGE_KEYS.context, JSON.stringify(context));
}

function loadDraftFromStorage() {
  const context = getContextFromStorage();
  const parsed = safeJsonParse(localStorage.getItem(STORAGE_KEYS.draft), null);
  if (!parsed || typeof parsed !== "object") return createEmptyDraft(context);

  return {
    ...createEmptyDraft(context),
    ...parsed,
    primary: { ...emptyWeapon(), ...(parsed.primary ?? {}) },
    launcher: { ...emptyWeapon(), ...(parsed.launcher ?? {}) },
    handgun: { ...emptyWeapon(), ...(parsed.handgun ?? {}) },
    binoculars: { weapon: parsed.binoculars?.weapon ?? parsed.assignedItems?.radio ?? "" },
    uniform: {
      className: parsed.uniform?.className ?? "",
      items: Array.isArray(parsed.uniform?.items) ? parsed.uniform.items.map(sanitiseItemRow) : []
    },
    vest: {
      className: parsed.vest?.className ?? "",
      items: Array.isArray(parsed.vest?.items) ? parsed.vest.items.map(sanitiseItemRow) : []
    },
    backpack: {
      className: parsed.backpack?.className ?? "",
      items: Array.isArray(parsed.backpack?.items) ? parsed.backpack.items.map(sanitiseItemRow) : []
    },
    assignedItems: {
      map: parsed.assignedItems?.map ?? "",
      gps: parsed.assignedItems?.gps ?? "",
      radio: "",
      compass: parsed.assignedItems?.compass ?? "",
      watch: parsed.assignedItems?.watch ?? "",
      nvg: parsed.assignedItems?.nvg ?? ""
    },
    extras: {
      insignia: parsed.extras?.insignia ?? "",
      aceEarplugs: Boolean(parsed.extras?.aceEarplugs ?? DEFAULT_EARPLUGS)
    }
  };
}

function saveDraftToStorage() {
  localStorage.setItem(STORAGE_KEYS.draft, JSON.stringify(state.draft));
  saveContextToStorage();
}

function loadSavedCacheFromStorage() {
  const parsed = safeJsonParse(localStorage.getItem(STORAGE_KEYS.savedCache), []);
  state.savedLoadouts = Array.isArray(parsed) ? parsed : [];
}

function saveSavedCacheToStorage() {
  localStorage.setItem(STORAGE_KEYS.savedCache, JSON.stringify(state.savedLoadouts));
}

function sanitiseItemRow(item) {
  return {
    className: item?.className ?? "",
    count: Math.max(1, Number(item?.count || 1))
  };
}

async function loadJson(url, required = true) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    if (!required && response.status === 404) return null;
    throw new Error(`Failed to load ${url} (${response.status})`);
  }
  return response.json();
}

async function loadDataFiles() {
  state.items = await loadJson("./data/items.json", true);
  state.itemMap = new Map(
    state.items.map(item => [item.className, { ...item, _search: `${normalise(item.displayName)} ${normalise(item.className)}` }])
  );
  state.defaultLoadouts = await loadJson("./data/default-loadouts.json", false) ?? [];
  state.compatibility = await loadJson("./data/compatibility.json", false);
}

function maybeInitFirestore() {
  if (Object.values(firebaseConfig).some(v => String(v).includes("REPLACE_ME"))) {
    elements.connectionPill.textContent = "Firestore: not configured";
    elements.connectionPill.classList.add("muted");
    return null;
  }

  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    elements.connectionPill.textContent = "Firestore: ready";
    elements.connectionPill.classList.remove("muted");
    return db;
  } catch (error) {
    console.error(error);
    elements.connectionPill.textContent = "Firestore: error";
    setStatus(`Firebase init failed: ${error.message}`);
    return null;
  }
}

function getItem(className) {
  return state.itemMap.get(className) ?? null;
}

function sortOptions(items) {
  return [...items].sort((a, b) => (a.displayName || a.className).localeCompare(b.displayName || b.className));
}

function itemMatchesArma(item, category, types) {
  const typeList = Array.isArray(types) ? types : [types];
  const itemCategory = item.armaCategory ?? item.category ?? "";
  const itemType = item.armaType ?? item.subtype ?? "";
  return itemCategory === category && typeList.includes(itemType);
}

function getItemsByArma(category, types) {
  return sortOptions(state.items.filter(item => itemMatchesArma(item, category, types)));
}

function getItemsBySubtype(subtypes) {
  const set = new Set(subtypes);
  return sortOptions(state.items.filter(item => set.has(item.subtype)));
}

function getMagazineOptions() {
  return sortOptions(state.items.filter(item => item.armaCategory === "Magazine" || item.category === "magazine" || item.count != null));
}

function getContainerItemOptions() {
  return sortOptions(state.items.filter(item => {
    const c = item.armaCategory ?? item.category ?? "";
    const t = item.armaType ?? item.subtype ?? "";
    return true;
  }));
}

function getCompatibilityEntry(weaponClass) {
  if (!state.compatibility || !weaponClass) return null;
  return state.compatibility[weaponClass] ?? null;
}

function getCompatibilityOptions(weaponClass, key) {
  const entry = getCompatibilityEntry(weaponClass);
  if (!entry || !Array.isArray(entry[key])) return null;
  return sortOptions(entry[key]
    .map(className => getItem(className) ?? { className, displayName: className, armaCategory: "Unknown", armaType: "Unknown", _search: normalise(className) }));
}

function getWeaponOptionsByType(typeValue, fallbackSubtype = "weapon") {
  if (typeValue === 4096) {
    const opts = getItemsByArma("Item", ["Binocular"]);
    return opts;
  }

  if (state.compatibility) {
    const options = Object.entries(state.compatibility)
      .filter(([, entry]) => Number(entry.type) === typeValue)
      .map(([className, entry]) => getItem(className) ?? { className, displayName: entry.displayName || className, armaCategory: "Weapon", armaType: fallbackSubtype, _search: `${normalise(entry.displayName)} ${normalise(className)}` });
    if (options.length) return sortOptions(options);
  }

  if (typeValue === 2) return getItemsByArma("Weapon", ["Handgun"]);
  if (typeValue === 4) return getItemsByArma("Weapon", ["RocketLauncher", "MissileLauncher", "Launcher"]);



  const primary = getItemsByArma("Weapon", ["AssaultRifle", "MachineGun", "Shotgun", "Rifle", "SniperRifle", "SubmachineGun"]);
  if (primary.length) return primary;
  return getItemsBySubtype([fallbackSubtype]);
}

function resolveOptions(fieldId) {
  const draft = state.draft;

  switch (fieldId) {
    case "primaryWeapon": return getWeaponOptionsByType(1, "weapon");
    case "launcherWeapon": return getWeaponOptionsByType(4, "weapon");
    case "handgunWeapon": return getWeaponOptionsByType(2, "weapon");
    case "binocularWeapon": return getWeaponOptionsByType(4096, "binocular");

    case "primaryBarrel": return getCompatibilityOptions(draft.primary.weapon, "muzzleAttachments") ?? getItemsByArma("Item", ["AccessoryMuzzle"]);
    case "launcherBarrel": return getCompatibilityOptions(draft.launcher.weapon, "muzzleAttachments") ?? getItemsByArma("Item", ["AccessoryMuzzle"]);
    case "handgunBarrel": return getCompatibilityOptions(draft.handgun.weapon, "muzzleAttachments") ?? getItemsByArma("Item", ["AccessoryMuzzle"]);

    case "primaryRail": return getCompatibilityOptions(draft.primary.weapon, "pointerAttachments") ?? getItemsByArma("Item", ["AccessoryPointer"]);
    case "launcherRail": return getCompatibilityOptions(draft.launcher.weapon, "pointerAttachments") ?? getItemsByArma("Item", ["AccessoryPointer"]);
    case "handgunRail": return getCompatibilityOptions(draft.handgun.weapon, "pointerAttachments") ?? getItemsByArma("Item", ["AccessoryPointer"]);

    case "primaryOptic": return getCompatibilityOptions(draft.primary.weapon, "opticAttachments") ?? getItemsByArma("Item", ["AccessorySights"]);
    case "launcherOptic": return getCompatibilityOptions(draft.launcher.weapon, "opticAttachments") ?? getItemsByArma("Item", ["AccessorySights"]);
    case "handgunOptic": return getCompatibilityOptions(draft.handgun.weapon, "opticAttachments") ?? getItemsByArma("Item", ["AccessorySights"]);

    case "primaryUnderbarrel": return getCompatibilityOptions(draft.primary.weapon, "underbarrelAttachments") ?? getItemsByArma("Item", ["AccessoryBipod"]);
    case "launcherUnderbarrel": return getCompatibilityOptions(draft.launcher.weapon, "underbarrelAttachments") ?? getItemsByArma("Item", ["AccessoryBipod"]);
    case "handgunUnderbarrel": return getCompatibilityOptions(draft.handgun.weapon, "underbarrelAttachments") ?? getItemsByArma("Item", ["AccessoryBipod"]);

    case "primaryMagClass": return getCompatibilityOptions(draft.primary.weapon, "primaryMagazines") ?? getMagazineOptions();
    case "launcherMagClass": return getCompatibilityOptions(draft.launcher.weapon, "primaryMagazines") ?? getMagazineOptions();
    case "handgunMagClass": return getCompatibilityOptions(draft.handgun.weapon, "primaryMagazines") ?? getMagazineOptions();

    case "primaryAltMagClass": return getCompatibilityOptions(draft.primary.weapon, "secondaryMagazines") ?? getMagazineOptions();
    case "launcherAltMagClass": return getCompatibilityOptions(draft.launcher.weapon, "secondaryMagazines") ?? getMagazineOptions();
    case "handgunAltMagClass": return getCompatibilityOptions(draft.handgun.weapon, "secondaryMagazines") ?? getMagazineOptions();

    case "uniformClass": return getItemsByArma("Equipment", ["Uniform"]);
    case "vestClass": return getItemsByArma("Equipment", ["Vest"]);
    case "backpackClass": return getItemsByArma("Equipment", ["Backpack"]);
    case "headgearClass": return getItemsByArma("Equipment", ["Headgear"]);
    case "facewearClass": return getItemsByArma("Equipment", ["Glasses"]);
    case "assignedMap": return getItemsByArma("Item", ["Map"]);
    case "assignedGps": return getItemsByArma("Item", ["GPS"]);
    case "assignedCompass": return getItemsByArma("Item", ["Compass"]);
    case "assignedWatch": return getItemsByArma("Item", ["Watch"]);
    case "assignedNvg": return getItemsByArma("Item", ["NVGoggles"]);

    default: return getContainerItemOptions();
  }
}

function createPicker(hostOrId, optionsResolver) {
  const host = typeof hostOrId === "string" ? $(hostOrId) : hostOrId;
  const hostId = typeof hostOrId === "string" ? hostOrId : (hostOrId?.id || "");
  if (!host) return null;
  host.innerHTML = "";

  const wrapper = document.createElement("div");
  wrapper.className = "picker";

  const inputWrap = document.createElement("div");
  inputWrap.className = "picker-input-wrap";

  const input = document.createElement("input");
  input.type = "text";
  input.className = "picker-input";
  input.autocomplete = "off";
  input.placeholder = "Search items...";

  const toggle = document.createElement("span");
  toggle.className = "picker-toggle";
  toggle.textContent = "▼";

  const menu = document.createElement("div");
  menu.className = "picker-menu";

  inputWrap.append(input, toggle);
  wrapper.append(inputWrap, menu);
  host.appendChild(wrapper);

  const picker = {
    host,
    input,
    menu,
    selectedClass: "",
    optionsResolver,
    getOptions() {
      const result = optionsResolver() ?? [];
      return Array.isArray(result) ? result : [];
    },
    getValue() {
      return this.selectedClass || "";
    },
    setValue(className) {
      const value = className || "";
      this.selectedClass = value;
      if (!value) {
        this.input.value = "";
        this.host.classList.remove("invalid");
        return;
      }
      const item = getItem(value);
      this.input.value = item?.displayName ?? value;
      this.host.classList.toggle("invalid", !item);
    },
    clear() { this.setValue(""); },
    renderOptions(query = "") {
      const q = normalise(query);
      const options = this.getOptions();
      const filtered = q
        ? options.filter(item => (item._search ?? `${normalise(item.displayName)} ${normalise(item.className)}`).includes(q))
        : options;

      const limited = filtered.slice(0, 60);
      menu.innerHTML = "";
      if (!limited.length) {
        const empty = document.createElement("div");
        empty.className = "picker-empty";
        empty.textContent = "No matches";
        menu.appendChild(empty);
      } else {
        for (const item of limited) {
          const option = document.createElement("div");
          option.className = "picker-option";
          option.innerHTML = `<span class="picker-option-title">${escapeHtml(item.displayName)}</span><span class="picker-option-sub">${escapeHtml(item.className)}</span>`;
          option.addEventListener("mousedown", (event) => {
            event.preventDefault();
            this.setValue(item.className);
            this.close();
            syncDraftFromForm();
          });
          menu.appendChild(option);
        }
      }
    },
    open(query = this.input.value) {
      this.renderOptions(query);
      menu.classList.add("open");
    },
    close() {
      menu.classList.remove("open");
    },
    commitTypedValue() {
      const typed = this.input.value.trim();
      if (!typed) {
        this.clear();
        return;
      }
      const options = this.getOptions();
      const exactDisplay = options.filter(item => normalise(item.displayName) === normalise(typed));
      const exactClass = options.filter(item => normalise(item.className) === normalise(typed));
      const exact = [...exactClass, ...exactDisplay].filter((item, index, arr) => arr.findIndex(x => x.className === item.className) === index);
      if (exact.length === 1) {
        this.setValue(exact[0].className);
      } else if (!this.selectedClass || getItem(this.selectedClass)?.displayName !== typed) {
        this.clear();
      }
    },
    validateCurrent() {
      if (!this.selectedClass) return;
      const valid = this.getOptions().some(item => item.className === this.selectedClass);
      if (!valid) this.clear();
    }
  };

  input.addEventListener("focus", () => picker.open());
  input.addEventListener("input", () => {
    picker.selectedClass = "";
    picker.host.classList.remove("invalid");
    picker.open(input.value);
  });
  input.addEventListener("blur", () => {
    window.setTimeout(() => {
      picker.commitTypedValue();
      picker.close();
      syncDraftFromForm();
    }, 120);
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Escape") picker.close();
  });

  if (hostId) state.pickers.set(hostId, picker);
  return picker;
}

function createItemRow(item = { className: "", count: 1 }) {
  const row = elements.itemRowTemplate.content.firstElementChild.cloneNode(true);
  const host = row.querySelector(".item-picker-host");
  const tempId = `row-picker-${crypto.randomUUID()}`;
  host.id = tempId;
  const picker = createPicker(host, () => getContainerItemOptions());
  if (picker) {
    picker.input.placeholder = "Search item...";
    picker.setValue(item.className ?? "");
  }
  row.querySelector(".item-count").value = Math.max(1, Number(item.count || 1));
  row._pickerId = tempId;
  row.querySelector(".item-count").addEventListener("input", syncDraftFromForm);
  return row;
}

function clearItemList(id) {
  const el = $(id);
  for (const row of el.querySelectorAll(".item-row")) {
    if (row._pickerId) state.pickers.delete(row._pickerId);
  }
  el.innerHTML = "";
}

function populateItemList(id, items) {
  clearItemList(id);
  const root = $(id);
  for (const item of items ?? []) {
    root.appendChild(createItemRow(item));
  }
}

function readItemsFromList(id) {
  return [...$(id).querySelectorAll(".item-row")]
    .map(row => {
      const picker = state.pickers.get(row._pickerId);
      const className = picker?.getValue() ?? "";
      const count = Math.max(1, Number(row.querySelector(".item-count")?.value || 1));
      if (!className) return null;
      return { className, count };
    })
    .filter(Boolean);
}

function setStatus(message) {
  elements.statusText.textContent = message;
}

function renderDefaultLoadouts() {
  const select = elements.defaultLoadoutSelect;
  select.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = state.defaultLoadouts.length ? "Select a default..." : "No defaults loaded";
  select.appendChild(placeholder);

  for (const def of state.defaultLoadouts) {
    const option = document.createElement("option");
    option.value = def.id || def.name;
    option.textContent = def.name || def.id;
    select.appendChild(option);
  }
}

function readText(id) { return $(id)?.value?.trim() ?? ""; }
function writeText(id, value) { if ($(id)) $(id).value = value ?? ""; }

function populateFormFromDraft(draft) {
  writeText("loadoutName", draft.name);
  writeText("roleName", draft.role);
  writeText("platoonName", draft.platoon);
  writeText("sectionName", draft.section);
  writeText("serverCarryLimit", draft.totalCarryLimit ?? DEFAULT_CARRY_LIMIT);
  writeText("insigniaClass", draft.extras?.insignia ?? "");
  $("aceEarplugs").checked = Boolean(draft.extras?.aceEarplugs ?? DEFAULT_EARPLUGS);

  state.pickers.get("primaryWeapon")?.setValue(draft.primary.weapon);
  state.pickers.get("primaryBarrel")?.setValue(draft.primary.barrel);
  state.pickers.get("primaryRail")?.setValue(draft.primary.rail);
  state.pickers.get("primaryOptic")?.setValue(draft.primary.optic);
  state.pickers.get("primaryMagClass")?.setValue(draft.primary.magClass);
  state.pickers.get("primaryAltMagClass")?.setValue(draft.primary.altMagClass);
  state.pickers.get("primaryUnderbarrel")?.setValue(draft.primary.underbarrel);

  state.pickers.get("launcherWeapon")?.setValue(draft.launcher.weapon);
  state.pickers.get("launcherBarrel")?.setValue(draft.launcher.barrel);
  state.pickers.get("launcherRail")?.setValue(draft.launcher.rail);
  state.pickers.get("launcherOptic")?.setValue(draft.launcher.optic);
  state.pickers.get("launcherMagClass")?.setValue(draft.launcher.magClass);
  state.pickers.get("launcherAltMagClass")?.setValue(draft.launcher.altMagClass);
  state.pickers.get("launcherUnderbarrel")?.setValue(draft.launcher.underbarrel);

  state.pickers.get("handgunWeapon")?.setValue(draft.handgun.weapon);
  state.pickers.get("handgunBarrel")?.setValue(draft.handgun.barrel);
  state.pickers.get("handgunRail")?.setValue(draft.handgun.rail);
  state.pickers.get("handgunOptic")?.setValue(draft.handgun.optic);
  state.pickers.get("handgunMagClass")?.setValue(draft.handgun.magClass);
  state.pickers.get("handgunAltMagClass")?.setValue(draft.handgun.altMagClass);
  state.pickers.get("handgunUnderbarrel")?.setValue(draft.handgun.underbarrel);

  state.pickers.get("binocularWeapon")?.setValue(draft.binoculars.weapon);
  state.pickers.get("uniformClass")?.setValue(draft.uniform.className);
  state.pickers.get("vestClass")?.setValue(draft.vest.className);
  state.pickers.get("backpackClass")?.setValue(draft.backpack.className);
  state.pickers.get("headgearClass")?.setValue(draft.headgear);
  state.pickers.get("facewearClass")?.setValue(draft.facewear);
  state.pickers.get("assignedMap")?.setValue(draft.assignedItems.map);
  state.pickers.get("assignedGps")?.setValue(draft.assignedItems.gps);
  state.pickers.get("assignedCompass")?.setValue(draft.assignedItems.compass);
  state.pickers.get("assignedWatch")?.setValue(draft.assignedItems.watch);
  state.pickers.get("assignedNvg")?.setValue(draft.assignedItems.nvg);

  populateItemList("uniformItems", draft.uniform.items);
  populateItemList("vestItems", draft.vest.items);
  populateItemList("backpackItems", draft.backpack.items);

  refreshDependentPickers();
  updateOutput();
  updateMassSummary();
  refreshContainerUiState();
}

function refreshDependentPickers() {
  for (const id of pickerIds) {
    const picker = state.pickers.get(id);
    picker?.validateCurrent();
  }
  for (const row of document.querySelectorAll(".item-row")) {
    const picker = state.pickers.get(row._pickerId);
    picker?.validateCurrent();
  }
}

function readWeapon(prefix) {
  return {
    weapon: state.pickers.get(`${prefix}Weapon`)?.getValue() ?? "",
    barrel: state.pickers.get(`${prefix}Barrel`)?.getValue() ?? "",
    rail: state.pickers.get(`${prefix}Rail`)?.getValue() ?? "",
    optic: state.pickers.get(`${prefix}Optic`)?.getValue() ?? "",
    magClass: state.pickers.get(`${prefix}MagClass`)?.getValue() ?? "",
    altMagClass: state.pickers.get(`${prefix}AltMagClass`)?.getValue() ?? "",
    underbarrel: state.pickers.get(`${prefix}Underbarrel`)?.getValue() ?? ""
  };
}

function syncDraftFromForm() {
  if (!state.draft) return;

  state.draft = {
    ...state.draft,
    name: readText("loadoutName"),
    role: readText("roleName"),
    platoon: readText("platoonName"),
    section: readText("sectionName"),
    totalCarryLimit: Number($("serverCarryLimit").value || DEFAULT_CARRY_LIMIT),
    primary: readWeapon("primary"),
    launcher: readWeapon("launcher"),
    handgun: readWeapon("handgun"),
    binoculars: {
      weapon: state.pickers.get("binocularWeapon")?.getValue() ?? ""
    },
    uniform: {
      className: state.pickers.get("uniformClass")?.getValue() ?? "",
      items: readItemsFromList("uniformItems")
    },
    vest: {
      className: state.pickers.get("vestClass")?.getValue() ?? "",
      items: readItemsFromList("vestItems")
    },
    backpack: {
      className: state.pickers.get("backpackClass")?.getValue() ?? "",
      items: readItemsFromList("backpackItems")
    },
    headgear: state.pickers.get("headgearClass")?.getValue() ?? "",
    facewear: state.pickers.get("facewearClass")?.getValue() ?? "",
    assignedItems: {
      map: state.pickers.get("assignedMap")?.getValue() ?? "",
      gps: state.pickers.get("assignedGps")?.getValue() ?? "",
      radio: "",
      compass: state.pickers.get("assignedCompass")?.getValue() ?? "",
      watch: state.pickers.get("assignedWatch")?.getValue() ?? "",
      nvg: state.pickers.get("assignedNvg")?.getValue() ?? ""
    },
    extras: {
      insignia: readText("insigniaClass"),
      aceEarplugs: $("aceEarplugs").checked
    }
  };

  refreshDependentPickers();
  refreshContainerUiState();
  updateOutput();
  updateMassSummary();
  saveDraftToStorage();
}

function buildMagArray(className) {
  if (!className) return [];
  const item = getItem(className);
  if (item && item.count != null) return [className, item.count];
  return [className];
}

function buildWeaponArray(weapon) {
  if (!weapon.weapon) return [];
  return [
    weapon.weapon || "",
    weapon.barrel || "",
    weapon.rail || "",
    weapon.optic || "",
    buildMagArray(weapon.magClass),
    buildMagArray(weapon.altMagClass),
    weapon.underbarrel || ""
  ];
}

function buildContainerItem(item) {
  const count = Math.max(1, Number(item.count || 1));
  const meta = getItem(item.className);
  if (meta && meta.count != null) return [item.className, count, meta.count];
  return [item.className, count];
}

function buildContainer(container) {
  if (!container.className) return [];
  return [container.className, container.items.map(buildContainerItem)];
}

function buildAssignedItems(assigned) {
  return [
    assigned.map || "",
    assigned.gps || "",
    "",
    assigned.compass || "",
    assigned.watch || "",
    assigned.nvg || ""
  ];
}

function buildExportArray(draft) {
  return [[
    buildWeaponArray(draft.primary),
    buildWeaponArray(draft.launcher),
    buildWeaponArray(draft.handgun),
    buildContainer(draft.uniform),
    buildContainer(draft.vest),
    buildContainer(draft.backpack),
    draft.headgear || "",
    draft.facewear || "",
    buildWeaponArray({ ...emptyWeapon(), weapon: draft.binoculars.weapon }),
    buildAssignedItems(draft.assignedItems)
  ], [
    ["ace_arsenal_insignia", draft.extras.insignia || ""],
    ["ace_earplugs", Boolean(draft.extras.aceEarplugs)]
  ]];
}

function setContainerUiState(containerClassName, itemsListId) {
  const hasContainer = Boolean(containerClassName && String(containerClassName).trim());

  const list = $(itemsListId);
  const addBtn = document.querySelector(`[data-add-row="${itemsListId}"]`);

  if (list) {
    list.style.display = hasContainer ? "" : "none";
  }

  if (addBtn) {
    addBtn.disabled = !hasContainer;
    addBtn.style.display = hasContainer ? "" : "none";
  }
}

function refreshContainerUiState() {
  setContainerUiState(state.draft?.uniform?.className, "uniformItems");
  setContainerUiState(state.draft?.vest?.className, "vestItems");
  setContainerUiState(state.draft?.backpack?.className, "backpackItems");
}

function updateOutput() {
  elements.outputText.value = JSON.stringify(buildExportArray(state.draft));
}

function getMass(className) {
  const item = getItem(className);
  return item?.mass ?? null;
}

function getMaxLoad(className) {
  const item = getItem(className);
  return item?.maxLoad ?? null;
}

function massToKg(mass) {
  return Number(mass || 0) * KG_PER_MASS;
}

function kgToMass(kg) {
  return Number(kg || 0) * MASS_PER_KG;
}

function calcItemRowsMass(rows, missing) {
  let total = 0;
  for (const row of rows) {
    const mass = getMass(row.className);
    if (mass == null) {
      missing.add(row.className);
      continue;
    }
    total += Number(mass) * Number(row.count || 1);
  }
  return total;
}

function calcSingleItemMass(className, missing) {
  if (!className) return 0;
  const mass = getMass(className);
  if (mass == null) {
    missing.add(className);
    return 0;
  }
  return Number(mass);
}

function updateMassSummary() {
  const missing = new Set();
  let totalMassUnits = 0;

  const addWeaponMass = (weapon) => {
    totalMassUnits += calcSingleItemMass(weapon.weapon, missing);
    totalMassUnits += calcSingleItemMass(weapon.barrel, missing);
    totalMassUnits += calcSingleItemMass(weapon.rail, missing);
    totalMassUnits += calcSingleItemMass(weapon.optic, missing);
    totalMassUnits += calcSingleItemMass(weapon.magClass, missing);
    totalMassUnits += calcSingleItemMass(weapon.altMagClass, missing);
    totalMassUnits += calcSingleItemMass(weapon.underbarrel, missing);
  };

  addWeaponMass(state.draft.primary);
  addWeaponMass(state.draft.launcher);
  addWeaponMass(state.draft.handgun);
  totalMassUnits += calcSingleItemMass(state.draft.binoculars.weapon, missing);

  const hasUniform = Boolean(state.draft.uniform.className);
  const hasVest = Boolean(state.draft.vest.className);
  const hasBackpack = Boolean(state.draft.backpack.className);

  if (hasUniform) {
    totalMassUnits += calcSingleItemMass(state.draft.uniform.className, missing);
  }
  if (hasVest) {
    totalMassUnits += calcSingleItemMass(state.draft.vest.className, missing);
  }
  if (hasBackpack) {
    totalMassUnits += calcSingleItemMass(state.draft.backpack.className, missing);
  }

  totalMassUnits += calcSingleItemMass(state.draft.headgear, missing);
  totalMassUnits += calcSingleItemMass(state.draft.facewear, missing);
  totalMassUnits += calcSingleItemMass(state.draft.assignedItems.map, missing);
  totalMassUnits += calcSingleItemMass(state.draft.assignedItems.gps, missing);
  totalMassUnits += calcSingleItemMass(state.draft.assignedItems.compass, missing);
  totalMassUnits += calcSingleItemMass(state.draft.assignedItems.watch, missing);
  totalMassUnits += calcSingleItemMass(state.draft.assignedItems.nvg, missing);

  const uniformLoadMass = hasUniform ? calcItemRowsMass(state.draft.uniform.items, missing) : 0;
  const vestLoadMass = hasVest ? calcItemRowsMass(state.draft.vest.items, missing) : 0;
  const backpackLoadMass = hasBackpack ? calcItemRowsMass(state.draft.backpack.items, missing) : 0;

  totalMassUnits += uniformLoadMass + vestLoadMass + backpackLoadMass;

  const uniformMaxMass = hasUniform ? (getMaxLoad(state.draft.uniform.className) ?? 0) : 0;
  const vestMaxMass = hasVest ? (getMaxLoad(state.draft.vest.className) ?? 0) : 0;
  const backpackMaxMass = hasBackpack ? (getMaxLoad(state.draft.backpack.className) ?? 0) : 0;

  const carryLimitKg = Number(state.draft.totalCarryLimit || DEFAULT_CARRY_LIMIT);
  const carryLimitMass = kgToMass(carryLimitKg);

  const totalKg = massToKg(totalMassUnits);
  const uniformLoadKg = massToKg(uniformLoadMass);
  const vestLoadKg = massToKg(vestLoadMass);
  const backpackLoadKg = massToKg(backpackLoadMass);

  const uniformMaxKg = massToKg(uniformMaxMass);
  const vestMaxKg = massToKg(vestMaxMass);
  const backpackMaxKg = massToKg(backpackMaxMass);

  elements.metricTotalMass.textContent = `${roundNumber(massToKg(totalMassUnits))} / ${roundNumber(carryLimitKg)} kg`;
  elements.metricUniformMass.textContent = `${roundNumber(massToKg(uniformLoadMass))} / ${roundNumber(massToKg(uniformMaxMass))} kg`;
  elements.metricVestMass.textContent = `${roundNumber(massToKg(vestLoadMass))} / ${roundNumber(massToKg(vestMaxMass))} kg`;
  elements.metricBackpackMass.textContent = `${roundNumber(massToKg(backpackLoadMass))} / ${roundNumber(massToKg(backpackMaxMass))} kg`;

  const warnings = [];
  if (carryLimitMass > 0 && totalMassUnits > carryLimitMass) {
    warnings.push(`Total carry mass is over the server limit (${roundNumber(totalKg)} / ${roundNumber(carryLimitKg)} kg).`);
  }
  if (uniformMaxMass > 0 && uniformLoadMass > uniformMaxMass) {
    warnings.push(`Uniform contents exceed max load (${roundNumber(uniformLoadKg)} / ${roundNumber(uniformMaxKg)} kg).`);
  }
  if (vestMaxMass > 0 && vestLoadMass > vestMaxMass) {
    warnings.push(`Vest contents exceed max load (${roundNumber(vestLoadKg)} / ${roundNumber(vestMaxKg)} kg).`);
  }
  if (backpackMaxMass > 0 && backpackLoadMass > backpackMaxMass) {
    warnings.push(`Backpack contents exceed max load (${roundNumber(backpackLoadKg)} / ${roundNumber(backpackMaxKg)} kg).`);
  }
  if (missing.size) {
    warnings.push(`Missing mass data for ${missing.size} item(s): ${[...missing].slice(0, 8).join(", ")}${missing.size > 8 ? "..." : ""}`);
  }

  elements.massWarnings.innerHTML = warnings.length
    ? warnings.map(text => `<div class="warning">${escapeHtml(text)}</div>`).join("")
    : '<div class="ok-note">All current mass checks are within limits.</div>';
}

function roundNumber(value) {
  return Number.isInteger(value) ? value : Math.round(value * 10) / 10;
}

function formatDate(value) {
  if (!value) return "unsaved";
  if (typeof value?.toDate === "function") return value.toDate().toLocaleString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "unsaved" : parsed.toLocaleString();
}

function renderSavedLoadouts() {
  const root = elements.savedLoadouts;
  root.innerHTML = "";

  if (!state.savedLoadouts.length) {
    root.innerHTML = '<div class="empty-state">No cached saved loadouts yet. Click Refresh Shared when you want to read Firestore.</div>';
    return;
  }

  for (const item of state.savedLoadouts) {
    const card = document.createElement("div");
    card.className = "saved-card";
    card.innerHTML = `
      <div>
        <p class="saved-title">${escapeHtml(item.name || "Untitled")}</p>
        <div class="saved-meta">
          <span>Role: ${escapeHtml(item.role || "-")}</span>
          <span>${escapeHtml(item.platoon || "-")} / ${escapeHtml(item.section || "-")}</span>
          <span>Updated: ${escapeHtml(formatDate(item.updatedAt))}</span>
        </div>
      </div>
      <div class="saved-actions">
        <button class="btn" type="button" data-open-id="${escapeHtml(item.id || "")}">Open</button>
        <button class="btn" type="button" data-overwrite-id="${escapeHtml(item.id || "")}">Overwrite</button>
        <button class="btn danger" type="button" data-delete-id="${escapeHtml(item.id || "")}">Delete</button>
      </div>`;
    root.appendChild(card);
  }
}

async function refreshSavedLoadoutsFromFirestore() {
  if (!state.db) {
    setStatus("Firebase is not configured yet.");
    return;
  }

  syncDraftFromForm();
  const platoon = state.draft.platoon;
  const section = state.draft.section;
  if (!platoon || !section) {
    setStatus("Enter platoon and section before refreshing shared loadouts.");
    return;
  }

  setStatus("Refreshing shared loadouts...");
  const q = query(collection(state.db, LOADOUTS_COLLECTION), where("platoon", "==", platoon), where("section", "==", section));
  const snapshot = await getDocs(q);
  state.savedLoadouts = snapshot.docs
    .map(docSnap => ({ id: docSnap.id, ...docSnap.data() }))
    .sort((a, b) => (b.updatedAt?.seconds ?? 0) - (a.updatedAt?.seconds ?? 0));

  saveSavedCacheToStorage();
  renderSavedLoadouts();
  setStatus(`Loaded ${state.savedLoadouts.length} shared loadout(s) from Firestore.`);
}

function toFirestorePayload(draft) {
  return {
    name: draft.name || "Untitled",
    role: draft.role || "",
    platoon: draft.platoon || "",
    section: draft.section || "",
    exportString: JSON.stringify(buildExportArray(draft)),
    loadout: structuredClone(draft),
    updatedAt: serverTimestamp()
  };
}

async function saveCurrentLoadout() {
  if (!state.db) {
    setStatus("Firebase is not configured yet.");
    return;
  }

  syncDraftFromForm();

  if (!state.draft.name) {
    setStatus("Give the loadout a name before saving.");
    return;
  }
  if (!state.draft.platoon || !state.draft.section) {
    setStatus("Fill in platoon and section before saving.");
    return;
  }

  setStatus("Saving loadout...");
  const payload = toFirestorePayload(state.draft);

  if (state.currentId) {
    await setDoc(doc(state.db, LOADOUTS_COLLECTION, state.currentId), payload, { merge: true });
  } else {
    payload.createdAt = serverTimestamp();
    const added = await addDoc(collection(state.db, LOADOUTS_COLLECTION), payload);
    state.currentId = added.id;
  }

  const cachedEntry = {
    id: state.currentId,
    name: state.draft.name,
    role: state.draft.role,
    platoon: state.draft.platoon,
    section: state.draft.section,
    exportString: JSON.stringify(buildExportArray(state.draft)),
    loadout: structuredClone(state.draft),
    updatedAt: new Date().toISOString()
  };

  const idx = state.savedLoadouts.findIndex(x => x.id === state.currentId);
  if (idx >= 0) state.savedLoadouts[idx] = cachedEntry;
  else state.savedLoadouts.unshift(cachedEntry);
  state.savedLoadouts.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  saveSavedCacheToStorage();
  renderSavedLoadouts();
  setStatus("Loadout saved and local cache updated.");
}

function openLoadout(id) {
  const item = state.savedLoadouts.find(x => x.id === id);
  if (!item) {
    setStatus("That cached loadout could not be found.");
    return;
  }

  state.currentId = item.id;
  state.draft = {
    ...createEmptyDraft(getContextFromStorage()),
    ...(item.loadout ?? {})
  };

  populateFormFromDraft(state.draft);
  saveDraftToStorage();
  setStatus(`Opened "${item.name || "Untitled"}" from cache.`);
}

async function deleteLoadout(id) {
  if (!state.db) {
    setStatus("Firebase is not configured yet.");
    return;
  }
  const item = state.savedLoadouts.find(x => x.id === id);
  if (!window.confirm(`Delete "${item?.name || "this loadout"}"?`)) return;

  await deleteDoc(doc(state.db, LOADOUTS_COLLECTION, id));
  state.savedLoadouts = state.savedLoadouts.filter(x => x.id !== id);
  saveSavedCacheToStorage();
  renderSavedLoadouts();
  setStatus("Loadout deleted and local cache updated.");
}

function resetToNewLoadout() {
  state.currentId = null;
  state.draft = createEmptyDraft(getContextFromStorage());
  state.draft.uniform.items = [{ className: "", count: 1 }];
  populateFormFromDraft(state.draft);
  saveDraftToStorage();
  setStatus("Started a new loadout.");
}

async function copyOutput() {
  syncDraftFromForm();
  try {
    await navigator.clipboard.writeText(elements.outputText.value);
    setStatus("Import string copied to clipboard.");
  } catch {
    elements.outputText.select();
    document.execCommand("copy");
    setStatus("Import string copied.");
  }
}

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportCurrentDefault() {
  syncDraftFromForm();
  const id = (state.draft.name || "loadout").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const payload = {
    id,
    name: state.draft.name || "Unnamed Default",
    role: state.draft.role || "",
    description: "Exported from loadout generator",
    loadout: structuredClone(state.draft)
  };
  downloadJson(`${id || 'default-loadout'}.json`, payload);
}

function exportAllDefaults() {
  downloadJson("default-loadouts.json", state.defaultLoadouts);
}

function loadSelectedDefault() {
  const selected = elements.defaultLoadoutSelect.value;
  if (!selected) return;
  const def = state.defaultLoadouts.find(x => (x.id || x.name) === selected);
  if (!def) return;
  state.currentId = null;
  state.draft = {
    ...createEmptyDraft(getContextFromStorage()),
    ...(def.loadout ?? {})
  };
  populateFormFromDraft(state.draft);
  saveDraftToStorage();
  setStatus(`Loaded default "${def.name || selected}".`);
}

function attachEvents() {
  document.addEventListener("click", async (event) => {
    const addRowId = event.target.getAttribute("data-add-row");
    if (addRowId) {
      $(addRowId).appendChild(createItemRow());
      syncDraftFromForm();
      return;
    }

    const removeBtn = event.target.closest(".remove-row");
    if (removeBtn) {
      const row = removeBtn.closest(".item-row");
      if (row?._pickerId) state.pickers.delete(row._pickerId);
      row?.remove();
      syncDraftFromForm();
      return;
    }

    const openId = event.target.getAttribute("data-open-id");
    if (openId) return openLoadout(openId);

    const overwriteId = event.target.getAttribute("data-overwrite-id");
    if (overwriteId) {
      state.currentId = overwriteId;
      return saveCurrentLoadout();
    }

    const deleteId = event.target.getAttribute("data-delete-id");
    if (deleteId) return deleteLoadout(deleteId);
  });

  for (const id of ["loadoutName", "roleName", "platoonName", "sectionName", "serverCarryLimit"]) {
    $(id).addEventListener("input", syncDraftFromForm);
  }
  $("aceEarplugs").addEventListener("change", syncDraftFromForm);

  $("newLoadoutBtn").addEventListener("click", resetToNewLoadout);
  $("saveLoadoutBtn").addEventListener("click", saveCurrentLoadout);
  $("copyOutputBtn").addEventListener("click", copyOutput);
  $("refreshLoadoutsBtn").addEventListener("click", refreshSavedLoadoutsFromFirestore);
  $("refreshTopBtn").addEventListener("click", refreshSavedLoadoutsFromFirestore);
  $("loadDefaultBtn").addEventListener("click", loadSelectedDefault);
  $("exportCurrentDefaultBtn").addEventListener("click", exportCurrentDefault);
  $("exportAllDefaultsBtn").addEventListener("click", exportAllDefaults);
}

function setupPickers() {
  for (const id of pickerIds) {
    if (!$(id)) continue;
    createPicker(id, () => resolveOptions(id));
  }
}

async function init() {
  state.db = maybeInitFirestore();
  await loadDataFiles();
  setupPickers();
  renderDefaultLoadouts();
  attachEvents();

  loadSavedCacheFromStorage();
  renderSavedLoadouts();

  state.draft = loadDraftFromStorage();
  if (!state.draft.uniform.items.length && !state.draft.vest.items.length && !state.draft.backpack.items.length) {
    state.draft.uniform.items = [{ className: "", count: 1 }];
  }

  populateFormFromDraft(state.draft);
  syncDraftFromForm();
  setStatus("Loaded local draft and cached shared loadouts. Use Refresh Shared when you want to read Firestore.");
}

init().catch(error => {
  console.error(error);
  setStatus(`Startup failed: ${error.message}`);
});