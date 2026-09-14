/* ============================================================
   DATE PLANNER — logic chính
   ============================================================ */

import { FOODS, CATEGORIES } from "./foods.js";
import { store, COL } from "./store.js";
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
  food: null,         // 1 món ăn  { emoji, name, cat }
  drink: null,        // 1 nước uống
  mood: "",
  me: DEFAULT_NAMES.me,
  her: DEFAULT_NAMES.her,
  category: "all",
  search: "",
  history: [],
  historyFilter: "all",
  customFoods: [],
  photoCounts: {},
  wheelMode: "food",   // "food" | "drink"
  wheelSrc: "short",   // "short" (bảng chọn) | "all"
  shortlist: []        // các món được bỏ vào bảng chọn để quay
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
/* ============================================================
   MÓN ĂN & NƯỚC UỐNG  (mỗi buổi hẹn: 1 món ăn + 1 nước uống)
   ============================================================ */
const DRINK_CAT = "drink";

/** Toàn bộ món (mặc định + tự thêm) */
function allItems() {
  return [...FOODS, ...state.customFoods];
}
/** Chỉ món ăn */
function allFoods() {
  return allItems().filter(f => f.cat !== DRINK_CAT);
}
/** Chỉ nước uống */
function allDrinks() {
  return allItems().filter(f => f.cat === DRINK_CAT);
}
/** Nhóm dùng cho phần món ăn (bỏ nhóm đồ uống ra) */
function foodCategories() {
  return CATEGORIES.filter(c => c.id !== DRINK_CAT);
}

function itemKey(f) { return f ? f.emoji + "|" + f.name : ""; }
function isDrink(f) { return Boolean(f) && f.cat === DRINK_CAT; }
/** Ô lưu của một món: "food" hay "drink" */
function slotOf(f) { return isDrink(f) ? "drink" : "food"; }

function initFood() {
  // bộ lọc nhóm cho phần món ăn
  const filters = $("#foodFilters");
  foodCategories().forEach(c => {
    const b = document.createElement("button");
    b.className = "chip" + (c.id === "all" ? " active" : "");
    b.textContent = c.id === "all" ? "🌈 Tất cả" : c.label;
    b.dataset.cat = c.id;
    b.addEventListener("click", () => {
      state.category = c.id;
      $$("#foodFilters .chip").forEach(x => x.classList.remove("active"));
      b.classList.add("active");
      renderFoodGrid();
    });
    filters.appendChild(b);
  });

  // nhóm cho vòng quay (chế độ món ăn)
  const sel = $("#wheelCategory");
  foodCategories().forEach(c => {
    const o = document.createElement("option");
    o.value = c.id;
    o.textContent = c.id === "all" ? "🌈 Tất cả món ăn" : c.label;
    sel.appendChild(o);
  });

  $("#foodSearch").addEventListener("input", e => {
    state.search = e.target.value.trim().toLowerCase();
    renderFoodGrid();
  });

  initFoodModal();
  $("#addCustomFood").addEventListener("click", () => openFoodModal("food"));
  $("#addCustomDrink").addEventListener("click", () => openFoodModal("drink"));

  initShortlist();
  renderFoodGrid();
  renderDrinkGrid();
  renderPicked();
}

/* ---------- modal thêm món mới ---------- */
const EMOJI_FOOD  = ["🍽️","🍜","🍚","🍲","🍛","🥘","🍝","🍕","🍔","🍗","🥩","🍤",
                     "🍣","🥟","🌮","🥗","🍢","🧁","🍰","🍦"];
const EMOJI_DRINK = ["🧋","☕","🍵","🥤","🧃","🍹","🥥","🍶","🧉","🍺","🥛","🍯"];
let modalKind = "food";

