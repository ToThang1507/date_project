/* ============================================================
   TRANG ẢNH CHUNG
   ============================================================ */

import { store, COL } from "./store.js";
import { drive, thumbUrlOf } from "./drive.js";
import { localPhotos, shrink, prettySize } from "./photos.js";
import { DRIVE_FOLDER_NAME } from "./config.js";

const $  = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const pad = n => String(n).padStart(2, "0");
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const DOW = ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"];

function prettyDate(s) {
  if (!s) return "—";
  const [y, m, d] = s.split("-").map(Number);
  return `${DOW[new Date(y, m - 1, d).getDay()]}, ${pad(d)}/${pad(m)}/${y}`;
}
function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, m =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}

let toastTimer;
function toast(msg, type = "") {
  const el = $("#toast");
  el.textContent = msg;
  el.className = "toast show " + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.className = "toast " + type), 3400);
}

/* ---------- trạng thái ---------- */
const state = {
  photos: [],
  dates: [],
  filter: "all",
  grouped: true,
  urls: new Map(),   // photoId -> objectURL / https url
  visible: []        // danh sách ảnh đang hiển thị (cho lightbox)
};

/* ============================================================
   DRIVE UI
   ============================================================ */
function renderDriveBar() {
  const badge = $("#driveBadge");
  const signIn = $("#driveSignIn");
  const signOut = $("#driveSignOut");
  const openLink = $("#driveOpen");

  if (!drive.enabled) {
    badge.classList.add("local");
    $("#driveBadgeText").textContent = "Chế độ offline 💾";
    $("#driveTitle").textContent = "Chưa cấu hình Google Drive";
    $("#driveDesc").textContent =
      "Ảnh đang lưu ngay trong trình duyệt này. Dán GOOGLE_CLIENT_ID vào assets/js/config.js để đồng bộ lên Drive.";
    signIn.hidden = true; signOut.hidden = true; openLink.hidden = true;
    return;
  }

  if (drive.signedIn) {
    badge.classList.remove("local");
    $("#driveBadgeText").textContent = "Drive đã kết nối ☁️";
    $("#driveTitle").textContent = "Đã kết nối Google Drive";
    $("#driveDesc").textContent = `Ảnh mới sẽ được tải lên thư mục "${DRIVE_FOLDER_NAME}".`;
    signIn.hidden = true; signOut.hidden = false;
    if (drive.folderId) {
      openLink.href = `https://drive.google.com/drive/folders/${drive.folderId}`;
      openLink.hidden = false;
    }
  } else {
    badge.classList.add("local");
    $("#driveBadgeText").textContent = "Chưa đăng nhập Drive";
    $("#driveTitle").textContent = "Google Drive chưa đăng nhập";
    $("#driveDesc").textContent = "Đăng nhập để ảnh được lưu lên Drive và xem được từ mọi thiết bị.";
    signIn.hidden = false; signOut.hidden = true; openLink.hidden = true;
  }
}

function initDrive() {
  drive.restore();
  renderDriveBar();

  $("#driveSignIn").addEventListener("click", async () => {
    const btn = $("#driveSignIn");
    btn.disabled = true;
    btn.textContent = "Đang mở Google…";
    try {
      await drive.signIn();
      await drive.ensureFolder();
      toast("Đã kết nối Google Drive ☁️", "ok");
    } catch (err) {
      console.error(err);
      toast(err.message || "Kết nối Drive thất bại", "err");
    } finally {
      btn.disabled = false;
      btn.textContent = "Kết nối Google Drive";
      renderDriveBar();
    }
  });

  $("#driveSignOut").addEventListener("click", () => {
    drive.signOut();
    renderDriveBar();
    toast("Đã ngắt kết nối Drive");
  });
}

/* ============================================================
   UPLOAD
   ============================================================ */
function initUpload() {
  const dz = $("#dropzone");
  const input = $("#fileInput");

  dz.addEventListener("click", () => input.click());
  dz.addEventListener("keydown", e => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.click(); }
  });
  input.addEventListener("change", () => {
    handleFiles(Array.from(input.files || []));
    input.value = "";
  });

  ["dragenter", "dragover"].forEach(ev =>
    dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add("over"); }));
  ["dragleave", "drop"].forEach(ev =>
    dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove("over"); }));
  dz.addEventListener("drop", e => {
    const files = Array.from(e.dataTransfer?.files || []).filter(f => f.type.startsWith("image/"));
    if (files.length) handleFiles(files);
    else toast("Chỉ nhận file ảnh thôi nha 🥺", "err");
  });

  $("#takenAt").value = iso(new Date());
}

