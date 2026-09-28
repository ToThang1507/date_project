/* ============================================================
   OUR TIME — trang chủ
   - Bộ đếm thời gian bên nhau (cập nhật từng giây)
   - Bảng ảnh polaroid + ghi chú: thêm, kéo thả, xoay, đổi kích thước
   - Sticky note lời nhắn dưới mỗi ảnh, sửa chữ trực tiếp trên trang
   ============================================================ */

import { board } from "./board-store.js";
import { START_DATE } from "./config.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const DEFAULT_SETTINGS = {
  title: "Thời gian chúng ta bên nhau",
  subtitle: "Từ ngày chúng ta bắt đầu… đến hôm nay và cả những ngày sau nữa",
  quote: "Cảm ơn vì đã xuất hiện trong cuộc đời tớ"
};
const NOTE_COLORS = ["yellow", "pink", "mint", "blue", "ink"];
const TAPES = ["pink", "mint", "yellow"];
const PLACEHOLDERS = ["sunset", "hills"];
const MIN_STAGE_H = 760;
const flowMQ = matchMedia("(max-width: 899px)");   // mobile: ảnh xếp lưới, không kéo tự do

const state = { settings: { ...DEFAULT_SETTINGS }, items: [], background: null, editing: false, selected: null };
const els = new Map();   // id -> element

const stage = $("#stage");
const boardEl = $("#board");
const bar = $("#itemBar");

// ---------- tiện ích ----------
const uid = () => "it_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const rand = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const pad = n => String(n).padStart(2, "0");
const byId = id => state.items.find(i => i.id === id);
const topZ = () => Math.max(0, ...state.items.map(i => i.z || 0)) + 1;

function parseDate(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || "");
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
}
const fmtDate = s => s ? s.split("-").reverse().join("/") : "--/--/----";

let toastT;
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove("show"), 2600);
}

let lastErrAt = 0;
function onSaveErr(err) {
  console.warn("[home] lưu lỗi:", err);
  if (Date.now() - lastErrAt < 5000) return;
  lastErrAt = Date.now();
  toast("⚠️ Chưa lưu được thay đổi: " + (err?.message || err));
}

// ---------- lưu có debounce (xả ngay khi rời trang) ----------
const pending = new Map();
function defer(key, fn, delay) {
  clearTimeout(pending.get(key)?.t);
  const t = setTimeout(() => { pending.delete(key); fn(); }, delay);
  pending.set(key, { t, fn });
}
function flush() {
  for (const { t, fn } of pending.values()) { clearTimeout(t); fn(); }
  pending.clear();
}
document.addEventListener("visibilitychange", () => document.visibilityState === "hidden" && flush());

const save = (it, delay = 250) =>
  defer(it.id, () => byId(it.id) && board.putItem(it).catch(onSaveErr), delay);
const saveSettings = (delay = 500) =>
  defer("settings", () => board.putSettings({ ...state.settings }).catch(onSaveErr), delay);

// ---------- dữ liệu mặc định & kiểm tra dữ liệu ----------
function seedItems() {
  return [
    { id: uid(), type: "photo", x: .015, y: 56, w: 270, rot: -8, z: 1, src: null, placeholder: "sunset",
      tape: "pink", caption: "Better together ♡", note: "", noteColor: "yellow" },
    { id: uid(), type: "note", x: .845, y: 210, w: 190, rot: -14, z: 2,
      text: "Cùng nhau\nđi qua thật nhiều\nngày nữa nhé ! :)", color: "ink" },
    { id: uid(), type: "photo", x: .82, y: 430, w: 230, rot: 8, z: 3, src: null, placeholder: "hills",
      tape: "pink", caption: "Đà Lạt ? ♡", note: "", noteColor: "pink" }
  ];
}

