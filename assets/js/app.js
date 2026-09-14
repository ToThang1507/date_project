/* ============================================================
   DATE PLANNER — logic chính
   ============================================================ */

import { FOODS, CATEGORIES } from "./foods.js";
import { store } from "./store.js";
import { Wheel } from "./wheel.js";
import { DEFAULT_NAMES, ALLOW_PAST_DATES } from "./config.js";

/* ---------- tiện ích ---------- */
const $  = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const pad = n => String(n).padStart(2, "0");
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayISO = iso(new Date());
const DOW = ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"];

function prettyDate(isoStr) {
  if (!isoStr) return "—";
  const [y, m, d] = isoStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return `${DOW[dt.getDay()]}, ${pad(d)}/${pad(m)}/${y}`;
}

let toastTimer;
function toast(msg, type = "") {
  const el = $("#toast");
  el.textContent = msg;
  el.className = "toast show " + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.className = "toast " + type), 3200);
}

/* ---------- trạng thái ---------- */
const state = {
  date: "",
  time: "",
  place: "",
  activities: [],
  note: "",
  foods: [],          // { emoji, name, cat }
  mood: "",
  me: DEFAULT_NAMES.me,
  her: DEFAULT_NAMES.her,
  category: "all",
  search: "",
  history: [],
  historyFilter: "all",
  customFoods: []
};

/* ============================================================
   LỊCH
   ============================================================ */
let viewYear, viewMonth;

function initCalendar() {
  const now = new Date();
  viewYear = now.getFullYear();
  viewMonth = now.getMonth();
  $("#prevMonth").addEventListener("click", () => shiftMonth(-1));
  $("#nextMonth").addEventListener("click", () => shiftMonth(1));
  renderCalendar();
}

function shiftMonth(delta) {
  viewMonth += delta;
  if (viewMonth < 0) { viewMonth = 11; viewYear--; }
  if (viewMonth > 11) { viewMonth = 0; viewYear++; }
  renderCalendar();
}

