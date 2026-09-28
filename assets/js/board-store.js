/* ============================================================
   LƯU TRỮ CHO TRANG CHỦ "OUR TIME" (ảnh, ghi chú, cài đặt)
   - Luôn lưu vào IndexedDB của trình duyệt (chứa được nhiều ảnh hơn localStorage)
   - Có cấu hình Firebase -> đồng bộ thêm lên Firestore để mọi thiết bị cùng thấy
     · board_items/{id}   : vị trí, kích thước, chữ của từng ảnh / ghi chú
     · board_images/{id}  : ảnh (data URL đã nén, < 1MB / doc)
     · board_meta/settings: ngày bắt đầu, tiêu đề, câu quote…
   ============================================================ */

import { firebaseConfig } from "./config.js";
import { FB } from "./store.js";

const C_ITEMS = "board_items";
const C_IMAGES = "board_images";
const C_META = "board_meta";

/** Bỏ ảnh ra khỏi item (ảnh lưu riêng) + loại bỏ undefined (Firestore không nhận). */
const layoutOf = ({ src, ...rest }) => JSON.parse(JSON.stringify(rest));

// ---- IndexedDB helpers ----
let dbp;
const openDB = () => dbp ??= new Promise((resolve, reject) => {
  const r = indexedDB.open("ourTime", 1);
  r.onupgradeneeded = () => {
    const db = r.result;
    db.createObjectStore("items", { keyPath: "id" });
    db.createObjectStore("images", { keyPath: "id" });
    db.createObjectStore("kv", { keyPath: "key" });
  };
  r.onsuccess = () => resolve(r.result);
  r.onerror = () => reject(r.error);
});
const wrap = r => new Promise((resolve, reject) => {
  r.onsuccess = () => resolve(r.result);
  r.onerror = () => reject(r.error);
});
const os = async (name, mode = "readonly") => (await openDB()).transaction(name, mode).objectStore(name);
const idb = {
  all: async name => wrap((await os(name)).getAll()),
  get: async (name, key) => wrap((await os(name)).get(key)),
  put: async (name, val) => wrap((await os(name, "readwrite")).put(val)),
  del: async (name, key) => wrap((await os(name, "readwrite")).delete(key)),
  clear: async name => wrap((await os(name, "readwrite")).clear())
};

export const board = {
  mode: "local",   // "cloud" | "local"
  _db: null,
  _fs: null,

  async init() {
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) return this.mode = "local";
    try {
      const [{ initializeApp }, fs] = await Promise.all([
        import(`${FB}/firebase-app.js`),
        import(`${FB}/firebase-firestore.js`)
      ]);
      this._db = fs.getFirestore(initializeApp(firebaseConfig));
      this._fs = fs;
      this.mode = "cloud";
    } catch (err) {
      console.warn("[board] Không kết nối được Firestore, dùng IndexedDB:", err);
      this.mode = "local";
    }
    return this.mode;
  },

  /** Trả về { settings | null, items: [...] } — item ảnh đã được gắn src. */
  async load() {
    const local = await this._loadLocal();
    if (this.mode !== "cloud") return local;
    try {
      const cloud = await this._loadCloud();
      // Mới bật Firebase mà trên máy đã có dữ liệu -> đẩy lên cloud
      if (!cloud.settings && (local.settings || local.items.length)) {
        await this._pushAll(local.settings, local.items);
        return local;
      }
      await this._cacheLocal(cloud.settings, cloud.items);
      return cloud;
    } catch (err) {
      console.warn("[board] load() từ Firestore lỗi, dùng dữ liệu trên máy:", err);
      this.mode = "local";
      return local;
    }
  },

  async putItem(item) {
    const data = layoutOf(item);
    await idb.put("items", data);
    if (this.mode === "cloud") {
      const { doc, setDoc } = this._fs;
      await setDoc(doc(this._db, C_ITEMS, data.id), data);
    }
  },

  async putImage(id, src) {
    await idb.put("images", { id, src });
    if (this.mode === "cloud") {
      const { doc, setDoc } = this._fs;
      await setDoc(doc(this._db, C_IMAGES, id), { src });
    }
  },

  async removeItem(id) {
    await idb.del("items", id);
    await idb.del("images", id);
    if (this.mode === "cloud") {
      const { doc, deleteDoc } = this._fs;
      await Promise.all([deleteDoc(doc(this._db, C_ITEMS, id)), deleteDoc(doc(this._db, C_IMAGES, id))]);
    }
  },

  async putSettings(settings) {
    await idb.put("kv", { key: "settings", value: settings });
    if (this.mode === "cloud") {
      const { doc, setDoc } = this._fs;
      await setDoc(doc(this._db, C_META, "settings"), settings);
    }
  },

  /** Thay toàn bộ dữ liệu (nhập file sao lưu / khôi phục mặc định). */
  async replaceAll(settings, items) {
    await this._cacheLocal(settings, items);
    if (this.mode === "cloud") {
      const { collection, getDocs, deleteDoc } = this._fs;
      const snaps = await Promise.all([C_ITEMS, C_IMAGES].map(c => getDocs(collection(this._db, c))));
      await Promise.all(snaps.flatMap(s => s.docs.map(d => deleteDoc(d.ref))));
      await this._pushAll(settings, items);
    }
  },

  // ---- nội bộ ----
  async _loadLocal() {
    const [items, images, kv] = await Promise.all([idb.all("items"), idb.all("images"), idb.get("kv", "settings")]);
    const srcById = new Map(images.map(i => [i.id, i.src]));
    return {
      settings: kv?.value ?? null,
      items: items.map(it => ({ ...it, src: srcById.get(it.id) ?? null })).sort((a, b) => (a.z || 0) - (b.z || 0))
    };
  },

  async _loadCloud() {
    const { collection, getDocs, doc, getDoc } = this._fs;
    const [items, images, meta] = await Promise.all([
      getDocs(collection(this._db, C_ITEMS)),
      getDocs(collection(this._db, C_IMAGES)),
      getDoc(doc(this._db, C_META, "settings"))
    ]);
    const srcById = new Map(images.docs.map(d => [d.id, d.data().src]));
    return {
      settings: meta.exists() ? meta.data() : null,
      items: items.docs
        .map(d => ({ ...d.data(), id: d.id, src: srcById.get(d.id) ?? null }))
        .sort((a, b) => (a.z || 0) - (b.z || 0))
    };
  },

  async _cacheLocal(settings, items) {
    await Promise.all([idb.clear("items"), idb.clear("images")]);
    await Promise.all([
      ...items.map(it => idb.put("items", layoutOf(it))),
      ...items.filter(it => it.src).map(it => idb.put("images", { id: it.id, src: it.src })),
      settings ? idb.put("kv", { key: "settings", value: settings }) : null
    ]);
  },

  async _pushAll(settings, items) {
    const { doc, setDoc } = this._fs;
    await Promise.all([
      ...items.map(it => setDoc(doc(this._db, C_ITEMS, it.id), layoutOf(it))),
      ...items.filter(it => it.src).map(it => setDoc(doc(this._db, C_IMAGES, it.id), { src: it.src })),
      settings ? setDoc(doc(this._db, C_META, "settings"), settings) : null
    ]);
  }
};