function sanitizeItem(raw) {
  if (!raw || (raw.type !== "photo" && raw.type !== "note")) return null;
  const num = (v, d) => Number.isFinite(+v) ? +v : d;
  const str = v => typeof v === "string" ? v.slice(0, 2000) : "";
  const id = typeof raw.id === "string" ? raw.id.replace(/[^\w-]/g, "").slice(0, 64) : "";
  const base = {
    id: id || uid(), type: raw.type,
    x: clamp(num(raw.x, .1), 0, 1), y: Math.max(0, num(raw.y, 40)),
    w: clamp(num(raw.w, 240), 110, 480), rot: clamp(num(raw.rot, 0), -180, 180), z: num(raw.z, 1)
  };
  if (raw.type === "note") {
    return { ...base, text: str(raw.text), color: NOTE_COLORS.includes(raw.color) ? raw.color : "yellow" };
  }
  return {
    ...base,
    src: typeof raw.src === "string" && raw.src.startsWith("data:image/") ? raw.src : null,
    placeholder: PLACEHOLDERS.includes(raw.placeholder) ? raw.placeholder : null,
    tape: TAPES.includes(raw.tape) ? raw.tape : "pink",
    caption: str(raw.caption), note: str(raw.note),
    noteColor: NOTE_COLORS.includes(raw.noteColor) ? raw.noteColor : "yellow"
  };
}

function sanitizeSettings(raw) {
  const s = { ...DEFAULT_SETTINGS };
  for (const k of Object.keys(s)) if (typeof raw?.[k] === "string" && raw[k].trim()) s[k] = raw[k].slice(0, 300);
  return s;
}

// ============================================================
// BỘ ĐẾM
// ============================================================
const START = parseDate(START_DATE);

function tick() {
  let diff = Date.now() - START.getTime();
  const future = diff < 0;
  const t = Math.floor(Math.abs(diff) / 1000);
  $("#cDays").textContent = Math.floor(t / 86400);
  $("#cHours").textContent = pad(Math.floor(t % 86400 / 3600));
  $("#cMins").textContent = pad(Math.floor(t % 3600 / 60));
  $("#cSecs").textContent = pad(t % 60);
  $("#counterLabel").textContent = future ? "Còn lại đến ngày đầu tiên" : "Đã bên nhau";
}
function loopTick() {
  tick();
  setTimeout(loopTick, 1000 - (Date.now() % 1000) + 10);
}

// ============================================================
// CÀI ĐẶT & CHỮ TRÊN TRANG
// ============================================================
function applySettings() {
  $$("[data-setting]").forEach(el => {
    if (document.activeElement !== el) el.textContent = state.settings[el.dataset.setting] ?? "";
  });
}

const isImageSrc = v => typeof v === "string" && v.startsWith("data:image/");

function applyBackground() {
  const bg = state.background;
  stage.classList.toggle("has-bg", !!bg);
  stage.style.setProperty("--stage-bg", bg ? `url("${bg}")` : "none");
  $("#bgPreview").hidden = !bg;
  $("#bgPreview").style.backgroundImage = bg ? `url("${bg}")` : "";
  $("#bgClearBtn").hidden = !bg;
}

function setBackground(src) {
  state.background = src;
  applyBackground();
  board.putBackground(src).catch(onSaveErr);
}

$$("[data-setting]").forEach(el => {
  const key = el.dataset.setting;
  el.spellcheck = false;
  el.addEventListener("input", () => {
    state.settings[key] = el.innerText.trim();
    saveSettings();
  });
  el.addEventListener("blur", () => {
    if (state.settings[key]) return;
    state.settings[key] = DEFAULT_SETTINGS[key];
    el.textContent = DEFAULT_SETTINGS[key];
    saveSettings(0);
  });
});

// ============================================================
// VẼ ẢNH & GHI CHÚ
// ============================================================
const HANDLES = `
  <button class="h h-rot" type="button" data-handle="rotate" tabindex="-1" aria-label="Xoay"></button>
  <button class="h h-size" type="button" data-handle="resize" tabindex="-1" aria-label="Đổi kích thước"></button>`;

function mount(it) {
  const el = document.createElement("div");
  el.className = `item item-${it.type}`;
  el.dataset.id = it.id;
  el.innerHTML = it.type === "photo" ? `
    <span class="tape"></span>
    <div class="frame">
      <div class="pic"></div>
      <div class="cap" data-field="caption" data-ph="Chú thích…"></div>
    </div>
    <div class="sticky"><div class="sticky-text" data-field="note" data-ph="Viết lời nhắn…" data-multiline></div></div>
    ${HANDLES}` : `
    <div class="note-body"><div class="note-text" data-field="text" data-ph="Viết gì đó…" data-multiline></div></div>
    ${HANDLES}`;
  $$("[data-field]", el).forEach(f => {
    f.textContent = it[f.dataset.field] || "";
    f.contentEditable = state.editing ? "true" : "false";
    f.spellcheck = false;
  });
  boardEl.appendChild(el);
  els.set(it.id, el);
  if (it.type === "photo") renderPic(it);
  update(it);
}