function renderCalendar() {
  $("#calTitle").textContent = `Tháng ${viewMonth + 1} · ${viewYear}`;
  const grid = $("#calGrid");
  grid.innerHTML = "";

  const first = new Date(viewYear, viewMonth, 1);
  const startOffset = (first.getDay() + 6) % 7;         // Thứ 2 đầu tuần
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysWithDate = new Set(state.history.map(h => h.date));

  for (let i = 0; i < startOffset; i++) {
    const b = document.createElement("button");
    b.className = "cal-day out";
    b.tabIndex = -1;
    grid.appendChild(b);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${viewYear}-${pad(viewMonth + 1)}-${pad(d)}`;
    const btn = document.createElement("button");
    btn.className = "cal-day";
    btn.textContent = d;
    btn.dataset.date = dateStr;
    if (dateStr === todayISO) btn.classList.add("today");
    if (dateStr === state.date) btn.classList.add("selected");
    if (daysWithDate.has(dateStr)) btn.classList.add("has-date");
    if (!ALLOW_PAST_DATES && dateStr < todayISO) btn.disabled = true;
    btn.addEventListener("click", () => {
      state.date = dateStr;
      renderCalendar();
      updateSummary();
      toast(`Đã chọn ${prettyDate(dateStr)} 💗`, "ok");
    });
    grid.appendChild(btn);
  }
}

/* ============================================================
   GIỜ · HOẠT ĐỘNG · GHI CHÚ
   ============================================================ */
function initTimeAndPlace() {
  $$("#timeSlots .chip").forEach(chip => {
    chip.addEventListener("click", () => {
      const on = chip.classList.contains("active");
      $$("#timeSlots .chip").forEach(c => c.classList.remove("active"));
      state.time = on ? "" : chip.dataset.time;
      if (!on) chip.classList.add("active");
      $("#customTime").value = state.time;
      updateSummary();
    });
  });

  $("#customTime").addEventListener("change", e => {
    state.time = e.target.value;
    $$("#timeSlots .chip").forEach(c =>
      c.classList.toggle("active", c.dataset.time === state.time));
    updateSummary();
  });

  $("#placeInput").addEventListener("input", e => {
    state.place = e.target.value.trim();
    updateSummary();
  });

  $$("#activityChips .chip").forEach(chip => {
    chip.addEventListener("click", () => {
      const act = chip.dataset.act;
      chip.classList.toggle("active");
      state.activities = chip.classList.contains("active")
        ? [...state.activities, act]
        : state.activities.filter(a => a !== act);
      updateSummary();
    });
  });

  $("#noteInput").addEventListener("input", e => {
    state.note = e.target.value.trim();
    updateSummary();
  });

  $("#meInput").addEventListener("input", e => (state.me = e.target.value.trim()));
  $("#herInput").addEventListener("input", e => (state.her = e.target.value.trim()));
  $("#meInput").value = state.me;
  $("#herInput").value = state.her;

  $$("#moodChips .chip").forEach(chip => {
    chip.addEventListener("click", () => {
      const on = chip.classList.contains("active");
      $$("#moodChips .chip").forEach(c => c.classList.remove("active"));
      state.mood = on ? "" : chip.dataset.mood;
      if (!on) chip.classList.add("active");
    });
  });
}

/* ============================================================
   MÓN ĂN
   ============================================================ */
function allFoods() {
  return [...FOODS, ...state.customFoods];
}

function initFood() {
  const filters = $("#foodFilters");
  CATEGORIES.forEach(c => {
    const b = document.createElement("button");
    b.className = "chip" + (c.id === "all" ? " active" : "");
    b.textContent = c.label;
    b.dataset.cat = c.id;
    b.addEventListener("click", () => {
      state.category = c.id;
      $$("#foodFilters .chip").forEach(x => x.classList.remove("active"));
      b.classList.add("active");
      renderFoodGrid();
      syncWheelSource();
    });
    filters.appendChild(b);
  });

  const sel = $("#wheelCategory");
  CATEGORIES.filter(c => c.id !== "all").forEach(c => {
    const o = document.createElement("option");
    o.value = c.id;
    o.textContent = c.label;
    sel.appendChild(o);
  });

  $("#foodSearch").addEventListener("input", e => {
    state.search = e.target.value.trim().toLowerCase();
    renderFoodGrid();
  });

  $("#addCustomFood").addEventListener("click", () => {
    const name = prompt("Tên món muốn thêm:");
    if (!name || !name.trim()) return;
    const emoji = (prompt("Emoji cho món này (bỏ trống cũng được):", "🍽️") || "🍽️").trim() || "🍽️";
    const item = { emoji, name: name.trim(), cat: "vn", custom: true };
    state.customFoods.push(item);
    toggleFood(item, true);
    renderFoodGrid();
    toast(`Đã thêm món "${item.name}" 🎉`, "ok");
  });

  renderFoodGrid();
}

function foodKey(f) { return f.emoji + "|" + f.name; }

function renderFoodGrid() {
  const grid = $("#foodGrid");
  grid.innerHTML = "";
  const selectedKeys = new Set(state.foods.map(foodKey));

  const list = allFoods().filter(f =>
    (state.category === "all" || f.cat === state.category) &&
    (!state.search || f.name.toLowerCase().includes(state.search))
  );

  if (!list.length) {
    grid.innerHTML = `<div class="empty"><span class="e-emoji">🔍</span>Không tìm thấy món nào phù hợp</div>`;
    return;
  }

  const catLabel = id => (CATEGORIES.find(c => c.id === id)?.label || "").replace(/^\S+\s/, "");

  list.forEach(f => {
    const b = document.createElement("button");
    b.className = "food-item" + (selectedKeys.has(foodKey(f)) ? " active" : "");
    b.innerHTML =
      `<span class="fi-emoji">${f.emoji}</span>` +
      `<span class="fi-name">${escapeHtml(f.name)}</span>` +
      `<span class="fi-cat">${catLabel(f.cat)}</span>`;
    b.addEventListener("click", () => toggleFood(f));
    grid.appendChild(b);
  });
}

function toggleFood(f, forceOn = false) {
  const key = foodKey(f);
  const exists = state.foods.some(x => foodKey(x) === key);
  if (exists && !forceOn) {
    state.foods = state.foods.filter(x => foodKey(x) !== key);
  } else if (!exists) {
    state.foods.push({ emoji: f.emoji, name: f.name, cat: f.cat });
  }
  renderFoodGrid();
  renderSelectedFoods();
  updateSummary();
  syncWheelSource();
}

function renderSelectedFoods() {
  const box = $("#selectedFoods");
  if (!state.foods.length) {
    box.innerHTML = `<span class="muted">Chưa chọn món nào 🥺</span>`;
    return;
  }
  box.innerHTML = "";
  state.foods.forEach(f => {
    const tag = document.createElement("span");
    tag.className = "tag";
    tag.innerHTML = `${f.emoji} ${escapeHtml(f.name)} <button title="Bỏ chọn">×</button>`;
    tag.querySelector("button").addEventListener("click", () => toggleFood(f));
    box.appendChild(tag);
  });
}

/* ============================================================
   VÒNG QUAY
   ============================================================ */
let wheel;
let lastWinner = null;

function initWheel() {
  wheel = new Wheel($("#wheelCanvas"), winner => {
    lastWinner = winner;
    const box = $("#wheelResult");
    box.classList.remove("win");
    void box.offsetWidth;
    box.classList.add("win");
    box.querySelector(".wr-emoji").textContent = winner.emoji;
    box.querySelector(".wr-label").textContent = `Hôm nay ăn ${winner.name}!`;
    $("#useResultBtn").hidden = false;
    $("#spinBtn").disabled = false;
    confetti();
    toast(`🎉 Vũ trụ chọn: ${winner.name}!`, "ok");
  });

  $("#spinBtn").addEventListener("click", () => {
    if (!wheel.items.length) { toast("Chưa có món nào để quay 🥺", "err"); return; }
    $("#spinBtn").disabled = true;
    $("#useResultBtn").hidden = true;
    wheel.spin();
  });

  $$('input[name="wheelSrc"]').forEach(r => {
    r.addEventListener("change", () => {
      $("#wheelCategory").disabled = r.value !== "category" || !r.checked;
      syncWheelSource();
    });
  });
  $("#wheelCategory").addEventListener("change", syncWheelSource);

  $("#useResultBtn").addEventListener("click", () => {
    if (!lastWinner) return;
    toggleFood(lastWinner, true);
    toast(`Đã thêm "${lastWinner.name}" vào buổi hẹn 💗`, "ok");
  });

  syncWheelSource();
}

function syncWheelSource() {
  if (!wheel) return;
  const src = ($('input[name="wheelSrc"]:checked') || {}).value || "selected";
  let items;
  if (src === "selected") items = state.foods.slice();
  else if (src === "category") items = allFoods().filter(f => f.cat === $("#wheelCategory").value);
  else items = allFoods().slice();

  if (items.length > 16) {
    items = items.sort(() => Math.random() - 0.5).slice(0, 16);
  }
  wheel.setItems(items);
}

/* ============================================================
   TÓM TẮT & LƯU
   ============================================================ */
function updateSummary() {
  $("#sumDate").textContent  = prettyDate(state.date);
  $("#sumTime").textContent  = state.time || "—";
  $("#sumPlace").textContent = state.place || "—";
  $("#sumAct").textContent   = state.activities.length ? state.activities.join(", ") : "—";
  $("#sumFood").textContent  = state.foods.length
    ? state.foods.map(f => `${f.emoji} ${f.name}`).join(", ")
    : "—";
  $("#sumNote").textContent  = state.note || "—";
  updateStepper();
}

function updateStepper() {
  const steps = $$("#stepper li");
  const done = [Boolean(state.date && state.time), state.foods.length > 0, false];
  steps.forEach((li, i) => {
    li.classList.toggle("done", done[i]);
    li.classList.toggle("active", !done[i] && done.slice(0, i).every(Boolean));
  });
}

function initSave() {
  $("#saveBtn").addEventListener("click", async () => {
    if (!state.date) { toast("Chọn ngày hẹn trước nha 🗓️", "err"); $("#plan").scrollIntoView(); return; }
    if (!state.time) { toast("Chọn giờ hẹn nữa nè ⏰", "err"); $("#plan").scrollIntoView(); return; }

    const btn = $("#saveBtn");
    btn.disabled = true;
    btn.textContent = "Đang lưu… 💾";

    const record = {
      date: state.date,
      time: state.time,
      place: state.place,
      activities: state.activities,
      foods: state.foods,
      note: state.note,
      mood: state.mood,
      me: state.me,
      her: state.her
    };

    try {
      const saved = await store.add(record);
      state.history.unshift(saved);
      renderHistory();
      renderCalendar();
      updateStats();
      confetti();
      toast("Đã lưu buổi hẹn rồi nè 💖", "ok");
      $("#history").scrollIntoView({ behavior: "smooth" });
    } catch (err) {
      console.error(err);
      toast("Lưu thất bại, thử lại nha 😢", "err");
    } finally {
      btn.disabled = false;
      btn.textContent = "Lưu buổi hẹn này 💖";
    }
  });

  $("#resetBtn").addEventListener("click", resetForm);
}

function resetForm() {
  state.date = ""; state.time = ""; state.place = "";
  state.activities = []; state.note = ""; state.foods = []; state.mood = "";
  $("#customTime").value = "";
  $("#placeInput").value = "";
  $("#noteInput").value = "";
  $$(".chip.active").forEach(c => {
    if (!c.closest("#foodFilters") && !c.closest("#historyFilters")) c.classList.remove("active");
  });
  renderCalendar();
  renderFoodGrid();
  renderSelectedFoods();
  updateSummary();
  syncWheelSource();
  toast("Đã làm mới form 🧹");
}

/* ============================================================
   LỊCH SỬ
   ============================================================ */
function initHistory() {
  $$("#historyFilters .chip").forEach(chip => {
    chip.addEventListener("click", () => {
      $$("#historyFilters .chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      state.historyFilter = chip.dataset.hf;
      renderHistory();
    });
  });

  $("#exportBtn").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(state.history, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `lich-hen-ho-${todayISO}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast("Đã xuất file JSON ⬇", "ok");
  });

  $("#clearAllBtn").addEventListener("click", async () => {
    if (!state.history.length) { toast("Lịch sử đang trống mà 🙈"); return; }
    if (!confirm("Xoá toàn bộ lịch sử? Hành động này không hoàn tác được.")) return;
    await store.clear();
    state.history = [];
    renderHistory();
    renderCalendar();
    updateStats();
    toast("Đã xoá toàn bộ lịch sử 🗑");
  });
}