function initFoodModal() {
  $("#fmCancel").addEventListener("click", closeFoodModal);
  $("#foodModal").addEventListener("click", e => {
    if (e.target.id === "foodModal") closeFoodModal();
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && !$("#foodModal").hidden) closeFoodModal();
  });
  $("#fmName").addEventListener("keydown", e => {
    if (e.key === "Enter") { e.preventDefault(); saveCustomFood(); }
  });
  $("#fmSave").addEventListener("click", saveCustomFood);
}

function fillModal(kind) {
  const picker = $("#fmEmojiPicker");
  picker.innerHTML = "";
  (kind === "drink" ? EMOJI_DRINK : EMOJI_FOOD).forEach(e => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = e;
    b.addEventListener("click", () => {
      $("#fmEmoji").value = e;
      $$("#fmEmojiPicker button").forEach(x => x.classList.remove("active"));
      b.classList.add("active");
    });
    picker.appendChild(b);
  });

  const sel = $("#fmCat");
  sel.innerHTML = "";
  const cats = kind === "drink"
    ? CATEGORIES.filter(c => c.id === DRINK_CAT)
    : foodCategories().filter(c => c.id !== "all");
  cats.forEach(c => {
    const o = document.createElement("option");
    o.value = c.id;
    o.textContent = c.label;
    sel.appendChild(o);
  });
  sel.disabled = kind === "drink";
}

function openFoodModal(kind = "food") {
  modalKind = kind;
  fillModal(kind);
  $("#fmTitle").textContent = kind === "drink" ? "🧋 Thêm nước uống mới" : "🍽️ Thêm món ăn mới";
  $("#fmDesc").textContent = kind === "drink"
    ? "Loại nước này sẽ được lưu lại và hiện trong danh sách ở những lần sau."
    : "Món này sẽ được lưu lại và hiện trong danh sách ở những lần sau.";
  $("#fmName").value = "";
  $("#fmEmoji").value = kind === "drink" ? "🧋" : "🍽️";
  if (kind === "food" && state.category !== "all") $("#fmCat").value = state.category;
  $("#fmSave").textContent = kind === "drink" ? "Thêm nước 🎉" : "Thêm món 🎉";
  $("#foodModal").hidden = false;
  setTimeout(() => $("#fmName").focus(), 60);
}

function closeFoodModal() {
  $("#foodModal").hidden = true;
}

async function saveCustomFood() {
  const name = $("#fmName").value.trim();
  const kind = modalKind;
  if (!name) { toast("Nhập tên đã nha 🥺", "err"); $("#fmName").focus(); return; }

  if (allItems().some(f => f.name.toLowerCase() === name.toLowerCase())) {
    toast(`"${name}" đã có trong danh sách rồi 🙈`, "err");
    return;
  }

  const item = {
    emoji: ($("#fmEmoji").value.trim() || (kind === "drink" ? "🧋" : "🍽️")).slice(0, 4),
    name,
    cat: kind === "drink" ? DRINK_CAT : ($("#fmCat").value || "vn"),
    custom: true
  };

  const btn = $("#fmSave");
  const label = btn.textContent;
  btn.disabled = true;
  btn.textContent = "Đang lưu…";
  try {
    const saved = await store.add(item, COL.FOODS);
    state.customFoods.push({ ...item, id: saved.id });
    closeFoodModal();
    pickItem(item);                     // chọn luôn món vừa thêm
    if (kind === "food") {
      state.category = "all";
      state.search = "";
      $("#foodSearch").value = "";
      $$("#foodFilters .chip").forEach(x => x.classList.toggle("active", x.dataset.cat === "all"));
    }
    renderFoodGrid();
    renderDrinkGrid();
    syncWheelSource();
    toast(`Đã thêm "${item.name}" 🎉`, "ok");
  } catch (err) {
    console.error(err);
    toast("Lưu thất bại, thử lại nha 😢", "err");
  } finally {
    btn.disabled = false;
    btn.textContent = label;
  }
}

