/* ============================================================
   LỚP LƯU TRỮ (dùng chung cho: buổi hẹn, ảnh, món tự thêm)
   - Có cấu hình Firebase  -> lưu lên Firestore (đồng bộ mọi thiết bị)
   - Chưa cấu hình / lỗi   -> tự động lưu vào localStorage
   ============================================================ */

import { firebaseConfig, COLLECTION } from "./config.js";

const LS_PREFIX = "datePlanner.";
const FB = "https://www.gstatic.com/firebasejs/10.12.2";

export const store = {
  mode: "local",   // "cloud" | "local"
  _db: null,
  _api: null,
  _ready: null,

  /** Khởi tạo (gọi bao nhiêu lần cũng được). Trả về "cloud" hoặc "local". */
  init() {
    if (!this._ready) this._ready = this._connect();
    return this._ready;
  },

  async _connect() {
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
      this.mode = "local";
      return this.mode;
    }
    try {
      const [{ initializeApp }, fs] = await Promise.all([
        import(`${FB}/firebase-app.js`),
        import(`${FB}/firebase-firestore.js`)
      ]);
      const app = initializeApp(firebaseConfig);
      this._db = fs.getFirestore(app);
      this._api = fs;
      this.mode = "cloud";
    } catch (err) {
      console.warn("[store] Không kết nối được Firestore, dùng localStorage:", err);
      this.mode = "local";
    }
    return this.mode;
  },

  /** Lấy toàn bộ bản ghi của một collection, mới nhất trước. */
  async list(col = COLLECTION) {
    if (this.mode === "cloud") {
      try {
        const { collection, getDocs, query, orderBy } = this._api;
        const q = query(collection(this._db, col), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (err) {
        console.warn(`[store] list(${col}) lỗi, fallback local:`, err);
        this.mode = "local";
      }
    }
    return this._local(col).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  },

  /** Thêm một bản ghi. Trả về bản ghi đã lưu (có id). */
  async add(record, col = COLLECTION) {
    const data = { ...record, createdAt: Date.now() };
    if (this.mode === "cloud") {
      try {
        const { collection, addDoc } = this._api;
        const ref = await addDoc(collection(this._db, col), data);
        return { id: ref.id, ...data };
      } catch (err) {
        console.warn(`[store] add(${col}) lỗi, fallback local:`, err);
        this.mode = "local";
      }
    }
    const item = { id: "loc_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7), ...data };
    const all = this._local(col);
    all.push(item);
    this._saveLocal(col, all);
    return item;
  },

  /** Cập nhật một vài trường của bản ghi. */
  async update(id, patch, col = COLLECTION) {
    if (this.mode === "cloud" && !String(id).startsWith("loc_")) {
      try {
        const { doc, updateDoc } = this._api;
        await updateDoc(doc(this._db, col, id), patch);
        return true;
      } catch (err) {
        console.warn(`[store] update(${col}) lỗi:`, err);
      }
    }
    const all = this._local(col).map(x => (x.id === id ? { ...x, ...patch } : x));
    this._saveLocal(col, all);
    return true;
  },

  /** Xoá một bản ghi theo id. */
  async remove(id, col = COLLECTION) {
    if (this.mode === "cloud" && !String(id).startsWith("loc_")) {
      try {
        const { doc, deleteDoc } = this._api;
        await deleteDoc(doc(this._db, col, id));
        return true;
      } catch (err) {
        console.warn(`[store] remove(${col}) lỗi:`, err);
      }
    }
    this._saveLocal(col, this._local(col).filter(x => x.id !== id));
    return true;
  },

  /** Xoá sạch một collection. */
  async clear(col = COLLECTION) {
    if (this.mode === "cloud") {
      try {
        const { collection, getDocs, deleteDoc, doc } = this._api;
        const snap = await getDocs(collection(this._db, col));
        await Promise.all(snap.docs.map(d => deleteDoc(doc(this._db, col, d.id))));
      } catch (err) {
        console.warn(`[store] clear(${col}) lỗi:`, err);
      }
    }
    this._saveLocal(col, []);
  },

  // ---- localStorage helpers ----
  _key(col) { return `${LS_PREFIX}${col}.v1`; },
  _local(col) {
    try {
      const raw = localStorage.getItem(this._key(col));
      if (raw === null && col === COLLECTION) {
        // chuyển dữ liệu từ phiên bản cũ (datePlanner.history.v1)
        const legacy = localStorage.getItem(LS_PREFIX + "history.v1");
        if (legacy) {
          localStorage.setItem(this._key(col), legacy);
          return JSON.parse(legacy) || [];
        }
      }
      return JSON.parse(raw) || [];
    } catch { return []; }
  },
  _saveLocal(col, arr) {
    try { localStorage.setItem(this._key(col), JSON.stringify(arr)); }
    catch (e) { console.warn("[store] không ghi được localStorage:", e); }
  }
};

/** Tên các collection dùng trong app */
export const COL = {
  DATES:  COLLECTION,
  PHOTOS: "photos",
  FOODS:  "customFoods"
};
