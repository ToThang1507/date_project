/* ============================================================
   LỚP LƯU TRỮ
   - Có cấu hình Firebase  -> lưu lên Firestore (đồng bộ mọi thiết bị)
   - Chưa cấu hình / lỗi   -> tự động lưu vào localStorage
   ============================================================ */

import { firebaseConfig, COLLECTION } from "./config.js";

const LS_KEY = "datePlanner.history.v1";
const FB = "https://www.gstatic.com/firebasejs/10.12.2";

export const store = {
  mode: "local",   // "cloud" | "local"
  _db: null,
  _api: null,

  /** Khởi tạo. Trả về "cloud" hoặc "local". */
  async init() {
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

  /** Lấy toàn bộ lịch sử, mới nhất trước. */
  async list() {
    if (this.mode === "cloud") {
      try {
        const { collection, getDocs, query, orderBy } = this._api;
        const q = query(collection(this._db, COLLECTION), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (err) {
        console.warn("[store] list() lỗi, fallback local:", err);
        this.mode = "local";
      }
    }
    return this._local().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  },

  /** Thêm một buổi hẹn. Trả về bản ghi đã lưu (có id). */
  async add(record) {
    const data = { ...record, createdAt: Date.now() };
    if (this.mode === "cloud") {
      try {
        const { collection, addDoc } = this._api;
        const ref = await addDoc(collection(this._db, COLLECTION), data);
        return { id: ref.id, ...data };
      } catch (err) {
        console.warn("[store] add() lỗi, fallback local:", err);
        this.mode = "local";
      }
    }
    const item = { id: "loc_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7), ...data };
    const all = this._local();
    all.push(item);
    this._saveLocal(all);
    return item;
  },

  /** Xoá một buổi hẹn theo id. */
  async remove(id) {
    if (this.mode === "cloud" && !String(id).startsWith("loc_")) {
      try {
        const { doc, deleteDoc } = this._api;
        await deleteDoc(doc(this._db, COLLECTION, id));
        return true;
      } catch (err) {
        console.warn("[store] remove() lỗi:", err);
      }
    }
    this._saveLocal(this._local().filter(x => x.id !== id));
    return true;
  },

  /** Xoá sạch lịch sử. */
  async clear() {
    if (this.mode === "cloud") {
      try {
        const { collection, getDocs, deleteDoc, doc } = this._api;
        const snap = await getDocs(collection(this._db, COLLECTION));
        await Promise.all(snap.docs.map(d => deleteDoc(doc(this._db, COLLECTION, d.id))));
      } catch (err) {
        console.warn("[store] clear() lỗi:", err);
      }
    }
    this._saveLocal([]);
  },

  // ---- localStorage helpers ----
  _local() {
    try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; }
    catch { return []; }
  },
  _saveLocal(arr) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(arr)); }
    catch (e) { console.warn("[store] không ghi được localStorage:", e); }
  }
};