async function deleteCustomFood(f) {
  if (!confirm(`Xoá "${f.name}" khỏi danh sách?`)) return;
  if (f.id) await store.remove(f.id, COL.FOODS);
  state.customFoods = state.customFoods.filter(x => x.name !== f.name);
  if (state.food  && state.food.name  === f.name) state.food  = null;
  if (state.drink && state.drink.name === f.name) state.drink = null;
  state.shortlist = state.shortlist.filter(x => x.name !== f.name);
  renderFoodGrid();
  renderDrinkGrid();
  renderPicked();
  renderShortlist();
  updateSummary();
  syncWheelSource();
  toast(`Đã xoá "${f.name}"`);
}

/* ============================================================
   BẢNG CHỌN — gom các món phân vân để quay random
   ============================================================ */
function isShortlisted(f) {
  return state.shortlist.some(x => itemKey(x) === itemKey(f));
}

function shortlistOf(mode) {
  return state.shortlist.filter(f => slotOf(f) === mode);
}

function toggleShortlist(f) {
  if (isShortlisted(f)) {
    state.shortlist = state.shortlist.filter(x => itemKey(x) !== itemKey(f));
  } else {
    state.shortlist.push({ emoji: f.emoji, name: f.name, cat: f.cat });
    // vừa thêm loại nào thì chuyển vòng quay sang loại đó cho tiện
    state.wheelMode = slotOf(f);
    state.wheelSrc = "short";
    syncWheelTabs();
  }
  renderFoodGrid();
  renderDrinkGrid();
  renderShortlist();
  syncWheelSource();
}

function clearShortlist() {
  state.shortlist = [];
  renderFoodGrid();
  renderDrinkGrid();
  renderShortlist();
  syncWheelSource();
}

function initShortlist() {
  $("#clearShortlist").addEventListener("click", () => {
    clearShortlist();
    toast("Đã xoá bảng chọn 🧹");
  });
  $("#spinFoodBtn").addEventListener("click", () => spinFromShortlist("food"));
  $("#spinDrinkBtn").addEventListener("click", () => spinFromShortlist("drink"));
  renderShortlist();
}

function spinFromShortlist(mode) {
  if (shortlistOf(mode).length < 2) {
    toast("Bỏ ít nhất 2 món vào bảng chọn đã nha 🥺", "err");
    return;
  }
  state.wheelMode = mode;
  state.wheelSrc = "short";
  syncWheelTabs();
  resetWheelResult();
  syncWheelSource();
  $("#wheel").scrollIntoView({ behavior: "smooth" });
  setTimeout(() => $("#spinBtn").click(), 650);
}

function renderShortlist() {
  const total = state.shortlist.length;
  $("#shortCount").textContent = total ? `${total} món` : "trống";
  $("#clearShortlist").hidden = total === 0;
  $("#shortlistCard").classList.toggle("is-empty", total === 0);

  [
    { mode: "food",  box: "#shortFoods",  count: "#sgFoodCount",  btn: "#spinFoodBtn",  empty: "Chưa có món ăn nào trong bảng chọn" },
    { mode: "drink", box: "#shortDrinks", count: "#sgDrinkCount", btn: "#spinDrinkBtn", empty: "Chưa có nước uống nào trong bảng chọn" }
  ].forEach(g => {
    const list = shortlistOf(g.mode);
    const box = $(g.box);
    box.innerHTML = "";
    $(g.count).textContent = list.length;

    if (!list.length) {
      box.innerHTML = `<span class="muted tiny">${g.empty}</span>`;
    } else {
      list.forEach(f => {
        const tag = document.createElement("span");
        tag.className = "tag";
        tag.innerHTML = `${f.emoji} ${escapeHtml(f.name)} <button title="Bỏ khỏi bảng chọn">×</button>`;
        tag.querySelector("button").addEventListener("click", () => toggleShortlist(f));
        box.appendChild(tag);
      });
    }

    const btn = $(g.btn);
    btn.disabled = list.length < 2;
    btn.textContent = g.mode === "food"
      ? `🎡 Quay món ăn${list.length ? ` (${list.length})` : ""}`
      : `🎡 Quay nước uống${list.length ? ` (${list.length})` : ""}`;
  });
}