function renderHistory() {
  const list = $("#historyList");
  list.innerHTML = "";

  const items = state.history.filter(h => {
    if (state.historyFilter === "upcoming") return h.date >= todayISO;
    if (state.historyFilter === "past") return h.date < todayISO;
    return true;
  });

  if (!items.length) {
    list.innerHTML = `<div class="empty">
      <span class="e-emoji">🌷</span>
      <b>Chưa có buổi hẹn nào ở đây</b><br />
      <span class="tiny">Lên lịch buổi đầu tiên ở phía trên nha!</span>
    </div>`;
    return;
  }

  items.forEach(h => {
    const upcoming = h.date >= todayISO;
    const card = document.createElement("article");
    card.className = "hist-card " + (upcoming ? "upcoming" : "past");
    card.innerHTML = `
      <div class="hist-top">
        <div>
          <div class="hist-date">${prettyDate(h.date)}</div>
          <div class="hist-time">⏰ ${escapeHtml(h.time || "—")}${h.mood ? " · " + escapeHtml(h.mood) : ""}</div>
        </div>
        <span class="hist-badge ${upcoming ? "" : "past"}">${upcoming ? "Sắp tới" : "Đã qua"}</span>
      </div>
      <div class="hist-body">
        ${h.place ? `<div><em>📍 Địa điểm</em><span>${escapeHtml(h.place)}</span></div>` : ""}
        ${(h.activities || []).length ? `<div><em>🎯 Hoạt động</em><span>${escapeHtml(h.activities.join(", "))}</span></div>` : ""}
        ${(h.me || h.her) ? `<div><em>💑 Cùng với</em><span>${escapeHtml([h.me, h.her].filter(Boolean).join(" & "))}</span></div>` : ""}
      </div>
      ${(h.foods || []).length ? `<div class="hist-foods">${h.foods.map(f => `<span>${f.emoji} ${escapeHtml(f.name)}</span>`).join("")}</div>` : ""}
      ${h.note ? `<div class="hist-note">💌 ${escapeHtml(h.note)}</div>` : ""}
      <div class="hist-actions">
        <button class="icon-btn copy">📋 Dùng lại</button>
        <button class="icon-btn del">🗑 Xoá</button>
      </div>`;

    card.querySelector(".copy").addEventListener("click", () => reuse(h));
    card.querySelector(".del").addEventListener("click", async () => {
      if (!confirm("Xoá buổi hẹn này?")) return;
      await store.remove(h.id);
      state.history = state.history.filter(x => x.id !== h.id);
      renderHistory();
      renderCalendar();
      updateStats();
      toast("Đã xoá buổi hẹn");
    });

    list.appendChild(card);
  });
}

