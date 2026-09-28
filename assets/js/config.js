/* ============================================================
   CẤU HÌNH — sửa file này là đủ, không cần đụng code khác
   ============================================================ */

/**
 * Firebase Firestore
 * ------------------
 * 1. Vào https://console.firebase.google.com → Add project (miễn phí).
 * 2. Trong project → biểu tượng </> (Web app) → đăng ký app → copy đoạn firebaseConfig.
 * 3. Dán các giá trị vào bên dưới.
 * 4. Vào Build → Firestore Database → Create database, rồi dán firestore.rules
 *    vào tab Rules (xem README).
 *
 * Nếu để trống apiKey, web vẫn chạy bình thường và tự động lưu vào
 * localStorage của trình duyệt.
 */
export const firebaseConfig = {
  apiKey: "AIzaSyBjfkg3w9sUR-z3qT53Dd38oHl8RQSsjJg",
  authDomain: "date-app-ece8c.firebaseapp.com",
  projectId: "date-app-ece8c",
  storageBucket: "date-app-ece8c.firebasestorage.app",
  messagingSenderId: "885136155029",
  appId: "1:885136155029:web:43b717613afb8dba72569c"
};

/** Tên collection trên Firestore */
export const COLLECTION = "dates";

/** Tên mặc định điền sẵn vào form */
export const DEFAULT_NAMES = {
  me: "",
  her: ""
};

/** Có cho phép chọn ngày trong quá khứ không */
export const ALLOW_PAST_DATES = false;

/**
 * Trang chủ "Our Time"
 * --------------------
 * Ngày bắt đầu yêu (YYYY-MM-DD), cố định — muốn đổi thì sửa ở đây.
 * Ảnh & ghi chú trên trang chủ được lưu vào Firestore (nếu đã cấu hình ở trên)
 * trong các collection: board_items, board_images, board_meta.
 */
export const START_DATE = "2026-09-26";