function renderPic(it) {
  const pic = els.get(it.id).querySelector(".pic");
  if (it.src) {
    pic.innerHTML = `<img alt="" draggable="false" decoding="async">`;
    pic.firstChild.src = it.src;
  } else {
    pic.innerHTML = `<div class="ph ph-${it.placeholder || "blank"}"><span>📷 Bấm để thêm ảnh</span></div>`;
  }
}

function update(it) {
  const el = els.get(it.id);
  if (!el) return;
  el.style.setProperty("--w", it.w + "px");
  el.style.setProperty("--rot", it.rot + "deg");
  el.style.zIndex = it.z || 1;
  el.classList.toggle("selected", state.selected === it.id);
  if (it.type === "photo") {
    el.querySelector(".tape").className = `tape tape-${it.tape}`;
    el.querySelector(".sticky").className = `sticky c-${it.noteColor}`;
    el.classList.toggle("has-note", !!it.note.trim());
  } else {
    el.querySelector(".note-body").className = `note-body c-${it.color}`;
  }
  place(it, el);
}

/** x lưu theo tỉ lệ chiều ngang (co giãn theo màn hình), y theo px từ đỉnh stage. */
function place(it, el = els.get(it.id)) {
  if (flowMQ.matches) { el.style.left = el.style.top = ""; return; }
  const W = stage.clientWidth;
  el.style.left = clamp(it.x * W, 0, Math.max(0, W - el.offsetWidth)) + "px";
  el.style.top = Math.max(0, it.y) + "px";
}

/** Kéo ảnh xuống thấp thì trang dài ra theo. */
function fitStage() {
  if (flowMQ.matches) { stage.style.minHeight = ""; return; }
  let bottom = 0;
  for (const it of state.items) bottom = Math.max(bottom, it.y + (els.get(it.id)?.offsetHeight || 0));
  stage.style.minHeight = Math.max(MIN_STAGE_H, bottom + 60) + "px";
}

function renderBoard() {
  boardEl.innerHTML = "";
  els.clear();
  state.items.forEach(mount);
  fitStage();
  positionBar();
}

// ============================================================
// CHẾ ĐỘ CHỈNH SỬA & CHỌN
// ============================================================
function setEditing(on) {
  state.editing = on;
  document.body.classList.toggle("editing", on);
  $("#toggleEdit").setAttribute("aria-pressed", on);
  $("#toggleEdit .lbl").textContent = on ? "Đang sửa" : "Chỉnh sửa";
  $$("[data-field], [data-setting]").forEach(el => el.contentEditable = on ? "true" : "false");
  if (!on) {
    if (document.activeElement?.isContentEditable) document.activeElement.blur();
    select(null);
    flush();
  }
  fitStage();
  positionBar();
}

function select(id) {
  state.selected = id;
  for (const [iid, el] of els) el.classList.toggle("selected", iid === id);
  positionBar();
}

function positionBar() {
  const it = state.editing && state.selected && byId(state.selected);
  if (!it) { bar.hidden = true; return; }
  bar.hidden = false;
  bar.querySelector('[data-act="replace"]').hidden = it.type !== "photo";
  bar.querySelector('[data-act="bg"]').hidden = !it.src;
  const r = els.get(it.id).getBoundingClientRect();
  const s = stage.getBoundingClientRect();
  const bw = bar.offsetWidth, bh = bar.offsetHeight;
  bar.style.left = clamp(r.left - s.left + r.width / 2 - bw / 2, 8, s.width - bw - 8) + "px";
  let top = r.top - s.top - bh - 16;
  if (top < 4) top = r.bottom - s.top + 16;
  bar.style.top = top + "px";
}

$("#toggleEdit").addEventListener("click", () => setEditing(!state.editing));
$("#doneEdit").addEventListener("click", () => { setEditing(false); toast("Đã lưu 💗"); });