/* ---------- lưới món ---------- */
function catLabel(id) {
  return (CATEGORIES.find(c => c.id === id)?.label || "").replace(/^\S+\s/, "");
}

function itemCard(f, selected, showCat = true) {
  const el = document.createElement("div");
  el.className = "food-item" + (selected ? " active" : "");
  el.setAttribute("role", "button");
  el.tabIndex = 0;
  const inWheel = isShortlisted(f);
  el.classList.toggle("in-wheel", inWheel);
  el.innerHTML =
    (f.custom ? `<button class="fi-del" title="Xoá món tự thêm">×</button>` : "") +
    `<button class="fi-wheel${inWheel ? " on" : ""}" title="${inWheel ? "Bỏ khỏi bảng chọn" : "Thêm vào bảng chọn để quay"}">🎡</button>` +
    `<span class="fi-emoji">${f.emoji}</span>` +
    `<span class="fi-name">${escapeHtml(f.name)}</span>` +
    (showCat || f.custom
      ? `<span class="fi-cat">${showCat ? catLabel(f.cat) : ""}${f.custom ? (showCat ? " ·&nbsp;" : "") + "tự thêm" : ""}</span>`
      : "");
  el.addEventListener("click", e => {
    if (e.target.classList.contains("fi-del"))   { e.stopPropagation(); deleteCustomFood(f); return; }
    if (e.target.classList.contains("fi-wheel")) { e.stopPropagation(); toggleShortlist(f);  return; }
    pickItem(f);
  });
  el.addEventListener("keydown", e => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pickItem(f); }
  });
  return el;
}

function renderFoodGrid() {
  const grid = $("#foodGrid");
  grid.innerHTML = "";

  const list = allFoods().filter(f =>
    (state.category === "all" || f.cat === state.category) &&
    (!state.search || f.name.toLowerCase().includes(state.search))
  );

  if (!list.length) {
    grid.innerHTML = `<div class="empty"><span class="e-emoji">🔍</span>Không tìm thấy món nào phù hợp</div>`;
    return;
  }
  const selKey = itemKey(state.food);
  list.forEach(f => grid.appendChild(itemCard(f, itemKey(f) === selKey)));
}

function renderDrinkGrid() {
  const grid = $("#drinkGrid");
  grid.innerHTML = "";
  const selKey = itemKey(state.drink);
  allDrinks().forEach(f => grid.appendChild(itemCard(f, itemKey(f) === selKey, false)));
}

/**
 * Chọn một món. Vì mỗi buổi hẹn chỉ giữ 1 món ăn + 1 nước uống nên
 * món mới LUÔN thay thế lựa chọn cũ cùng loại.
 * @param {object} f
 * @param {boolean} replaceOnly true = không cho bỏ chọn (dùng cho vòng quay)
 */
function pickItem(f, replaceOnly = false) {
  const slot = slotOf(f);
  const same = itemKey(state[slot]) === itemKey(f);

  if (same && !replaceOnly) state[slot] = null;      // bấm lại để bỏ chọn
  else state[slot] = { emoji: f.emoji, name: f.name, cat: f.cat };

  renderFoodGrid();
  renderDrinkGrid();
  renderPicked();
  updateSummary();
}

function clearSlot(slot) {
  state[slot] = null;
  renderFoodGrid();
  renderDrinkGrid();
  renderPicked();
  updateSummary();
}