function reuse(h) {
  state.time = h.time || "";
  state.place = h.place || "";
  state.activities = [...(h.activities || [])];
  state.foods = (h.foods || []).map(f => ({ ...f }));
  state.note = h.note || "";
  state.mood = h.mood || "";

  $("#customTime").value = state.time;
  $("#placeInput").value = state.place;
  $("#noteInput").value = state.note;
  $$("#timeSlots .chip").forEach(c => c.classList.toggle("active", c.dataset.time === state.time));
  $$("#activityChips .chip").forEach(c => c.classList.toggle("active", state.activities.includes(c.dataset.act)));
  $$("#moodChips .chip").forEach(c => c.classList.toggle("active", c.dataset.mood === state.mood));

  renderFoodGrid();
  renderSelectedFoods();
  updateSummary();
  syncWheelSource();
  $("#plan").scrollIntoView({ behavior: "smooth" });
  toast("Đã sao chép buổi hẹn — chọn ngày mới nha 🗓️", "ok");
}

function updateStats() {
  $("#statCount").textContent = state.history.length;
  $("#statUpcoming").textContent = state.history.filter(h => h.date >= todayISO).length;

  const tally = {};
  state.history.forEach(h => (h.foods || []).forEach(f => {
    const k = `${f.emoji} ${f.name}`;
    tally[k] = (tally[k] || 0) + 1;
  }));
  const top = Object.entries(tally).sort((a, b) => b[1] - a[1])[0];
  $("#statFav").textContent = top ? top[0] : "–";
}