// Bấm ra ngoài -> bỏ chọn
stage.addEventListener("pointerdown", e => {
  if (state.editing && !e.target.closest(".item, .item-bar")) select(null);
});

// ---------- kéo / xoay / đổi kích thước ----------
boardEl.addEventListener("pointerdown", e => {
  if (!state.editing || e.button > 0) return;
  const el = e.target.closest(".item");
  if (!el) return;
  const it = byId(el.dataset.id);
  const handle = e.target.closest("[data-handle]")?.dataset.handle;
  const onField = e.target.closest("[data-field]");
  const wasSelected = state.selected === it.id;

  // Mục đã chọn + bấm vào chữ -> để trình duyệt đặt con trỏ sửa chữ
  if (onField && wasSelected && !handle) return;

  e.preventDefault();
  if (document.activeElement?.isContentEditable) document.activeElement.blur();
  select(it.id);

  const flow = flowMQ.matches;
  const s = { px: e.clientX, py: e.clientY, left: el.offsetLeft, y: it.y, w: it.w, rot: it.rot, moved: false };
  if (handle === "rotate") {
    const r = el.getBoundingClientRect();
    s.cx = r.left + r.width / 2;
    s.cy = r.top + r.height / 2;
    s.a0 = Math.atan2(e.clientY - s.cy, e.clientX - s.cx);
  }
  el.setPointerCapture(e.pointerId);

  const move = ev => {
    const dx = ev.clientX - s.px, dy = ev.clientY - s.py;
    if (!s.moved) {
      if (Math.hypot(dx, dy) < 4) return;
      if (!handle && flow) return;               // mobile: không kéo tự do
      s.moved = true;
      el.classList.add("dragging");
      if (!handle) { it.z = topZ(); el.style.zIndex = it.z; }
    }
    if (handle === "rotate") {
      let deg = s.rot + (Math.atan2(ev.clientY - s.cy, ev.clientX - s.cx) - s.a0) * 180 / Math.PI;
      deg = ((deg + 540) % 360) - 180;
      if (ev.shiftKey) deg = Math.round(deg / 15) * 15;
      it.rot = Math.round(deg * 10) / 10;
      el.style.setProperty("--rot", it.rot + "deg");
    } else if (handle === "resize") {
      it.w = Math.round(clamp(s.w + dx, it.type === "photo" ? 150 : 110, 480));
      el.style.setProperty("--w", it.w + "px");
      if (!flow) place(it, el);
    } else {
      const W = stage.clientWidth;
      const left = clamp(s.left + dx, 0, W - el.offsetWidth);
      it.x = left / W;
      it.y = Math.max(0, Math.round(s.y + dy));
      place(it, el);
    }
    positionBar();
  };

  const up = () => {
    el.removeEventListener("pointermove", move);
    el.removeEventListener("pointerup", up);
    el.removeEventListener("pointercancel", up);
    el.classList.remove("dragging");
    if (s.moved) {
      save(it);
      fitStage();
      positionBar();
    } else if (!handle && e.target.closest(".ph")) {
      pickImageFor(it.id);
    }
  };
  el.addEventListener("pointermove", move);
  el.addEventListener("pointerup", up);
  el.addEventListener("pointercancel", up);
});

boardEl.addEventListener("dragstart", e => e.preventDefault());

// ---------- sửa chữ ----------
boardEl.addEventListener("input", e => {
  const f = e.target.closest("[data-field]");
  if (!f) return;
  const it = byId(f.closest(".item").dataset.id);
  if (!f.textContent.trim() && f.innerHTML) f.innerHTML = "";   // để hiện placeholder
  it[f.dataset.field] = f.innerText.replace(/\n+$/, "");
  if (f.dataset.field === "note") els.get(it.id).classList.toggle("has-note", !!it.note.trim());
  save(it, 600);
  fitStage();
  positionBar();
});

// Dán chữ thuần (bỏ định dạng)
document.addEventListener("paste", e => {
  if (!e.target.closest?.('[contenteditable="true"]')) return;
  e.preventDefault();
  const text = e.clipboardData.getData("text/plain");
  const el = e.target.closest('[contenteditable="true"]');
  document.execCommand("insertText", false, el.hasAttribute("data-multiline") ? text : text.replace(/\s*\n\s*/g, " "));
});