function renderPicked() {
  const slots = [
    { el: $("#slotFood"),  key: "food",  icon: "🍜", label: "Món ăn",    empty: "Chưa chọn món ăn" },
    { el: $("#slotDrink"), key: "drink", icon: "🧋", label: "Nước uống", empty: "Chưa chọn nước uống" }
  ];

  slots.forEach(s => {
    const item = state[s.key];
    s.el.classList.toggle("empty", !item);
    if (!item) {
      s.el.innerHTML =
        `<span class="ps-label">${s.icon} ${s.label}</span>` +
        `<span class="ps-value muted">${s.empty} 🥺</span>`;
      return;
    }
    s.el.innerHTML =
      `<span class="ps-label">${s.icon} ${s.label}</span>` +
      `<span class="ps-value">${item.emoji} ${escapeHtml(item.name)}</span>` +
      `<button class="ps-clear" title="Bỏ chọn">×</button>`;
    s.el.querySelector(".ps-clear").addEventListener("click", () => clearSlot(s.key));
  });
}

/* ============================================================
   VÒNG QUAY  (2 chế độ: món ăn / nước uống)
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
    box.querySelector(".wr-label").textContent =
      state.wheelMode === "drink" ? `Hôm nay uống ${winner.name}!` : `Hôm nay ăn ${winner.name}!`;
    $("#useResultBtn").hidden = false;
    $("#spinBtn").disabled = false;
    confetti();
    toast(`🎉 Vũ trụ chọn: ${winner.name}!`, "ok");
  });

  $("#spinBtn").addEventListener("click", () => {
    if (!wheel.items.length) { toast("Chưa có gì để quay 🥺", "err"); return; }
    $("#spinBtn").disabled = true;
    $("#useResultBtn").hidden = true;
    wheel.spin();
  });

  $$("#wheelTabs .wtab").forEach(tab => {
    tab.addEventListener("click", () => {
      state.wheelMode = tab.dataset.mode;
      // sang tab mới thì ưu tiên bảng chọn nếu đủ món
      state.wheelSrc = shortlistOf(state.wheelMode).length >= 2 ? "short" : "all";
      syncWheelTabs();
      resetWheelResult();
      syncWheelSource();
    });
  });

  $$("#wheelSrc .src-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      if (btn.dataset.src === "short" && shortlistOf(state.wheelMode).length < 2) {
        toast("Bảng chọn cần ít nhất 2 món đã nha 🥺", "err");
        $("#food").scrollIntoView({ behavior: "smooth" });
        return;
      }
      state.wheelSrc = btn.dataset.src;
      syncWheelTabs();
      resetWheelResult();
      syncWheelSource();
    });
  });

  $("#wheelCategory").addEventListener("change", syncWheelSource);
  $("#reshuffleBtn").addEventListener("click", () => {
    syncWheelSource();
    toast("Đã xáo lại vòng quay 🔀");
  });

  // Chốt kết quả: XOÁ lựa chọn cũ, chỉ giữ đúng món vừa quay
  $("#useResultBtn").addEventListener("click", () => {
    if (!lastWinner) return;
    const slot = slotOf(lastWinner);
    pickItem(lastWinner, true);
    syncWheelSource();
    $("#useResultBtn").hidden = true;
    toast(
      slot === "drink"
        ? `🧋 Nước uống của buổi hẹn giờ là "${lastWinner.name}"`
        : `🍜 Món ăn của buổi hẹn giờ là "${lastWinner.name}"`,
      "ok"
    );
    $("#confirm").scrollIntoView({ behavior: "smooth" });
  });

  syncWheelSource();
}

function resetWheelResult() {
  lastWinner = null;
  const box = $("#wheelResult");
  box.classList.remove("win");
  box.querySelector(".wr-emoji").textContent = "🎁";
  box.querySelector(".wr-label").textContent = "Kết quả sẽ hiện ở đây";
  $("#useResultBtn").hidden = true;
}

/** Đồng bộ trạng thái bật/tắt của 2 tab và 2 nút nguồn */
function syncWheelTabs() {
  $$("#wheelTabs .wtab").forEach(t => {
    const on = t.dataset.mode === state.wheelMode;
    t.classList.toggle("active", on);
    t.setAttribute("aria-selected", String(on));
  });
  $$("#wheelSrc .src-btn").forEach(b =>
    b.classList.toggle("active", b.dataset.src === state.wheelSrc));
}