async function handleFiles(files) {
  const imgs = files.filter(f => f.type.startsWith("image/"));
  if (!imgs.length) { toast("Không có ảnh nào hợp lệ 🥺", "err"); return; }

  const queue = $("#queue");
  queue.hidden = false;

  const linkId  = $("#linkDate").value;
  const taken   = $("#takenAt").value || iso(new Date());
  const caption = $("#captionInput").value.trim();

  for (const file of imgs) {
    const row = document.createElement("div");
    row.className = "queue-row";
    row.innerHTML = `
      <span class="q-name">${escapeHtml(file.name)}</span>
      <span class="q-size">${prettySize(file.size)}</span>
      <span class="q-state">Đang xử lý…</span>`;
    queue.appendChild(row);
    const setState = (txt, cls = "") => {
      const el = row.querySelector(".q-state");
      el.textContent = txt;
      el.className = "q-state " + cls;
    };

    try {
      const blob = await shrink(file);
      row.querySelector(".q-size").textContent = prettySize(blob.size);

      const base = {
        name: file.name,
        caption,
        takenAt: taken,
        dateId: linkId,
        bytes: blob.size
      };

      let record;
      if (drive.signedIn) {
        setState("Đang tải lên Drive…");
        const safeName = `${taken}_${file.name}`.replace(/[\\/:*?"<>|]/g, "-");
        const up = await drive.upload(new File([blob], safeName, { type: blob.type }), safeName);
        record = await store.add({
          ...base,
          source: "drive",
          driveId: up.id,
          viewUrl: up.viewUrl,
          thumbUrl: up.thumbUrl,
          isPublic: up.isPublic
        }, COL.PHOTOS);
        setState(up.isPublic ? "Xong ✓ (đã share link)" : "Xong ✓", "ok");
      } else {
        setState("Đang lưu vào máy…");
        record = await store.add({ ...base, source: "local" }, COL.PHOTOS);
        await localPhotos.put(record.id, blob);
        setState("Đã lưu trong máy ✓", "ok");
      }

      state.photos.unshift(record);
      renderAlbum();
      updateStats();
    } catch (err) {
      console.error(err);
      setState(err.message || "Lỗi", "err");
    }
  }

  toast(`Đã thêm ${imgs.length} ảnh 📸`, "ok");
  setTimeout(() => { queue.innerHTML = ""; queue.hidden = true; }, 4000);
}

/* ============================================================
   HIỂN THỊ ẢNH
   ============================================================ */
async function urlFor(photo) {
  if (state.urls.has(photo.id)) return state.urls.get(photo.id);

  let url = "";
  if (photo.source === "drive") {
    if (photo.isPublic) {
      url = photo.thumbUrl || thumbUrlOf(photo.driveId);
    } else if (drive.signedIn) {
      try { url = await drive.blobUrl(photo.driveId); }
      catch (err) { console.warn(err); }
    }
  } else {
    const blob = await localPhotos.get(photo.id).catch(() => null);
    if (blob) url = URL.createObjectURL(blob);
  }
  state.urls.set(photo.id, url);
  return url;
}

function filtered() {
  return state.photos.filter(p => {
    if (state.filter === "linked") return Boolean(p.dateId);
    if (state.filter === "free")   return !p.dateId;
    return true;
  });
}

function renderAlbum() {
  const body = $("#albumBody");
  body.innerHTML = "";
  const items = filtered();
  state.visible = items;

  if (!items.length) {
    body.innerHTML = `<div class="empty">
      <span class="e-emoji">📷</span>
      <b>Chưa có tấm ảnh nào ở đây</b><br />
      <span class="tiny">Kéo ảnh vào khung phía trên để bắt đầu nha!</span>
    </div>`;
    return;
  }

  if (!state.grouped) {
    body.appendChild(gridOf(items));
    return;
  }

  // nhóm theo buổi hẹn (ảnh lẻ xếp cuối)
  const groups = new Map();
  items.forEach(p => {
    const key = p.dateId || "__free__";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  });

  const ordered = [...groups.entries()].sort((a, b) => {
    if (a[0] === "__free__") return 1;
    if (b[0] === "__free__") return -1;
    const da = state.dates.find(d => d.id === a[0])?.date || "";
    const db = state.dates.find(d => d.id === b[0])?.date || "";
    return db.localeCompare(da);
  });

  ordered.forEach(([key, list]) => {
    const sec = document.createElement("section");
    sec.className = "album-group";
    sec.id = "date-" + key;

    let title = "🖼️ Ảnh lẻ", sub = "Chưa gắn với buổi hẹn nào";
    if (key !== "__free__") {
      const d = state.dates.find(x => x.id === key);
      title = d ? `💕 ${prettyDate(d.date)}` : "💕 Buổi hẹn đã xoá";
      sub = d ? [d.time && `⏰ ${d.time}`, d.place && `📍 ${d.place}`].filter(Boolean).join(" · ") : "";
    }

    sec.innerHTML = `<div class="group-head">
        <h3>${escapeHtml(title)}</h3>
        <span class="group-sub">${escapeHtml(sub)}</span>
        <span class="group-count">${list.length} ảnh</span>
      </div>`;
    sec.appendChild(gridOf(list));
    body.appendChild(sec);
  });
}

function gridOf(list) {
  const grid = document.createElement("div");
  grid.className = "photo-grid";

  list.forEach(p => {
    const fig = document.createElement("figure");
    fig.className = "photo";
    fig.innerHTML = `
      <div class="photo-img"><div class="ph-skeleton"></div></div>
      <figcaption>
        <b>${escapeHtml(p.caption || p.name || "Ảnh")}</b>
        <span class="tiny">${escapeHtml(p.takenAt ? prettyDate(p.takenAt) : "")}${p.source === "drive" ? " · Drive ☁️" : " · Trong máy 💾"}</span>
      </figcaption>
      <div class="photo-actions">
        <button class="icon-btn edit" title="Sửa cần chú">✏️</button>
        <button class="icon-btn del" title="Xoá ảnh">🗑</button>
      </div>`;

    const holder = fig.querySelector(".photo-img");
    urlFor(p).then(url => {
      if (!url) {
        holder.innerHTML = `<div class="ph-fail">🔒<span class="tiny">Đăng nhập Drive để xem</span></div>`;
        return;
      }
      const img = new Image();
      img.alt = p.caption || p.name || "Ảnh chung";
      img.onload = () => holder.classList.add("loaded");
      img.onerror = () => {
        holder.innerHTML = `<div class="ph-fail">😢<span class="tiny">Không tải được ảnh</span></div>`;
      };
      // phải gắn vào DOM trước rồi mới đặt src, nếu không loading="lazy" sẽ không bao giờ tải
      holder.appendChild(img);
      img.loading = "lazy";
      img.src = url;
    });

    holder.addEventListener("click", () => openLightbox(p));
    fig.querySelector(".edit").addEventListener("click", async () => {
      const cap = prompt("Cần chú cho ảnh này:", p.caption || "");
      if (cap === null) return;
      await store.update(p.id, { caption: cap.trim() }, COL.PHOTOS);
      p.caption = cap.trim();
      renderAlbum();
      toast("Đã cập nhật cần chú ✏️", "ok");
    });
    fig.querySelector(".del").addEventListener("click", () => removePhoto(p));

    grid.appendChild(fig);
  });

  return grid;
}

async function removePhoto(p) {
  if (!confirm("Xoá tấm ảnh này?")) return;
  if (p.source === "drive" && drive.signedIn) await drive.remove(p.driveId);
  if (p.source === "local") await localPhotos.del(p.id).catch(() => {});
  await store.remove(p.id, COL.PHOTOS);

  const url = state.urls.get(p.id);
  if (url && url.startsWith("blob:")) URL.revokeObjectURL(url);
  state.urls.delete(p.id);
  state.photos = state.photos.filter(x => x.id !== p.id);

  renderAlbum();
  updateStats();
  toast("Đã xoá ảnh 🗑");
}

/* ============================================================
   LIGHTBOX
   ============================================================ */
let lbIndex = -1;

function openLightbox(photo) {
  lbIndex = state.visible.findIndex(x => x.id === photo.id);
  if (lbIndex < 0) return;
  $("#lightbox").hidden = false;
  document.body.style.overflow = "hidden";
  showLightbox();
}

async function showLightbox() {
  const p = state.visible[lbIndex];
  if (!p) return;
  const url = await urlFor(p);
  $("#lbImg").src = url || "";
  $("#lbImg").alt = p.caption || p.name || "Ảnh";
  $("#lbCap").textContent =
    [p.caption || p.name, p.takenAt ? prettyDate(p.takenAt) : ""].filter(Boolean).join(" · ");
}

function closeLightbox() {
  $("#lightbox").hidden = true;
  $("#lbImg").src = "";
  document.body.style.overflow = "";
}

function stepLightbox(d) {
  if (!state.visible.length) return;
  lbIndex = (lbIndex + d + state.visible.length) % state.visible.length;
  showLightbox();
}

function initLightbox() {
  $("#lbClose").addEventListener("click", closeLightbox);
  $("#lbPrev").addEventListener("click", () => stepLightbox(-1));
  $("#lbNext").addEventListener("click", () => stepLightbox(1));
  $("#lightbox").addEventListener("click", e => {
    if (e.target.id === "lightbox") closeLightbox();
  });
  document.addEventListener("keydown", e => {
    if ($("#lightbox").hidden) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") stepLightbox(-1);
    if (e.key === "ArrowRight") stepLightbox(1);
  });
}

/* ============================================================
   BỘ LỌC & THỐNG KÊ
   ============================================================ */
function initFilters() {
  $$("#albumFilters .chip").forEach(chip => {
    chip.addEventListener("click", () => {
      $$("#albumFilters .chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      state.filter = chip.dataset.gf;
      renderAlbum();
    });
  });

  $("#groupToggle").addEventListener("click", () => {
    state.grouped = !state.grouped;
    $("#groupToggle").textContent = state.grouped ? "🗂 Nhóm theo buổi hẹn" : "🔲 Xem dạng lưới";
    renderAlbum();
  });

  $("#clearPhotos").addEventListener("click", async () => {
    if (!state.photos.length) { toast("Album đang trống mà 🙈"); return; }
    if (!confirm("Xoá toàn bộ ảnh? Ảnh trên Drive cũng sẽ bị xoá.")) return;
    for (const p of state.photos) {
      if (p.source === "drive" && drive.signedIn) await drive.remove(p.driveId);
    }
    await localPhotos.clear().catch(() => {});
    await store.clear(COL.PHOTOS);
    state.urls.forEach(u => u.startsWith("blob:") && URL.revokeObjectURL(u));
    state.urls.clear();
    state.photos = [];
    renderAlbum();
    updateStats();
    toast("Đã xoá toàn bộ ảnh 🗑");
  });
}

function updateStats() {
  $("#gsTotal").textContent = state.photos.length;
  $("#gsDates").textContent = new Set(state.photos.filter(p => p.dateId).map(p => p.dateId)).size;
  const bytes = state.photos.reduce((s, p) => s + (p.bytes || 0), 0);
  $("#gsSize").textContent = bytes ? prettySize(bytes) : "0";
}

function fillDateSelect() {
  const sel = $("#linkDate");
  state.dates.forEach(d => {
    const o = document.createElement("option");
    o.value = d.id;
    o.textContent = `${prettyDate(d.date)}${d.place ? " · " + d.place : ""}`;
    sel.appendChild(o);
  });
  // nếu vào từ link #date-xxx thì chọn sẵn buổi hẹn đó
  const m = location.hash.match(/^#date-(.+)$/);
  if (m && state.dates.some(d => d.id === m[1])) sel.value = m[1];
}

/* ============================================================
   KHỞI ĐỘNG
   ============================================================ */
async function main() {
  initDrive();
  initUpload();
  initFilters();
  initLightbox();

  await store.init();
  const [dates, photos] = await Promise.all([
    store.list(COL.DATES).catch(() => []),
    store.list(COL.PHOTOS).catch(() => [])
  ]);
  state.dates = dates;
  state.photos = photos;

  fillDateSelect();
  renderAlbum();
  updateStats();

  // cuộn tới nhóm ảnh của buổi hẹn nếu đi từ trang chính sang
  const m = location.hash.match(/^#date-(.+)$/);
  if (m) setTimeout(() => document.getElementById("date-" + m[1])?.scrollIntoView({ behavior: "smooth" }), 400);
}

main();