document.addEventListener("keydown", e => {
  const t = e.target;
  if (t.isContentEditable) {
    if (e.key === "Escape" || (e.key === "Enter" && !t.hasAttribute("data-multiline"))) {
      e.preventDefault();
      t.blur();
    }
    return;
  }
  if (!state.editing || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || $("#settingsDlg").open) return;
  if ((e.key === "Delete" || e.key === "Backspace") && state.selected) {
    e.preventDefault();
    removeItem(state.selected);
  } else if (e.key === "Escape") {
    state.selected ? select(null) : setEditing(false);
  }
});

// ---------- thanh công cụ của mục ----------
bar.addEventListener("pointerdown", e => e.preventDefault());
bar.addEventListener("click", e => {
  const act = e.target.closest("[data-act]")?.dataset.act;
  const it = byId(state.selected);
  if (!act || !it) return;
  if (act === "replace") {
    pickImageFor(it.id);
  } else if (act === "bg") {
    setBackground(it.src);
    toast("Đã đặt làm ảnh nền 🌄");
  } else if (act === "color") {
    const key = it.type === "photo" ? "noteColor" : "color";
    it[key] = NOTE_COLORS[(NOTE_COLORS.indexOf(it[key]) + 1) % NOTE_COLORS.length];
    update(it);
    save(it);
  } else if (act === "front") {
    it.z = topZ();
    update(it);
    save(it);
  } else if (act === "delete") {
    removeItem(it.id);
  }
});

function removeItem(id) {
  const it = byId(id);
  if (!it || !confirm(it.type === "photo" ? "Xoá ảnh này khỏi trang?" : "Xoá ghi chú này?")) return;
  state.items = state.items.filter(i => i.id !== id);
  els.get(id)?.remove();
  els.delete(id);
  select(null);
  clearTimeout(pending.get(id)?.t);
  pending.delete(id);
  board.removeItem(id).catch(onSaveErr);
  fitStage();
}

// ============================================================
// THÊM ẢNH / GHI CHÚ
// ============================================================

/** Nén ảnh về JPEG (cạnh dài ≤ 1280px, < ~750KB) để lưu được nhiều ảnh & vừa 1 doc Firestore. */
async function compressImage(file, maxSide = 1280, maxLen = 750_000) {
  const src = await createImageBitmap(file).catch(() => new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Không đọc được ảnh")); };
    img.src = url;
  }));
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  let side = maxSide;
  for (;;) {
    const scale = Math.min(1, side / Math.max(src.width, src.height));
    canvas.width = Math.round(src.width * scale);
    canvas.height = Math.round(src.height * scale);
    ctx.fillStyle = "#fff";                       // nền trắng cho ảnh PNG trong suốt
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(src, 0, 0, canvas.width, canvas.height);
    for (let q = .85; q >= .5; q -= .1) {
      const url = canvas.toDataURL("image/jpeg", q);
      if (url.length < maxLen) return url;
    }
    side = Math.round(side * .75);
  }
}

/** Vị trí đang nhìn thấy trên stage (để ảnh mới hiện ngay trong tầm mắt). */
function visibleTop() {
  const s = stage.getBoundingClientRect();
  return clamp(-s.top + 20, 0, Math.max(0, stage.offsetHeight - 320));
}

function newPhoto(src, at, i) {
  const w = 240, W = stage.clientWidth;
  let x, y;
  if (at) {
    x = (at.x - w / 2) / W + i * .015;
    y = Math.max(0, at.y - 120 + i * 28);
  } else {
    const n = state.items.filter(t => t.type === "photo").length + i;
    x = n % 2 === 0 ? .02 + rand(0, .04) : .98 - w / W - rand(0, .04);
    y = visibleTop() + 30 + (Math.floor(n / 2) % 3) * 70;
  }
  return {
    id: uid(), type: "photo", x: clamp(x, 0, 1), y: Math.round(y), w, rot: Math.round(rand(-8, 8)), z: topZ(),
    src, placeholder: null, tape: pick(TAPES), caption: "", note: "", noteColor: pick(NOTE_COLORS.slice(0, 4))
  };
}