function syncWheelSource() {
  if (!wheel) return;
  const drinkMode = state.wheelMode === "drink";
  const short = shortlistOf(state.wheelMode);

  // hết món trong bảng chọn thì tự rơi về "cả danh sách"
  if (state.wheelSrc === "short" && short.length < 2) state.wheelSrc = "all";
  const useShort = state.wheelSrc === "short";

  $("#srcCount").textContent = `(${short.length})`;
  $("#wheelSrc").classList.toggle("short-empty", short.length < 2);
  syncWheelTabs();

  $("#wheelCatField").hidden = drinkMode || useShort;

  const what = drinkMode ? "ly nước" : "món";
  $("#wheelHint").innerHTML = useShort
    ? `🎯 Đang quay trong <b>${short.length} ${what}</b> ở bảng chọn của mình.`
    : (drinkMode
        ? '💡 Chốt xong, ly nước này sẽ <b>thay thế</b> nước uống đang chọn — mỗi buổi hẹn chỉ giữ 1 ly.'
        : '💡 Chốt xong, món này sẽ <b>thay thế</b> món ăn đang chọn — mỗi buổi hẹn chỉ giữ 1 món.');

  let items;
  if (useShort) {
    items = short.slice();
  } else if (drinkMode) {
    items = allDrinks();
  } else {
    const cat = $("#wheelCategory").value || "all";
    items = cat === "all" ? allFoods() : allFoods().filter(f => f.cat === cat);
  }

  // vòng quay đẹp nhất ở khoảng 12 lát -> lấy ngẫu nhiên nếu nhiều quá
  const MAX = 12;
  const truncated = !useShort && items.length > MAX;
  if (truncated) items = items.slice().sort(() => Math.random() - 0.5).slice(0, MAX);
  $("#reshuffleBtn").hidden = !truncated;

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
  $("#sumFood").textContent  = state.food  ? `${state.food.emoji} ${state.food.name}`   : "—";
  $("#sumDrink").textContent = state.drink ? `${state.drink.emoji} ${state.drink.name}` : "—";
  $("#sumNote").textContent  = state.note || "—";
  updateStepper();
}

