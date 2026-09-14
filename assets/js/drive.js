/* ============================================================
   GOOGLE DRIVE
   - Đăng nhập bằng Google Identity Services (không cần backend)
   - Quyền drive.file: app CHỈ thấy được file do chính nó tạo ra
   - Upload ảnh vào 1 thư mục riêng, tuỳ chọn tự share "ai có link đều xem"
   ============================================================ */

import {
  GOOGLE_CLIENT_ID,
  DRIVE_FOLDER_NAME,
  DRIVE_FOLDER_ID,
  DRIVE_PUBLIC_LINK
} from "./config.js";

const SCOPE   = "https://www.googleapis.com/auth/drive.file";
const GIS_SRC = "https://accounts.google.com/gsi/client";
const API     = "https://www.googleapis.com/drive/v3";
const UPLOAD  = "https://www.googleapis.com/upload/drive/v3/files";
const SS_KEY  = "datePlanner.driveToken";

export const drive = {
  enabled: Boolean(GOOGLE_CLIENT_ID),
  token: null,
  tokenExp: 0,
  folderId: DRIVE_FOLDER_ID || null,
  _client: null,
  _gisLoaded: null,

  /** Khôi phục token còn hạn từ sessionStorage (đỡ phải bấm đăng nhập lại). */
  restore() {
    if (!this.enabled) return false;
    try {
      const saved = JSON.parse(sessionStorage.getItem(SS_KEY) || "null");
      if (saved && saved.exp > Date.now() + 60_000) {
        this.token = saved.token;
        this.tokenExp = saved.exp;
        return true;
      }
    } catch { /* bỏ qua */ }
    return false;
  },

  get signedIn() {
    return Boolean(this.token) && this.tokenExp > Date.now();
  },

  signOut() {
    this.token = null;
    this.tokenExp = 0;
    this.folderId = DRIVE_FOLDER_ID || null;
    sessionStorage.removeItem(SS_KEY);
  },

  /** Nạp thư viện Google Identity Services (1 lần). */
  _loadGis() {
    if (this._gisLoaded) return this._gisLoaded;
    this._gisLoaded = new Promise((resolve, reject) => {
      if (window.google?.accounts?.oauth2) return resolve();
      const s = document.createElement("script");
      s.src = GIS_SRC;
      s.async = true;
      s.defer = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Không tải được thư viện Google"));
      document.head.appendChild(s);
    });
    return this._gisLoaded;
  },

  /** Mở popup đăng nhập Google. Trả về access token. */
  async signIn() {
    if (!this.enabled) throw new Error("Chưa cấu hình GOOGLE_CLIENT_ID trong config.js");
    await this._loadGis();

    return new Promise((resolve, reject) => {
      this._client = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: SCOPE,
        callback: res => {
          if (res.error) return reject(new Error(res.error_description || res.error));
          this.token = res.access_token;
          this.tokenExp = Date.now() + (Number(res.expires_in || 3600) - 60) * 1000;
          try {
            sessionStorage.setItem(SS_KEY, JSON.stringify({ token: this.token, exp: this.tokenExp }));
          } catch { /* bỏ qua */ }
          resolve(this.token);
        },
        error_callback: err => reject(new Error(err?.message || "Đăng nhập bị huỷ"))
      });
      this._client.requestAccessToken({ prompt: "" });
    });
  },

  _headers(extra = {}) {
    return { Authorization: `Bearer ${this.token}`, ...extra };
  },

  async _json(url, opts = {}) {
    const res = await fetch(url, { ...opts, headers: this._headers(opts.headers) });
    if (res.status === 401) { this.signOut(); throw new Error("Phiên đăng nhập hết hạn, đăng nhập lại nha"); }
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body?.error?.message || `Drive lỗi ${res.status}`);
    return body;
  },

  /** Tìm hoặc tạo thư mục chứa ảnh. */
  async ensureFolder() {
    if (this.folderId) return this.folderId;

    const q = encodeURIComponent(
      `mimeType='application/vnd.google-apps.folder' and name='${DRIVE_FOLDER_NAME.replace(/'/g, "\\'")}' and trashed=false`
    );
    const found = await this._json(`${API}/files?q=${q}&fields=files(id,name)&pageSize=1`);
    if (found.files?.length) {
      this.folderId = found.files[0].id;
      return this.folderId;
    }

    const created = await this._json(`${API}/files?fields=id`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: DRIVE_FOLDER_NAME,
        mimeType: "application/vnd.google-apps.folder"
      })
    });
    this.folderId = created.id;
    return this.folderId;
  },

  /**
   * Upload 1 ảnh lên Drive.
   * @param {File} file
   * @param {string} name tên file muốn đặt
   * @returns {Promise<{id:string, name:string, viewUrl:string, thumbUrl:string, isPublic:boolean}>}
   */
  async upload(file, name) {
    const folderId = await this.ensureFolder();
    const meta = { name: name || file.name, parents: [folderId] };

    const boundary = "dpBoundary" + Math.random().toString(36).slice(2);
    const body = new Blob([
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`,
      JSON.stringify(meta),
      `\r\n--${boundary}\r\nContent-Type: ${file.type || "application/octet-stream"}\r\n\r\n`,
      file,
      `\r\n--${boundary}--`
    ]);

    const res = await fetch(`${UPLOAD}?uploadType=multipart&fields=id,name,webViewLink`, {
      method: "POST",
      headers: this._headers({ "Content-Type": `multipart/related; boundary=${boundary}` }),
      body
    });
    if (res.status === 401) { this.signOut(); throw new Error("Phiên đăng nhập hết hạn, đăng nhập lại nha"); }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error?.message || `Upload lỗi ${res.status}`);

    let isPublic = false;
    if (DRIVE_PUBLIC_LINK) {
      try {
        await this._json(`${API}/files/${data.id}/permissions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: "reader", type: "anyone" })
        });
        isPublic = true;
      } catch (err) {
        console.warn("[drive] không đặt được quyền công khai:", err);
      }
    }

    return {
      id: data.id,
      name: data.name,
      viewUrl: data.webViewLink || `https://drive.google.com/file/d/${data.id}/view`,
      thumbUrl: thumbUrlOf(data.id),
      isPublic
    };
  },

  /** Xoá ảnh khỏi Drive (bỏ qua lỗi nếu file đã bị xoá tay). */
  async remove(fileId) {
    try {
      const res = await fetch(`${API}/files/${fileId}`, { method: "DELETE", headers: this._headers() });
      return res.ok || res.status === 404;
    } catch (err) {
      console.warn("[drive] xoá lỗi:", err);
      return false;
    }
  },

  /** Tải ảnh về dạng blob URL — dùng khi ảnh KHÔNG được share công khai. */
  async blobUrl(fileId) {
    const res = await fetch(`${API}/files/${fileId}?alt=media`, { headers: this._headers() });
    if (!res.ok) throw new Error(`Không tải được ảnh (${res.status})`);
    return URL.createObjectURL(await res.blob());
  }
};

export function thumbUrlOf(fileId, size = 800) {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${size}`;
}