const isImage = f => f.type.startsWith("image/") || /\.(jpe?g|png|gif|webp|avif|bmp|heic|heif)$/i.test(f.name);

async function addPhotos(files, at) {
  const list = [...files].filter(isImage);
  if (!list.length) return toast("Chỉ nhận file ảnh thôi nha 📷");
  if (!state.editing) setEditing(true);
  toast(`Đang thêm ${list.length} ảnh…`);
  let last = null, i = 0;
  for (const f of list) {
    try {
      const src = await compressImage(f);
      const it = newPhoto(src, at, i++);
      state.items.push(it);
      mount(it);
      await board.putImage(it.id, src).catch(onSaveErr);
      await board.putItem(it).catch(onSaveErr);
      last = it;
    } catch (err) {
      console.warn(err);
      toast(`Không đọc được ảnh "${f.name}" 😢 (thử JPG/PNG nha)`);
    }
  }
  if (last) {
    fitStage();
    select(last.id);
    toast("Đã thêm ảnh 💗 Kéo để đặt vị trí, viết lời nhắn bên dưới nha");
  }
}

async function replacePhoto(id, file) {
  const it = byId(id);
  if (!it || !isImage(file)) return;
  try {
    it.src = await compressImage(file);
    it.placeholder = null;
    renderPic(it);
    await board.putImage(it.id, it.src).catch(onSaveErr);
    save(it, 0);
    toast("Đã đổi ảnh 💗");
  } catch (err) {
    console.warn(err);
    toast(`Không đọc được ảnh "${file.name}" 😢`);
  }
}

let replaceTarget = null;
function pickImageFor(id) {
  replaceTarget = id;
  $("#replaceInput").click();
}
$("#replaceInput").addEventListener("change", e => {
  const f = e.target.files[0];
  if (f && replaceTarget) replacePhoto(replaceTarget, f);
  e.target.value = "";
});

$("#addPhotoBtn").addEventListener("click", () => $("#fileInput").click());
$("#addBgBtn").addEventListener("click", () => $("#bgInput").click());
$("#fileInput").addEventListener("change", e => {
  addPhotos(e.target.files);
  e.target.value = "";
});

$("#addNoteBtn").addEventListener("click", () => {
  const w = 200, W = stage.clientWidth;
  const it = {
    id: uid(), type: "note", x: clamp(.8 - w / W + rand(-.03, .03), 0, 1), y: Math.round(visibleTop() + 60),
    w, rot: Math.round(rand(-6, 6)), z: topZ(), text: "", color: "yellow"
  };
  state.items.push(it);
  mount(it);
  fitStage();
  select(it.id);
  save(it, 0);
  els.get(it.id).querySelector("[data-field]").focus();
});

// ---------- kéo file ảnh từ máy thả vào trang ----------
let dragDepth = 0;
const hasFiles = e => [...(e.dataTransfer?.types || [])].includes("Files");
window.addEventListener("dragenter", e => {
  if (!hasFiles(e)) return;
  e.preventDefault();
  dragDepth++;
  document.body.classList.add("dropping");
});
window.addEventListener("dragover", e => {
  if (!hasFiles(e)) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = "copy";
});
window.addEventListener("dragleave", e => {
  if (!hasFiles(e)) return;
  if (--dragDepth <= 0) {
    dragDepth = 0;
    document.body.classList.remove("dropping");
  }
});
window.addEventListener("drop", e => {
  if (!hasFiles(e)) return;
  e.preventDefault();
  dragDepth = 0;
  document.body.classList.remove("dropping");
  const files = e.dataTransfer.files;
  const onPhoto = e.target.closest?.(".item-photo");
  if (onPhoto && files.length === 1) {
    if (!state.editing) setEditing(true);
    return replacePhoto(onPhoto.dataset.id, files[0]);
  }
  const s = stage.getBoundingClientRect();
  const at = flowMQ.matches ? null : { x: e.clientX - s.left, y: clamp(e.clientY - s.top, 0, s.height - 200) };
  addPhotos(files, at);
});

// ============================================================
// SETTINGS: sao lưu / nhập / khôi phục
// ============================================================
const dlg = $("#settingsDlg");
$("#openSettings").addEventListener("click", () => dlg.showModal());
dlg.addEventListener("click", e => { if (e.target === dlg) dlg.close(); });   // bấm nền để đóng

