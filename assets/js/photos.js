/* ============================================================
   ẢNH — nén ảnh trước khi upload + kho ảnh offline (IndexedDB)
   ============================================================ */

const DB_NAME = "datePlannerPhotos";
const STORE   = "blobs";
let _dbp = null;

function db() {
  if (_dbp) return _dbp;
  _dbp = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return _dbp;
}

async function tx(mode, fn) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const t = d.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export const localPhotos = {
  put(id, blob) { return tx("readwrite", s => s.put(blob, id)); },
  get(id)       { return tx("readonly",  s => s.get(id)); },
  del(id)       { return tx("readwrite", s => s.delete(id)); },
  clear()       { return tx("readwrite", s => s.clear()); }
};

/**
 * Nén / thu nhỏ ảnh trước khi lưu để đỡ tốn dung lượng và upload nhanh hơn.
 * @param {File} file
 * @param {number} maxDim cạnh dài nhất (px)
 * @param {number} quality 0–1
 * @returns {Promise<Blob>}
 */
export async function shrink(file, maxDim = 1600, quality = 0.85) {
  if (!file.type.startsWith("image/")) return file;
  // GIF động sẽ mất animation nếu vẽ lại -> giữ nguyên
  if (file.type === "image/gif") return file;

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;

  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size < 900_000) { bitmap.close?.(); return file; }

  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  canvas.getContext("2d").drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();

  const blob = await new Promise(r => canvas.toBlob(r, "image/jpeg", quality));
  return blob && blob.size < file.size ? blob : file;
}

/** Lấy kích thước ảnh dạng chữ dễ đọc */
export function prettySize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + " KB";
  return (bytes / 1024 / 1024).toFixed(1) + " MB";
}