function updateStepper() {
  const steps = $$("#stepper li");
  const done = [Boolean(state.date && state.time), Boolean(state.food || state.drink), false];
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
      food: state.food,
      drink: state.drink,
      // giữ thêm mảng foods cho tương thích với các bản ghi cũ & phần thống kê
      foods: [state.food, state.drink].filter(Boolean),
      note: state.note,
      mood: state.mood,
      me: state.me,
      her: state.her
    };

    try {
      const saved = await store.add(record, COL.DATES);
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
  state.activities = []; state.note = ""; state.mood = "";
  state.food = null; state.drink = null; state.shortlist = [];
  $("#customTime").value = "";
  $("#placeInput").value = "";
  $("#noteInput").value = "";
  $$(".chip.active").forEach(c => {
    if (!c.closest("#foodFilters") && !c.closest("#historyFilters")) c.classList.remove("active");
  });
  renderCalendar();
  renderFoodGrid();
  renderDrinkGrid();
  renderPicked();
  renderShortlist();
  resetWheelResult();
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
    await store.clear(COL.DATES);
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
      ${histPicks(h)}
      ${h.note ? `<div class="hist-note">💌 ${escapeHtml(h.note)}</div>` : ""}
      <div class="hist-actions">
        <button class="icon-btn copy">📋 Dùng lại</button>
        <a class="icon-btn" href="gallery.html#date-${encodeURIComponent(h.id)}">📷 Ảnh${state.photoCounts[h.id] ? " (" + state.photoCounts[h.id] + ")" : ""}</a>
        <button class="icon-btn del">🗑 Xoá</button>
      </div>`;

    card.querySelector(".copy").addEventListener("click", () => reuse(h));
    card.querySelector(".del").addEventListener("click", async () => {
      if (!confirm("Xoá buổi hẹn này?")) return;
      await store.remove(h.id, COL.DATES);
      state.history = state.history.filter(x => x.id !== h.id);
      renderHistory();
      renderCalendar();
      updateStats();
      toast("Đã xoá buổi hẹn");
    });

    list.appendChild(card);
  });
}

/** Chip món ăn / nước uống trên thẻ lịch sử (hỗ trợ cả bản ghi cũ) */
function histPicks(h) {
  const legacy = h.foods || [];
  const food  = h.food  || legacy.find(f => f.cat !== DRINK_CAT);
  const drink = h.drink || legacy.find(f => f.cat === DRINK_CAT);
  // bản ghi cũ có thể có nhiều món -> hiện hết cho khỏi mất dữ liệu
  const extras = legacy.filter(f => f !== food && f !== drink);

  const chips = [];
  if (food)  chips.push(`<span class="pick-chip food">Ăn · ${escapeHtml(food.emoji + " " + food.name)}</span>`);
  if (drink) chips.push(`<span class="pick-chip drink">Uống · ${escapeHtml(drink.emoji + " " + drink.name)}</span>`);
  extras.forEach(f => chips.push(`<span class="pick-chip">${escapeHtml(f.emoji + " " + f.name)}</span>`));

  return chips.length ? `<div class="hist-foods">${chips.join("")}</div>` : "";
}

function reuse(h) {
  state.time = h.time || "";
  state.place = h.place || "";
  state.activities = [...(h.activities || [])];
  // bản ghi mới có food/drink riêng; bản ghi cũ chỉ có mảng foods
  const legacy = h.foods || [];
  state.food  = h.food  ? { ...h.food }  : (legacy.find(f => f.cat !== DRINK_CAT) || null);
  state.drink = h.drink ? { ...h.drink } : (legacy.find(f => f.cat === DRINK_CAT) || null);
  state.note = h.note || "";
  state.mood = h.mood || "";

  $("#customTime").value = state.time;
  $("#placeInput").value = state.place;
  $("#noteInput").value = state.note;
  $$("#timeSlots .chip").forEach(c => c.classList.toggle("active", c.dataset.time === state.time));
  $$("#activityChips .chip").forEach(c => c.classList.toggle("active", state.activities.includes(c.dataset.act)));
  $$("#moodChips .chip").forEach(c => c.classList.toggle("active", c.dataset.mood === state.mood));

  renderFoodGrid();
  renderDrinkGrid();
  renderPicked();
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
  updateSummary();

  const mode = await store.init();
  const badge = $("#storeBadge");
  badge.classList.toggle("local", mode === "local");
  $("#storeBadgeText").textContent = mode === "cloud" ? "Firebase ☁️" : "Lưu trên máy 💾";
  $("#saveHint").textContent = mode === "cloud"
    ? "Lịch sử đang được lưu lên Firebase Firestore — xem được từ mọi thiết bị."
    : "Chưa cấu hình Firebase nên lịch sử đang lưu trong trình duyệt này. Xem README để bật Firestore.";

  const [history, customFoods, photos] = await Promise.all([
    store.list(COL.DATES).catch(e => { console.warn(e); return []; }),
    store.list(COL.FOODS).catch(e => { console.warn(e); return []; }),
    store.list(COL.PHOTOS).catch(() => [])
  ]);

  state.history = history;
  state.customFoods = customFoods.map(f => ({ ...f, custom: true }));
  state.photoCounts = photos.reduce((acc, p) => {
    if (p.dateId) acc[p.dateId] = (acc[p.dateId] || 0) + 1;
    return acc;
  }, {});

  renderFoodGrid();
  renderDrinkGrid();
  renderPicked();
  syncWheelSource();
  renderHistory();
  renderCalendar();
  updateStats();
}

main();