function showStoreInfo() {
  $("#storeInfo").innerHTML = board.mode === "cloud"
    ? "☁️ <b>Firebase</b> — ảnh &amp; ghi chú được đồng bộ, mở trên máy nào cũng thấy."
    : "💾 <b>Lưu trên trình duyệt này.</b> Máy khác sẽ không thấy ảnh — cấu hình Firebase trong <code>assets/js/config.js</code> để đồng bộ, hoặc dùng Xuất / Nhập file.";
}

// Ảnh nền: cho phép to hơn ảnh polaroid (vẫn < 1MB / doc Firestore)
$("#bgInput").addEventListener("change", async e => {
  const f = e.target.files[0];
  e.target.value = "";
  if (!f) return;
  if (!isImage(f)) return toast("Chỉ nhận file ảnh thôi nha 📷");
  try {
    toast("Đang xử lý ảnh nền…");
    setBackground(await compressImage(f, 1920, 900_000));
    toast("Đã đổi ảnh nền 🌄");
  } catch (err) {
    console.warn(err);
    toast("Không đọc được ảnh: " + err.message);
  }
});

$("#bgClearBtn").addEventListener("click", () => {
  setBackground(null);
  toast("Đã bỏ ảnh nền");
});

$("#exportBtn").addEventListener("click", () => {
  flush();
  const data = {
    app: "our-time", version: 1, exportedAt: new Date().toISOString(),
    settings: state.settings, items: state.items, background: state.background
  };
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: "application/json" }));
  a.download = `our-time-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});

$("#importInput").addEventListener("change", async e => {
  const f = e.target.files[0];
  e.target.value = "";
  if (!f) return;
  try {
    const data = JSON.parse(await f.text());
    if (!Array.isArray(data.items)) throw new Error("File không đúng định dạng");
    if (!confirm("Nhập file sẽ thay thế toàn bộ ảnh & ghi chú hiện tại. Tiếp tục?")) return;
    await resetTo(sanitizeSettings(data.settings), data.items.map(sanitizeItem).filter(Boolean),
                  isImageSrc(data.background) ? data.background : null);
    toast("Đã nhập dữ liệu 💗");
  } catch (err) {
    console.warn(err);
    toast("Không nhập được file: " + err.message);
  }
});

$("#resetBtn").addEventListener("click", async () => {
  if (!confirm("Xoá toàn bộ ảnh, ghi chú và chữ đã sửa để quay về mặc định?")) return;
  await resetTo({ ...DEFAULT_SETTINGS }, seedItems());
  toast("Đã khôi phục mặc định");
});

async function resetTo(settings, items, background = null) {
  for (const { t } of pending.values()) clearTimeout(t);
  pending.clear();
  state.settings = settings;
  state.items = items;
  state.background = background;
  state.selected = null;
  applySettings();
  applyBackground();
  renderBoard();
  dlg.close();
  await board.replaceAll(settings, items, background).catch(onSaveErr);
}

// ============================================================
// KHỞI ĐỘNG
// ============================================================
let rafId = 0;
window.addEventListener("resize", () => {
  cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(() => {
    state.items.forEach(it => place(it));
    fitStage();
    positionBar();
  });
});

async function init() {
  $("#startDateText").textContent = fmtDate(START_DATE);
  applySettings();
  loopTick();

  await board.init();
  showStoreInfo();
  const data = await board.load().catch(err => { console.warn("[home] load lỗi:", err); return null; });

  state.background = isImageSrc(data?.background) ? data.background : null;
  if (!data || (!data.settings && !data.items.length)) {
    state.items = seedItems();
    board.replaceAll(state.settings, state.items, state.background).catch(onSaveErr);
  } else {
    state.settings = sanitizeSettings(data.settings);
    state.items = data.items.map(sanitizeItem).filter(Boolean);
  }
  applySettings();
  applyBackground();
  renderBoard();
  showStoreInfo();

  // Font viết tay tải xong làm thay đổi chiều cao chữ -> tính lại
  document.fonts?.ready.then(() => { state.items.forEach(it => place(it)); fitStage(); });
  navigator.storage?.persist?.().catch(() => {});
}

init();