/* ============================================================
   CONFETTI
   ============================================================ */
function confetti() {
  const cv = $("#confetti");
  const ctx = cv.getContext("2d");
  cv.width = innerWidth; cv.height = innerHeight;
  cv.classList.add("on");

  const colors = ["#FFA6C1", "#84DCC6", "#B7D686", "#F4708F", "#5CC9AF", "#FFE0EA"];
  const parts = Array.from({ length: 120 }, () => ({
    x: Math.random() * cv.width,
    y: -20 - Math.random() * cv.height * 0.4,
    r: 4 + Math.random() * 7,
    c: colors[Math.floor(Math.random() * colors.length)],
    vy: 2.2 + Math.random() * 3.6,
    vx: -1.4 + Math.random() * 2.8,
    rot: Math.random() * Math.PI,
    vr: -0.14 + Math.random() * 0.28
  }));

  const t0 = performance.now();
  const tick = now => {
    ctx.clearRect(0, 0, cv.width, cv.height);
    parts.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 1.5);
      ctx.restore();
    });
    if (now - t0 < 3000) requestAnimationFrame(tick);
    else { ctx.clearRect(0, 0, cv.width, cv.height); cv.classList.remove("on"); }
  };
  requestAnimationFrame(tick);
}

/* ---------- an toàn HTML ---------- */
function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, m =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}

/* ============================================================
   KHỞI ĐỘNG
   ============================================================ */
async function main() {
  initCalendar();
  initTimeAndPlace();
  initFood();
  initWheel();
  initSave();
  initHistory();
  renderSelectedFoods();
  updateSummary();

  const mode = await store.init();
  const badge = $("#storeBadge");
  badge.classList.toggle("local", mode === "local");
  $("#storeBadgeText").textContent = mode === "cloud" ? "Firebase ☁️" : "Lưu trên máy 💾";
  $("#saveHint").textContent = mode === "cloud"
    ? "Lịch sử đang được lưu lên Firebase Firestore — xem được từ mọi thiết bị."
    : "Chưa cấu hình Firebase nên lịch sử đang lưu trong trình duyệt này. Xem README để bật Firestore.";

  try {
    state.history = await store.list();
  } catch (e) {
    console.warn(e);
    state.history = [];
  }
  renderHistory();
  renderCalendar();
  updateStats();
}

main();
